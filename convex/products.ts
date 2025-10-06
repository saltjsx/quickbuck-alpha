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
      quality: 100, // Start with perfect quality
      lastMaintenanceDate: Date.now(),
      maintenanceCost: 0,
      createdAt: Date.now(),
    });

    return productId;
  },
});

// Get all active products
// OPTIMIZED: Batch fetch all companies at once with limits
export const getActiveProducts = query({
  args: {},
  handler: async (ctx) => {
    // BANDWIDTH OPTIMIZATION: Reduced from 500 to 200
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .take(200);

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
    // Limit to 100 products per company to reduce bandwidth
    const products = await ctx.db
      .query("products")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(100);

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

  // Random spend between $300,000 and $425,000
  const totalSpend = Math.floor(Math.random() * 125000) + 300000;

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

    const idToKey = (id: any) =>
      typeof id === "string" ? id : id?.toString?.() ?? String(id);

    const productMap = new Map<string, any>();
    for (const product of products) {
      productMap.set(idToKey(product._id), product);
    }

    // OPTIMIZATION: Pre-fetch all unique companies at once to avoid N repeated reads
    const uniqueCompanyIds = [...new Set(products.map(p => p.companyId))];
    const allCompanies = await Promise.all(
      uniqueCompanyIds.map(id => ctx.db.get(id))
    );
    
    const companyCache = new Map<string, any>();
    allCompanies.forEach(company => {
      if (company) {
        companyCache.set(idToKey(company._id), company);
      }
    });

    // OPTIMIZATION: Pre-fetch all unique accounts at once to avoid repeated reads
    const uniqueAccountIds = [...new Set(allCompanies
      .filter(c => c && c.accountId)
      .map(c => c!.accountId))];
    const allAccounts = await Promise.all(
      uniqueAccountIds.map(id => ctx.db.get(id))
    );
    
    const accountCache = new Map<string, any>();
    allAccounts.forEach(account => {
      if (account) {
        accountCache.set(idToKey(account._id), account);
      }
    });

    // Track sales and costs by company for batching
    const companyTransactions = new Map<
      string,
      {
        companyId: any;
        accountId: any;
        company: any;
        totalRevenue: number;
        totalCost: number;
        productSales: Map<
          string,
          {
            count: number;
            totalRevenue: number;
            totalCost: number;
          }
        >;
      }
    >();

    const recordPurchase = async (product: any) => {
      if (!product || !Number.isFinite(product.price)) return false;

      const price = Math.max(product.price, 0.01);
      const costPercentage = 0.23 + Math.random() * 0.44;
      const productionCost = price * costPercentage;
      const profit = price - productionCost;

      const companyKey = idToKey(product.companyId);
      
      // OPTIMIZED: Use pre-fetched company cache (fallback to db.get if missing)
      if (!companyCache.has(companyKey)) {
        const companyDoc = await ctx.db.get(product.companyId);
        if (!companyDoc) return false;
        companyCache.set(companyKey, companyDoc);
      }

      const companyDoc = companyCache.get(companyKey);
      if (!companyDoc) return false;

      if (!companyTransactions.has(companyKey)) {
        companyTransactions.set(companyKey, {
          companyId: companyDoc._id,
          accountId: companyDoc.accountId,
          company: companyDoc,
          totalRevenue: 0,
          totalCost: 0,
          productSales: new Map(),
        });
      }

      const companyTx = companyTransactions.get(companyKey)!;
      companyTx.totalRevenue += price;
      companyTx.totalCost += productionCost;

      const productKey = idToKey(product._id);
      const existing =
        companyTx.productSales.get(productKey) ?? {
          count: 0,
          totalRevenue: 0,
          totalCost: 0,
        };

      existing.count += 1;
      existing.totalRevenue += price;
      existing.totalCost += productionCost;
      companyTx.productSales.set(productKey, existing);

      purchases.push({
        product: product.name,
        productId: product._id,
        price,
        cost: productionCost,
        profit,
      });

      return true;
    };

    // IMPROVED: Fair distribution system with equal budget split across price ranges
    // Step 1: Categorize products by price tier
    const cheapProducts = products.filter((p) => p.price <= 150);
    const mediumProducts = products.filter((p) => p.price > 150 && p.price < 1000);
    const expensiveProducts = products.filter((p) => p.price >= 1000);

    // Step 2: Split budget equally across the three price ranges
    const budgetPerTier = totalSpend / 3;
    const cheapBudget = budgetPerTier;
    const mediumBudget = budgetPerTier;
    const expensiveBudget = budgetPerTier;

    const MAX_PURCHASES_PER_PRODUCT = 50;

    // Step 3: Purchase from each tier - select 16 random products and split budget randomly
    const purchaseFromTier = async (tierProducts: any[], tierBudget: number) => {
      if (tierProducts.length === 0 || tierBudget <= 0) return tierBudget;

      // Randomly select up to 16 products from this tier
      const shuffledTier = [...tierProducts].sort(() => Math.random() - 0.5);
      const selectedProducts = shuffledTier.slice(0, Math.min(16, tierProducts.length));

      if (selectedProducts.length === 0) return tierBudget;

      let tierRemainingBudget = tierBudget;

      // Generate random budget shares for each selected product
      const randomShares = selectedProducts.map(() => Math.random());
      const totalRandomShare = randomShares.reduce((sum, share) => sum + share, 0);
      
      // Normalize shares to sum to 1
      const normalizedShares = randomShares.map(share => share / totalRandomShare);

      // Assign budget to each product based on random shares
      const productBudgets = selectedProducts.map((product, idx) => ({
        product,
        budget: normalizedShares[idx] * tierBudget
      }));

      // Sort by price (expensive first) to ensure they get their chance
      productBudgets.sort((a, b) => b.product.price - a.product.price);

      // Purchase products using their allocated budgets
      for (const { product, budget } of productBudgets) {
        const productPrice = Math.max(product.price, 0.01);
        let productBudgetRemaining = budget;
        let purchaseCount = 0;

        // Calculate how many units we can buy with this product's budget
        const maxUnits = Math.min(
          MAX_PURCHASES_PER_PRODUCT,
          Math.floor(productBudgetRemaining / productPrice)
        );

        // Purchase up to the max units
        while (purchaseCount < maxUnits && tierRemainingBudget >= productPrice) {
          const success = await recordPurchase(product);
          if (!success) break;

          tierRemainingBudget -= productPrice;
          productBudgetRemaining -= productPrice;
          purchaseCount++;
        }
      }

      // Bonus round within tier: use any remaining budget for additional random purchases
      if (tierRemainingBudget >= 0.01) {
        const shuffled = [...selectedProducts].sort(() => Math.random() - 0.5);
        for (const product of shuffled) {
          const productPrice = Math.max(product.price, 0.01);
          if (tierRemainingBudget < productPrice) continue;

          const success = await recordPurchase(product);
          if (!success) continue;

          tierRemainingBudget -= productPrice;

          if (tierRemainingBudget < 0.01) {
            break;
          }
        }
      }

      return tierRemainingBudget;
    };

    const unusedCheap = await purchaseFromTier(cheapProducts, cheapBudget);
    const unusedMedium = await purchaseFromTier(mediumProducts, mediumBudget);
    const unusedExpensive = await purchaseFromTier(expensiveProducts, expensiveBudget);
    
    // Step 4: Use remaining budget for bonus round - randomly select products from all tiers
    remainingBudget = Math.max(unusedCheap + unusedMedium + unusedExpensive, 0);
    const bonusProducts = [...products].sort(() => Math.random() - 0.5).slice(0, 30);
    
    for (const product of bonusProducts) {
      const productPrice = Math.max(product.price, 0.01);
      if (remainingBudget < productPrice) continue;

      const success = await recordPurchase(product);
      if (!success) continue;

      remainingBudget -= productPrice;
    }

    // Now process all batched transactions using pre-fetched account data
    for (const [, tx] of companyTransactions) {
      if (!tx.company || !tx.accountId) continue;

      const netProfit = tx.totalRevenue - tx.totalCost;
      const accountKey = idToKey(tx.accountId);
      
      // Get account from pre-fetched cache
      let accountDoc = accountCache.get(accountKey);
      if (!accountDoc || !("balance" in accountDoc)) {
        // Fallback: fetch if not in cache (shouldn't happen with pre-fetch)
        accountDoc = await ctx.db.get(tx.accountId);
        if (!accountDoc || !("balance" in accountDoc)) {
          continue;
        }
        accountCache.set(accountKey, accountDoc);
      }

      const currentBalance = (accountDoc.balance ?? 0) + netProfit;
      
      // Update cache with new balance for potential future transactions
      accountCache.set(accountKey, { ...accountDoc, balance: currentBalance });
      
      // Patch account balance
      await ctx.db.patch(tx.accountId, { balance: currentBalance });

      for (const [productIdStr, salesData] of tx.productSales) {
        const product = productMap.get(productIdStr);
        if (!product) continue;

        await ctx.db.insert("ledger", {
          fromAccountId: systemAccount._id,
          toAccountId: tx.accountId,
          amount: salesData.totalRevenue,
          type: "marketplace_batch",
          productId: product._id,
          batchCount: salesData.count,
          description: `Batch purchase of ${salesData.count}x ${product.name}`,
          createdAt: Date.now(),
        });

        await ctx.db.insert("ledger", {
          fromAccountId: tx.accountId,
          toAccountId: systemAccount._id,
          amount: salesData.totalCost,
          type: "marketplace_batch",
          productId: product._id,
          batchCount: salesData.count,
          description: `Batch production cost for ${salesData.count}x ${product.name}`,
          createdAt: Date.now(),
        });

        if ("totalSales" in product) {
          const updatedTotals = {
            totalSales: (product.totalSales || 0) + salesData.count,
            totalRevenue: (product.totalRevenue || 0) + salesData.totalRevenue,
            totalCosts: (product.totalCosts || 0) + salesData.totalCost,
          };

          productMap.set(productIdStr, {
            ...product,
            ...updatedTotals,
          });

          await ctx.db.patch(product._id, updatedTotals);
        }
      }
    }

    // After all purchases, check which companies should be made public using cached balances
    for (const [, tx] of companyTransactions) {
      const companyDoc = tx.company;
      if (!companyDoc || companyDoc.isPublic) continue;

      const accountKey = idToKey(tx.accountId);
      const balance = accountCache.get(accountKey) ?? 0;

      if (balance > 50000) {
        await ctx.db.patch(companyDoc._id, {
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
