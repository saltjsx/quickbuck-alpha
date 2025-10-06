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
    // Limit to 200 companies to reduce bandwidth
    const companies = await ctx.db.query("companies").take(200);
    
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
    
    // Batch fetch owners
    const ownerIds = companies.map(c => c.ownerId);
    const owners = await Promise.all(ownerIds.map(id => ctx.db.get(id)));
    
    // Create owner map
    const ownerMap = new Map();
    owners.forEach((owner: any, index) => {
      if (owner) {
        ownerMap.set(ownerIds[index], owner.name || "Unknown");
      }
    });

    const companiesWithBalance = companies.map((company) => ({
      ...company,
      balance: balanceMap.get(company.accountId) ?? 0,
      ownerName: ownerMap.get(company.ownerId) || "Unknown",
    }));

    return companiesWithBalance;
  },
});

// Get public companies (stock market)
export const getPublicCompanies = query({
  args: {},
  handler: async (ctx) => {
    // Limit to 100 public companies to reduce bandwidth
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .take(100);
    
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
    
    // Batch fetch owners
    const ownerIds = companies.map(c => c.ownerId);
    const owners = await Promise.all(ownerIds.map(id => ctx.db.get(id)));
    
    // Create owner map
    const ownerMap = new Map();
    owners.forEach((owner: any, index) => {
      if (owner) {
        ownerMap.set(ownerIds[index], owner.name || "Unknown");
      }
    });

    const enrichedCompanies = companies.map((company) => ({
      ...company,
      balance: balanceMap.get(company.accountId) ?? 0,
      ownerName: ownerMap.get(company.ownerId) || "Unknown",
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

    // Map results
    const result = validCompanies.map((company, index) => {
      const access = companyAccess.find(a => a.companyId === company._id);
      return {
        ...company,
        balance: accountBalanceMap.get(company.accountId) ?? 0,
        role: access?.role || "viewer",
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
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .filter((q) => q.eq(q.field("type"), "personal"))
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

    // Get all products for this company
    const products = await ctx.db
      .query("products")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Get cached balance directly from account
    const account = await ctx.db.get(company.accountId);
    const balance = account?.balance ?? 0;

    // OPTIMIZED: Use indexed queries to get only this company's transactions
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // Query only transactions TO this account
    const incoming = await ctx.db
      .query("ledger")
      .withIndex("by_to_account", (q) => q.eq("toAccountId", company.accountId))
      .filter((q) => q.gt(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    // Query only transactions FROM this account
    const outgoing = await ctx.db
      .query("ledger")
      .withIndex("by_from_account", (q) => q.eq("fromAccountId", company.accountId))
      .filter((q) => q.gt(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    // Calculate revenue (product purchases + batch marketplace)
    const revenueTransactions = incoming.filter(tx => 
      tx.type === "product_purchase" || tx.type === "marketplace_batch"
    );
    const totalRevenue = revenueTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Calculate costs (product costs + batch marketplace from company)
    const costTransactions = outgoing.filter(tx => 
      tx.type === "product_cost" || tx.type === "marketplace_batch"
    );
    const totalCosts = costTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Calculate expenses (operating costs, taxes, licenses, maintenance)
    const expenseTransactions = outgoing.filter(tx => tx.type === "expense");
    const totalExpenses = expenseTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Calculate profit (revenue - costs - expenses)
    const totalProfit = totalRevenue - totalCosts - totalExpenses;

    // OPTIMIZED: Use stored totalRevenue and totalCosts from products table
    const productStats = products.map((product) => {
      const productRevenue = product.totalRevenue || 0;
      const productCosts = product.totalCosts || 0;
      const productProfit = productRevenue - productCosts;
      
      // Use totalSales field for lifetime units sold
      const unitsSold = product.totalSales || 0;
      
      // Calculate avg sale price
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

    // Group by day for charts (OPTIMIZED: combine in one pass)
    const dailyData: Record<string, { revenue: number; costs: number; expenses: number; profit: number }> = {};
    
    // Process all transactions in one pass
    [...revenueTransactions, ...costTransactions, ...expenseTransactions].forEach(tx => {
      const date = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, costs: 0, expenses: 0, profit: 0 };
      }
      
      if (tx.type === "product_purchase" || (tx.type === "marketplace_batch" && tx.toAccountId === company.accountId)) {
        dailyData[date].revenue += tx.amount || 0;
      } else if (tx.type === "product_cost" || (tx.type === "marketplace_batch" && tx.fromAccountId === company.accountId)) {
        dailyData[date].costs += tx.amount || 0;
      } else if (tx.type === "expense") {
        dailyData[date].expenses += tx.amount || 0;
      }
      
      dailyData[date].profit = dailyData[date].revenue - dailyData[date].costs - dailyData[date].expenses;
    });

    // Convert to array and sort by date (limit to 30 most recent days)
    const chartData = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        costs: data.costs,
        expenses: data.expenses,
        profit: data.profit,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Keep only last 30 days for chart

    return {
      company: {
        ...company,
        balance,
      },
      totals: {
        revenue: totalRevenue,
        costs: totalCosts,
        expenses: totalExpenses,
        profit: totalProfit,
      },
      products: productStats,
      chartData,
    };
  },
});
