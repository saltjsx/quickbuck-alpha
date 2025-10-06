import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

function aggregateToHourly(priceHistory: any[]): any[] {
  if (priceHistory.length === 0) return [];

  const hourlyData: { [key: string]: any[] } = {};

  // Group by hour
  priceHistory.forEach(entry => {
    const date = new Date(entry.timestamp);
    const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
    
    if (!hourlyData[hourKey]) {
      hourlyData[hourKey] = [];
    }
    hourlyData[hourKey].push(entry);
  });

  // Aggregate each hour to get open, high, low, close
  const result = Object.keys(hourlyData)
    .sort()
    .map(hourKey => {
      const entries = hourlyData[hourKey];
      const prices = entries.map(e => e.price);
      const volumes = entries.map(e => e.volume || 0);
      
      return {
        timestamp: new Date(hourKey + ':00').getTime(),
        price: entries[entries.length - 1].price, // Close price
        open: entries[0].price,
        high: Math.max(...prices),
        low: Math.min(...prices),
        volume: volumes.reduce((sum, v) => sum + v, 0),
      };
    });

  return result;
}

async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
    .unique();
  
  return user?._id || null;
}

// Calculate base share price from company fundamentals
function calculateBasePrice(
  companyBalance: number,
  totalShares: number,
  marketSentiment: number = 1.0
): number {
  // Calculate book value per share
  const bookValuePerShare = companyBalance / totalShares;
  
  // Apply a valuation multiplier (similar to P/E or P/B ratios)
  // Companies are typically valued at 3-7x their book value
  // The multiplier varies based on company size and market sentiment
  let valuationMultiplier = 5.0; // Base multiplier
  
  // Adjust multiplier based on company size (larger companies get higher multiples)
  if (companyBalance > 1000000) {
    valuationMultiplier = 7.0;
  } else if (companyBalance > 500000) {
    valuationMultiplier = 6.0;
  } else if (companyBalance > 100000) {
    valuationMultiplier = 5.5;
  } else if (companyBalance < 10000) {
    valuationMultiplier = 3.0;
  }
  
  // Apply market sentiment modifier (-20% to +20%)
  valuationMultiplier *= marketSentiment;
  
  // Calculate fair value
  const fairValue = bookValuePerShare * valuationMultiplier;
  
  return Math.max(0.01, fairValue);
}

function calculateNewPrice(
  currentPrice: number,
  sharesBought: number,
  totalShares: number,
  isBuying: boolean,
  fairValue: number
): number {
  const impactPercentage = (sharesBought / totalShares) * 100;
  let priceChangePercent = 0;

  if (impactPercentage < 1) {
    priceChangePercent = impactPercentage * 0.25;
  } else if (impactPercentage < 5) {
    priceChangePercent = 0.25 + (impactPercentage - 1) * 0.4;
  } else {
    priceChangePercent = 2 + Math.pow(impactPercentage - 5, 1.5) * 0.1;
  }

  priceChangePercent = Math.min(priceChangePercent, 10); // Max 10% change per transaction
  const multiplier = isBuying ? (1 + priceChangePercent / 100) : (1 - priceChangePercent / 100);
  let newPrice = currentPrice * multiplier;

  // Gradually pull price toward fair value (prevents extreme deviation)
  const deviation = newPrice - fairValue;
  const correctionFactor = 0.1; // 10% correction toward fair value
  newPrice = newPrice - (deviation * correctionFactor);

  return Math.max(0.01, newPrice);
}

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
    if (args.shares <= 0) throw new Error("Invalid share amount");

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");
    if (!company.isPublic) throw new Error("Company is not publicly traded");

    let buyerId: any = userId;
    let buyerType: "user" | "company" = "user";
    
    if (args.buyerType === "company") {
      const account = await ctx.db.get(args.fromAccountId);
      if (!account || !account.companyId) throw new Error("Invalid company account");
      buyerId = account.companyId;
      buyerType = "company";
      
      const access = await ctx.db
        .query("companyAccess")
        .withIndex("by_company_user", (q) =>
          q.eq("companyId", account.companyId!).eq("userId", userId)
        )
        .first();
      if (!access) throw new Error("No access to this company");
    }

    const totalCost = args.shares * company.sharePrice;

    // Check balance from cached account balance
    const fromAccount = await ctx.db.get(args.fromAccountId);
    if (!fromAccount) throw new Error("Account not found");
    
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

    const existingHolding = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder", (q) =>
        q.eq("companyId", args.companyId).eq("holderId", buyerId)
      )
      .first();

    if (existingHolding) {
      const newTotalShares = existingHolding.shares + args.shares;
      const newAveragePrice = 
        (existingHolding.shares * existingHolding.averagePurchasePrice + totalCost) /
        newTotalShares;

      await ctx.db.patch(existingHolding._id, {
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
    const fairValue = calculateBasePrice(companyBalance + totalCost, company.totalShares, marketSentiment);
    
    const newPrice = calculateNewPrice(
      company.sharePrice,
      args.shares,
      company.totalShares,
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
    if (args.shares <= 0) throw new Error("Invalid share amount");

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    let sellerId: any = userId;
    let sellerType: "user" | "company" = "user";
    
    if (args.sellerType === "company") {
      const account = await ctx.db.get(args.toAccountId);
      if (!account || !account.companyId) throw new Error("Invalid company account");
      sellerId = account.companyId;
      sellerType = "company";
      
      const access = await ctx.db
        .query("companyAccess")
        .withIndex("by_company_user", (q) =>
          q.eq("companyId", account.companyId!).eq("userId", userId)
        )
        .first();
      if (!access) throw new Error("No access to this company");
    }

    const holding = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder", (q) =>
        q.eq("companyId", args.companyId).eq("holderId", sellerId)
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
    const fairValue = calculateBasePrice(companyBalance, company.totalShares, marketSentiment);
    
    const newPrice = calculateNewPrice(
      company.sharePrice,
      args.shares,
      company.totalShares,
      false,
      fairValue
    );

    const proceeds = args.shares * newPrice;

    // Get destination account
    const toAccount = await ctx.db.get(args.toAccountId);
    if (!toAccount) throw new Error("Destination account not found");

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
      .withIndex("by_company_holder", (q) =>
        q.eq("companyId", args.companyId).eq("holderId", fromHolderId)
      )
      .filter((q) => q.eq(q.field("holderType"), fromHolderType))
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
      .withIndex("by_company_holder", (q) =>
        q.eq("companyId", args.companyId).eq("holderId", args.toId)
      )
      .filter((q) => q.eq(q.field("holderType"), args.toType))
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
    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_holder", (q) => q.eq("holderId", userId))
      .filter((q) => q.eq(q.field("holderType"), "user"))
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
          .withIndex("by_holder", (q) => q.eq("holderId", company._id))
          .filter((q) => q.eq(q.field("holderType"), "company"))
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
    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_holder", (q) => q.eq("holderId", args.holderId))
      .filter((q) => q.eq(q.field("holderType"), args.holderType))
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

    const founderShares = company.totalShares - totalHeldShares;
    const founderOwnership = (founderShares / company.totalShares) * 100;
    
    const founder = await ctx.db.get(company.ownerId);
    
    return {
      shareholders: shareholders.sort((a, b) => b.ownershipPercent - a.ownershipPercent),
      founderShares,
      founderOwnership,
      founderName: founder?.name || "Founder",
      totalShares: company.totalShares,
      sharesOutstanding: totalHeldShares,
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

    // OPTIMIZED: Limit number of price history records
    const maxRecords = timeRange === "1h" ? 60 : timeRange === "6h" ? 180 : 500;
    
    const rawPriceHistory = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_company_timestamp", (q) =>
        q.eq("companyId", args.companyId).gt("timestamp", startTime)
      )
      .order("asc")
      .take(maxRecords);

    // Aggregate to hourly intervals
    const priceHistory = aggregateToHourly(rawPriceHistory);

    // OPTIMIZED: Only get last 50 transactions instead of all
    const recentTransactions = await ctx.db
      .query("stockTransactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(50);

    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const priceOneDayAgo = rawPriceHistory.find(p => p.timestamp >= oneDayAgo)?.price || company.sharePrice;
    const priceChange24h = company.sharePrice - priceOneDayAgo;
    const priceChangePercent24h = (priceChange24h / priceOneDayAgo) * 100;

    const highPrice = Math.max(...rawPriceHistory.map(p => p.price), company.sharePrice);
    const lowPrice = Math.min(...rawPriceHistory.map(p => p.price), company.sharePrice);

    const totalVolume = recentTransactions.reduce((sum, tx) => sum + tx.shares, 0);
    
    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    
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
      priceHistory,
      recentTransactions,
    };
  },
});

export const getAllPublicStocks = query({
  args: {},
  handler: async (ctx) => {
    const publicCompanies = await ctx.db
      .query("companies")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect();

    // OPTIMIZED: Batch fetch price history for all companies
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Get all recent price history in fewer queries
    const allDayHistory = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_company_timestamp")
      .filter((q) => q.gt(q.field("timestamp"), oneDayAgo))
      .collect();
    
    const allHourHistory = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_company_timestamp")
      .filter((q) => q.gt(q.field("timestamp"), oneHourAgo))
      .collect();

    // Group by company
    const dayHistoryByCompany = new Map<string, any[]>();
    const hourHistoryByCompany = new Map<string, any[]>();
    
    allDayHistory.forEach(entry => {
      const arr = dayHistoryByCompany.get(entry.companyId) || [];
      arr.push(entry);
      dayHistoryByCompany.set(entry.companyId, arr);
    });
    
    allHourHistory.forEach(entry => {
      const arr = hourHistoryByCompany.get(entry.companyId) || [];
      arr.push(entry);
      hourHistoryByCompany.set(entry.companyId, arr);
    });

    const stocks = publicCompanies.map(company => {
      const dayHistory = dayHistoryByCompany.get(company._id) || [];
      const hourHistory = hourHistoryByCompany.get(company._id) || [];
      
      const oldPrice = dayHistory[0]?.price || company.sharePrice;
      const priceChange24h = company.sharePrice - oldPrice;
      const priceChangePercent24h = (priceChange24h / oldPrice) * 100;

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
        priceHistory: aggregateToHourly(hourHistory).map(h => ({
          price: h.price,
          timestamp: h.timestamp,
        })),
      };
    });

    return stocks.sort((a, b) => b.marketCap - a.marketCap);
  },
});

export const updateStockPrices = internalMutation({
  args: {},
  handler: async (ctx) => {
    const publicCompanies = await ctx.db
      .query("companies")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect();

    // Batch fetch all company accounts
    const accountIds = publicCompanies.map(c => c.accountId);
    const accounts = await Promise.all(accountIds.map(id => ctx.db.get(id)));
    
    // Create balance map
    const balanceMap = new Map();
    accounts.forEach((account: any) => {
      if (account) {
        balanceMap.set(account._id, account.balance ?? 0);
      }
    });

    for (const company of publicCompanies) {
      const companyBalance = balanceMap.get(company.accountId) ?? 0;
      
      // Update market sentiment with small random walk (±2% per update)
      const currentSentiment = company.marketSentiment ?? 1.0;
      const sentimentChange = (Math.random() - 0.5) * 0.04; // ±2%
      let newSentiment = currentSentiment + sentimentChange;
      
      // Keep sentiment between 0.8 and 1.2 (±20% from base)
      newSentiment = Math.max(0.8, Math.min(1.2, newSentiment));
      
      // Calculate fair value based on company fundamentals
      const fairValue = calculateBasePrice(companyBalance, company.totalShares, newSentiment);
      
      // Calculate how far price is from fair value
      const priceGap = fairValue - company.sharePrice;
      const deviationPercent = Math.abs(priceGap / fairValue);
      
      let newPrice: number;
      
      // If price is within 5% of fair value, just apply random fluctuations
      if (deviationPercent < 0.05) {
        // Small random market noise (±1.5%) when near fair value
        const marketNoise = (Math.random() - 0.5) * 0.03;
        newPrice = company.sharePrice * (1 + marketNoise);
      } else {
        // If significantly off fair value, converge back
        // Stronger convergence for larger deviations
        let convergenceRate = 0.15; // Base 15% convergence
        if (deviationPercent > 0.15) {
          convergenceRate = 0.25; // 25% for large deviations (>15% off)
        }
        
        // Add smaller noise when converging
        const marketNoise = (Math.random() - 0.5) * 0.01;
        newPrice = company.sharePrice + (priceGap * convergenceRate) + (company.sharePrice * marketNoise);
      }
      
      // Ensure price stays positive
      newPrice = Math.max(0.01, newPrice);

      await ctx.db.patch(company._id, {
        sharePrice: newPrice,
        marketSentiment: newSentiment,
      });

      const marketCap = newPrice * company.totalShares;
      await ctx.db.insert("stockPriceHistory", {
        companyId: company._id,
        price: newPrice,
        marketCap,
        volume: 0,
        timestamp: Date.now(),
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
    
    // Get all old records
    const oldRecords = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_company_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), ninetyDaysAgo))
      .collect();

    // Delete in batches to avoid timeout
    let deleted = 0;
    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
      deleted++;
      
      // Limit deletions per run to avoid timeout
      if (deleted >= 1000) break;
    }

    return { deleted, remaining: oldRecords.length - deleted };
  },
});
