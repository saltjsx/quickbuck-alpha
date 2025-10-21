import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

/**
 * Restore account balances from ledger - process one at a time
 */
export const restoreOneAccount = internalMutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const accountId = args.accountId;

    // Get incoming transactions
    const incomingTx = await ctx.db
      .query("ledger")
      .withIndex("by_to_account_created", (q) => q.eq("toAccountId", accountId))
      .collect();

    // Get outgoing transactions
    const outgoingTx = await ctx.db
      .query("ledger")
      .withIndex("by_from_account_created", (q) =>
        q.eq("fromAccountId", accountId)
      )
      .collect();

    // Calculate balance
    let balance = 0;
    for (const tx of incomingTx) {
      balance += tx.amount || 0;
    }
    for (const tx of outgoingTx) {
      balance -= tx.amount || 0;
    }

    // Update
    await ctx.db.patch(accountId, { balance });

    return { balance };
  },
});

/**
 * Get all accounts except system
 */
export const getAllNonSystemAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("accounts").collect();
    return all.filter((a) => a.name !== "System");
  },
});
