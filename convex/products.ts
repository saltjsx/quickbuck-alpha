import { v } from "convex/values";
import { internalMutation, mutation, query, internalAction } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

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

// Helper to get company employee bonuses
async function getCompanyEmployeeBonuses(ctx: any, companyId: Id<"companies">) {
  const employees = await ctx.db
    .query("employees")
    .withIndex("by_company_active", (q: any) =>
      q.eq("companyId", companyId).eq("isActive", true)
    )
    .collect();

  const totalBonuses = {
    salesBoost: 0,
    maintenanceReduction: 0,
    qualityBoost: 0,
    costReduction: 0,
    efficiencyBoost: 0,
  };

  for (const employee of employees) {
    const baseMultiplier = 0.02; // 2% per level
    const levelMultiplier = employee.level * baseMultiplier;
    const totalMultiplier = levelMultiplier * employee.bonusMultiplier;
    const moraleMultiplier = employee.morale / 100;

    switch (employee.role) {
      case "marketer":
        totalBonuses.salesBoost += totalMultiplier * moraleMultiplier;
        break;
      case "engineer":
        totalBonuses.maintenanceReduction += totalMultiplier * moraleMultiplier;
        break;
      case "quality_control":
        totalBonuses.qualityBoost += totalMultiplier * moraleMultiplier;
        break;
      case "cost_optimizer":
        totalBonuses.costReduction += totalMultiplier * moraleMultiplier;
        break;
      case "manager":
        const managerBonus = (totalMultiplier * 0.5) * moraleMultiplier;
        totalBonuses.salesBoost += managerBonus;
        totalBonuses.maintenanceReduction += managerBonus;
        totalBonuses.qualityBoost += managerBonus;
        totalBonuses.costReduction += managerBonus;
        totalBonuses.efficiencyBoost += managerBonus;
        break;
    }
  }

  return totalBonuses;
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

    // Apply employee quality bonuses
    const employeeBonuses = await getCompanyEmployeeBonuses(ctx, args.companyId);
    // Quality boost: start at 100 and add bonus (cap at 120)
    const initialQuality = Math.min(120, 100 + (employeeBonuses.qualityBoost * 100));

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
      quality: initialQuality,
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
    
    const products = paginationResult.page;
    
    // BANDWIDTH OPTIMIZATION: Batch fetch unique companies only (not duplicates)
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
    // Remove totalRevenue, totalCosts, lastMaintenanceDate, maintenanceCost - not needed for listing
    // Save ~45 bytes per product × 1000 = 45KB per query
    const enrichedProducts = products.map(product => ({
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
      companyName: companyMap.get(product.companyId)?.name || "Unknown",
      companyLogoUrl: companyMap.get(product.companyId)?.logoUrl,
      companyTicker: companyMap.get(product.companyId)?.ticker,
    }));

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
        const quantity = Math.max(1, Math.min(100000, Math.floor(purchase.quantity))); // Increased from 100 to 100,000 for larger bulk purchases
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

        // Check if company should go public (only if keepPrivate is not set)
        const company = await ctx.db.get(tx.companyId);
        if (company && "isPublic" in company && !company.isPublic && newBalance > 50000 && !(company as any).keepPrivate) {
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
