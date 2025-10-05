import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

/**
 * Balance Management System
 * 
 * This module manages account balances using a dedicated balances table
 * instead of calculating from the ledger, which improves performance dramatically.
 */

// Get balance for an account
export const getBalance = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const balanceRecord = await ctx.db
      .query("balances")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .first();

    return balanceRecord?.balance ?? 0;
  },
});

// Internal mutation to update a balance (called by other mutations)
export const updateBalance = internalMutation({
  args: {
    accountId: v.id("accounts"),
    amount: v.number(), // Positive to add, negative to subtract
  },
  handler: async (ctx, args) => {
    const balanceRecord = await ctx.db
      .query("balances")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .first();

    if (balanceRecord) {
      // Update existing balance
      const newBalance = balanceRecord.balance + args.amount;
      await ctx.db.patch(balanceRecord._id, {
        balance: newBalance,
        lastUpdated: Date.now(),
      });
      
      // Also update the cached balance on the account
      await ctx.db.patch(args.accountId, { balance: newBalance });
      
      return newBalance;
    } else {
      // Create new balance record
      const newBalance = args.amount;
      await ctx.db.insert("balances", {
        accountId: args.accountId,
        balance: newBalance,
        lastUpdated: Date.now(),
      });
      
      // Also update the cached balance on the account
      await ctx.db.patch(args.accountId, { balance: newBalance });
      
      return newBalance;
    }
  },
});

// Transfer between accounts and update balances
export const transfer = internalMutation({
  args: {
    fromAccountId: v.id("accounts"),
    toAccountId: v.id("accounts"),
    amount: v.number(),
    type: v.string(),
    description: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    batchCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Update balances
    await ctx.scheduler.runAfter(0, "balances:updateBalance" as any, {
      accountId: args.fromAccountId,
      amount: -args.amount,
    });
    
    await ctx.scheduler.runAfter(0, "balances:updateBalance" as any, {
      accountId: args.toAccountId,
      amount: args.amount,
    });

    // Record in ledger
    await ctx.db.insert("ledger", {
      fromAccountId: args.fromAccountId,
      toAccountId: args.toAccountId,
      amount: args.amount,
      type: args.type as any,
      description: args.description,
      productId: args.productId,
      batchCount: args.batchCount,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Initialize balance for a new account
export const initializeBalance = internalMutation({
  args: {
    accountId: v.id("accounts"),
    initialBalance: v.number(),
  },
  handler: async (ctx, args) => {
    // Create balance record
    await ctx.db.insert("balances", {
      accountId: args.accountId,
      balance: args.initialBalance,
      lastUpdated: Date.now(),
    });

    // Update account cached balance
    await ctx.db.patch(args.accountId, {
      balance: args.initialBalance,
    });

    return args.initialBalance;
  },
});

// Migration: Sync balance from account to balances table
export const syncBalanceFromAccount = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) throw new Error("Account not found");

    const balance = account.balance ?? 0;

    // Check if balance record exists
    const existingBalance = await ctx.db
      .query("balances")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .first();

    if (existingBalance) {
      await ctx.db.patch(existingBalance._id, {
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

// Migration: Sync all accounts to balances table
export const syncAllBalances = mutation({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect();
    
    const results = [];
    for (const account of accounts) {
      const balance = account.balance ?? 0;

      const existingBalance = await ctx.db
        .query("balances")
        .withIndex("by_account", (q) => q.eq("accountId", account._id))
        .first();

      if (existingBalance) {
        await ctx.db.patch(existingBalance._id, {
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

      results.push({ accountId: account._id, balance });
    }

    return results;
  },
});
