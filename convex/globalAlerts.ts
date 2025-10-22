import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Send a global alert to all users
 * Shows once to everyone with an info icon
 */
export const sendAlert = mutation({
  args: {
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // Insert the alert
    const alertId = await ctx.db.insert("globalAlerts", {
      title: args.title,
      description: args.description,
      createdAt: Date.now(),
    });

    return { success: true, alertId };
  },
});

/**
 * Get all global alerts
 */
export const getAlerts = query({
  args: {},
  handler: async (ctx) => {
    const alerts = await ctx.db
      .query("globalAlerts")
      .order("desc")
      .collect();

    return alerts;
  },
});

/**
 * Delete a global alert
 */
export const deleteAlert = mutation({
  args: {
    alertId: v.id("globalAlerts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.alertId);
    return { success: true };
  },
});
