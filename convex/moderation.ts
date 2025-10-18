import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// Check if a user is banned (by email - for admin use)
export const checkIfBanned = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const ban = await ctx.db
      .query("userBans")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (ban) {
      return {
        isBanned: true,
        reason: ban.reason,
        bannedAt: ban.bannedAt,
      };
    }

    return {
      isBanned: false,
    };
  },
});

// Check if the current authenticated user is banned
export const checkCurrentUserBan = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { isBanned: false };

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user || !user.email) return { isBanned: false };

    const userEmail = user.email.toLowerCase();
    const ban = await ctx.db
      .query("userBans")
      .withIndex("by_email", (q) => q.eq("email", userEmail))
      .first();

    if (ban) {
      return {
        isBanned: true,
        reason: ban.reason,
        bannedAt: ban.bannedAt,
      };
    }

    return {
      isBanned: false,
    };
  },
});

// Get unacknowledged warnings for a user
export const getUnacknowledgedWarnings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return null;

    const warnings = await ctx.db
      .query("userWarnings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isAcknowledged"), false))
      .collect();

    return warnings.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Acknowledge a warning
export const acknowledgeWarning = mutation({
  args: { warningId: v.id("userWarnings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const warning = await ctx.db.get(args.warningId);
    if (!warning) throw new Error("Warning not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user || user._id !== warning.userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.warningId, {
      isAcknowledged: true,
      acknowledgedAt: Date.now(),
    });
  },
});

// Admin: Warn a user
export const warnUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify admin key
    if (args.adminKey !== process.env.ADMIN_KEY) {
      throw new Error("Invalid admin key");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Create warning record
    const warningId = await ctx.db.insert("userWarnings", {
      userId: args.userId,
      reason: args.reason,
      severity: "warning",
      isAcknowledged: false,
      createdAt: Date.now(),
    });

    return {
      success: true,
      warningId,
      userId: args.userId,
      userName: user.name || user.email || "Unknown",
      reason: args.reason,
    };
  },
});

// Helper function to batch delete related entities
async function deleteUserData(ctx: any, userId: Id<"users">) {
  let operationCount = 0;
  const MAX_OPS_PER_CALL = 3000; // Leave buffer for the read limit
  
  // Delete companies and all related data
  let hasMoreCompanies = true;
  while (hasMoreCompanies) {
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q: any) => q.eq("ownerId", userId))
      .take(50);

    if (companies.length === 0) break;
    hasMoreCompanies = companies.length === 50;

    for (const company of companies) {
      // Delete company products
      let hasMoreProducts = true;
      while (hasMoreProducts && operationCount < MAX_OPS_PER_CALL) {
        const products = await ctx.db
          .query("products")
          .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
          .take(30);

        if (products.length === 0) break;
        hasMoreProducts = products.length === 30;

        for (const product of products) {
          const collections = await ctx.db
            .query("collections")
            .withIndex("by_product", (q: any) => q.eq("productId", product._id))
            .take(50);

          for (const collection of collections) {
            await ctx.db.delete(collection._id);
            operationCount++;
          }

          await ctx.db.delete(product._id);
          operationCount++;
        }
      }

      // Delete company's other data
      const dataTables = [
        { table: "companyAccess", index: "by_company" },
        { table: "stockTransactions", index: "by_company" },
        { table: "stockPriceHistory", index: "by_company" },
        { table: "stocks", index: "by_company" },
        { table: "companySaleOffers", index: "by_company" },
        { table: "expenses", index: "by_company" },
        { table: "companyMetrics", index: "by_company" },
        { table: "licenses", index: "by_company" },
      ];

      for (const { table, index } of dataTables) {
        if (operationCount > MAX_OPS_PER_CALL) break;
        
        let hasMore = true;
        while (hasMore && operationCount < MAX_OPS_PER_CALL) {
          const records = await ctx.db
            .query(table as any)
            .withIndex(index as any, (q: any) => q.eq("companyId", company._id))
            .take(50);

          if (records.length === 0) break;
          hasMore = records.length === 50;

          for (const record of records) {
            await ctx.db.delete(record._id);
            operationCount++;
          }
        }
      }

      if (operationCount < MAX_OPS_PER_CALL) {
        await ctx.db.delete(company._id);
        operationCount++;
      }
    }

    if (operationCount > MAX_OPS_PER_CALL) break;
  }

  // Delete user's accounts and ledger
  let hasMoreAccounts = true;
  while (hasMoreAccounts && operationCount < MAX_OPS_PER_CALL) {
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q: any) => q.eq("ownerId", userId))
      .take(30);

    if (accounts.length === 0) break;
    hasMoreAccounts = accounts.length === 30;

    for (const account of accounts) {
      // Delete ledger entries
      let hasMoreLedger = true;
      while (hasMoreLedger && operationCount < MAX_OPS_PER_CALL) {
        const ledger = await ctx.db
          .query("ledger")
          .withIndex("by_from_account_created", (q: any) => q.eq("fromAccountId", account._id))
          .take(50);

        if (ledger.length === 0) {
          hasMoreLedger = false;
        } else {
          for (const entry of ledger) {
            await ctx.db.delete(entry._id);
            operationCount++;
          }
        }
      }

      let hasMoreToLedger = true;
      while (hasMoreToLedger && operationCount < MAX_OPS_PER_CALL) {
        const ledger = await ctx.db
          .query("ledger")
          .withIndex("by_to_account_created", (q: any) => q.eq("toAccountId", account._id))
          .take(50);

        if (ledger.length === 0) {
          hasMoreToLedger = false;
        } else {
          for (const entry of ledger) {
            await ctx.db.delete(entry._id);
            operationCount++;
          }
        }
      }

      if (operationCount < MAX_OPS_PER_CALL) {
        await ctx.db.delete(account._id);
        operationCount++;
      }
    }

    if (operationCount > MAX_OPS_PER_CALL) break;
  }

  // Delete user's personal data
  const personalDataTables = [
    { table: "gambles", index: "by_user" },
    { table: "blackjackStates", index: "by_user" },
    { table: "collections", index: "by_user" },
    { table: "loans", index: "by_user" },
    { table: "userWarnings", index: "by_user" },
  ];

  for (const { table, index } of personalDataTables) {
    if (operationCount > MAX_OPS_PER_CALL) break;
    
    let hasMore = true;
    while (hasMore && operationCount < MAX_OPS_PER_CALL) {
      const records = await ctx.db
        .query(table as any)
        .withIndex(index as any, (q: any) => q.eq("userId", userId))
        .take(50);

      if (records.length === 0) break;
      hasMore = records.length === 50;

      for (const record of records) {
        await ctx.db.delete(record._id);
        operationCount++;
      }
    }

    if (operationCount > MAX_OPS_PER_CALL) break;
  }

  // Delete user's stocks
  if (operationCount < MAX_OPS_PER_CALL) {
    let hasMoreStocks = true;
    while (hasMoreStocks && operationCount < MAX_OPS_PER_CALL) {
      const stocks = await ctx.db
        .query("stocks")
        .withIndex("by_holder_holderType", (q: any) =>
          q.eq("holderId", userId).eq("holderType", "user")
        )
        .take(50);

      if (stocks.length === 0) break;
      hasMoreStocks = stocks.length === 50;

      for (const stock of stocks) {
        await ctx.db.delete(stock._id);
        operationCount++;
      }
    }
  }

  // Delete user's stock transactions
  if (operationCount < MAX_OPS_PER_CALL) {
    let hasMoreTx = true;
    while (hasMoreTx && operationCount < MAX_OPS_PER_CALL) {
      const transactions = await ctx.db
        .query("stockTransactions")
        .withIndex("by_buyer", (q: any) => q.eq("buyerId", userId))
        .take(50);

      if (transactions.length === 0) break;
      hasMoreTx = transactions.length === 50;

      for (const tx of transactions) {
        await ctx.db.delete(tx._id);
        operationCount++;
      }
    }
  }

  return operationCount;
}

// Admin: Ban a user
export const banUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify admin key
    if (args.adminKey !== process.env.ADMIN_KEY) {
      throw new Error("Invalid admin key");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const email = (user.email || "").toLowerCase();
    if (!email) throw new Error("User has no email on file");

    // Check if already banned
    const existingBan = await ctx.db
      .query("userBans")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingBan) {
      throw new Error("User is already banned");
    }

    // Create ban record first
    const banId = await ctx.db.insert("userBans", {
      email,
      userId: args.userId,
      reason: args.reason,
      bannedAt: Date.now(),
    });

    // Delete user data in batches
    const operationsCompleted = await deleteUserData(ctx, args.userId);

    return {
      success: true,
      banId,
      userId: args.userId,
      userName: user.name || user.email || "Unknown",
      email,
      reason: args.reason,
      status: `Ban created. Deleted ${operationsCompleted} records.`,
    };
  },
});

// Admin: Get ban record by email
export const getBanRecord = query({
  args: {
    email: v.string(),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.adminKey !== process.env.ADMIN_KEY) {
      throw new Error("Invalid admin key");
    }

    const ban = await ctx.db
      .query("userBans")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    return ban || null;
  },
});

// Admin: Get all warnings for a user
export const getUserWarnings = query({
  args: {
    userId: v.id("users"),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.adminKey !== process.env.ADMIN_KEY) {
      throw new Error("Invalid admin key");
    }

    const warnings = await ctx.db
      .query("userWarnings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return warnings.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Admin: Unban a user (remove from blacklist)
export const unbanUser = mutation({
  args: {
    email: v.string(),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.adminKey !== process.env.ADMIN_KEY) {
      throw new Error("Invalid admin key");
    }

    const ban = await ctx.db
      .query("userBans")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!ban) {
      throw new Error("No ban record found for this email");
    }

    await ctx.db.delete(ban._id);

    return {
      success: true,
      email: args.email,
      unbannedAt: Date.now(),
    };
  },
});
