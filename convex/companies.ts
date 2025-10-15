import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { computeOwnerMetricsFromHoldings } from "./utils/stocks";
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

// ULTRA-OPTIMIZATION: Update cached company metrics (with skip logic)
export const updateCompanyMetrics = internalMutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) return;

    // Check existing metrics first to avoid unnecessary queries
    const existing30d = await ctx.db
      .query("companyMetrics")
      .withIndex("by_company_period", (q) => 
        q.eq("companyId", args.companyId).eq("period", "30d")
      )
      .first();

    // OPTIMIZATION: Skip update if cache is less than 20 minutes old
    // This prevents redundant updates when cron runs frequently
    if (existing30d) {
      const cacheAge = Date.now() - existing30d.lastUpdated;
      if (cacheAge < 20 * 60 * 1000) { // 20 minutes
        return existing30d; // Skip update - cache is fresh enough
      }
    }

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    // BANDWIDTH OPTIMIZATION: Reduced from 200 to 150 per query
    // Further reduction since we're now updating less frequently
    const [incoming30d, outgoing30d] = await Promise.all([
      ctx.db
        .query("ledger")
        .withIndex("by_to_account_created", (q) => 
          q.eq("toAccountId", company.accountId).gt("createdAt", thirtyDaysAgo)
        )
        .take(150), // REDUCED from 200 to 150
      ctx.db
        .query("ledger")
        .withIndex("by_from_account_created", (q) => 
          q.eq("fromAccountId", company.accountId).gt("createdAt", thirtyDaysAgo)
        )
        .take(150), // REDUCED from 200 to 150
    ]);

    // Revenue: incoming transactions for product sales
    const revenueTypes = new Set(["product_purchase", "marketplace_batch"]);
    // Costs: outgoing transactions for production costs (NOT expenses)
    const costTypes = new Set(["product_cost", "marketplace_batch"]);

    let revenue30d = 0;
    let costs30d = 0;
    let expenses30d = 0;

    // Process incoming transactions (revenue)
    for (const tx of incoming30d) {
      if (revenueTypes.has(tx.type)) revenue30d += tx.amount || 0;
    }

    // Process outgoing transactions (costs and expenses separately)
    for (const tx of outgoing30d) {
      if (costTypes.has(tx.type)) {
        // Production costs (COGS - Cost of Goods Sold)
        costs30d += tx.amount || 0;
      } else if (tx.type === "expense") {
        // Operating expenses (overhead, taxes, licenses, maintenance)
        expenses30d += tx.amount || 0;
      }
    }

    const metrics30d = {
      companyId: args.companyId,
      period: "30d" as const,
      totalRevenue: revenue30d,
      totalCosts: costs30d,
      totalExpenses: expenses30d,
      totalProfit: revenue30d - costs30d - expenses30d,
      transactionCount: incoming30d.length + outgoing30d.length,
      lastUpdated: Date.now(),
    };

    // OPTIMIZATION: Only write if values have actually changed (skip redundant writes)
    if (existing30d) {
      const hasChanged = 
        existing30d.totalRevenue !== metrics30d.totalRevenue ||
        existing30d.totalCosts !== metrics30d.totalCosts ||
        existing30d.totalExpenses !== metrics30d.totalExpenses ||
        existing30d.transactionCount !== metrics30d.transactionCount;
      
      if (hasChanged) {
        await ctx.db.patch(existing30d._id, metrics30d);
      } else {
        // Just update timestamp if no data changed
        await ctx.db.patch(existing30d._id, { lastUpdated: Date.now() });
      }
    } else {
      await ctx.db.insert("companyMetrics", metrics30d);
    }

    return metrics30d;
  },
});

// ULTRA-OPTIMIZATION: Batch update all company metrics (called by cron)
export const updateAllCompanyMetrics = internalMutation({
  args: {},
  handler: async (ctx) => {
    // BANDWIDTH OPTIMIZATION: Only update companies that need it
    // Prioritize: 1) Public companies, 2) Active companies with recent transactions
    
    // Get up to 30 companies (reduced from 50)
    const companies = await ctx.db.query("companies").take(30);
    
    // Get existing metrics for all companies
    const metricsPromises = companies.map(company =>
      ctx.db
        .query("companyMetrics")
        .withIndex("by_company_period", (q) => 
          q.eq("companyId", company._id).eq("period", "30d")
        )
        .first()
    );
    const allMetrics = await Promise.all(metricsPromises);
    
    // Filter to only update companies that need it
    const companiesToUpdate = companies.filter((company, index) => {
      const metrics = allMetrics[index];
      
      // Always update if no metrics exist
      if (!metrics) return true;
      
      // Update if cache is older than 25 minutes
      const cacheAge = Date.now() - metrics.lastUpdated;
      if (cacheAge > 25 * 60 * 1000) return true;
      
      // Otherwise skip
      return false;
    });
    
    let scheduled = 0;
    for (const company of companiesToUpdate) {
      try {
        await ctx.scheduler.runAfter(0, internal.companies.updateCompanyMetrics, {
          companyId: company._id,
        });
        scheduled++;
      } catch (error) {
        console.error(`Failed to schedule metrics update for company ${company._id}:`, error);
      }
    }
    
    return { 
      scheduled, 
      total: companies.length, 
      skipped: companies.length - scheduled 
    };
  },
});

// Create a new company
export const createCompany = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    ticker: v.string(),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if ticker is already taken
    const existingCompany = await ctx.db
      .query("companies")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .first();
    
    if (existingCompany) {
      throw new Error("Ticker symbol already in use");
    }

    // Create company account with 0 initial balance
    const accountId = await ctx.db.insert("accounts", {
      name: `${args.name} Account`,
      type: "company",
      ownerId: userId,
      balance: 0,
      createdAt: Date.now(),
    });

    // Create balance record
    await ctx.db.insert("balances", {
      accountId,
      balance: 0,
      lastUpdated: Date.now(),
    });

    // Create company
    const companyId = await ctx.db.insert("companies", {
      name: args.name,
      description: args.description,
      tags: args.tags,
      ticker: args.ticker.toUpperCase(),
      logoUrl: args.logoUrl,
      ownerId: userId,
      accountId,
      isPublic: false,
      totalShares: 1000000, // 1 million shares by default
      sharePrice: 0.01, // $0.01 per share initially
      marketSentiment: 1.0, // Neutral market sentiment
      // Initialize expense tracking
      lastExpenseDate: Date.now(),
      monthlyRevenue: 0,
      taxRate: 0.21, // 21% corporate tax rate
      lastTaxPayment: Date.now(),
      unpaidTaxes: 0,
      createdAt: Date.now(),
    });

    // Link account to company
    await ctx.db.patch(accountId, {
      companyId,
    });

    // Grant owner access
    await ctx.db.insert("companyAccess", {
      companyId,
      userId,
      role: "owner",
      grantedAt: Date.now(),
    });

    return companyId;
  },
});

// Get all companies (for marketplace)
export const getCompanies = query({
  args: {},
  handler: async (ctx) => {
    const MAX_COMPANIES = 1000;
    const PAGE_SIZE = 100;

    const companies: Doc<"companies">[] = [];
    let cursor: string | null = null;

    while (companies.length < MAX_COMPANIES) {
      const page = await ctx.db
        .query("companies")
        .order("desc")
        .paginate({
          cursor,
          numItems: Math.min(PAGE_SIZE, MAX_COMPANIES - companies.length),
        });

      companies.push(...(page.page as Doc<"companies">[]));

      if (page.isDone || page.page.length === 0 || !page.continueCursor) {
        break;
      }

      cursor = page.continueCursor;
    }
    
    // Batch fetch all accounts using cached balance
    const accountIds = companies.map(c => c.accountId);
    const accounts = await Promise.all(accountIds.map(id => ctx.db.get(id)));
    
    // Create balance map
    const balanceMap = new Map();
    accounts.forEach((account: any) => {
      if (account) {
        balanceMap.set(account._id, account.balance ?? 0);
      }
    });
    
    // BANDWIDTH OPTIMIZATION: Skip owner fetching for marketplace listing
    // Only fetch owner names when specifically needed

    const companiesWithBalance = companies.map((company) => ({
      ...company,
      balance: balanceMap.get(company.accountId) ?? 0,
    }));

    return companiesWithBalance;
  },
});

// Get public companies (stock market)
export const getPublicCompanies = query({
  args: {},
  handler: async (ctx) => {
    // BANDWIDTH OPTIMIZATION: Reduced from 100 to 50
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .take(50);
    
    // Batch fetch all accounts using cached balance
    const accountIds = companies.map(c => c.accountId);
    const accounts = await Promise.all(accountIds.map(id => ctx.db.get(id)));
    
    // Create balance map
    const balanceMap = new Map();
    accounts.forEach((account: any) => {
      if (account) {
        balanceMap.set(account._id, account.balance ?? 0);
      }
    });
    
    // BANDWIDTH OPTIMIZATION: Skip owner fetching for stock market listing
    // Owner info not critical for stock listings

    const enrichedCompanies = companies.map((company) => ({
      ...company,
      balance: balanceMap.get(company.accountId) ?? 0,
    }));

    return enrichedCompanies;
  },
});

// Get user's companies
export const getUserCompanies = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    const companyAccess = await ctx.db
      .query("companyAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (companyAccess.length === 0) return [];

    // Batch fetch all companies and their accounts
    const companyIds = companyAccess.map(a => a.companyId);
    const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));
    const validCompanies = companies.filter(Boolean) as any[];
    
    // Batch fetch all accounts
    const accountIds = validCompanies.map(c => c.accountId);
    const accounts = await Promise.all(accountIds.map(id => ctx.db.get(id)));
    
    // Create account balance map using cached balance on account
    const accountBalanceMap = new Map();
    accounts.forEach((account: any) => {
      if (account) {
        accountBalanceMap.set(account._id, account.balance ?? 0);
      }
    });

    const ownedCompanies = validCompanies.filter((company) => company.ownerId === userId);
    // Fetch stock holdings for ownership calculation - need enough for accurate metrics
    const ownedHoldings = await Promise.all(
      ownedCompanies.map((company) =>
        ctx.db
          .query("stocks")
          .withIndex("by_company", (q) => q.eq("companyId", company._id))
          .take(200) // Increased from 50 to 200 for accurate ownership calculation
      )
    );

    const ownerMetricsMap = new Map();
    ownedCompanies.forEach((company, index) => {
      const holdings = ownedHoldings[index] as any[];
      const snapshot = computeOwnerMetricsFromHoldings(company, holdings ?? [], userId);
      ownerMetricsMap.set(company._id, snapshot);
    });

    // Map results
    const result = validCompanies.map((company, index) => {
      const access = companyAccess.find(a => a.companyId === company._id);
      const ownership = ownerMetricsMap.get(company._id);
      const totalShares = Math.max(company.totalShares ?? 0, 0);
      const ownershipPercent = ownership
        ? (totalShares === 0 ? 0 : (ownership.ownerShares / totalShares) * 100)
        : (company.ownerId === userId && totalShares > 0 ? 100 : 0);
      return {
        ...company,
        balance: accountBalanceMap.get(company.accountId) ?? 0,
        role: access?.role || "viewer",
        ownerEquityValue: ownership?.ownerEquityValue ?? 0,
        ownerShares: ownership?.ownerShares ?? (company.ownerId === userId ? totalShares : 0),
        ownerOwnershipPercent: ownershipPercent,
      };
    });

    return result;
  },
});

// Grant access to a company
export const grantCompanyAccess = mutation({
  args: {
    companyId: v.id("companies"),
    userEmail: v.string(),
    role: v.union(v.literal("owner"), v.literal("manager")),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if current user is owner
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");
    if (company.ownerId !== userId) throw new Error("Only owner can grant access");

    // Find user by email
    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.userEmail))
      .first();

    if (!targetUser) throw new Error("User not found");

    // Check if access already exists
    const existingAccess = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", args.companyId).eq("userId", targetUser._id)
      )
      .first();

    if (existingAccess) {
      // Update role
      await ctx.db.patch(existingAccess._id, {
        role: args.role,
      });
      return existingAccess._id;
    }

    // Grant access
    const accessId = await ctx.db.insert("companyAccess", {
      companyId: args.companyId,
      userId: targetUser._id,
      role: args.role,
      grantedAt: Date.now(),
    });

    return accessId;
  },
});

// Check if company should be made public (balance > $50,000)
export const checkAndUpdatePublicStatus = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Get balance from cached account balance
    const account = await ctx.db.get(company.accountId);
    const balance = account?.balance ?? 0;

    if (balance > 50000 && !company.isPublic) {
      // Calculate fair IPO price based on company fundamentals
      // Use neutral sentiment (1.0) for IPO
      const fairValue = (balance / company.totalShares) * 5.0; // 5x book value multiplier
      
      await ctx.db.patch(args.companyId, {
        isPublic: true,
        sharePrice: fairValue,
        marketSentiment: 1.0,
      });
      
      // Record initial public price in history
      await ctx.db.insert("stockPriceHistory", {
        companyId: args.companyId,
        price: fairValue,
        marketCap: fairValue * company.totalShares,
        volume: 0,
        timestamp: Date.now(),
      });
      
      return { madePublic: true, balance, ipoPrice: fairValue };
    }

    return { madePublic: false, balance };
  },
});

// Update company details
export const updateCompany = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    ticker: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Check if user is the owner
    if (company.ownerId !== userId) {
      throw new Error("Only the owner can update company details");
    }

    // If ticker is being changed, check if it's already taken
    if (args.ticker && args.ticker !== company.ticker) {
      const newTicker = args.ticker.toUpperCase();
      const existingCompany = await ctx.db
        .query("companies")
        .withIndex("by_ticker", (q) => q.eq("ticker", newTicker))
        .first();
      
      if (existingCompany && existingCompany._id !== args.companyId) {
        throw new Error("Ticker symbol already in use");
      }
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.ticker !== undefined) updates.ticker = args.ticker.toUpperCase();
    if (args.logoUrl !== undefined) updates.logoUrl = args.logoUrl;

    await ctx.db.patch(args.companyId, updates);

    return { success: true };
  },
});

// Delete company and return funds to owner
export const deleteCompany = mutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Check if user is the owner
    if (company.ownerId !== userId) {
      throw new Error("Only the owner can delete the company");
    }

    // Get company balance
    const account = await ctx.db.get(company.accountId);
    const balance = account?.balance ?? 0;

    // Transfer funds back to owner's personal account if there's a balance
    let fundsReturned = 0;
    if (balance > 0) {
      const personalAccount = await ctx.db
        .query("accounts")
        .withIndex("by_owner_type", (q) => q.eq("ownerId", userId).eq("type", "personal"))
        .first();

      if (personalAccount) {
        // Update personal account balance
        const personalBalance = personalAccount.balance ?? 0;
        await ctx.db.patch(personalAccount._id, {
          balance: personalBalance + balance,
        });

        // Create transfer ledger entry
        await ctx.db.insert("ledger", {
          fromAccountId: company.accountId,
          toAccountId: personalAccount._id,
          amount: balance,
          type: "transfer",
          description: `Company deletion: ${company.name} - returning funds to owner`,
          createdAt: Date.now(),
        });

        fundsReturned = balance;
      }
    }

    // Deactivate all products (don't delete for historical record)
    const products = await ctx.db
      .query("products")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const product of products) {
      await ctx.db.patch(product._id, { isActive: false });
    }

    // Delete all stock holdings for this company
    const stocks = await ctx.db
      .query("stocks")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const stock of stocks) {
      await ctx.db.delete(stock._id);
    }

    // Delete stock price history
    const priceHistory = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const history of priceHistory) {
      await ctx.db.delete(history._id);
    }

    // Delete stock transactions
    const stockTransactions = await ctx.db
      .query("stockTransactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const transaction of stockTransactions) {
      await ctx.db.delete(transaction._id);
    }

    // Delete all company access records
    const accessRecords = await ctx.db
      .query("companyAccess")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const access of accessRecords) {
      await ctx.db.delete(access._id);
    }

    // Delete balance record
    const balanceRecord = await ctx.db
      .query("balances")
      .withIndex("by_account", (q) => q.eq("accountId", company.accountId))
      .first();

    if (balanceRecord) {
      await ctx.db.delete(balanceRecord._id);
    }

    // Delete company account
    await ctx.db.delete(company.accountId);

    // Finally, delete the company
    await ctx.db.delete(args.companyId);

    return {
      success: true,
      fundsReturned,
    };
  },
});

// Get company dashboard data
export const getCompanyDashboard = query({
  args: { companyId: v.id("companies") },
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

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Get cached balance directly from account
    const account = await ctx.db.get(company.accountId);
    const balance = account?.balance ?? 0;

    // ULTRA-OPTIMIZED: Query only active products (most companies have <10 products)
    const products = await ctx.db
      .query("products")
      .withIndex("by_company_active", (q) => q.eq("companyId", args.companyId).eq("isActive", true))
      .take(50); // Limit to 50 active products max

    // Fetch stock holdings for accurate ownership calculation
    const companyHoldings = await ctx.db
      .query("stocks")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(200); // Increased from 20 to 200 for accurate ownership calculation
    const ownershipSnapshot = computeOwnerMetricsFromHoldings(company, companyHoldings ?? [], company.ownerId);

    // BANDWIDTH OPTIMIZATION: Always use cached metrics (extend cache time to 30 min)
    const cachedMetrics = await ctx.db
      .query("companyMetrics")
      .withIndex("by_company_period", (q) => 
        q.eq("companyId", args.companyId).eq("period", "30d")
      )
      .first();

    // Check if cache is fresh (less than 60 minutes old - increased from 30 min)
    // Since cron now runs every 30 min, we can trust cache for up to 60 min
    const cacheAge = cachedMetrics ? Date.now() - cachedMetrics.lastUpdated : Infinity;
    const useCachedData = cachedMetrics && cacheAge < 60 * 60 * 1000;

    let totalRevenue = 0;
    let totalCosts = 0;
    let totalExpenses = 0;
    let totalProfit = 0;
    let chartData: Array<{ date: string; revenue: number; costs: number; expenses: number; profit: number }> = [];

    if (useCachedData) {
      // CACHED PATH: Use pre-calculated metrics (MAIN PATH - saves massive bandwidth)
      totalRevenue = cachedMetrics.totalRevenue;
      totalCosts = cachedMetrics.totalCosts;
      totalExpenses = cachedMetrics.totalExpenses;
      totalProfit = cachedMetrics.totalProfit;
      
      // BANDWIDTH OPTIMIZATION: Limit chart to last 7 days with hard cap of 30 transactions
      // Charts don't need perfect accuracy - reduced from 50 to 30 per direction
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const [incomingTx, outgoingTx] = await Promise.all([
        ctx.db
          .query("ledger")
          .withIndex("by_to_account_created", (q) => 
            q.eq("toAccountId", company.accountId).gt("createdAt", sevenDaysAgo)
          )
          .take(30), // REDUCED from 50 to 30
        ctx.db
          .query("ledger")
          .withIndex("by_from_account_created", (q) => 
            q.eq("fromAccountId", company.accountId).gt("createdAt", sevenDaysAgo)
          )
          .take(30), // REDUCED from 50 to 30
      ]);

      // Revenue: incoming transactions for product sales
      const revenueTypes = new Set(["product_purchase", "marketplace_batch"]);
      // Costs: outgoing transactions for production costs (NOT expenses)
      const costTypes = new Set(["product_cost", "marketplace_batch"]);
      
      const dailyRevenue: Record<string, number> = {};
      const dailyCosts: Record<string, number> = {};
      const dailyExpenses: Record<string, number> = {};

      // Process incoming transactions (revenue)
      for (const tx of incomingTx) {
        if (revenueTypes.has(tx.type)) {
          const date = new Date(tx.createdAt).toISOString().split('T')[0];
          dailyRevenue[date] = (dailyRevenue[date] || 0) + (tx.amount || 0);
        }
      }

      // Process outgoing transactions (costs and expenses separately)
      for (const tx of outgoingTx) {
        const date = new Date(tx.createdAt).toISOString().split('T')[0];
        if (costTypes.has(tx.type)) {
          // Production costs (COGS - Cost of Goods Sold)
          dailyCosts[date] = (dailyCosts[date] || 0) + (tx.amount || 0);
        } else if (tx.type === "expense") {
          // Operating expenses (overhead, taxes, licenses, maintenance)
          dailyExpenses[date] = (dailyExpenses[date] || 0) + (tx.amount || 0);
        }
      }

      const allDates = new Set([
        ...Object.keys(dailyRevenue),
        ...Object.keys(dailyCosts),
        ...Object.keys(dailyExpenses),
      ]);

      chartData = Array.from(allDates)
        .map(date => ({
          date,
          revenue: dailyRevenue[date] || 0,
          costs: dailyCosts[date] || 0,
          expenses: dailyExpenses[date] || 0,
          profit: (dailyRevenue[date] || 0) - (dailyCosts[date] || 0) - (dailyExpenses[date] || 0),
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7); // Only last 7 days for chart

    } else {
      // FALLBACK PATH: Calculate from ledger (with AGGRESSIVE limits to reduce bandwidth)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      // BANDWIDTH OPTIMIZATION: Reduced from 100 to 75 for fallback path
      // Fallback should rarely be used, so make it even more aggressive
      const [incomingTx, outgoingTx] = await Promise.all([
        ctx.db
          .query("ledger")
          .withIndex("by_to_account_created", (q) => 
            q.eq("toAccountId", company.accountId).gt("createdAt", thirtyDaysAgo)
          )
          .take(75), // REDUCED from 100 to 75
        ctx.db
          .query("ledger")
          .withIndex("by_from_account_created", (q) => 
            q.eq("fromAccountId", company.accountId).gt("createdAt", thirtyDaysAgo)
          )
          .take(75), // REDUCED from 100 to 75
      ]);

      const revenueTypes = new Set(["product_purchase", "marketplace_batch"]);
      const costTypes = new Set(["product_cost", "marketplace_batch"]);
      
      const dailyRevenue: Record<string, number> = {};
      const dailyCosts: Record<string, number> = {};
      const dailyExpenses: Record<string, number> = {};

      for (const tx of incomingTx) {
        if (revenueTypes.has(tx.type)) {
          totalRevenue += tx.amount || 0;
          const date = new Date(tx.createdAt).toISOString().split('T')[0];
          dailyRevenue[date] = (dailyRevenue[date] || 0) + (tx.amount || 0);
        }
      }

      for (const tx of outgoingTx) {
        if (costTypes.has(tx.type)) {
          totalCosts += tx.amount || 0;
          const date = new Date(tx.createdAt).toISOString().split('T')[0];
          dailyCosts[date] = (dailyCosts[date] || 0) + (tx.amount || 0);
        } else if (tx.type === "expense") {
          totalExpenses += tx.amount || 0;
          const date = new Date(tx.createdAt).toISOString().split('T')[0];
          dailyExpenses[date] = (dailyExpenses[date] || 0) + (tx.amount || 0);
        }
      }

      totalProfit = totalRevenue - totalCosts - totalExpenses;

      const allDates = new Set([
        ...Object.keys(dailyRevenue),
        ...Object.keys(dailyCosts),
        ...Object.keys(dailyExpenses),
      ]);

      // BANDWIDTH OPTIMIZATION: Only last 7 days even in fallback
      chartData = Array.from(allDates)
        .map(date => ({
          date,
          revenue: dailyRevenue[date] || 0,
          costs: dailyCosts[date] || 0,
          expenses: dailyExpenses[date] || 0,
          profit: (dailyRevenue[date] || 0) - (dailyCosts[date] || 0) - (dailyExpenses[date] || 0),
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7); // CHANGED from -30 to -7 for consistency
    }

    // ULTRA-OPTIMIZED: Use stored totals from products table (no additional queries needed)
    const productStats = products.map((product) => {
      const productRevenue = product.totalRevenue || 0;
      const productCosts = product.totalCosts || 0;
      const productProfit = productRevenue - productCosts;
      const unitsSold = product.totalSales || 0;
      const avgSalePrice = unitsSold > 0 ? productRevenue / unitsSold : product.price;

      return {
        ...product,
        revenue: productRevenue,
        costs: productCosts,
        profit: productProfit,
        unitsSold: unitsSold,
        avgSalePrice: avgSalePrice,
      };
    });

    return {
      company: {
        ...company,
        balance,
        ownerEquityValue: ownershipSnapshot.ownerEquityValue,
        ownerShares: ownershipSnapshot.ownerShares,
        ownerOwnershipPercent: company.totalShares > 0
          ? (ownershipSnapshot.ownerShares / company.totalShares) * 100
          : 0,
      },
      totals: {
        revenue: totalRevenue,
        costs: totalCosts,
        expenses: totalExpenses,
        profit: totalProfit,
      },
      products: productStats,
      chartData,
      cachedData: useCachedData, // Indicate if using cached data
    };
  },
});

// Distribute dividends to shareholders (excluding founder)
export const distributeDividends = mutation({
  args: {
    companyId: v.id("companies"),
    totalAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate amount
    if (args.totalAmount <= 0) {
      throw new Error("Dividend amount must be positive");
    }

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Check if user is the owner
    if (company.ownerId !== userId) {
      throw new Error("Only the company owner can distribute dividends");
    }

    // Get company balance
    const companyAccount = await ctx.db.get(company.accountId);
    if (!companyAccount) throw new Error("Company account not found");
    
    const companyBalance = companyAccount.balance ?? 0;
    if (companyBalance < args.totalAmount) {
      throw new Error(`Insufficient funds. Company has $${companyBalance.toFixed(2)} but you're trying to distribute $${args.totalAmount.toFixed(2)}`);
    }

    // Get all shareholders (excluding founder)
    const allHoldings = await ctx.db
      .query("stocks")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Filter out founder's holdings
    const investorHoldings = allHoldings.filter(holding => {
      if (holding.holderType === "user" && holding.holderId === company.ownerId) {
        return false; // Exclude founder
      }
      return true; // Include all other investors
    });

    if (investorHoldings.length === 0) {
      throw new Error("No external investors to distribute dividends to");
    }

    // Calculate total shares held by investors (excluding founder)
    const totalInvestorShares = investorHoldings.reduce((sum, h) => sum + h.shares, 0);
    
    if (totalInvestorShares === 0) {
      throw new Error("No investor shares found");
    }

    // Distribute dividends proportionally to each investor
    const distributions: Array<{
      holderId: any;
      holderType: "user" | "company";
      shares: number;
      amount: number;
      accountId: any;
    }> = [];

    // Collect all unique holders and their total shares
    const holderMap = new Map<string, { holderId: any; holderType: "user" | "company"; shares: number }>();
    
    for (const holding of investorHoldings) {
      const key = `${holding.holderType}-${holding.holderId}`;
      const existing = holderMap.get(key);
      if (existing) {
        existing.shares += holding.shares;
      } else {
        holderMap.set(key, {
          holderId: holding.holderId,
          holderType: holding.holderType,
          shares: holding.shares,
        });
      }
    }

    // Calculate dividend for each holder
    let totalDistributed = 0;
    
    for (const holder of holderMap.values()) {
      const dividendAmount = (holder.shares / totalInvestorShares) * args.totalAmount;
      
      // Find the appropriate account for this holder
      let recipientAccount;
      if (holder.holderType === "user") {
        recipientAccount = await ctx.db
          .query("accounts")
          .withIndex("by_owner_type", (q) => 
            q.eq("ownerId", holder.holderId).eq("type", "personal")
          )
          .first();
      } else {
        // Company holder
        const holderCompany = await ctx.db.get(holder.holderId as any);
        if (holderCompany && 'accountId' in holderCompany) {
          recipientAccount = await ctx.db.get(holderCompany.accountId);
        }
      }

      if (!recipientAccount) {
        console.warn(`Could not find account for holder ${holder.holderId}`);
        continue;
      }

      distributions.push({
        holderId: holder.holderId,
        holderType: holder.holderType,
        shares: holder.shares,
        amount: dividendAmount,
        accountId: recipientAccount._id,
      });
      
      totalDistributed += dividendAmount;
    }

    // Execute all distributions
    for (const dist of distributions) {
      // Update recipient balance
      const recipientAccount = await ctx.db.get(dist.accountId);
      if (!recipientAccount || !('balance' in recipientAccount)) continue;
      
      const recipientBalance = recipientAccount.balance ?? 0;
      await ctx.db.patch(dist.accountId, {
        balance: recipientBalance + dist.amount,
      });

      // Create ledger entry
      await ctx.db.insert("ledger", {
        fromAccountId: company.accountId,
        toAccountId: dist.accountId,
        amount: dist.amount,
        type: "dividend",
        description: `Dividend payment from ${company.name} (${dist.shares.toLocaleString()} shares)`,
        createdAt: Date.now(),
      });
    }

    // Deduct total from company account
    await ctx.db.patch(company.accountId, {
      balance: companyBalance - totalDistributed,
    });

    return {
      success: true,
      totalDistributed,
      recipientCount: distributions.length,
      distributions: distributions.map(d => ({
        holderId: d.holderId,
        holderType: d.holderType,
        shares: d.shares,
        amount: d.amount,
      })),
    };
  },
});

// Internal mutation to delete company without authentication (for moderation)
export const internalDeleteCompany = internalMutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Deactivate all products (don't delete for historical record)
    const products = await ctx.db
      .query("products")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const product of products) {
      await ctx.db.patch(product._id, { isActive: false });
    }

    // Delete all stock holdings for this company
    const stocks = await ctx.db
      .query("stocks")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const stock of stocks) {
      await ctx.db.delete(stock._id);
    }

    // Delete stock price history
    const priceHistory = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const history of priceHistory) {
      await ctx.db.delete(history._id);
    }

    // Delete stock transactions
    const stockTransactions = await ctx.db
      .query("stockTransactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const transaction of stockTransactions) {
      await ctx.db.delete(transaction._id);
    }

    // Delete all company access records
    const accessRecords = await ctx.db
      .query("companyAccess")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const access of accessRecords) {
      await ctx.db.delete(access._id);
    }

    // Delete balance record
    const balanceRecord = await ctx.db
      .query("balances")
      .withIndex("by_account", (q) => q.eq("accountId", company.accountId))
      .first();

    if (balanceRecord) {
      await ctx.db.delete(balanceRecord._id);
    }

    // Delete company account
    await ctx.db.delete(company.accountId);

    // Finally, delete the company
    await ctx.db.delete(args.companyId);

    return {
      success: true,
    };
  },
});

// Admin mutation to batch delete companies (requires admin key)
export const adminDeleteCompanies = mutation({
  args: {
    companyIds: v.array(v.id("companies")),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check admin key
    if (args.adminKey !== process.env.ADMIN_KEY) {
      throw new Error("Invalid admin key");
    }

    const results = [];
    for (const companyId of args.companyIds) {
      try {
        await ctx.scheduler.runAfter(0, internal.companies.internalDeleteCompany, {
          companyId,
        });
        results.push({ companyId, success: true });
      } catch (error) {
        results.push({ 
          companyId, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return results;
  },
});
