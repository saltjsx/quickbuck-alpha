import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

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
    // Convex limits: single pagination per query, max 1000 items per page
    // Fetch as many as possible in one paginated query
    const paginationResult = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .paginate({ numItems: 1000, cursor: null });
    
    const products = paginationResult.page;    // OPTIMIZED: Batch fetch all companies at once (minimal fields)
    const companyIds = [...new Set(products.map(p => p.companyId))];
    const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));
    
    // BANDWIDTH OPTIMIZATION: Create minimal company map with only essential fields
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

    // BANDWIDTH OPTIMIZATION: Return only essential product fields
    // Remove unnecessary data from response
    const enrichedProducts = products.map(product => {
      const companyInfo = companyMap.get(product.companyId);
      return {
        _id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        tags: product.tags,
        companyId: product.companyId,
        isActive: product.isActive,
        quality: product.quality,
        totalSales: product.totalSales,
        // Only include company info, not full product object
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
    // BANDWIDTH OPTIMIZATION: Limit to 150 products (reduced from 200)
    // Focus on most popular products to reduce bandwidth
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .take(150); // REDUCED from 200 to 150

    if (products.length === 0) return { message: "No products available" };

  // Random spend between $300,000 and $425,000
  const totalSpend = Math.floor(Math.random() * 125000) + 300000;

    // Get system account (buyer)
    // OPTIMIZED: Use by_name index for system account lookup
    let systemAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", "System"))
      .first();

    if (!systemAccount) {
      throw new Error("System account not found");
    }

  let remainingBudget = totalSpend;
  const purchases: any[] = [];
  const companySpend = new Map<string, number>();
  const maxCompanySpend = totalSpend * 0.15; // Cap spend per company at 15%

    const idToKey = (id: any) =>
      typeof id === "string" ? id : id?.toString?.() ?? String(id);

    const productMap = new Map<string, any>();
    for (const product of products) {
      productMap.set(idToKey(product._id), product);
    }

    // OPTIMIZATION: Pre-fetch all unique companies at once to avoid N repeated reads
  const uniqueCompanyIds = [...new Set(products.map(p => p.companyId))];
  const totalActiveCompanies = uniqueCompanyIds.length;
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

    const recordPurchase = async (product: any, flexibleLimit = false) => {
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

      const currentCompanySpend = companySpend.get(companyKey) ?? 0;
      if (!flexibleLimit && totalActiveCompanies > 1 && currentCompanySpend + price > maxCompanySpend) {
        return false;
      }

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

      companySpend.set(companyKey, currentCompanySpend + price);

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

    // Step 3: Purchase from each tier with fair company allocation
    const purchaseFromTier = async (tierProducts: any[], tierBudget: number) => {
      if (tierProducts.length === 0 || tierBudget <= 0) return tierBudget;

      const companyGroups = new Map<string, any[]>();
      tierProducts.forEach((product) => {
        const key = idToKey(product.companyId);
        const productsForCompany = companyGroups.get(key) ?? [];
        productsForCompany.push(product);
        companyGroups.set(key, productsForCompany);
      });

      const companyEntries = Array.from(companyGroups.entries());
      if (companyEntries.length === 0) return tierBudget;

      let tierRemainingBudget = tierBudget;
      const equitableAllocation = tierBudget / companyEntries.length;

      // Randomize processing order each run to avoid deterministic bias
      companyEntries.sort(() => Math.random() - 0.5);

      for (const [, products] of companyEntries) {
        let allocation = equitableAllocation;
        const sortedProducts = [...products].sort((a, b) => {
          const qualityA = a.quality ?? 100;
          const qualityB = b.quality ?? 100;
          if (qualityA !== qualityB) return qualityB - qualityA;
          return b.price - a.price;
        });

        let rotationIndex = 0;
        let attempts = 0;
        const maxAttempts = MAX_PURCHASES_PER_PRODUCT * sortedProducts.length;

        while (allocation >= 0.01 && tierRemainingBudget >= 0.01 && attempts < maxAttempts) {
          const product = sortedProducts[rotationIndex % sortedProducts.length];
          const productPrice = Math.max(product.price, 0.01);

          if (productPrice > allocation || productPrice > tierRemainingBudget) {
            rotationIndex++;
            attempts++;
            continue;
          }

          const success = await recordPurchase(product);
          attempts++;
          rotationIndex++;

          if (!success) {
            continue;
          }

          allocation -= productPrice;
          tierRemainingBudget -= productPrice;
        }
      }

      if (tierRemainingBudget >= 0.01) {
        const prioritizedProducts = [...tierProducts]
          .sort((a, b) => {
            const qualityA = a.quality ?? 100;
            const qualityB = b.quality ?? 100;
            if (qualityA !== qualityB) return qualityB - qualityA;
            return a.price - b.price;
          })
          .slice(0, 25);

        for (const product of prioritizedProducts) {
          const productPrice = Math.max(product.price, 0.01);
          if (productPrice > tierRemainingBudget) continue;

          const success = await recordPurchase(product);
          if (!success) continue;

          tierRemainingBudget -= productPrice;

          if (tierRemainingBudget < 0.01) break;
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

      const success = await recordPurchase(product, true);
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

      // ULTRA-BANDWIDTH OPTIMIZATION: Consolidate ledger entries per company instead of per product
      // This reduces 600+ ledger writes per cron run to just 2 writes per company
      const productPatches: Array<{ id: any; updates: any }> = [];
      const productNames: string[] = [];
      let totalProductCount = 0;

      for (const [productIdStr, salesData] of tx.productSales) {
        const product = productMap.get(productIdStr);
        if (!product) continue;

        // Track product names for consolidated description
        productNames.push(`${salesData.count}x ${product.name}`);
        totalProductCount += salesData.count;

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

          productPatches.push({ id: product._id, updates: updatedTotals });
        }
      }

      // Create ONE consolidated revenue ledger entry per company
      const revenueDescription = productNames.length <= 3
        ? `Marketplace sales: ${productNames.join(", ")}`
        : `Marketplace sales: ${totalProductCount} items across ${productNames.length} products`;

      await ctx.db.insert("ledger", {
        fromAccountId: systemAccount._id,
        toAccountId: tx.accountId,
        amount: tx.totalRevenue,
        type: "marketplace_batch" as const,
        description: revenueDescription,
        createdAt: Date.now(),
      });

      // Create ONE consolidated cost ledger entry per company
      const costDescription = productNames.length <= 3
        ? `Production costs: ${productNames.join(", ")}`
        : `Production costs: ${totalProductCount} items across ${productNames.length} products`;

      await ctx.db.insert("ledger", {
        fromAccountId: tx.accountId,
        toAccountId: systemAccount._id,
        amount: tx.totalCost,
        type: "marketplace_batch" as const,
        description: costDescription,
        createdAt: Date.now(),
      });

      // Execute all product patches in parallel
      await Promise.all(
        productPatches.map(({ id, updates }) => ctx.db.patch(id, updates))
      );
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

// Delete a product (deactivate it)
export const deleteProduct = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Check if user has access to the company
    const access = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", product.companyId).eq("userId", userId)
      )
      .first();

    if (!access) throw new Error("No access to this company");

    // Deactivate the product instead of deleting for historical record
    await ctx.db.patch(args.productId, {
      isActive: false,
    });

    return { success: true };
  },
});

// Internal mutation to delete product without authentication (for moderation)
export const internalDeleteProduct = internalMutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Deactivate the product
    await ctx.db.patch(args.productId, {
      isActive: false,
    });

    return { success: true };
  },
});

// Admin mutation to batch delete products (requires admin key)
export const adminDeleteProducts = mutation({
  args: {
    productIds: v.array(v.id("products")),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check admin key
    if (args.adminKey !== process.env.ADMIN_KEY) {
      throw new Error("Invalid admin key");
    }

    const results = [];
    for (const productId of args.productIds) {
      try {
        const product = await ctx.db.get(productId);
        if (product) {
          await ctx.db.patch(productId, { isActive: false });
          results.push({ productId, success: true });
        } else {
          results.push({ productId, success: false, error: "Product not found" });
        }
      } catch (error) {
        results.push({ 
          productId, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return results;
  },
});
