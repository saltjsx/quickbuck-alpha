import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper function to get the authenticated user ID
async function getAuthenticatedUserId(ctx: any): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user._id;
}

// Initialize default upgrades (run once to populate the upgrades table)
export const initializeUpgrades = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if upgrades already exist
    const existingUpgrades = await ctx.db.query("upgrades").first();
    if (existingUpgrades) {
      return { success: false, message: "Upgrades already initialized" };
    }

    // Revenue Boost Upgrades
    await ctx.db.insert("upgrades", {
      name: "Revenue Boost - Low Tier",
      description: "Boost a company's revenue by 10%",
      type: "revenue_boost",
      tier: "low",
      effectPercentage: 10,
      price: 500000, // $500,000
      isActive: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("upgrades", {
      name: "Revenue Boost - Medium Tier",
      description: "Boost a company's revenue by 20%",
      type: "revenue_boost",
      tier: "medium",
      effectPercentage: 20,
      price: 1500000, // $1,500,000
      isActive: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("upgrades", {
      name: "Revenue Boost - High Tier",
      description: "Boost a company's revenue by 30%",
      type: "revenue_boost",
      tier: "high",
      effectPercentage: 30,
      price: 3000000, // $3,000,000
      isActive: true,
      createdAt: Date.now(),
    });

    // Stock Price Boost Upgrades
    await ctx.db.insert("upgrades", {
      name: "Stock Price Boost - Low Tier",
      description: "Boost a stock's price by 5%",
      type: "stock_price_boost",
      tier: "low",
      effectPercentage: 5,
      price: 750000, // $750,000
      isActive: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("upgrades", {
      name: "Stock Price Boost - High Tier",
      description: "Boost a stock's price by 10%",
      type: "stock_price_boost",
      tier: "high",
      effectPercentage: 10,
      price: 2000000, // $2,000,000
      isActive: true,
      createdAt: Date.now(),
    });

    // Stock Price Lower Upgrades
    await ctx.db.insert("upgrades", {
      name: "Stock Price Lower - Low Tier",
      description: "Lower a stock's price by 5%",
      type: "stock_price_lower",
      tier: "low",
      effectPercentage: 5,
      price: 1000000, // $1,000,000
      isActive: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("upgrades", {
      name: "Stock Price Lower - High Tier",
      description: "Lower a stock's price by 10%",
      type: "stock_price_lower",
      tier: "high",
      effectPercentage: 10,
      price: 2500000, // $2,500,000
      isActive: true,
      createdAt: Date.now(),
    });

    return { success: true, message: "Upgrades initialized successfully" };
  },
});

// Get all active upgrades
export const getActiveUpgrades = query({
  args: {},
  handler: async (ctx) => {
    const upgrades = await ctx.db
      .query("upgrades")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return upgrades;
  },
});

// Get user's purchased upgrades
export const getUserUpgrades = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);
    if (!userId) return [];

    const userUpgrades = await ctx.db
      .query("userUpgrades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Enrich with upgrade details
    const enrichedUpgrades = await Promise.all(
      userUpgrades.map(async (userUpgrade) => {
        const upgrade = await ctx.db.get(userUpgrade.upgradeId);
        let targetName = null;

        if (userUpgrade.targetId && userUpgrade.targetType) {
          if (userUpgrade.targetType === "company") {
            const company = await ctx.db.get(userUpgrade.targetId as Id<"companies">);
            targetName = company?.name;
          } else if (userUpgrade.targetType === "stock") {
            const stock = await ctx.db.get(userUpgrade.targetId as Id<"stocks">);
            if (stock) {
              const company = await ctx.db.get(stock.companyId);
              targetName = company?.name;
            }
          }
        }

        return {
          ...userUpgrade,
          upgrade,
          targetName,
        };
      })
    );

    return enrichedUpgrades;
  },
});

// Get user's unused upgrades
export const getUnusedUpgrades = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);
    if (!userId) return [];

    const userUpgrades = await ctx.db
      .query("userUpgrades")
      .withIndex("by_user_used", (q) => q.eq("userId", userId).eq("isUsed", false))
      .collect();

    // Enrich with upgrade details
    const enrichedUpgrades = await Promise.all(
      userUpgrades.map(async (userUpgrade) => {
        const upgrade = await ctx.db.get(userUpgrade.upgradeId);
        return {
          ...userUpgrade,
          upgrade,
        };
      })
    );

    return enrichedUpgrades;
  },
});

// Purchase an upgrade
export const purchaseUpgrade = mutation({
  args: {
    upgradeId: v.id("upgrades"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get upgrade details
    const upgrade = await ctx.db.get(args.upgradeId);
    if (!upgrade) {
      throw new Error("Upgrade not found");
    }

    if (!upgrade.isActive) {
      throw new Error("Upgrade is not available for purchase");
    }

    // Get user's personal account
    const personalAccount = await ctx.db
      .query("accounts")
      .withIndex("by_owner_type", (q) =>
        q.eq("ownerId", userId).eq("type", "personal")
      )
      .first();

    if (!personalAccount) {
      throw new Error("Personal account not found");
    }

    // Check if user has enough balance
    if ((personalAccount.balance || 0) < upgrade.price) {
      throw new Error("Insufficient balance");
    }

    // Get or create system account
    let systemAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", "System"))
      .first();

    if (!systemAccount) {
      // Create system account if it doesn't exist
      const systemUserId = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("tokenIdentifier"), "system"))
        .first();

      if (!systemUserId) {
        throw new Error("System user not found");
      }

      const systemAccountId = await ctx.db.insert("accounts", {
        name: "System",
        type: "personal",
        ownerId: systemUserId._id,
        balance: 0,
        createdAt: Date.now(),
      });

      systemAccount = await ctx.db.get(systemAccountId);
    }

    if (!systemAccount) {
      throw new Error("System account could not be created");
    }

    // Deduct the price from user's account
    await ctx.db.patch(personalAccount._id, {
      balance: (personalAccount.balance || 0) - upgrade.price,
    });

    // Add to system account
    await ctx.db.patch(systemAccount._id, {
      balance: (systemAccount.balance || 0) + upgrade.price,
    });

    // Record the transaction in ledger
    await ctx.db.insert("ledger", {
      fromAccountId: personalAccount._id,
      toAccountId: systemAccount._id,
      amount: upgrade.price,
      type: "transfer",
      description: `Purchase: ${upgrade.name}`,
      createdAt: Date.now(),
    });

    // Create user upgrade record
    const userUpgradeId = await ctx.db.insert("userUpgrades", {
      userId,
      upgradeId: args.upgradeId,
      purchasePrice: upgrade.price,
      isUsed: false,
      purchasedAt: Date.now(),
    });

    return {
      success: true,
      userUpgradeId,
      message: `Successfully purchased ${upgrade.name}`,
    };
  },
});

// Use a revenue boost upgrade
export const useRevenueBoost = mutation({
  args: {
    userUpgradeId: v.id("userUpgrades"),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the user upgrade
    const userUpgrade = await ctx.db.get(args.userUpgradeId);
    if (!userUpgrade) {
      throw new Error("User upgrade not found");
    }

    if (userUpgrade.userId !== userId) {
      throw new Error("This upgrade does not belong to you");
    }

    if (userUpgrade.isUsed) {
      throw new Error("This upgrade has already been used");
    }

    // Get the upgrade details
    const upgrade = await ctx.db.get(userUpgrade.upgradeId);
    if (!upgrade || upgrade.type !== "revenue_boost") {
      throw new Error("Invalid upgrade type");
    }

    // Get the company
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Check if user owns this company
    if (company.ownerId !== userId) {
      throw new Error("You can only boost revenue for your own companies");
    }

    // Get all products for this company
    const products = await ctx.db
      .query("products")
      .withIndex("by_company_active", (q) =>
        q.eq("companyId", args.companyId).eq("isActive", true)
      )
      .collect();

    // Apply revenue boost to each product
    let totalRevenueBoost = 0;
    for (const product of products) {
      const currentRevenue = product.totalRevenue || 0;
      const boostAmount = currentRevenue * (upgrade.effectPercentage / 100);
      const newRevenue = currentRevenue + boostAmount;

      await ctx.db.patch(product._id, {
        totalRevenue: newRevenue,
      });

      totalRevenueBoost += boostAmount;
    }

    // Mark the upgrade as used
    await ctx.db.patch(args.userUpgradeId, {
      isUsed: true,
      usedAt: Date.now(),
      targetId: args.companyId,
      targetType: "company",
      effectApplied: totalRevenueBoost,
    });

    return {
      success: true,
      message: `Boosted ${company.name}'s revenue by ${upgrade.effectPercentage}%`,
      totalRevenueBoost,
    };
  },
});

// Use a stock price boost upgrade
export const useStockPriceBoost = mutation({
  args: {
    userUpgradeId: v.id("userUpgrades"),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the user upgrade
    const userUpgrade = await ctx.db.get(args.userUpgradeId);
    if (!userUpgrade) {
      throw new Error("User upgrade not found");
    }

    if (userUpgrade.userId !== userId) {
      throw new Error("This upgrade does not belong to you");
    }

    if (userUpgrade.isUsed) {
      throw new Error("This upgrade has already been used");
    }

    // Get the upgrade details
    const upgrade = await ctx.db.get(userUpgrade.upgradeId);
    if (!upgrade || upgrade.type !== "stock_price_boost") {
      throw new Error("Invalid upgrade type");
    }

    // Get the company
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    if (!company.isPublic) {
      throw new Error("Company must be public to boost stock price");
    }

    // Calculate new share price
    const currentPrice = company.sharePrice;
    const boostAmount = currentPrice * (upgrade.effectPercentage / 100);
    const newPrice = currentPrice + boostAmount;

    // Update company share price
    await ctx.db.patch(args.companyId, {
      sharePrice: newPrice,
    });

    // Record price history
    await ctx.db.insert("stockPriceHistory", {
      companyId: args.companyId,
      price: newPrice,
      marketCap: newPrice * company.totalShares,
      volume: 0,
      timestamp: Date.now(),
    });

    // Mark the upgrade as used
    await ctx.db.patch(args.userUpgradeId, {
      isUsed: true,
      usedAt: Date.now(),
      targetId: args.companyId,
      targetType: "company",
      effectApplied: boostAmount,
    });

    return {
      success: true,
      message: `Boosted ${company.name}'s stock price by ${upgrade.effectPercentage}%`,
      oldPrice: currentPrice,
      newPrice,
      boostAmount,
    };
  },
});

// Use a stock price lower upgrade
export const useStockPriceLower = mutation({
  args: {
    userUpgradeId: v.id("userUpgrades"),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the user upgrade
    const userUpgrade = await ctx.db.get(args.userUpgradeId);
    if (!userUpgrade) {
      throw new Error("User upgrade not found");
    }

    if (userUpgrade.userId !== userId) {
      throw new Error("This upgrade does not belong to you");
    }

    if (userUpgrade.isUsed) {
      throw new Error("This upgrade has already been used");
    }

    // Get the upgrade details
    const upgrade = await ctx.db.get(userUpgrade.upgradeId);
    if (!upgrade || upgrade.type !== "stock_price_lower") {
      throw new Error("Invalid upgrade type");
    }

    // Get the company
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    if (!company.isPublic) {
      throw new Error("Company must be public to lower stock price");
    }

    // Calculate new share price
    const currentPrice = company.sharePrice;
    const lowerAmount = currentPrice * (upgrade.effectPercentage / 100);
    const newPrice = Math.max(0.01, currentPrice - lowerAmount); // Minimum $0.01

    // Update company share price
    await ctx.db.patch(args.companyId, {
      sharePrice: newPrice,
    });

    // Record price history
    await ctx.db.insert("stockPriceHistory", {
      companyId: args.companyId,
      price: newPrice,
      marketCap: newPrice * company.totalShares,
      volume: 0,
      timestamp: Date.now(),
    });

    // Mark the upgrade as used
    await ctx.db.patch(args.userUpgradeId, {
      isUsed: true,
      usedAt: Date.now(),
      targetId: args.companyId,
      targetType: "company",
      effectApplied: lowerAmount,
    });

    return {
      success: true,
      message: `Lowered ${company.name}'s stock price by ${upgrade.effectPercentage}%`,
      oldPrice: currentPrice,
      newPrice,
      lowerAmount,
    };
  },
});
