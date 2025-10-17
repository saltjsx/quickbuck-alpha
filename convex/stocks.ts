import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { computeOwnerMetricsFromHoldings } from "./utils/stocks";

// ============================================================================
// STOCK PRICING SYSTEM - Balance-Based Model
// ============================================================================
//
// This system uses two primary mechanisms:
//
// 1. AUTOMATIC ADJUSTMENT (Every 10 minutes via cron)
//    - Gradually moves prices toward target based on company balance
//    - Target Price = (Company Balance × 10) / 1,000,000 shares
//    - Adjustment = 3% of the difference between current and target
//
// 2. PLAYER TRADE IMPACT (Immediate)
//    - Price changes instantly when players buy/sell
//    - Impact = (Transaction Value / Market Cap) × Impact Multiplier
//    - Creates short-term volatility around the balance-based baseline
//
// ============================================================================

// Configuration constants
const ADJUSTMENT_FACTOR = 0.03;  // 3% of gap closed per 10-minute update
const IMPACT_MULTIPLIER = 0.15;  // Player trade impact sensitivity

// ============================================================================
// Helper Functions
// ============================================================================

async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) =>
      q.eq("tokenIdentifier", identity.subject)
    )
    .unique();

  return user?._id || null;
}

// Calculate target price based on company balance
// Target = (Balance × 10) / Total Shares
function calculateTargetPrice(balance: number, totalShares: number): number {
  if (totalShares === 0) return 0.01;
  const target = (balance * 10) / totalShares;
  return Math.max(0.01, target);
}

// Calculate immediate price impact from a player trade
function calculatePlayerTradeImpact(
  currentPrice: number,
  sharesTraded: number,
  totalShares: number,
  isBuying: boolean
): number {
  const transactionValue = sharesTraded * currentPrice;
  const totalMarketCap = currentPrice * totalShares;

  if (totalMarketCap === 0) return currentPrice;

  const priceChangePercent =
    (transactionValue / totalMarketCap) * IMPACT_MULTIPLIER;

  let newPrice: number;
  if (isBuying) {
    newPrice = currentPrice * (1 + priceChangePercent);
  } else {
    newPrice = currentPrice * (1 - priceChangePercent);
  }

  return Math.max(0.01, newPrice);
}

// Helper function to calculate total ownership percentage for a holder
async function calculateTotalOwnership(
  ctx: any,
  companyId: any,
  holderId: any,
  holderType: "user" | "company",
  additionalShares: number = 0
): Promise<{
  totalShares: number;
  ownershipPercent: number;
  canProceed: boolean;
}> {
  const company = await ctx.db.get(companyId);
  if (!company) {
    return { totalShares: 0, ownershipPercent: 0, canProceed: false };
  }

  let totalHolderShares = additionalShares;

  if (holderType === "user") {
    // Direct user holdings
    const userHoldings = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder_holderType", (q: any) =>
        q
          .eq("companyId", companyId)
          .eq("holderId", holderId)
          .eq("holderType", "user")
      )
      .collect();

    totalHolderShares += userHoldings.reduce(
      (sum: number, h: any) => sum + h.shares,
      0
    );

    // Check all companies owned by this user
    const userCompanies = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q: any) => q.eq("ownerId", holderId))
      .collect();

    for (const userCompany of userCompanies) {
      const companyHoldings = await ctx.db
        .query("stocks")
        .withIndex("by_company_holder_holderType", (q: any) =>
          q
            .eq("companyId", companyId)
            .eq("holderId", userCompany._id)
            .eq("holderType", "company")
        )
        .collect();

      totalHolderShares += companyHoldings.reduce(
        (sum: number, h: any) => sum + h.shares,
        0
      );
    }
  } else {
    // Company holdings
    const companyHoldings = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder_holderType", (q: any) =>
        q
          .eq("companyId", companyId)
          .eq("holderId", holderId)
          .eq("holderType", "company")
      )
      .collect();

    totalHolderShares += companyHoldings.reduce(
      (sum: number, h: any) => sum + h.shares,
      0
    );

    // Check if this company is owned by someone
    const holderCompany = await ctx.db.get(holderId as any);
    if (holderCompany && "ownerId" in holderCompany) {
      const ownerHoldings = await ctx.db
        .query("stocks")
        .withIndex("by_company_holder_holderType", (q: any) =>
          q
            .eq("companyId", companyId)
            .eq("holderId", holderCompany.ownerId)
            .eq("holderType", "user")
        )
        .collect();

      totalHolderShares += ownerHoldings.reduce(
        (sum: number, h: any) => sum + h.shares,
        0
      );

      // Check other companies owned by the same person
      const siblingCompanies = await ctx.db
        .query("companies")
        .withIndex("by_owner", (q: any) => q.eq("ownerId", holderCompany.ownerId))
        .collect();

      for (const sibling of siblingCompanies) {
        if (sibling._id === holderId) continue;

        const siblingHoldings = await ctx.db
          .query("stocks")
          .withIndex("by_company_holder_holderType", (q: any) =>
            q
              .eq("companyId", companyId)
              .eq("holderId", sibling._id)
              .eq("holderType", "company")
          )
          .collect();

        totalHolderShares += siblingHoldings.reduce(
          (sum: number, h: any) => sum + h.shares,
          0
        );
      }
    }
  }

  const ownershipPercent = (totalHolderShares / company.totalShares) * 100;
  const canProceed = ownershipPercent <= 100;

  return {
    totalShares: totalHolderShares,
    ownershipPercent,
    canProceed,
  };
}

// ============================================================================
// Stock Trading Mutations
// ============================================================================

export const buyStock = mutation({
  args: {
    companyId: v.id("companies"),
    shares: v.number(),
    fromAccountId: v.id("accounts"),
    buyerType: v.optional(v.union(v.literal("user"), v.literal("company"))),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!Number.isInteger(args.shares) || args.shares <= 0) {
      throw new Error("Share amount must be a positive whole number");
    }
    if (args.shares > 1_000_000) {
      throw new Error(
        "Cannot purchase more than 1,000,000 shares in a single trade"
      );
    }

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");
    if (!company.isPublic) throw new Error("Company is not publicly traded");

    // ANTI-EXPLOIT: Rate limiting
    const fiveSecondsAgo = Date.now() - 5 * 1000;
    const recentBuys = await ctx.db
      .query("stockTransactions")
      .withIndex("by_company_timestamp", (q) =>
        q.eq("companyId", args.companyId).gt("timestamp", fiveSecondsAgo)
      )
      .filter((q) => q.eq(q.field("transactionType"), "buy"))
      .collect();

    const buyerRecentBuys = recentBuys.filter((tx) => tx.buyerId === userId);
    if (buyerRecentBuys.length >= 3) {
      throw new Error(
        "Rate limit exceeded: Please wait a few seconds between trades"
      );
    }

    // ANTI-EXPLOIT: Minimum trade size
    const minTradeSize = Math.max(1, Math.ceil(company.totalShares * 0.0001));
    if (args.shares < minTradeSize && company.totalShares > 1000) {
      throw new Error(
        `Minimum trade size is ${minTradeSize} shares (0.01% of total shares)`
      );
    }

    const fromAccount = await ctx.db.get(args.fromAccountId);
    if (!fromAccount) throw new Error("Account not found");

    const accountIsCompany = !!fromAccount.companyId;
    const buyerPreference =
      args.buyerType ?? (accountIsCompany ? "company" : "user");

    let buyerId: any;
    let buyerType: "user" | "company";

    if (accountIsCompany) {
      buyerType = "company";
      buyerId = fromAccount.companyId!;

      const access = await ctx.db
        .query("companyAccess")
        .withIndex("by_company_user", (q) =>
          q.eq("companyId", fromAccount.companyId!).eq("userId", userId)
        )
        .first();
      if (!access) throw new Error("No access to this company");

      if (buyerId === company._id) {
        throw new Error(
          "Companies cannot buy back their own shares through the public market"
        );
      }
    } else {
      if (buyerPreference === "company") {
        throw new Error("Selected account is not associated with a company");
      }

      buyerType = "user";
      buyerId = userId;

      if (company.ownerId === buyerId) {
        throw new Error(
          "Company owners already control their equity and cannot buy their own stock"
        );
      }
    }

    // ANTI-EXPLOIT: Check ownership cap
    const ownershipCheck = await calculateTotalOwnership(
      ctx,
      args.companyId,
      buyerType === "user" ? userId : fromAccount.companyId!,
      buyerType,
      args.shares
    );

    if (!ownershipCheck.canProceed) {
      throw new Error(
        `Cannot complete purchase: This would result in ${ownershipCheck.ownershipPercent.toFixed(
          2
        )}% ` +
          `total ownership across all your accounts. Maximum allowed is 100%.`
      );
    }

    // Calculate costs
    const totalCost = args.shares * company.sharePrice;
    const fromBalance = fromAccount.balance ?? 0;

    if (fromBalance < totalCost) throw new Error("Insufficient funds");

    // Get company account
    const companyAccount = await ctx.db.get(company.accountId);
    if (!companyAccount) throw new Error("Company account not found");

    const companyBalance = companyAccount.balance ?? 0;

    // Update buyer balance
    await ctx.db.patch(args.fromAccountId, {
      balance: fromBalance - totalCost,
    });

    // Update company balance
    await ctx.db.patch(company.accountId, {
      balance: companyBalance + totalCost,
    });

    // Record transaction in ledger
    await ctx.db.insert("ledger", {
      fromAccountId: args.fromAccountId,
      toAccountId: company.accountId,
      amount: totalCost,
      type: "stock_purchase",
      description: `Purchase of ${args.shares} shares of ${company.ticker}`,
      createdAt: Date.now(),
    });

    // Record stock transaction
    await ctx.db.insert("stockTransactions", {
      companyId: args.companyId,
      buyerId,
      buyerType,
      shares: args.shares,
      pricePerShare: company.sharePrice,
      totalAmount: totalCost,
      transactionType: "buy",
      timestamp: Date.now(),
    });

    // Update or create holding
    const holding = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder_holderType", (q: any) =>
        q
          .eq("companyId", args.companyId)
          .eq("holderId", buyerId)
          .eq("holderType", buyerType)
      )
      .first();

    if (holding) {
      if (holding.shares + args.shares > 1_000_000) {
        throw new Error(
          "Holding limit exceeded: cannot own more than 1,000,000 shares of a single company"
        );
      }
      const newTotalShares = holding.shares + args.shares;
      const newAveragePrice =
        (holding.shares * holding.averagePurchasePrice + totalCost) /
        newTotalShares;

      await ctx.db.patch(holding._id, {
        shares: newTotalShares,
        averagePurchasePrice: newAveragePrice,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("stocks", {
        companyId: args.companyId,
        holderId: buyerId,
        holderType: buyerType,
        shares: args.shares,
        averagePurchasePrice: company.sharePrice,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // PLAYER IMPACT: Calculate new price based on this trade
    const newPrice = calculatePlayerTradeImpact(
      company.sharePrice,
      args.shares,
      company.totalShares,
      true
    );

    await ctx.db.patch(args.companyId, {
      sharePrice: newPrice,
    });

    // Record price history
    await ctx.db.insert("stockPriceHistory", {
      companyId: args.companyId,
      price: newPrice,
      marketCap: newPrice * company.totalShares,
      volume: args.shares,
      timestamp: Date.now(),
    });

    return {
      success: true,
      totalCost,
      oldPrice: company.sharePrice,
      newPrice,
      priceChange: newPrice - company.sharePrice,
      priceChangePercent:
        ((newPrice - company.sharePrice) / company.sharePrice) * 100,
    };
  },
});

export const sellStock = mutation({
  args: {
    companyId: v.id("companies"),
    shares: v.number(),
    toAccountId: v.id("accounts"),
    sellerType: v.optional(v.union(v.literal("user"), v.literal("company"))),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!Number.isInteger(args.shares) || args.shares <= 0) {
      throw new Error("Share amount must be a positive whole number");
    }

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // ANTI-EXPLOIT: Rate limiting
    const fiveSecondsAgo = Date.now() - 5 * 1000;
    const recentSells = await ctx.db
      .query("stockTransactions")
      .withIndex("by_company_timestamp", (q) =>
        q.eq("companyId", args.companyId).gt("timestamp", fiveSecondsAgo)
      )
      .filter((q) => q.eq(q.field("transactionType"), "sell"))
      .collect();

    const sellerRecentSells = recentSells.filter((tx) => tx.buyerId === userId);
    if (sellerRecentSells.length >= 3) {
      throw new Error(
        "Rate limit exceeded: Please wait a few seconds between trades"
      );
    }

    // ANTI-EXPLOIT: Minimum trade size
    const minTradeSize = Math.max(1, Math.ceil(company.totalShares * 0.0001));
    if (args.shares < minTradeSize && company.totalShares > 1000) {
      throw new Error(
        `Minimum trade size is ${minTradeSize} shares (0.01% of total shares)`
      );
    }

    const toAccount = await ctx.db.get(args.toAccountId);
    if (!toAccount) throw new Error("Destination account not found");

    const accountIsCompany = !!toAccount.companyId;
    const sellerPreference =
      args.sellerType ?? (accountIsCompany ? "company" : "user");

    let sellerId: any;
    let sellerType: "user" | "company";

    if (accountIsCompany) {
      sellerType = "company";
      sellerId = toAccount.companyId!;

      const access = await ctx.db
        .query("companyAccess")
        .withIndex("by_company_user", (q) =>
          q.eq("companyId", toAccount.companyId!).eq("userId", userId)
        )
        .first();
      if (!access) throw new Error("No access to this company");
    } else {
      if (sellerPreference === "company") {
        throw new Error("Selected account is not associated with a company");
      }

      sellerType = "user";
      sellerId = userId;
    }

    // Get holding
    const holding = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder_holderType", (q: any) =>
        q
          .eq("companyId", args.companyId)
          .eq("holderId", sellerId)
          .eq("holderType", sellerType)
      )
      .first();

    if (!holding || holding.shares < args.shares) {
      throw new Error("Insufficient shares");
    }

    // Get company account
    const companyAccount = await ctx.db.get(company.accountId);
    if (!companyAccount) throw new Error("Company account not found");
    const companyBalance = companyAccount.balance ?? 0;

    // PLAYER IMPACT: Calculate new price based on this sale
    const newPrice = calculatePlayerTradeImpact(
      company.sharePrice,
      args.shares,
      company.totalShares,
      false
    );

    const proceeds = args.shares * newPrice;

    const toBalance = toAccount.balance ?? 0;

    // Update company balance (can go negative/into debt)
    await ctx.db.patch(company.accountId, {
      balance: companyBalance - proceeds,
    });

    // Update seller balance
    await ctx.db.patch(args.toAccountId, {
      balance: toBalance + proceeds,
    });

    // Record transaction in ledger
    await ctx.db.insert("ledger", {
      fromAccountId: company.accountId,
      toAccountId: args.toAccountId,
      amount: proceeds,
      type: "stock_sale",
      description: `Sale of ${args.shares} shares of ${company.ticker}`,
      createdAt: Date.now(),
    });

    // Record stock transaction
    await ctx.db.insert("stockTransactions", {
      companyId: args.companyId,
      buyerId: sellerId,
      buyerType: sellerType,
      shares: args.shares,
      pricePerShare: newPrice,
      totalAmount: proceeds,
      transactionType: "sell",
      timestamp: Date.now(),
    });

    // Update holding
    const newShares = holding.shares - args.shares;
    if (newShares === 0) {
      await ctx.db.delete(holding._id);
    } else {
      await ctx.db.patch(holding._id, {
        shares: newShares,
        updatedAt: Date.now(),
      });
    }

    // Update price
    await ctx.db.patch(args.companyId, {
      sharePrice: newPrice,
    });

    // Record price history
    await ctx.db.insert("stockPriceHistory", {
      companyId: args.companyId,
      price: newPrice,
      marketCap: newPrice * company.totalShares,
      volume: args.shares,
      timestamp: Date.now(),
    });

    return {
      success: true,
      proceeds,
      oldPrice: company.sharePrice,
      newPrice,
      priceChange: newPrice - company.sharePrice,
      priceChangePercent:
        ((newPrice - company.sharePrice) / company.sharePrice) * 100,
    };
  },
});

export const transferStock = mutation({
  args: {
    companyId: v.id("companies"),
    shares: v.number(),
    toId: v.union(v.id("users"), v.id("companies")),
    toType: v.union(v.literal("user"), v.literal("company")),
    fromHolderId: v.optional(v.union(v.id("users"), v.id("companies"))),
    fromHolderType: v.optional(
      v.union(v.literal("user"), v.literal("company"))
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (args.shares <= 0) throw new Error("Invalid share amount");

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const fromHolderId = args.fromHolderId || userId;
    const fromHolderType = args.fromHolderType || "user";

    // Check permissions
    if (fromHolderType === "company") {
      const access = await ctx.db
        .query("companyAccess")
        .withIndex("by_company_user", (q) =>
          q.eq("companyId", fromHolderId as any).eq("userId", userId)
        )
        .first();

      if (!access) {
        throw new Error(
          "You don't have permission to transfer stocks from this company"
        );
      }
    } else if (fromHolderId !== userId) {
      throw new Error("You can only transfer your own stocks");
    }

    const holding = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder_holderType", (q: any) =>
        q
          .eq("companyId", args.companyId)
          .eq("holderId", fromHolderId)
          .eq("holderType", fromHolderType)
      )
      .first();

    if (!holding || holding.shares < args.shares) {
      throw new Error("Insufficient shares");
    }

    // ANTI-EXPLOIT: Check receiver ownership cap
    const receiverOwnershipCheck = await calculateTotalOwnership(
      ctx,
      args.companyId,
      args.toId,
      args.toType,
      args.shares
    );

    if (!receiverOwnershipCheck.canProceed) {
      throw new Error(
        `Cannot complete transfer: The receiver would have ${receiverOwnershipCheck.ownershipPercent.toFixed(
          2
        )}% ` +
          `total ownership across all their accounts. Maximum allowed is 100%.`
      );
    }

    // Record transaction
    await ctx.db.insert("stockTransactions", {
      companyId: args.companyId,
      buyerId: args.toId,
      buyerType: args.toType,
      shares: args.shares,
      pricePerShare: company.sharePrice,
      totalAmount: args.shares * company.sharePrice,
      transactionType: "transfer",
      fromId: fromHolderId,
      toId: args.toId,
      timestamp: Date.now(),
    });

    // Update sender holding
    const newShares = holding.shares - args.shares;
    if (newShares === 0) {
      await ctx.db.delete(holding._id);
    } else {
      await ctx.db.patch(holding._id, {
        shares: newShares,
        updatedAt: Date.now(),
      });
    }

    // Update receiver holding
    const receiverHolding = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder_holderType", (q: any) =>
        q
          .eq("companyId", args.companyId)
          .eq("holderId", args.toId)
          .eq("holderType", args.toType)
      )
      .first();

    if (receiverHolding) {
      await ctx.db.patch(receiverHolding._id, {
        shares: receiverHolding.shares + args.shares,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("stocks", {
        companyId: args.companyId,
        holderId: args.toId,
        holderType: args.toType,
        shares: args.shares,
        averagePurchasePrice: company.sharePrice,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// ============================================================================
// Stock Query Functions
// ============================================================================

export const getPortfolio = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_holder_holderType", (q: any) =>
        q.eq("holderId", userId).eq("holderType", "user")
      )
      .take(100);

    const companyIds = [...new Set(holdings.map((h) => h.companyId))];
    const companies = await Promise.all(companyIds.map((id) => ctx.db.get(id)));
    const companyMap = new Map();
    companies.forEach((company: any) => {
      if (company) {
        companyMap.set(company._id, company);
      }
    });

    const portfolio = holdings
      .map((holding) => {
        const company = companyMap.get(holding.companyId);
        if (!company) return null;

        const currentValue = holding.shares * company.sharePrice;
        const costBasis = holding.shares * holding.averagePurchasePrice;
        const gainLoss = currentValue - costBasis;
        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

        return {
          ...holding,
          companyName: company.name,
          companyTicker: company.ticker,
          companyLogoUrl: company.logoUrl,
          currentPrice: company.sharePrice,
          currentValue,
          costBasis,
          gainLoss,
          gainLossPercent,
        };
      })
      .filter(Boolean);

    return portfolio;
  },
});

export const getCompanyPortfolios = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    const companyAccess = await ctx.db
      .query("companyAccess")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .take(20);

    const companyIds = companyAccess.map((a) => a.companyId);
    const companies = await Promise.all(companyIds.map((id) => ctx.db.get(id)));
    const validCompanies = companies.filter(Boolean) as any[];

    const allCompanyHoldings = await Promise.all(
      validCompanies.map((company) =>
        ctx.db
          .query("stocks")
          .withIndex("by_holder_holderType", (q: any) =>
            q.eq("holderId", company._id).eq("holderType", "company")
          )
          .take(50)
      )
    );

    const stockCompanyIds = [
      ...new Set(allCompanyHoldings.flat().map((h) => h.companyId)),
    ];
    const stockCompanies = await Promise.all(
      stockCompanyIds.map((id) => ctx.db.get(id))
    );
    const stockCompanyMap = new Map();
    stockCompanies.forEach((company: any) => {
      if (company) {
        stockCompanyMap.set(company._id, company);
      }
    });

    const companyPortfolios = validCompanies
      .map((company, index) => {
        const holdings = allCompanyHoldings[index];
        const enrichedHoldings = holdings
          .map((holding: any) => {
            const stockCompany = stockCompanyMap.get(holding.companyId);
            if (!stockCompany) return null;

            const currentValue = holding.shares * stockCompany.sharePrice;
            const costBasis = holding.shares * holding.averagePurchasePrice;
            const gainLoss = currentValue - costBasis;
            const gainLossPercent =
              costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

            return {
              ...holding,
              companyName: stockCompany.name,
              companyTicker: stockCompany.ticker,
              companyLogoUrl: stockCompany.logoUrl,
              currentPrice: stockCompany.sharePrice,
              currentValue,
              costBasis,
              gainLoss,
              gainLossPercent,
            };
          })
          .filter(Boolean);

        return {
          companyId: company._id,
          companyName: company.name,
          companyTicker: company.ticker,
          holdings: enrichedHoldings,
        };
      })
      .filter((c) => c.holdings.length > 0);

    return companyPortfolios;
  },
});

export const getHolderPortfolio = query({
  args: {
    holderId: v.union(v.id("users"), v.id("companies")),
    holderType: v.union(v.literal("user"), v.literal("company")),
  },
  handler: async (ctx, args) => {
    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_holder_holderType", (q: any) =>
        q.eq("holderId", args.holderId).eq("holderType", args.holderType)
      )
      .take(100);

    const companyIds = [...new Set(holdings.map((h) => h.companyId))];
    const companies = await Promise.all(companyIds.map((id) => ctx.db.get(id)));
    const companyMap = new Map();
    companies.forEach((company: any) => {
      if (company) {
        companyMap.set(company._id, company);
      }
    });

    const portfolio = holdings
      .map((holding) => {
        const company = companyMap.get(holding.companyId);
        if (!company) return null;

        const currentValue = holding.shares * company.sharePrice;
        const costBasis = holding.shares * holding.averagePurchasePrice;
        const gainLoss = currentValue - costBasis;
        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

        return {
          ...holding,
          companyName: company.name,
          companyTicker: company.ticker,
          companyLogoUrl: company.logoUrl,
          currentPrice: company.sharePrice,
          currentValue,
          costBasis,
          gainLoss,
          gainLossPercent,
        };
      })
      .filter(Boolean);

    return portfolio;
  },
});

export const getCompanyShareholders = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .take(100);

    const ownershipSnapshot = computeOwnerMetricsFromHoldings(
      company,
      holdings,
      company.ownerId
    );
    const totalHeldShares = holdings.reduce((sum, h) => sum + h.shares, 0);

    const userIds = holdings
      .filter((h) => h.holderType === "user")
      .map((h) => h.holderId);
    const companyIds = holdings
      .filter((h) => h.holderType === "company")
      .map((h) => h.holderId);

    const users = await Promise.all(userIds.map((id) => ctx.db.get(id as any)));
    const companies = await Promise.all(
      companyIds.map((id) => ctx.db.get(id as any))
    );

    const userMap = new Map();
    users.forEach((user: any, index) => {
      if (user) {
        userMap.set(
          userIds[index],
          user.name || user.username || "Unknown User"
        );
      }
    });

    const companyMapLocal = new Map();
    companies.forEach((comp: any, index) => {
      if (comp) {
        companyMapLocal.set(companyIds[index], comp.name || "Unknown Company");
      }
    });

    const shareholders = holdings.map((holding) => {
      const name =
        holding.holderType === "user"
          ? userMap.get(holding.holderId) || "Unknown"
          : companyMapLocal.get(holding.holderId) || "Unknown";

      const ownershipPercent = (holding.shares / company.totalShares) * 100;
      const currentValue = holding.shares * company.sharePrice;

      return {
        holderId: holding.holderId,
        holderType: holding.holderType,
        holderName: name,
        shares: holding.shares,
        ownershipPercent,
        currentValue,
        averagePurchasePrice: holding.averagePurchasePrice,
      };
    });

    const founderShares = ownershipSnapshot.ownerShares;
    const founderOwnership = (founderShares / company.totalShares) * 100;

    const founder = await ctx.db.get(company.ownerId);

    return {
      shareholders: shareholders.sort(
        (a, b) => b.ownershipPercent - a.ownershipPercent
      ),
      founderShares,
      founderOwnership,
      founderEquityValue: ownershipSnapshot.ownerEquityValue,
      founderName: founder?.name || "Founder",
      totalShares: company.totalShares,
      sharesOutstanding: totalHeldShares,
      treasuryShares: ownershipSnapshot.treasuryShares,
    };
  },
});

export const getStockDetails = query({
  args: {
    companyId: v.id("companies"),
    timeRange: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const account = await ctx.db.get(company.accountId);
    const balance = account?.balance ?? 0;

    const now = Date.now();
    let startTime = 0;
    const timeRange = args.timeRange || "7d";

    switch (timeRange) {
      case "1h":
        startTime = now - 60 * 60 * 1000;
        break;
      case "6h":
        startTime = now - 6 * 60 * 60 * 1000;
        break;
      case "24h":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "7d":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "all":
      default:
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
    }

    const priceHistory = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_company_timestamp", (q: any) =>
        q.eq("companyId", args.companyId).gt("timestamp", startTime)
      )
      .order("asc")
      .collect();

    let sampledHistory = priceHistory;
    if (priceHistory.length > 100) {
      const step = Math.ceil(priceHistory.length / 100);
      sampledHistory = priceHistory.filter((_, index) => index % step === 0);
    }

    const recentTransactions = await ctx.db
      .query("stockTransactions")
      .withIndex("by_company_timestamp", (q: any) =>
        q.eq("companyId", args.companyId)
      )
      .order("desc")
      .take(50);

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const priceOneDayAgo =
      sampledHistory.find((p) => p.timestamp >= oneDayAgo)?.price ??
      company.sharePrice;
    const priceChange24h = company.sharePrice - priceOneDayAgo;
    const priceChangePercent24h =
      priceOneDayAgo !== 0 ? (priceChange24h / priceOneDayAgo) * 100 : 0;

    const highPrice =
      sampledHistory.length > 0
        ? Math.max(...sampledHistory.map((p) => p.price))
        : company.sharePrice;
    const lowPrice =
      sampledHistory.length > 0
        ? Math.min(...sampledHistory.map((p) => p.price))
        : company.sharePrice;

    const totalVolume = sampledHistory
      .filter((p) => p.timestamp >= oneDayAgo)
      .reduce((sum, p) => sum + (p.volume || 0), 0);

    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .take(100);

    const totalHeldShares = holdings.reduce((sum, h) => sum + h.shares, 0);
    const marketCap = company.sharePrice * company.totalShares;

    const owner = await ctx.db.get(company.ownerId);

    return {
      company: {
        ...company,
        balance,
        ownerName: owner?.name || "Unknown",
      },
      stats: {
        currentPrice: company.sharePrice,
        priceChange24h,
        priceChangePercent24h,
        highPrice,
        lowPrice,
        marketCap,
        totalShares: company.totalShares,
        sharesOutstanding: totalHeldShares,
        volume24h: totalVolume,
      },
      priceHistory: sampledHistory,
      recentTransactions,
    };
  },
});

export const getAllPublicStocks = query({
  args: {},
  handler: async (ctx) => {
    const publicCompanies = await ctx.db
      .query("companies")
      .withIndex("by_public_sharePrice", (q: any) => q.eq("isPublic", true))
      .order("desc")
      .take(50);

    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const allRecentHistory = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_timestamp", (q: any) => q.gt("timestamp", twoHoursAgo))
      .order("asc")
      .collect();

    const allDayAgoHistory = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_timestamp", (q: any) => q.gt("timestamp", oneDayAgo))
      .order("asc")
      .take(100);

    const recentHistoryByCompany = new Map<string, any[]>();
    const dayAgoHistoryByCompany = new Map<string, any>();

    allRecentHistory.forEach((entry) => {
      const arr = recentHistoryByCompany.get(entry.companyId) || [];
      arr.push(entry);
      recentHistoryByCompany.set(entry.companyId, arr);
    });

    allDayAgoHistory.forEach((entry) => {
      if (!dayAgoHistoryByCompany.has(entry.companyId)) {
        dayAgoHistoryByCompany.set(entry.companyId, entry);
      }
    });

    for (const [, entries] of recentHistoryByCompany) {
      entries.sort((a, b) => a.timestamp - b.timestamp);
      if (entries.length > 20) {
        const step = Math.floor(entries.length / 20);
        const sampled = [];
        for (let i = 0; i < entries.length; i += step) {
          sampled.push(entries[i]);
        }
        entries.length = 0;
        entries.push(...sampled);
      }
    }

    const stocks = publicCompanies.map((company) => {
      const recentHistory = recentHistoryByCompany.get(company._id) || [];
      const chartHistory =
        recentHistory.length > 0
          ? recentHistory.map((entry) => ({
              price: entry.price,
              timestamp: entry.timestamp,
            }))
          : [{ price: company.sharePrice, timestamp: Date.now() }];

      const dayAgoEntry = dayAgoHistoryByCompany.get(company._id);
      const oldPrice = dayAgoEntry?.price || company.sharePrice;
      const priceChange24h = company.sharePrice - oldPrice;
      const priceChangePercent24h =
        oldPrice !== 0 ? (priceChange24h / oldPrice) * 100 : 0;

      const marketCap = company.sharePrice * company.totalShares;

      return {
        _id: company._id,
        name: company.name,
        ticker: company.ticker,
        logoUrl: company.logoUrl,
        description: company.description,
        currentPrice: company.sharePrice,
        priceChange24h,
        priceChangePercent24h,
        marketCap,
        priceHistory: chartHistory,
      };
    });

    return stocks.sort((a, b) => b.marketCap - a.marketCap);
  },
});

// ============================================================================
// Automatic Price Updates (Cron)
// ============================================================================

export const updateStockPrices = internalMutation({
  args: {},
  handler: async (ctx) => {
    // AUTOMATIC PRICE ADJUSTMENT: Runs every 10 minutes
    // Gradually moves stock prices toward target based on company balance

    const now = Date.now();

    const publicCompanies = await ctx.db
      .query("companies")
      .withIndex("by_public_sharePrice", (q: any) => q.eq("isPublic", true))
      .collect();

    if (publicCompanies.length === 0) {
      return { updated: 0 };
    }

    // Batch fetch all company accounts
    const accountIds = publicCompanies.map((company) => company.accountId);
    const accounts = await Promise.all(accountIds.map((id) => ctx.db.get(id)));

    const balanceMap = new Map<string, number>();
    accounts.forEach((account: any) => {
      if (account) {
        balanceMap.set(account._id, account.balance ?? 0);
      }
    });

    // Update each company's stock price
    for (const company of publicCompanies) {
      const companyBalance = balanceMap.get(company.accountId) ?? 0;
      const currentPrice = company.sharePrice;

      // Calculate target price: (Balance × 10) / Total Shares
      const targetPrice = calculateTargetPrice(companyBalance, company.totalShares);

      // Calculate adjustment: 3% of the difference
      const priceDifference = targetPrice - currentPrice;
      const adjustment = priceDifference * ADJUSTMENT_FACTOR;
      const newPrice = Math.max(0.01, currentPrice + adjustment);

      // Update price
      await ctx.db.patch(company._id, {
        sharePrice: newPrice,
      });

      // Record in history
      const marketCap = newPrice * company.totalShares;
      await ctx.db.insert("stockPriceHistory", {
        companyId: company._id,
        price: newPrice,
        marketCap,
        volume: 0,
        timestamp: now,
      });
    }

    return { updated: publicCompanies.length };
  },
});

// ============================================================================
// Cleanup
// ============================================================================

export const cleanupOldPriceHistory = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    const oldRecords = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_timestamp", (q: any) => q.lt("timestamp", ninetyDaysAgo))
      .order("asc")
      .take(1000);

    let deleted = 0;
    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
      deleted++;
    }

    return { deleted, remaining: 0 };
  },
});
