import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    const companies = await ctx.db.query("companies").collect();
    
    // Get balances for each company from balances table
    const companiesWithBalance = await Promise.all(
      companies.map(async (company) => {
        const balanceRecord = await ctx.db
          .query("balances")
          .withIndex("by_account", (q) => q.eq("accountId", company.accountId))
          .first();
        
        const balance = balanceRecord?.balance ?? (await ctx.db.get(company.accountId))?.balance ?? 0;

        const owner = await ctx.db.get(company.ownerId);

        return {
          ...company,
          balance,
          ownerName: owner?.name || "Unknown",
        };
      })
    );

    return companiesWithBalance;
  },
});

// Get public companies (stock market)
export const getPublicCompanies = query({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect();
    
    // Get balances and additional info from balances table
    const enrichedCompanies = await Promise.all(
      companies.map(async (company) => {
        const balanceRecord = await ctx.db
          .query("balances")
          .withIndex("by_account", (q) => q.eq("accountId", company.accountId))
          .first();
        
        const balance = balanceRecord?.balance ?? (await ctx.db.get(company.accountId))?.balance ?? 0;

        const owner = await ctx.db.get(company.ownerId);

        return {
          ...company,
          balance,
          ownerName: owner?.name || "Unknown",
        };
      })
    );

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

    const companies = await Promise.all(
      companyAccess.map(async (access) => {
        const company = await ctx.db.get(access.companyId);
        if (!company) return null;

        // Get balance from balances table
        const balanceRecord = await ctx.db
          .query("balances")
          .withIndex("by_account", (q) => q.eq("accountId", company.accountId))
          .first();
        
        const balance = balanceRecord?.balance ?? (await ctx.db.get(company.accountId))?.balance ?? 0;

        return {
          ...company,
          balance,
          role: access.role,
        };
      })
    );

    return companies.filter(Boolean);
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

    // Get balance from balances table
    const balanceRecord = await ctx.db
      .query("balances")
      .withIndex("by_account", (q) => q.eq("accountId", company.accountId))
      .first();
    
    const balance = balanceRecord?.balance ?? (await ctx.db.get(company.accountId))?.balance ?? 0;

    if (balance > 50000 && !company.isPublic) {
      await ctx.db.patch(args.companyId, {
        isPublic: true,
      });
      return { madePublic: true, balance };
    }

    return { madePublic: false, balance };
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

    // Get all products for this company
    const products = await ctx.db
      .query("products")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Get cached balance
    const account = await ctx.db.get(company.accountId);
    const balance = account?.balance ?? 0;

    // For revenue/cost calculations, we still need ledger data
    // But we'll filter by product type and limit the query
    const allTransactions = await ctx.db
      .query("ledger")
      .withIndex("by_created_at")
      .order("desc")
      .take(10000); // Limit to last 10k transactions to avoid hitting limit

    // Filter transactions for this company
    const incoming = allTransactions.filter(tx => tx.toAccountId === company.accountId);
    const outgoing = allTransactions.filter(tx => tx.fromAccountId === company.accountId);

    // Calculate revenue (product purchases)
    const revenueTransactions = incoming.filter(tx => tx.type === "product_purchase");
    const totalRevenue = revenueTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate costs (product costs)
    const costTransactions = outgoing.filter(tx => tx.type === "product_cost");
    const totalCosts = costTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate profit
    const totalProfit = totalRevenue - totalCosts;

    // Calculate product-level stats
    const productStats = await Promise.all(
      products.map(async (product) => {
        // Filter from already loaded transactions
        const productPurchases = allTransactions.filter(
          tx => tx.productId === product._id && 
                tx.type === "product_purchase"
        );
        
        const productCostTxs = allTransactions.filter(
          tx => tx.productId === product._id && 
                tx.type === "product_cost"
        );
        
        const productRevenue = productPurchases.reduce((sum, tx) => sum + tx.amount, 0);
        const productCosts = productCostTxs.reduce((sum, tx) => sum + tx.amount, 0);
        const productProfit = productRevenue - productCosts;
        
        // Simple calculation: units sold = revenue / price
        // This works even if prices changed because each purchase was at current price
        const unitsSold = product.price > 0 ? Math.round(productRevenue / product.price) : 0;
        
        // Calculate average sale price for verification
        const avgSalePrice = unitsSold > 0 ? productRevenue / unitsSold : 0;

        return {
          ...product,
          revenue: productRevenue,
          costs: productCosts,
          profit: productProfit,
          unitsSold: unitsSold,
          avgSalePrice: avgSalePrice,
        };
      })
    );

    // Calculate daily revenue and profit for graphs (last 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    const recentRevenue = revenueTransactions.filter(tx => tx.createdAt >= thirtyDaysAgo);
    const recentCosts = costTransactions.filter(tx => tx.createdAt >= thirtyDaysAgo);

    // Group by day
    const dailyData: Record<string, { revenue: number; costs: number; profit: number }> = {};
    
    recentRevenue.forEach(tx => {
      const date = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, costs: 0, profit: 0 };
      }
      dailyData[date].revenue += tx.amount;
    });

    recentCosts.forEach(tx => {
      const date = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, costs: 0, profit: 0 };
      }
      dailyData[date].costs += tx.amount;
    });

    // Calculate profit for each day
    Object.keys(dailyData).forEach(date => {
      dailyData[date].profit = dailyData[date].revenue - dailyData[date].costs;
    });

    // Convert to array and sort by date
    const chartData = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        costs: data.costs,
        profit: data.profit,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      company: {
        ...company,
        balance,
      },
      totals: {
        revenue: totalRevenue,
        costs: totalCosts,
        profit: totalProfit,
      },
      products: productStats,
      chartData,
    };
  },
});
