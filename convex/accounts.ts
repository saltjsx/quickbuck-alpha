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

// Helper to calculate balance for an account with pagination to avoid hitting limits
// This should only be used for migration or repair, not for regular balance checks
async function calculateBalance(ctx: any, accountId: any) {
  let totalIn = 0;
  let totalOut = 0;
  
  // Paginate incoming transactions
  const incomingIterator = ctx.db
    .query("ledger")
    .withIndex("by_to_account", (q: any) => q.eq("toAccountId", accountId));
  
  for await (const tx of incomingIterator) {
    totalIn += tx.amount;
  }
  
  // Paginate outgoing transactions
  const outgoingIterator = ctx.db
    .query("ledger")
    .withIndex("by_from_account", (q: any) => q.eq("fromAccountId", accountId));
  
  for await (const tx of outgoingIterator) {
    totalOut += tx.amount;
  }

  return totalIn - totalOut;
}

// Get account balance from balances table
export const getBalance = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const balanceRecord = await ctx.db
      .query("balances")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .first();

    if (balanceRecord) {
      return balanceRecord.balance;
    }

    // Fallback to account cached balance
    const account = await ctx.db.get(args.accountId);
    return account?.balance ?? 0;
  },
});

// Get user's personal account
export const getPersonalAccount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return null;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.eq(q.field("type"), "personal"))
      .first();

    return account;
  },
});

// Get all accounts for a user (personal + companies they have access to)
export const getUserAccounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    // Get personal account
    const personalAccount = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.eq(q.field("type"), "personal"))
      .first();

    // Get company accounts where user has access
    const companyAccess = await ctx.db
      .query("companyAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Batch fetch companies
    const companyIds = companyAccess.map(a => a.companyId);
    const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));
    
    // Batch fetch company accounts
    const companyAccounts = await Promise.all(
      companies
        .filter(Boolean)
        .map((company: any) => ctx.db.get(company.accountId))
    );

    // Build result with company names
    const companyAccountsWithNames = companyAccounts
      .map((account: any, index) => {
        const company = companies[index];
        return account && company ? { ...account, companyName: (company as any).name } : null;
      })
      .filter(Boolean);

    const accounts = [personalAccount, ...companyAccountsWithNames].filter(Boolean);
    
    // Use cached balance from account directly
    const accountsWithBalance = accounts.map((account: any) => ({
      ...account,
      balance: account.balance ?? 0,
    }));

    return accountsWithBalance;
  },
});

// Initialize user's personal account with $10,000
export const initializeAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if account already exists
    const existingAccount = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.eq(q.field("type"), "personal"))
      .first();

    if (existingAccount) {
      return existingAccount._id;
    }

    // Create personal account with initial balance
    const accountId = await ctx.db.insert("accounts", {
      name: "Personal Account",
      type: "personal",
      ownerId: userId,
      balance: 10000, // Initial balance of $10,000
      createdAt: Date.now(),
    });

    // Create balance record
    await ctx.db.insert("balances", {
      accountId,
      balance: 10000,
      lastUpdated: Date.now(),
    });

    // Create system account if it doesn't exist (for initial deposits)
    let systemAccount = await ctx.db
      .query("accounts")
      .filter((q) => q.eq(q.field("name"), "System"))
      .first();

    if (!systemAccount) {
      const systemAccountId = await ctx.db.insert("accounts", {
        name: "System",
        type: "personal",
        ownerId: userId, // Dummy owner
        balance: 0,
        createdAt: Date.now(),
      });
      
      // Create balance record for system account
      await ctx.db.insert("balances", {
        accountId: systemAccountId,
        balance: 0,
        lastUpdated: Date.now(),
      });
      
      systemAccount = await ctx.db.get(systemAccountId);
    }

    // Initial deposit of $10,000 (ledger for record-keeping only)
    await ctx.db.insert("ledger", {
      fromAccountId: systemAccount!._id,
      toAccountId: accountId,
      amount: 10000,
      type: "initial_deposit",
      description: "Initial deposit",
      createdAt: Date.now(),
    });

    // Note: Balance is already set on account creation above

    return accountId;
  },
});

// Transfer money between accounts
export const transfer = mutation({
  args: {
    fromAccountId: v.id("accounts"),
    toAccountId: v.id("accounts"),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify user has access to from account
    const fromAccount = await ctx.db.get(args.fromAccountId);
    if (!fromAccount) throw new Error("Source account not found");

    // Check if user owns the account or has access
    let hasAccess = fromAccount.ownerId === userId;
    
    if (!hasAccess && fromAccount.type === "company" && fromAccount.companyId) {
      const access = await ctx.db
        .query("companyAccess")
        .withIndex("by_company_user", (q) =>
          q.eq("companyId", fromAccount.companyId!).eq("userId", userId)
        )
        .first();
      hasAccess = !!access;
    }

    if (!hasAccess) throw new Error("No access to source account");

    // Check balance from cached account balance
    const balance = fromAccount.balance ?? 0;

    if (balance < args.amount) throw new Error("Insufficient funds");

    // Get toAccount
    const toAccount = await ctx.db.get(args.toAccountId);
    if (!toAccount) throw new Error("Destination account not found");

    const toBalance = toAccount.balance ?? 0;

    // Update from account balance
    await ctx.db.patch(args.fromAccountId, { 
      balance: balance - args.amount 
    });

    // Update to account balance
    await ctx.db.patch(args.toAccountId, { 
      balance: toBalance + args.amount 
    });

    // Create transfer ledger entry for record-keeping
    await ctx.db.insert("ledger", {
      fromAccountId: args.fromAccountId,
      toAccountId: args.toAccountId,
      amount: args.amount,
      type: "transfer",
      description: args.description,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation to recalculate balance for an account (use this to migrate existing accounts)
export const recalculateBalance = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const balance = await calculateBalance(ctx, args.accountId);
    await ctx.db.patch(args.accountId, { balance });
    
    // Sync to balances table
    const balanceRecord = await ctx.db
      .query("balances")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .first();
    
    if (balanceRecord) {
      await ctx.db.patch(balanceRecord._id, {
        balance,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("balances", {
        accountId: args.accountId,
        balance,
        lastUpdated: Date.now(),
      });
    }
    
    return balance;
  },
});

// Mutation to recalculate all account balances (migration helper)
export const recalculateAllBalances = mutation({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect();
    
    const results = [];
    for (const account of accounts) {
      try {
        const balance = await calculateBalance(ctx, account._id);
        await ctx.db.patch(account._id, { balance });
        
        // Sync to balances table
        const balanceRecord = await ctx.db
          .query("balances")
          .withIndex("by_account", (q) => q.eq("accountId", account._id))
          .first();
        
        if (balanceRecord) {
          await ctx.db.patch(balanceRecord._id, {
            balance,
            lastUpdated: Date.now(),
          });
        } else {
          await ctx.db.insert("balances", {
            accountId: account._id,
            balance,
            lastUpdated: Date.now(),
          });
        }
        
        results.push({ accountId: account._id, balance, success: true });
      } catch (error: any) {
        results.push({ accountId: account._id, success: false, error: error.message });
      }
    }
    
    return results;
  },
});

// Get transaction history for an account
export const getTransactions = query({
  args: { accountId: v.id("accounts"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // OPTIMIZED: Query only from/to this account with proper index usage
    const fromTransactions = await ctx.db
      .query("ledger")
      .withIndex("by_from_account", (q) => q.eq("fromAccountId", args.accountId))
      .order("desc")
      .take(limit);

    const toTransactions = await ctx.db
      .query("ledger")
      .withIndex("by_to_account", (q) => q.eq("toAccountId", args.accountId))
      .order("desc")
      .take(limit);

    // Combine and sort
    const allTransactions = [...fromTransactions, ...toTransactions]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    // OPTIMIZED: Batch fetch account names
    const accountIds = new Set<string>();
    allTransactions.forEach(tx => {
      accountIds.add(tx.fromAccountId);
      accountIds.add(tx.toAccountId);
    });

    const accounts = await Promise.all(
      Array.from(accountIds).map(id => ctx.db.get(id as any))
    );

    const accountMap = new Map();
    accounts.forEach(account => {
      if (account && 'name' in account) {
        accountMap.set(account._id, account.name);
      }
    });

    // Map with cached account names
    const enrichedTransactions = allTransactions.map(tx => ({
      ...tx,
      fromAccountName: accountMap.get(tx.fromAccountId) || "Unknown",
      toAccountName: accountMap.get(tx.toAccountId) || "Unknown",
    }));

    return enrichedTransactions;
  },
});

// Search for users by username or email
export const searchUsers = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    if (!args.searchTerm || args.searchTerm.length < 2) return [];

    const users = await ctx.db.query("users").collect();
    
    const searchLower = args.searchTerm.toLowerCase();
    const matchedUsers = users.filter(user => 
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower)
    );

    // Return user info with their personal account
    const usersWithAccounts = await Promise.all(
      matchedUsers.map(async (user) => {
        const account = await ctx.db
          .query("accounts")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .filter((q) => q.eq(q.field("type"), "personal"))
          .first();

        return {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          accountId: account?._id,
        };
      })
    );

    return usersWithAccounts.filter(u => u.accountId);
  },
});

// Search for companies by name or ticker
export const searchCompanies = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    if (!args.searchTerm || args.searchTerm.length < 1) return [];

    const companies = await ctx.db.query("companies").collect();
    
    const searchLower = args.searchTerm.toLowerCase();
    const matchedCompanies = companies.filter(company => 
      company.ticker.toLowerCase().includes(searchLower) ||
      company.name.toLowerCase().includes(searchLower)
    );

    return matchedCompanies.map(company => ({
      _id: company._id,
      name: company.name,
      ticker: company.ticker,
      accountId: company.accountId,
      logoUrl: company.logoUrl,
    }));
  },
});

