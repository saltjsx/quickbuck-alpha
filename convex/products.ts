import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

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

// Create a product
export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    tags: v.array(v.string()),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has access to company
    const access = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", args.companyId).eq("userId", userId)
      )
      .first();

    if (!access) throw new Error("No access to this company");

    const productId = await ctx.db.insert("products", {
      name: args.name,
      description: args.description,
      price: args.price,
      imageUrl: args.imageUrl,
      tags: args.tags,
      companyId: args.companyId,
      createdBy: userId,
      isActive: true,
      totalSales: 0,
      totalRevenue: 0,
      totalCosts: 0,
      createdAt: Date.now(),
    });

    return productId;
  },
});

// Get all active products
// OPTIMIZED: Batch fetch all companies at once
export const getActiveProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // OPTIMIZED: Batch fetch all companies at once
    const companyIds = [...new Set(products.map(p => p.companyId))];
    const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));
    
    const companyMap = new Map();
    companies.forEach(company => {
      if (company) {
        companyMap.set(company._id, {
          name: company.name,
          logoUrl: company.logoUrl,
          ticker: company.ticker,
        });
      }
    });

    // Enrich with company info
    const enrichedProducts = products.map(product => {
      const companyInfo = companyMap.get(product.companyId);
      return {
        ...product,
        companyName: companyInfo?.name || "Unknown",
        companyLogoUrl: companyInfo?.logoUrl,
        companyTicker: companyInfo?.ticker,
      };
    });

    return enrichedProducts;
  },
});

// Get products by company
export const getProductsByCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    return products;
  },
});

// Update product
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Check if user has access to company
    const access = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", product.companyId).eq("userId", userId)
      )
      .first();

    if (!access) throw new Error("No access to this product's company");

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.price !== undefined) updates.price = args.price;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.productId, updates);

    return { success: true };
  },
});

// Automatic product purchase (called by cron/scheduler)
export const automaticPurchase = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all active products
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    if (products.length === 0) return { message: "No products available" };

    // Random spend between $30,000 and $50,000
    const totalSpend = Math.floor(Math.random() * 20000) + 30000;

    // Get system account (buyer)
    let systemAccount = await ctx.db
      .query("accounts")
      .filter((q) => q.eq(q.field("name"), "System"))
      .first();

    if (!systemAccount) {
      throw new Error("System account not found");
    }

    let remainingBudget = totalSpend;
    const purchases: any[] = [];
    
    // Track sales and costs by company for batching
    const companyTransactions = new Map<string, {
      companyId: string,
      totalRevenue: number,
      totalCost: number,
      productSales: Map<string, number>, // productId -> count
    }>();
    
    // Select 50 random products (or all if less than 50)
    const numToSelect = Math.min(50, products.length);
    const selectedProducts = [...products].sort(() => Math.random() - 0.5).slice(0, numToSelect);

    // Try to buy each selected product if affordable
    for (const randomProduct of selectedProducts) {
      if (remainingBudget <= 0) break;

      if (randomProduct.price > remainingBudget) continue; // Skip if can't afford

      // Calculate production cost (23%-67% of selling price)
      const costPercentage = 0.23 + Math.random() * 0.44;
      const productionCost = randomProduct.price * costPercentage;
      const profit = randomProduct.price - productionCost;

      // Get company
      const company = await ctx.db.get(randomProduct.companyId);
      if (!company) continue;

      // Accumulate transactions for this company
      const companyId = company._id;
      if (!companyTransactions.has(companyId)) {
        companyTransactions.set(companyId, {
          companyId,
          totalRevenue: 0,
          totalCost: 0,
          productSales: new Map(),
        });
      }
      
      const companyTx = companyTransactions.get(companyId)!;
      companyTx.totalRevenue += randomProduct.price;
      companyTx.totalCost += productionCost;
      
      const currentSales = companyTx.productSales.get(randomProduct._id) || 0;
      companyTx.productSales.set(randomProduct._id, currentSales + 1);

      purchases.push({
        product: randomProduct.name,
        price: randomProduct.price,
        cost: productionCost,
        profit,
      });

      remainingBudget -= randomProduct.price;
    }

    // Now process all batched transactions
    for (const [companyIdStr, tx] of companyTransactions) {
      const company = await ctx.db.get(companyIdStr as any);
      if (!company || !("accountId" in company)) continue;

      const netProfit = tx.totalRevenue - tx.totalCost;
      
      // Update company balance (only update account, skip balances table for performance)
      const account = await ctx.db.get(company.accountId);
      if (account) {
        const newBalance = (account.balance ?? 0) + netProfit;
        await ctx.db.patch(company.accountId, { balance: newBalance });
      }

      // OPTIMIZED: Create BATCH transactions instead of individual ones
      for (const [productIdStr, salesCount] of tx.productSales) {
        const product = await ctx.db.get(productIdStr as any) as any;
        if (!product) continue;

        const prodPrice = product.price || 0;
        const costPercentage = 0.23 + Math.random() * 0.44;
        const prodCost = prodPrice * costPercentage;
        
        const totalRevenue = prodPrice * salesCount;
        const totalCost = prodCost * salesCount;

        // Create ONE batch revenue transaction for all sales
        await ctx.db.insert("ledger", {
          fromAccountId: systemAccount._id,
          toAccountId: company.accountId,
          amount: totalRevenue,
          type: "marketplace_batch",
          productId: productIdStr as any,
          batchCount: salesCount,
          description: `Batch purchase of ${salesCount}x ${product.name}`,
          createdAt: Date.now(),
        });

        // Create ONE batch cost transaction
        await ctx.db.insert("ledger", {
          fromAccountId: company.accountId,
          toAccountId: systemAccount._id,
          amount: totalCost,
          type: "marketplace_batch",
          productId: productIdStr as any,
          batchCount: salesCount,
          description: `Batch production cost for ${salesCount}x ${product.name}`,
          createdAt: Date.now(),
        });
      }

      // Update product sales counts and revenue/costs
      for (const [productIdStr, salesCount] of tx.productSales) {
        const product = await ctx.db.get(productIdStr as any);
        if (product && "totalSales" in product) {
          const prodPrice = (product as any).price || 0;
          const costPercentage = 0.23 + Math.random() * 0.44;
          const prodCost = prodPrice * costPercentage;
          
          await ctx.db.patch(productIdStr as any, {
            totalSales: product.totalSales + salesCount,
            totalRevenue: (product.totalRevenue || 0) + (salesCount * prodPrice),
            totalCosts: (product.totalCosts || 0) + (salesCount * prodCost),
          });
        }
      }
    }

    // After all purchases, check which companies should be made public
    const companiesProcessed = new Set<string>();
    for (const purchase of purchases) {
      const product = products.find(p => p.name === purchase.product);
      if (!product || companiesProcessed.has(product.companyId)) continue;
      
      companiesProcessed.add(product.companyId);
      const company = await ctx.db.get(product.companyId);
      if (!company || company.isPublic) continue;

      // Get cached balance
      const account = await ctx.db.get(company.accountId);
      const balance = account?.balance ?? 0;

      if (balance > 50000) {
        await ctx.db.patch(company._id, {
          isPublic: true,
        });
      }
    }

    return {
      totalSpent: totalSpend - remainingBudget,
      purchases,
      productsCount: purchases.length,
    };
  },
});
