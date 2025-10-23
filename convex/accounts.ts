/**
 * Account management functions for Quickbuck
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const STARTING_BALANCE = parseInt(process.env.QUICKBUCK_START_BALANCE || "10000000"); // $100,000 in cents

/**
 * Create a personal account for a user with starting balance
 */
export const createPersonalAccountForUser = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("Unauthorized: User must be authenticated");
    }

    // Check if user already has a personal account
    const existingAccount = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "personal"))
      .first();

    if (existingAccount) {
      return existingAccount;
    }

    // Create personal account
    const accountId = await ctx.db.insert("accounts", {
      type: "personal",
      userId: args.userId,
      balance: STARTING_BALANCE,
      canGoNegative: false,
    });

    // Create transaction record for account creation
    await ctx.db.insert("transactions", {
      type: "account_creation",
      toAccountId: accountId,
      amount: STARTING_BALANCE,
      description: "Initial account balance",
      metadata: {
        userId: args.userId,
      },
    });

    return await ctx.db.get(accountId);
  },
});

/**
 * Get user's personal account
 */
export const getPersonalAccount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      return null;
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Get personal account
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("type"), "personal"))
      .first();

    return account;
  },
});

/**
 * Get all accounts for current user (personal + company accounts they own)
 */
export const getUserAccounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      return [];
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    // Get all accounts for this user
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return accounts;
  },
});

/**
 * Get account by ID (with permission check)
 */
export const getAccountById = query({
  args: {
    accountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("Unauthorized: User must be authenticated");
    }

    const account = await ctx.db.get(args.accountId);
    
    if (!account) {
      throw new Error("Account not found");
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check permission: user must own the account
    if (account.userId !== user._id) {
      throw new Error("Unauthorized: You do not own this account");
    }

    return account;
  },
});

/**
 * Update account balance (internal use only, requires transaction)
 */
export const updateAccountBalance = mutation({
  args: {
    accountId: v.id("accounts"),
    newBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    
    if (!account) {
      throw new Error("Account not found");
    }

    // Check if balance can go negative
    if (!account.canGoNegative && args.newBalance < 0) {
      throw new Error("Insufficient funds: Account balance cannot go negative");
    }

    await ctx.db.patch(args.accountId, {
      balance: args.newBalance,
    });

    return await ctx.db.get(args.accountId);
  },
});
