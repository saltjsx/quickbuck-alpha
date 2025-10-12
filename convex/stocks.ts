import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { calculateFairValue, computeOwnerMetricsFromHoldings } from "./utils/stocks";

async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
    .unique();
  
  return user?._id || null;
}

function calculateNewPrice(
  currentPrice: number,
  sharesTraded: number,
  totalShares: number,
  isBuying: boolean,
  fairValue: number
): number {
  const liquidity = Math.max(totalShares, 1);
  // Calculate actual trade ratio without artificial cap
  const tradeRatio = sharesTraded / liquidity;
  
  // Apply square root dampening to make large trades have proportionally larger impact
  // but prevent extreme price swings
  const dampened = Math.sqrt(tradeRatio) * Math.sign(tradeRatio);
  
  const direction = isBuying ? 1 : -1;
  // Scale the impact based on trade size with better curve
  const rawImpact = direction * dampened * 0.5;
  
  // Dynamic max change based on trade size - larger trades can move price more
  const baseMaxChange = 0.02;
  const tradeMultiplier = Math.min(tradeRatio * 2, 1); // Up to 2x impact for large trades
  const maxChange = baseMaxChange + (tradeMultiplier * 0.03); // Can go up to 5% for very large trades
  const clampedImpact = Math.max(-maxChange, Math.min(maxChange, rawImpact));

  const adjustedPrice = currentPrice * (1 + clampedImpact);

  // Blend with fundamentals to encourage mean reversion
  const blendedPrice = adjustedPrice * 0.6 + fairValue * 0.4;
  let finalPrice = Math.max(0.01, blendedPrice);

  // Ensure trade direction always nudges price the expected way
  if (isBuying && finalPrice <= currentPrice) {
    const guaranteedLift = Math.max(clampedImpact, 0.002);
    finalPrice = currentPrice * (1 + Math.min(guaranteedLift, maxChange));
  } else if (!isBuying && finalPrice >= currentPrice) {
    const guaranteedDrop = Math.min(clampedImpact, -0.002);
    finalPrice = currentPrice * (1 + Math.max(guaranteedDrop, -maxChange));
  }

  if (isBuying) {
    finalPrice = Math.min(finalPrice, currentPrice * (1 + maxChange));
  } else {
    finalPrice = Math.max(finalPrice, currentPrice * (1 - maxChange));
  }

  return Math.max(0.01, finalPrice);
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type AutoPriceContext = {
  currentPrice: number;
  fairValue: number;
  averagePrice: number;
  momentum: number;
  volumeRatio: number;
  directionalFlow: number;
  volatility: number;
  currentSentiment: number;
};

function deriveAutoPrice({
  currentPrice,
  fairValue,
  averagePrice,
  momentum,
  volumeRatio,
  directionalFlow,
  volatility,
  currentSentiment,
}: AutoPriceContext) {
  const baseline = fairValue * 0.55 + averagePrice * 0.45;
  const fundamentalsBias = Math.tanh((baseline - currentPrice) / Math.max(baseline, 0.01));
  const momentumBias = Math.tanh(momentum * 2);
  const liquidityBias = clamp(directionalFlow * 4, -0.4, 0.4);
  const stability = 1 - clamp(volatility * 5, 0, 0.7);
  const noise = (Math.random() - 0.5) * 0.01 * (0.5 + stability);

  let combinedDrift = fundamentalsBias * 0.5 + momentumBias * 0.2 + liquidityBias * 0.2 + noise;
  combinedDrift = clamp(combinedDrift, -0.04, 0.05);

  let blendedPrice = currentPrice * (1 + combinedDrift);
  blendedPrice = blendedPrice * 0.5 + baseline * 0.5;
  blendedPrice *= 1 + volumeRatio * 0.12;

  const protectiveFloor = Math.max(baseline * 0.65, averagePrice * 0.55, 0.05);
  const protectiveCeiling = Math.max(baseline * 1.6, currentPrice * 1.25);
  const newPrice = clamp(blendedPrice, protectiveFloor, protectiveCeiling);

  const sentimentTarget = 1 + fundamentalsBias * 0.25 + momentumBias * 0.15 + liquidityBias * 0.1;
  const sentimentAdjustment = (sentimentTarget - currentSentiment) * 0.35 + noise * 2;
  const nextSentiment = clamp(currentSentiment + sentimentAdjustment, 0.85, 1.2);

  return { newPrice: Math.max(0.05, newPrice), nextSentiment };
}

const PRICE_HISTORY_WINDOW_MS = 12 * 60 * 60 * 1000;
const VOLUME_WINDOW_MS = 6 * 60 * 60 * 1000;
const PRICE_HISTORY_SAMPLES = 24;
const TRANSACTION_SAMPLES = 50;

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
      throw new Error("Cannot purchase more than 1,000,000 shares in a single trade");
    }

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");
    if (!company.isPublic) throw new Error("Company is not publicly traded");
    
    // ANTI-EXPLOIT: Rate limiting - prevent rapid-fire small trades
    const fiveSecondsAgo = Date.now() - (5 * 1000);
    const recentBuys = await ctx.db
      .query("stockTransactions")
      .withIndex("by_company_timestamp", (q) => 
        q.eq("companyId", args.companyId).gt("timestamp", fiveSecondsAgo)
      )
      .filter((q) => q.eq(q.field("transactionType"), "buy"))
      .collect();
    
    const buyerRecentBuys = recentBuys.filter(tx => tx.buyerId === userId);
    if (buyerRecentBuys.length >= 3) {
      throw new Error("Rate limit exceeded: Please wait a few seconds between trades");
    }
    
    // ANTI-EXPLOIT: Minimum trade size relative to total shares
    const minTradeSize = Math.max(1, Math.ceil(company.totalShares * 0.0001)); // 0.01% minimum
    if (args.shares < minTradeSize && company.totalShares > 1000) {
      throw new Error(`Minimum trade size is ${minTradeSize} shares (0.01% of total shares)`);
    }

    const fromAccount = await ctx.db.get(args.fromAccountId);
    if (!fromAccount) throw new Error("Account not found");

    const accountIsCompany = !!fromAccount.companyId;
    const buyerPreference = args.buyerType ?? (accountIsCompany ? "company" : "user");

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
        throw new Error("Companies cannot buy back their own shares through the public market");
      }
    } else {
      if (buyerPreference === "company") {
        throw new Error("Selected account is not associated with a company");
      }

      buyerType = "user";
      buyerId = userId;

      if (company.ownerId === buyerId) {
        throw new Error("Company owners already control their equity and cannot buy their own stock");
      }
    }

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

    // Record transaction in ledger (for record-keeping)
    await ctx.db.insert("ledger", {
      fromAccountId: args.fromAccountId,
      toAccountId: company.accountId,
      amount: totalCost,
      type: "stock_purchase",
      description: `Purchase of ${args.shares} shares of ${company.ticker}`,
      createdAt: Date.now(),
    });

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

    const holding = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder_holderType", (q) =>
        q.eq("companyId", args.companyId).eq("holderId", buyerId).eq("holderType", buyerType)
      )
      .first();

    if (holding) {
      if (holding.shares + args.shares > 1_000_000) {
        throw new Error("Holding limit exceeded: cannot own more than 1,000,000 shares of a single company");
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

    // Calculate fair value based on fundamentals
    const marketSentiment = company.marketSentiment ?? 1.0;
    const fairValue = calculateFairValue({
      company,
      cashBalance: companyBalance + totalCost,
      sentimentOverride: marketSentiment,
    });
    
    const newPrice = calculateNewPrice(
      company.sharePrice,
      args.shares,
      Math.max(company.totalShares, 1),
      true,
      fairValue
    );

    await ctx.db.patch(args.companyId, {
      sharePrice: newPrice,
    });

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
      priceChangePercent: ((newPrice - company.sharePrice) / company.sharePrice) * 100
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
    
    // ANTI-EXPLOIT: Rate limiting - prevent rapid-fire small trades
    // Check recent transactions from this user/company for this stock
    const fiveSecondsAgo = Date.now() - (5 * 1000);
    const recentSells = await ctx.db
      .query("stockTransactions")
      .withIndex("by_company_timestamp", (q) => 
        q.eq("companyId", args.companyId).gt("timestamp", fiveSecondsAgo)
      )
      .filter((q) => q.eq(q.field("transactionType"), "sell"))
      .collect();
    
    // Check if this seller has made recent sells
    const sellerRecentSells = recentSells.filter(tx => tx.buyerId === userId);
    if (sellerRecentSells.length >= 3) {
      throw new Error("Rate limit exceeded: Please wait a few seconds between trades");
    }
    
    // ANTI-EXPLOIT: Minimum trade size relative to total shares
    // Prevent microtrading to manipulate prices
    const minTradeSize = Math.max(1, Math.ceil(company.totalShares * 0.0001)); // 0.01% minimum
    if (args.shares < minTradeSize && company.totalShares > 1000) {
      throw new Error(`Minimum trade size is ${minTradeSize} shares (0.01% of total shares)`);
    }

    const toAccount = await ctx.db.get(args.toAccountId);
    if (!toAccount) throw new Error("Destination account not found");

    const accountIsCompany = !!toAccount.companyId;
    const sellerPreference = args.sellerType ?? (accountIsCompany ? "company" : "user");

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

    // OPTIMIZED: Use compound index to avoid filter after withIndex
    const holding = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder_holderType", (q) =>
        q.eq("companyId", args.companyId).eq("holderId", sellerId).eq("holderType", sellerType)
      )
      .first();

    if (!holding || holding.shares < args.shares) {
      throw new Error("Insufficient shares");
    }

    // Get company account and balance for fair value calculation
    const companyAccount = await ctx.db.get(company.accountId);
    if (!companyAccount) throw new Error("Company account not found");
    const companyBalance = companyAccount.balance ?? 0;
    
    // Calculate fair value based on fundamentals
    const marketSentiment = company.marketSentiment ?? 1.0;
    const fairValue = calculateFairValue({
      company,
      cashBalance: Math.max(companyBalance, 0),
      sentimentOverride: marketSentiment,
    });
    
    const newPrice = calculateNewPrice(
      company.sharePrice,
      args.shares,
      Math.max(company.totalShares, 1),
      false,
      fairValue
    );

    const proceeds = args.shares * newPrice;

    if (companyBalance < proceeds) {
      throw new Error("Company does not have enough liquidity to complete this sale");
    }

    // Get cached balances
    const toBalance = toAccount.balance ?? 0;

    // Update company balance
    await ctx.db.patch(company.accountId, {
      balance: companyBalance - proceeds,
    });

    // Update seller balance
    await ctx.db.patch(args.toAccountId, {
      balance: toBalance + proceeds,
    });

    // Record transaction in ledger (for record-keeping)
    await ctx.db.insert("ledger", {
      fromAccountId: company.accountId,
      toAccountId: args.toAccountId,
      amount: proceeds,
      type: "stock_sale",
      description: `Sale of ${args.shares} shares of ${company.ticker}`,
      createdAt: Date.now(),
    });

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

    const newShares = holding.shares - args.shares;
    if (newShares === 0) {
      await ctx.db.delete(holding._id);
    } else {
      await ctx.db.patch(holding._id, {
        shares: newShares,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.companyId, {
      sharePrice: newPrice,
    });

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
      priceChangePercent: ((newPrice - company.sharePrice) / company.sharePrice) * 100
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
    fromHolderType: v.optional(v.union(v.literal("user"), v.literal("company"))),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (args.shares <= 0) throw new Error("Invalid share amount");

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Determine the actual holder (default to current user if not specified)
    const fromHolderId = args.fromHolderId || userId;
    const fromHolderType = args.fromHolderType || "user";

    // Check if user has permission to transfer from this holder
    if (fromHolderType === "company") {
      // User must have access to the company to transfer its stocks
      const access = await ctx.db
        .query("companyAccess")
        .withIndex("by_company_user", (q) =>
          q.eq("companyId", fromHolderId as any).eq("userId", userId)
        )
        .first();

      if (!access) {
        throw new Error("You don't have permission to transfer stocks from this company");
      }
    } else if (fromHolderId !== userId) {
      // Can't transfer from another user's account
      throw new Error("You can only transfer your own stocks");
    }

    const holding = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder_holderType", (q) =>
        q.eq("companyId", args.companyId).eq("holderId", fromHolderId).eq("holderType", fromHolderType)
      )
      .first();

    if (!holding || holding.shares < args.shares) {
      throw new Error("Insufficient shares");
    }

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

    const newShares = holding.shares - args.shares;
    if (newShares === 0) {
      await ctx.db.delete(holding._id);
    } else {
      await ctx.db.patch(holding._id, {
        shares: newShares,
        updatedAt: Date.now(),
      });
    }

    const receiverHolding = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder_holderType", (q) =>
        q.eq("companyId", args.companyId).eq("holderId", args.toId).eq("holderType", args.toType)
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

export const getPortfolio = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    // BANDWIDTH OPTIMIZATION: Limit holdings to 100 per user
    // OPTIMIZED: Use compound index to avoid filter after withIndex
    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_holder_holderType", (q) => q.eq("holderId", userId).eq("holderType", "user"))
      .take(100);

    // BANDWIDTH OPTIMIZATION: Batch fetch all companies
    const companyIds = [...new Set(holdings.map(h => h.companyId))];
    const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));
    const companyMap = new Map();
    companies.forEach((company: any) => {
      if (company) {
        companyMap.set(company._id, company);
      }
    });

    // BANDWIDTH OPTIMIZATION: Skip 24h price history for portfolio listing
    // Can be fetched separately when viewing individual stock details
    const portfolio = holdings.map((holding) => {
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
    }).filter(Boolean);

    return portfolio;
  },
});

// Get portfolios for all companies the user has access to
export const getCompanyPortfolios = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    // BANDWIDTH OPTIMIZATION: Reduced from 50 to 20 companies
    const companyAccess = await ctx.db
      .query("companyAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(20);

    const companyIds = companyAccess.map(a => a.companyId);
    const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));
    const validCompanies = companies.filter(Boolean) as any[];

    // BANDWIDTH OPTIMIZATION: Limit holdings per company to 50
    const allCompanyHoldings = await Promise.all(
      validCompanies.map(company =>
        ctx.db
          .query("stocks")
          .withIndex("by_holder_holderType", (q) => q.eq("holderId", company._id).eq("holderType", "company"))
          .take(50)
      )
    );

    // Get unique stock companies
    const stockCompanyIds = [...new Set(allCompanyHoldings.flat().map(h => h.companyId))];
    const stockCompanies = await Promise.all(stockCompanyIds.map(id => ctx.db.get(id)));
    const stockCompanyMap = new Map();
    stockCompanies.forEach((company: any) => {
      if (company) {
        stockCompanyMap.set(company._id, company);
      }
    });

    // Build portfolio structure
    const companyPortfolios = validCompanies.map((company, index) => {
      const holdings = allCompanyHoldings[index];
      const enrichedHoldings = holdings.map((holding: any) => {
        const stockCompany = stockCompanyMap.get(holding.companyId);
        if (!stockCompany) return null;

        const currentValue = holding.shares * stockCompany.sharePrice;
        const costBasis = holding.shares * holding.averagePurchasePrice;
        const gainLoss = currentValue - costBasis;
        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

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
      }).filter(Boolean);

      return {
        companyId: company._id,
        companyName: company.name,
        companyTicker: company.ticker,
        holdings: enrichedHoldings,
      };
    }).filter(c => c.holdings.length > 0); // Only return companies with stock holdings

    return companyPortfolios;
  },
});

export const getHolderPortfolio = query({
  args: { holderId: v.union(v.id("users"), v.id("companies")), holderType: v.union(v.literal("user"), v.literal("company")) },
  handler: async (ctx, args) => {
    // BANDWIDTH OPTIMIZATION: Limit holdings to 100
    // OPTIMIZED: Use compound index to avoid filter after withIndex
    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_holder_holderType", (q) => q.eq("holderId", args.holderId).eq("holderType", args.holderType))
      .take(100);

    // BANDWIDTH OPTIMIZATION: Batch fetch companies and skip price history
    const companyIds = [...new Set(holdings.map(h => h.companyId))];
    const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));
    const companyMap = new Map();
    companies.forEach((company: any) => {
      if (company) {
        companyMap.set(company._id, company);
      }
    });

    const portfolio = holdings.map((holding) => {
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
    }).filter(Boolean);

    return portfolio;
  },
});

export const getCompanyShareholders = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // BANDWIDTH OPTIMIZATION: Limit to top 100 shareholders
    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(100);

  const ownershipSnapshot = computeOwnerMetricsFromHoldings(company, holdings, company.ownerId);
  const totalHeldShares = holdings.reduce((sum, h) => sum + h.shares, 0);

    // BANDWIDTH OPTIMIZATION: Batch fetch all holders
    const userIds = holdings.filter(h => h.holderType === "user").map(h => h.holderId);
    const companyIds = holdings.filter(h => h.holderType === "company").map(h => h.holderId);
    
    const users = await Promise.all(userIds.map(id => ctx.db.get(id as any)));
    const companies = await Promise.all(companyIds.map(id => ctx.db.get(id as any)));
    
    const userMap = new Map();
    users.forEach((user: any, index) => {
      if (user) {
        userMap.set(userIds[index], user.name || user.username || "Unknown User");
      }
    });
    
    const companyMapLocal = new Map();
    companies.forEach((comp: any, index) => {
      if (comp) {
        companyMapLocal.set(companyIds[index], comp.name || "Unknown Company");
      }
    });

    const shareholders = holdings.map((holding) => {
      const name = holding.holderType === "user" 
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
      shareholders: shareholders.sort((a, b) => b.ownershipPercent - a.ownershipPercent),
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
    timeRange: v.optional(v.string()) // "1h", "6h", "24h", "7d", "30d", "all"
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Get balance from cached account balance
    const account = await ctx.db.get(company.accountId);
    const balance = account?.balance ?? 0;

    // Calculate time range
    const now = Date.now();
    let startTime = 0;
    const timeRange = args.timeRange || "7d";
    
    switch (timeRange) {
      case "1h":
        startTime = now - (60 * 60 * 1000);
        break;
      case "6h":
        startTime = now - (6 * 60 * 60 * 1000);
        break;
      case "24h":
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        // OPTIMIZED: Limit "all" to last 90 days instead of truly all
        startTime = now - (90 * 24 * 60 * 60 * 1000);
        break;
    }

    const priceHistory = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_company_timestamp", (q) =>
        q.eq("companyId", args.companyId).gt("timestamp", startTime)
      )
      .order("asc")
      .collect();
    
    // BANDWIDTH OPTIMIZATION: Sample down large history datasets
    let sampledHistory = priceHistory;
    if (priceHistory.length > 100) {
      const step = Math.ceil(priceHistory.length / 100);
      sampledHistory = priceHistory.filter((_, index) => index % step === 0);
    }

    // OPTIMIZED: Only get last 50 transactions instead of all
    // OPTIMIZED: Use compound index for efficient time-ordered queries
    const recentTransactions = await ctx.db
      .query("stockTransactions")
      .withIndex("by_company_timestamp", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(50);

    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const priceOneDayAgo = sampledHistory.find(p => p.timestamp >= oneDayAgo)?.price ?? company.sharePrice;
    const priceChange24h = company.sharePrice - priceOneDayAgo;
    const priceChangePercent24h = priceOneDayAgo !== 0 ? (priceChange24h / priceOneDayAgo) * 100 : 0;

    const highPrice = sampledHistory.length > 0
      ? Math.max(...sampledHistory.map(p => p.price))
      : company.sharePrice;
    const lowPrice = sampledHistory.length > 0
      ? Math.min(...sampledHistory.map(p => p.price))
      : company.sharePrice;

    const totalVolume = sampledHistory
      .filter(p => p.timestamp >= oneDayAgo)
      .reduce((sum, p) => sum + (p.volume || 0), 0);
    
    // BANDWIDTH OPTIMIZATION: Limit holdings to 100
    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
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
    // BANDWIDTH OPTIMIZATION: Limit to top 50 public companies by market cap
    const publicCompanies = await ctx.db
      .query("companies")
      .withIndex("by_public_sharePrice", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(50);

    // OPTIMIZED: Only fetch last 2 hours of history for chart (reduced from 24h)
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    // Get recent price history for chart display (last 2 hours)
    const allRecentHistory = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", twoHoursAgo))
      .order("asc")
      .collect();
    
    // Get single price point from 24h ago for price change calculation
    const allDayAgoHistory = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", oneDayAgo))
      .order("asc")
      .take(100); // Just need first entry per company

    // Group by company
    const recentHistoryByCompany = new Map<string, any[]>();
    const dayAgoHistoryByCompany = new Map<string, any>();
    
    allRecentHistory.forEach(entry => {
      const arr = recentHistoryByCompany.get(entry.companyId) || [];
      arr.push(entry);
      recentHistoryByCompany.set(entry.companyId, arr);
    });

    allDayAgoHistory.forEach(entry => {
      if (!dayAgoHistoryByCompany.has(entry.companyId)) {
        dayAgoHistoryByCompany.set(entry.companyId, entry);
      }
    });

    // Sort recent history
    for (const [, entries] of recentHistoryByCompany) {
      entries.sort((a, b) => a.timestamp - b.timestamp);
      // BANDWIDTH OPTIMIZATION: Sample down to max 20 points per chart
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

    const stocks = publicCompanies.map(company => {
      const recentHistory = recentHistoryByCompany.get(company._id) || [];
      const chartHistory = recentHistory.length > 0
        ? recentHistory.map(entry => ({
            price: entry.price,
            timestamp: entry.timestamp,
          }))
        : [{ price: company.sharePrice, timestamp: Date.now() }];
      
      const dayAgoEntry = dayAgoHistoryByCompany.get(company._id);
      const oldPrice = dayAgoEntry?.price || company.sharePrice;
      const priceChange24h = company.sharePrice - oldPrice;
      const priceChangePercent24h = oldPrice !== 0 ? (priceChange24h / oldPrice) * 100 : 0;

      const marketCap = company.sharePrice * company.totalShares;

      return {
        _id: company._id,
        name: company.name,
        ticker: company.ticker,
        logoUrl: company.logoUrl,
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

export const updateStockPrices = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const priceWindowStart = now - PRICE_HISTORY_WINDOW_MS;
    const volumeWindowStart = now - VOLUME_WINDOW_MS;

    const publicCompanies = await ctx.db
      .query("companies")
      .withIndex("by_public_sharePrice", (q) => q.eq("isPublic", true))
      .collect();

    if (publicCompanies.length === 0) {
      return { updated: 0 };
    }

    const accountIds = publicCompanies.map((company) => company.accountId);
    const accounts = await Promise.all(accountIds.map((id) => ctx.db.get(id)));

    const balanceMap = new Map<string, number>();
    accounts.forEach((account: any) => {
      if (account) {
        balanceMap.set(account._id, account.balance ?? 0);
      }
    });

    for (const company of publicCompanies) {
      const companyBalance = balanceMap.get(company.accountId) ?? 0;
      const currentSentiment = clamp(company.marketSentiment ?? 1.0, 0.85, 1.2);

      const priceHistory = await ctx.db
        .query("stockPriceHistory")
        .withIndex("by_company_timestamp", (q) =>
          q.eq("companyId", company._id).gt("timestamp", priceWindowStart)
        )
        .order("desc")
        .take(PRICE_HISTORY_SAMPLES);

      const priceSeries = [
        { price: company.sharePrice, timestamp: now },
        ...priceHistory.map((entry) => ({ price: entry.price, timestamp: entry.timestamp })),
      ];

      const averagePrice =
        priceSeries.reduce((sum, entry) => sum + entry.price, 0) /
        Math.max(priceSeries.length, 1);

      const lookbackIndex = Math.min(priceSeries.length - 1, 6);
      const lookbackSample = lookbackIndex >= 0 ? priceSeries[lookbackIndex] : undefined;
      const momentum = lookbackSample
        ? (company.sharePrice - lookbackSample.price) / Math.max(lookbackSample.price, 0.01)
        : 0;

      let volatility = 0;
      if (priceSeries.length > 1) {
        const returns: number[] = [];
        for (let i = 0; i < priceSeries.length - 1; i++) {
          const nextPrice = priceSeries[i + 1].price;
          if (nextPrice > 0) {
            returns.push((priceSeries[i].price - nextPrice) / nextPrice);
          }
        }
        if (returns.length > 0) {
          const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
          const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
            returns.length;
          volatility = Math.sqrt(variance);
        }
      }

      const recentTransactions = await ctx.db
        .query("stockTransactions")
        .withIndex("by_company_timestamp", (q) =>
          q.eq("companyId", company._id).gt("timestamp", volumeWindowStart)
        )
        .order("desc")
        .take(TRANSACTION_SAMPLES);

      let totalVolume = 0;
      let netFlow = 0;
      for (const tx of recentTransactions) {
        const quantity = Math.max(tx.shares ?? 0, 0);
        totalVolume += quantity;
        if (tx.transactionType === "buy") {
          netFlow += quantity;
        } else if (tx.transactionType === "sell") {
          netFlow -= quantity;
        }
      }

      const liquidity = Math.max(company.totalShares, 1);
      const volumeRatio = clamp(totalVolume / liquidity, 0, 0.2);
      const directionalFlow = clamp(netFlow / liquidity, -0.1, 0.1);

      const fairValue = calculateFairValue({
        company,
        cashBalance: companyBalance,
        sentimentOverride: currentSentiment,
      });

      const { newPrice, nextSentiment } = deriveAutoPrice({
        currentPrice: company.sharePrice,
        fairValue,
        averagePrice,
        momentum,
        volumeRatio,
        directionalFlow,
        volatility,
        currentSentiment,
      });

      await ctx.db.patch(company._id, {
        sharePrice: newPrice,
        marketSentiment: nextSentiment,
      });

      const marketCap = newPrice * company.totalShares;
      await ctx.db.insert("stockPriceHistory", {
        companyId: company._id,
        price: newPrice,
        marketCap,
        volume: Math.round(totalVolume),
        timestamp: now,
      });
    }

    return { updated: publicCompanies.length };
  },
});

// OPTIMIZATION: Clean up old stock price history to prevent unbounded growth
export const cleanupOldPriceHistory = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Keep only last 90 days of price history
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    
    // Get old records in a timestamp-ordered batch
    const oldRecords = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", ninetyDaysAgo))
      .order("asc")
      .take(1000);

    // Delete in batches to avoid timeout
    let deleted = 0;
    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
      deleted++;
    }

    return { deleted, remaining: 0 };
  },
});
