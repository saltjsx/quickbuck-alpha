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

function calculateNewPrice(
  currentPrice: number,
  sharesBought: number,
  totalShares: number,
  isBuying: boolean
): number {
  const impactPercentage = (sharesBought / totalShares) * 100;
  let priceChangePercent = 0;

  if (impactPercentage < 1) {
    priceChangePercent = impactPercentage * 0.25; // Reduced from 25 to 0.25
  } else if (impactPercentage < 5) {
    priceChangePercent = 0.25 + (impactPercentage - 1) * 0.4; // Reduced from 25+40x to 0.25+0.4x
  } else {
    priceChangePercent = 2 + Math.pow(impactPercentage - 5, 1.5) * 0.1; // Much smaller impact for large trades
  }

  priceChangePercent = Math.min(priceChangePercent, 10); // Max 10% change instead of 1000%
  const multiplier = isBuying ? (1 + priceChangePercent / 100) : (1 - priceChangePercent / 100);
  const newPrice = currentPrice * multiplier;

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
    
    const balance = fromAccount.balance ?? 0;

    if (balance < totalCost) throw new Error("Insufficient funds");

    // Get company account
    const companyAccount = await ctx.db.get(company.accountId);
    if (!companyAccount) throw new Error("Company account not found");

    const companyBalance = companyAccount.balance ?? 0;

    // Update buyer balance
    await ctx.db.patch(args.fromAccountId, {
      balance: balance - totalCost,
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

    const newPrice = calculateNewPrice(
      company.sharePrice,
      args.shares,
      company.totalShares,
      true
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

    const newPrice = calculateNewPrice(
      company.sharePrice,
      args.shares,
      company.totalShares,
      false
    );

    const proceeds = args.shares * newPrice;

    // Get accounts and update balances
    const companyAccount = await ctx.db.get(company.accountId);
    if (!companyAccount) throw new Error("Company account not found");
    
    const toAccount = await ctx.db.get(args.toAccountId);
    if (!toAccount) throw new Error("Destination account not found");

    // Get cached balances
    const companyBalance = companyAccount.balance ?? 0;
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
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (args.shares <= 0) throw new Error("Invalid share amount");

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const holding = await ctx.db
      .query("stocks")
      .withIndex("by_company_holder", (q) =>
        q.eq("companyId", args.companyId).eq("holderId", userId)
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
      fromId: userId,
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

    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_holder", (q) => q.eq("holderId", userId))
      .filter((q) => q.eq(q.field("holderType"), "user"))
      .collect();

    const portfolio = await Promise.all(
      holdings.map(async (holding) => {
        const company = await ctx.db.get(holding.companyId);
        if (!company) return null;

        const currentValue = holding.shares * company.sharePrice;
        const costBasis = holding.shares * holding.averagePurchasePrice;
        const gainLoss = currentValue - costBasis;
        const gainLossPercent = (gainLoss / costBasis) * 100;

        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const oldPrice = await ctx.db
          .query("stockPriceHistory")
          .withIndex("by_company_timestamp", (q) => 
            q.eq("companyId", holding.companyId).gt("timestamp", oneDayAgo)
          )
          .order("asc")
          .first();

        const priceChange24h = oldPrice 
          ? company.sharePrice - oldPrice.price
          : 0;
        const priceChangePercent24h = oldPrice
          ? ((company.sharePrice - oldPrice.price) / oldPrice.price) * 100
          : 0;

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
          priceChange24h,
          priceChangePercent24h,
        };
      })
    );

    return portfolio.filter(Boolean);
  },
});

export const getCompanyShareholders = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const totalHeldShares = holdings.reduce((sum, h) => sum + h.shares, 0);

    const shareholders = await Promise.all(
      holdings.map(async (holding) => {
        let name = "Unknown";
        let type = holding.holderType;
        
        if (holding.holderType === "user") {
          const user: any = await ctx.db.get(holding.holderId as any);
          name = user?.name || user?.username || "Unknown User";
        } else {
          const holderCompany: any = await ctx.db.get(holding.holderId as any);
          name = holderCompany?.name || "Unknown Company";
        }

        const ownershipPercent = (holding.shares / company.totalShares) * 100;
        const currentValue = holding.shares * company.sharePrice;

        return {
          holderId: holding.holderId,
          holderType: type,
          holderName: name,
          shares: holding.shares,
          ownershipPercent,
          currentValue,
          averagePurchasePrice: holding.averagePurchasePrice,
        };
      })
    );

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

    const stocks = await Promise.all(
      publicCompanies.map(async (company) => {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const priceHistory = await ctx.db
          .query("stockPriceHistory")
          .withIndex("by_company_timestamp", (q) =>
            q.eq("companyId", company._id).gt("timestamp", oneDayAgo)
          )
          .order("asc")
          .collect();

        const oldPrice = priceHistory[0]?.price || company.sharePrice;
        const priceChange24h = company.sharePrice - oldPrice;
        const priceChangePercent24h = (priceChange24h / oldPrice) * 100;

        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const hourHistory = await ctx.db
          .query("stockPriceHistory")
          .withIndex("by_company_timestamp", (q) =>
            q.eq("companyId", company._id).gt("timestamp", oneHourAgo)
          )
          .order("asc")
          .collect();

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
      })
    );

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

    for (const company of publicCompanies) {
      const fluctuation = (Math.random() - 0.5) * 0.04; // Reduced from ±50% to ±4%
      const newPrice = Math.max(0.01, company.sharePrice * (1 + fluctuation));

      await ctx.db.patch(company._id, {
        sharePrice: newPrice,
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
