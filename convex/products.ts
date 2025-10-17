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
    // Get ALL active products (up to 1000) to ensure fair distribution
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .take(1000); // Increased to handle 350+ products

    if (products.length === 0) return { message: "No products available" };

    // Fixed minimum spend of $5,000,000 as requested
    const totalSpend = 5000000;

    // Get or create system account (buyer)
    // OPTIMIZED: Use by_name index for system account lookup
    let systemAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", "System"))
      .first();

    if (!systemAccount) {
      // Get or create a designated system user (not a real player)
      let systemUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("name"), "System"))
        .first();
      
      if (!systemUser) {
        const systemUserId = await ctx.db.insert("users", {
          name: "System",
          email: "system@quickbuck.internal",
          tokenIdentifier: "system-internal-account",
        });
        systemUser = await ctx.db.get(systemUserId);
      }

      // Create system account with the system user as owner
      const systemAccountId = await ctx.db.insert("accounts", {
        name: "System",
        type: "personal",
        ownerId: systemUser!._id,
        balance: Number.MAX_SAFE_INTEGER, // Unlimited funds for market purchases
        createdAt: Date.now(),
      });
      
      systemAccount = await ctx.db.get(systemAccountId);
    }
    
    if (!systemAccount) {
      throw new Error("Failed to create or retrieve system account");
    }

    let remainingBudget = totalSpend;
    const purchases: any[] = [];
    const companySpend = new Map<string, number>();

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

    const recordPurchase = async (product: any, quantity: number) => {
      if (!product || !Number.isFinite(product.price) || quantity <= 0) return false;

      const price = Math.max(product.price, 0.01);
      const totalPrice = price * quantity;
      const costPercentage = 0.23 + Math.random() * 0.44;
      const productionCost = totalPrice * costPercentage;

      const companyKey = idToKey(product.companyId);
      
      // OPTIMIZED: Use pre-fetched company cache
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
      companyTx.totalRevenue += totalPrice;
      companyTx.totalCost += productionCost;

      const productKey = idToKey(product._id);
      const existing =
        companyTx.productSales.get(productKey) ?? {
          count: 0,
          totalRevenue: 0,
          totalCost: 0,
        };

      existing.count += quantity;
      existing.totalRevenue += totalPrice;
      existing.totalCost += productionCost;
      companyTx.productSales.set(productKey, existing);

      purchases.push({
        product: product.name,
        productId: product._id,
        quantity,
        price: totalPrice,
        cost: productionCost,
        profit: totalPrice - productionCost,
      });

      companySpend.set(companyKey, (companySpend.get(companyKey) || 0) + totalPrice);

      return true;
    };

    // ============================================================
    // BALANCED RANDOM DISTRIBUTION ALGORITHM
    // ============================================================
    // Goal: Spend $5M across ALL products with balanced distribution
    // Strategy:
    // 1. Give every product a guaranteed minimum purchase
    // 2. Distribute remaining budget more evenly with weighted randomness
    // 3. Pick some lucky products to get extra sales (but not millions)
    // 4. Use sqrt(price) weighting to reduce extreme imbalances
    // ============================================================

    // Calculate weighted score for each product
    interface ProductScore {
      product: any;
      revenuePerUnit: number; // Price per item
      qualityWeight: number; // 0.5 - 1.0 based on quality
      balancedScore: number; // sqrt(price) * quality for more balanced distribution
      randomBonus: number; // Random multiplier for variety
      minPurchases: number; // Guaranteed minimum purchases
      bonusBudget: number; // Additional budget allocation
    }

    const productScores: ProductScore[] = products.map(product => {
      const price = Math.max(product.price, 0.01);
      const quality = Math.max(Math.min(product.quality ?? 100, 100), 0);
      const qualityWeight = 0.5 + (quality / 100) * 0.5; // Range: 0.5 to 1.0
      
      // Use square root of price to reduce impact of extreme prices
      // A $10,000 product now only has 10x weight vs $100 product (not 100x)
      const balancedScore = Math.sqrt(price) * qualityWeight;
      
      // Add random bonus (0.5 to 1.5x multiplier) for variety
      const randomBonus = 0.5 + Math.random();

      return {
        product,
        revenuePerUnit: price,
        qualityWeight,
        balancedScore,
        randomBonus,
        minPurchases: 0,
        bonusBudget: 0,
      };
    });

    // Shuffle products for random selection order
    for (let i = productScores.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [productScores[i], productScores[j]] = [productScores[j], productScores[i]];
    }

    // Phase 1: GUARANTEED MINIMUM - Every product gets 2-5 purchases
    // Allocate 40% of budget to ensure everyone gets decent baseline
    const guaranteedBudget = totalSpend * 0.40;
    let guaranteedSpent = 0;

    console.log(`Phase 1: Guaranteeing minimum purchases for ${productScores.length} products`);
    
    for (const score of productScores) {
      // Random quantity between 2-5 units for variety
      const quantity = 2 + Math.floor(Math.random() * 4);
      const cost = score.revenuePerUnit * quantity;
      
      if (guaranteedSpent + cost <= guaranteedBudget) {
        const success = await recordPurchase(score.product, quantity);
        if (success) {
          score.minPurchases = quantity;
          guaranteedSpent += cost;
        }
      } else {
        // If we can't afford random quantity, try just 1 unit
        const singleCost = score.revenuePerUnit;
        if (guaranteedSpent + singleCost <= guaranteedBudget) {
          const success = await recordPurchase(score.product, 1);
          if (success) {
            score.minPurchases = 1;
            guaranteedSpent += singleCost;
          }
        }
      }
    }

    console.log(`Phase 1 complete: Spent $${guaranteedSpent.toFixed(2)} on minimum purchases`);

    // Phase 2: BALANCED DISTRIBUTION with randomness
    // Use 50% of budget, distributed by balanced score (sqrt pricing)
    const mainBudget = totalSpend * 0.50;
    const totalBalancedScore = productScores.reduce((sum, s) => s.balancedScore * s.randomBonus + sum, 0);

    console.log(`Phase 2: Distributing $${mainBudget.toFixed(2)} with balanced weighting`);

    // Calculate each product's budget allocation
    for (const score of productScores) {
      const weightedScore = score.balancedScore * score.randomBonus;
      const proportion = weightedScore / totalBalancedScore;
      score.bonusBudget = mainBudget * proportion;
    }

    // Execute balanced purchases
    let phase2Spent = 0;
    for (const score of productScores) {
      if (score.bonusBudget < score.revenuePerUnit) {
        continue; // Not enough budget for even 1 unit
      }

      // Calculate how many units to buy based on allocated budget
      const maxQuantity = Math.floor(score.bonusBudget / score.revenuePerUnit);
      
      // Add randomness to quantity (50% to 150% of calculated amount)
      const randomFactor = 0.5 + Math.random();
      const quantity = Math.max(1, Math.min(Math.floor(maxQuantity * randomFactor), 500)); // Cap at 500 units

      if (quantity > 0) {
        const success = await recordPurchase(score.product, quantity);
        if (success) {
          const actualCost = score.revenuePerUnit * quantity;
          phase2Spent += actualCost;
        }
      }
    }

    console.log(`Phase 2 complete: Spent $${phase2Spent.toFixed(2)} on balanced purchases`);

    remainingBudget = totalSpend - guaranteedSpent - phase2Spent;

    // Phase 3: LUCKY PRODUCTS - Pick 20-30 random products for bonus sales
    if (remainingBudget > 100) {
      console.log(`Phase 3: Distributing remaining $${remainingBudget.toFixed(2)} to lucky products`);
      
      // Shuffle again and pick 20-30 random products
      const shuffled = [...productScores].sort(() => Math.random() - 0.5);
      const luckyCount = 20 + Math.floor(Math.random() * 11); // 20-30 products
      const luckyProducts = shuffled.slice(0, luckyCount);

      for (const score of luckyProducts) {
        if (remainingBudget < score.revenuePerUnit) continue;

        // Give each lucky product 10-50 extra units (capped by remaining budget)
        const bonusQuantity = 10 + Math.floor(Math.random() * 41);
        const maxAffordable = Math.floor(remainingBudget / score.revenuePerUnit);
        const quantity = Math.min(bonusQuantity, maxAffordable);

        if (quantity > 0) {
          const success = await recordPurchase(score.product, quantity);
          if (success) {
            const actualCost = score.revenuePerUnit * quantity;
            remainingBudget -= actualCost;
          }
        }
      }
    }

    const totalSpent = totalSpend - remainingBudget;
    console.log(`Purchase complete: Spent $${totalSpent.toFixed(2)} across ${purchases.length} purchases`);    // Now process all batched transactions using pre-fetched account data
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

      // BANDWIDTH OPTIMIZATION: Batch all ledger inserts and product patches
      const ledgerInserts: any[] = [];
      const productPatches: Array<{ id: any; updates: any }> = [];
      
      for (const [productIdStr, salesData] of tx.productSales) {
        const product = productMap.get(productIdStr);
        if (!product) continue;

        // Queue ledger entries for batch insert
        ledgerInserts.push({
          fromAccountId: systemAccount._id,
          toAccountId: tx.accountId,
          amount: salesData.totalRevenue,
          type: "marketplace_batch" as const,
          productId: product._id,
          batchCount: salesData.count,
          description: `Batch purchase of ${salesData.count}x ${product.name}`,
          createdAt: Date.now(),
        });

        ledgerInserts.push({
          fromAccountId: tx.accountId,
          toAccountId: systemAccount._id,
          amount: salesData.totalCost,
          type: "marketplace_batch" as const,
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

          productPatches.push({ id: product._id, updates: updatedTotals });
        }
      }
      
      // Execute all batched operations
      await Promise.all([
        ...ledgerInserts.map(entry => ctx.db.insert("ledger", entry)),
        ...productPatches.map(({ id, updates }) => ctx.db.patch(id, updates))
      ]);
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
      totalSpent,
      purchases,
      purchaseCount: purchases.length,
      productsReached: new Set(purchases.map((p: any) => p.productId)).size,
      companiesReached: companyTransactions.size,
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

// Admin mutation for AI-driven purchases (requires admin key)
export const adminAIPurchase = mutation({
  args: {
    purchases: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
    })),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check admin key
    if (args.adminKey !== process.env.ADMIN_KEY) {
      throw new Error("Invalid admin key");
    }

    // Get or create system account (buyer)
    let systemAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", "System"))
      .first();

    if (!systemAccount) {
      // Get or create a designated system user (not a real player)
      let systemUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("name"), "System"))
        .first();
      
      if (!systemUser) {
        const systemUserId = await ctx.db.insert("users", {
          name: "System",
          email: "system@quickbuck.internal",
          tokenIdentifier: "system-internal-account-ai-purchases",
        });
        systemUser = await ctx.db.get(systemUserId);
      }

      // Create system account with the system user as owner
      const systemAccountId = await ctx.db.insert("accounts", {
        name: "System",
        type: "personal",
        ownerId: systemUser!._id,
        balance: Number.MAX_SAFE_INTEGER, // Unlimited funds for market purchases
        createdAt: Date.now(),
      });
      
      systemAccount = await ctx.db.get(systemAccountId);
    }
    
    if (!systemAccount) {
      throw new Error("Failed to create or retrieve system account");
    }

    let totalSpent = 0;
    let totalItems = 0;
    let productsPurchased = 0;
    const errors: string[] = [];
    const companiesAffected = new Set<string>();
    
    // Track transactions by company for batching
    const companyTransactions = new Map<string, {
      companyId: any;
      accountId: any;
      totalRevenue: number;
      totalCost: number;
      productSales: Map<string, {
        product: any;
        count: number;
        totalRevenue: number;
        totalCost: number;
      }>;
    }>();

    // Process each purchase
    for (const purchase of args.purchases) {
      try {
        const product = await ctx.db.get(purchase.productId);
        if (!product || !product.isActive) {
          errors.push(`Product ${purchase.productId} not found or inactive`);
          continue;
        }

        const company = await ctx.db.get(product.companyId);
        if (!company) {
          errors.push(`Company for product ${product.name} not found`);
          continue;
        }

        // Calculate costs
        const pricePerUnit = Math.max(product.price, 0.01);
        const quantity = Math.max(1, Math.min(100, Math.floor(purchase.quantity)));
        const totalPrice = pricePerUnit * quantity;
        const costPercentage = 0.23 + Math.random() * 0.44;
        const productionCost = totalPrice * costPercentage;
        const profit = totalPrice - productionCost;

        // Track company transactions
        const companyKey = String(company._id);
        companiesAffected.add(companyKey);
        
        if (!companyTransactions.has(companyKey)) {
          companyTransactions.set(companyKey, {
            companyId: company._id,
            accountId: company.accountId,
            totalRevenue: 0,
            totalCost: 0,
            productSales: new Map(),
          });
        }

        const companyTx = companyTransactions.get(companyKey)!;
        companyTx.totalRevenue += totalPrice;
        companyTx.totalCost += productionCost;

        const productKey = String(product._id);
        const existing = companyTx.productSales.get(productKey) ?? {
          product,
          count: 0,
          totalRevenue: 0,
          totalCost: 0,
        };

        existing.count += quantity;
        existing.totalRevenue += totalPrice;
        existing.totalCost += productionCost;
        companyTx.productSales.set(productKey, existing);

        totalSpent += totalPrice;
        totalItems += quantity;
        productsPurchased++;
      } catch (error) {
        errors.push(`Error processing ${purchase.productId}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Process all batched transactions
    for (const [, tx] of companyTransactions) {
      try {
        // Get account
        const account = await ctx.db.get(tx.accountId);
        if (!account || !("balance" in account)) {
          errors.push(`Account not found for company`);
          continue;
        }

        // Update account balance
        const netProfit = tx.totalRevenue - tx.totalCost;
        const newBalance = (account.balance ?? 0) + netProfit;
        await ctx.db.patch(tx.accountId, { balance: newBalance });

        // Create ledger entries and update products
        for (const [, salesData] of tx.productSales) {
          const product = salesData.product;

          // Ledger entry for revenue
          await ctx.db.insert("ledger", {
            fromAccountId: systemAccount._id,
            toAccountId: tx.accountId,
            amount: salesData.totalRevenue,
            type: "ai_purchase",
            productId: product._id,
            batchCount: salesData.count,
            description: `AI market purchase: ${salesData.count}x ${product.name}`,
            createdAt: Date.now(),
          });

          // Ledger entry for costs
          await ctx.db.insert("ledger", {
            fromAccountId: tx.accountId,
            toAccountId: systemAccount._id,
            amount: salesData.totalCost,
            type: "ai_purchase",
            productId: product._id,
            batchCount: salesData.count,
            description: `AI purchase cost: ${salesData.count}x ${product.name}`,
            createdAt: Date.now(),
          });

          // Update product statistics
          await ctx.db.patch(product._id, {
            totalSales: (product.totalSales || 0) + salesData.count,
            totalRevenue: (product.totalRevenue || 0) + salesData.totalRevenue,
            totalCosts: (product.totalCosts || 0) + salesData.totalCost,
          });
        }

        // Check if company should go public
        const company = await ctx.db.get(tx.companyId);
        if (company && "isPublic" in company && !company.isPublic && newBalance > 50000) {
          await ctx.db.patch(company._id, { isPublic: true });
        }
      } catch (error) {
        errors.push(`Error processing company transaction: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return {
      totalSpent,
      totalItems,
      productsPurchased,
      companiesAffected: companiesAffected.size,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error messages
    };
  },
});
