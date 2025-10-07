import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to get current user ID
async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
    .unique();
  
  return user?._id || null;
}

// Purchase an item from the marketplace and add it to user's collection
export const purchaseItem = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get the product
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    if (!product.isActive) throw new Error("Product is not available");

    // Get user's personal account
    // OPTIMIZED: Use compound index to avoid filter after withIndex
    const userAccount = await ctx.db
      .query("accounts")
      .withIndex("by_owner_type", (q) => q.eq("ownerId", userId).eq("type", "personal"))
      .first();

    if (!userAccount) throw new Error("No personal account found");

    // Check if user has enough balance
    const balance = userAccount.balance ?? 0;
    if (balance < product.price) {
      throw new Error("Insufficient funds");
    }

    // Get company account
    const company = await ctx.db.get(product.companyId);
    if (!company) throw new Error("Company not found");

    const companyAccount = await ctx.db.get(company.accountId);
    if (!companyAccount) throw new Error("Company account not found");

    // Deduct from user's account
    await ctx.db.patch(userAccount._id, {
      balance: balance - product.price,
    });

    // Add to company's account
    const companyBalance = companyAccount.balance ?? 0;
    await ctx.db.patch(companyAccount._id, {
      balance: companyBalance + product.price,
    });

    // Create ledger entry
    await ctx.db.insert("ledger", {
      fromAccountId: userAccount._id,
      toAccountId: companyAccount._id,
      amount: product.price,
      type: "product_purchase",
      productId: args.productId,
      description: `Purchased ${product.name}`,
      createdAt: Date.now(),
    });

    // Add to user's collection
    const collectionId = await ctx.db.insert("collections", {
      userId,
      productId: args.productId,
      purchasePrice: product.price,
      purchasedAt: Date.now(),
    });

    // Update product sales
    await ctx.db.patch(args.productId, {
      totalSales: product.totalSales + 1,
      totalRevenue: (product.totalRevenue || 0) + product.price,
    });

    return { collectionId, success: true };
  },
});

// Get user's collection
export const getMyCollection = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    // Limit to 200 collection items to reduce bandwidth
    const collectionItems = await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);

    // OPTIMIZED: Batch fetch products and companies
    const productIds = [...new Set(collectionItems.map(item => item.productId))];
    const products = await Promise.all(productIds.map(id => ctx.db.get(id)));
    
    const productMap = new Map();
    const companyIds = new Set();
    products.forEach(product => {
      if (product) {
        productMap.set(product._id, product);
        companyIds.add(product.companyId);
      }
    });
    
    const companies = await Promise.all(Array.from(companyIds).map(id => ctx.db.get(id as any)));
    const companyMap = new Map();
    companies.forEach(company => {
      if (company) {
        companyMap.set(company._id, company);
      }
    });

    // Group items by productId
    const groupedItems = new Map<string, {
      productId: any;
      quantity: number;
      totalPurchasePrice: number;
      averagePurchasePrice: number;
      firstPurchasedAt: number;
      lastPurchasedAt: number;
      purchases: any[];
    }>();

    collectionItems.forEach((item) => {
      const productIdStr = item.productId.toString();
      if (!groupedItems.has(productIdStr)) {
        groupedItems.set(productIdStr, {
          productId: item.productId,
          quantity: 0,
          totalPurchasePrice: 0,
          averagePurchasePrice: 0,
          firstPurchasedAt: item.purchasedAt,
          lastPurchasedAt: item.purchasedAt,
          purchases: [],
        });
      }
      
      const group = groupedItems.get(productIdStr)!;
      group.quantity += 1;
      group.totalPurchasePrice += item.purchasePrice;
      group.firstPurchasedAt = Math.min(group.firstPurchasedAt, item.purchasedAt);
      group.lastPurchasedAt = Math.max(group.lastPurchasedAt, item.purchasedAt);
      group.purchases.push(item);
    });

    // Calculate average and enrich with product data
    const enrichedItems = Array.from(groupedItems.values()).map((group) => {
      const product = productMap.get(group.productId);
      if (!product) return null;

      const company = companyMap.get(product.companyId);
      group.averagePurchasePrice = group.totalPurchasePrice / group.quantity;

      return {
        productId: group.productId,
        quantity: group.quantity,
        averagePurchasePrice: group.averagePurchasePrice,
        totalPurchasePrice: group.totalPurchasePrice,
        firstPurchasedAt: group.firstPurchasedAt,
        lastPurchasedAt: group.lastPurchasedAt,
        productName: product.name,
        productDescription: product.description,
        productImageUrl: product.imageUrl,
        productTags: product.tags,
        currentPrice: product.price,
        companyName: company?.name || "Unknown",
        companyLogoUrl: company?.logoUrl,
      };
    });

    return enrichedItems.filter((item) => item !== null);
  },
});

// Get collection stats
export const getCollectionStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return { totalItems: 0, totalSpent: 0, totalValue: 0 };

    // Limit to 200 items for stats calculation to reduce bandwidth
    const collectionItems = await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(200);

    const totalSpent = collectionItems.reduce(
      (sum, item) => sum + item.purchasePrice,
      0
    );

    // Calculate current value by getting current product prices
    let totalValue = 0;
    for (const item of collectionItems) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        totalValue += product.price;
      }
    }

    return {
      totalItems: collectionItems.length,
      totalSpent,
      totalValue,
      priceChange: totalValue - totalSpent,
      priceChangePercent: totalSpent > 0 ? ((totalValue - totalSpent) / totalSpent) * 100 : 0,
    };
  },
});

// Check if user already owns a product
export const checkOwnership = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return false;

    const existing = await ctx.db
      .query("collections")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .first();

    return !!existing;
  },
});
