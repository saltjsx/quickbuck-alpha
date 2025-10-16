import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// Check if a user is banned
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

    // Get all companies owned by this user
    const userCompanies = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    // Delete all products associated with user's companies
    let productsDeleted = 0;
    for (const company of userCompanies) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const product of products) {
        // Delete collections (purchases) for this product
        const collections = await ctx.db
          .query("collections")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .collect();

        for (const collection of collections) {
          await ctx.db.delete(collection._id);
        }

        // Delete the product
        await ctx.db.delete(product._id);
        productsDeleted++;
      }

      // Delete company access records
      const accessRecords = await ctx.db
        .query("companyAccess")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const access of accessRecords) {
        await ctx.db.delete(access._id);
      }

      // Delete stock transactions
      const transactions = await ctx.db
        .query("stockTransactions")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const transaction of transactions) {
        await ctx.db.delete(transaction._id);
      }

      // Delete stock price history
      const priceHistory = await ctx.db
        .query("stockPriceHistory")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const history of priceHistory) {
        await ctx.db.delete(history._id);
      }

      // Delete all stocks (holdings) for this company
      const stocks = await ctx.db
        .query("stocks")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const stock of stocks) {
        await ctx.db.delete(stock._id);
      }

      // Delete company sale offers
      const saleOffers = await ctx.db
        .query("companySaleOffers")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const offer of saleOffers) {
        await ctx.db.delete(offer._id);
      }

      // Delete company expenses
      const expenses = await ctx.db
        .query("expenses")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const expense of expenses) {
        await ctx.db.delete(expense._id);
      }

      // Delete company metrics
      const metrics = await ctx.db
        .query("companyMetrics")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const metric of metrics) {
        await ctx.db.delete(metric._id);
      }

      // Delete licenses
      const licenses = await ctx.db
        .query("licenses")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const license of licenses) {
        await ctx.db.delete(license._id);
      }

      // Delete the company itself
      await ctx.db.delete(company._id);
    }

    // Delete user's company accounts
    const userAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    let accountsDeleted = 0;
    for (const account of userAccounts) {
      // Delete ledger entries
      const fromLedger = await ctx.db
        .query("ledger")
        .withIndex("by_from_account_created", (q) => q.eq("fromAccountId", account._id))
        .collect();

      for (const entry of fromLedger) {
        await ctx.db.delete(entry._id);
      }

      const toLedger = await ctx.db
        .query("ledger")
        .withIndex("by_to_account_created", (q) => q.eq("toAccountId", account._id))
        .collect();

      for (const entry of toLedger) {
        await ctx.db.delete(entry._id);
      }

      // Delete gambles
      const gambles = await ctx.db
        .query("gambles")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const gamble of gambles) {
        await ctx.db.delete(gamble._id);
      }

      // Delete blackjack states
      const blackjackStates = await ctx.db
        .query("blackjackStates")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const state of blackjackStates) {
        await ctx.db.delete(state._id);
      }

      // Delete collections (products purchased)
      const collections = await ctx.db
        .query("collections")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const collection of collections) {
        await ctx.db.delete(collection._id);
      }

      // Delete loans
      const loans = await ctx.db
        .query("loans")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const loan of loans) {
        await ctx.db.delete(loan._id);
      }

      // Delete stocks held by user
      const userStocks = await ctx.db
        .query("stocks")
        .withIndex("by_holder_holderType", (q) => q.eq("holderId", args.userId).eq("holderType", "user"))
        .collect();

      for (const stock of userStocks) {
        await ctx.db.delete(stock._id);
      }

      // Delete stock transactions
      const userTransactions = await ctx.db
        .query("stockTransactions")
        .withIndex("by_buyer", (q) => q.eq("buyerId", args.userId))
        .collect();

      for (const transaction of userTransactions) {
        await ctx.db.delete(transaction._id);
      }

      // Delete the account
      await ctx.db.delete(account._id);
      accountsDeleted++;
    }

    // Create ban record
    const banId = await ctx.db.insert("userBans", {
      email,
      userId: args.userId,
      reason: args.reason,
      bannedAt: Date.now(),
    });

    return {
      success: true,
      banId,
      userId: args.userId,
      userName: user.name || user.email || "Unknown",
      email,
      reason: args.reason,
      companiesDeleted: userCompanies.length,
      productsDeleted,
      accountsDeleted,
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
