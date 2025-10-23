import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const findUserByToken = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Check if we've already stored this identity before
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (user !== null) {
      return user;
    }

    return null;
  },
});

export const upsertUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      // Update if needed
      if (
        existingUser.name !== identity.name ||
        existingUser.email !== identity.email
      ) {
        await ctx.db.patch(existingUser._id, {
          name: identity.name,
          email: identity.email,
        });
      }
      return existingUser;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.subject,
    });

    const user = await ctx.db.get(userId);

    if (!user) {
      return null;
    }

    // Create personal account with starting balance
    const STARTING_BALANCE = parseInt(
      process.env.QUICKBUCK_START_BALANCE || "10000000"
    ); // $100,000 in cents

    const accountId = await ctx.db.insert("accounts", {
      type: "personal",
      userId: user._id,
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
        userId: user._id,
      },
    });

    return user;
  },
});
