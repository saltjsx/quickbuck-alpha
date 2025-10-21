import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Set maintenance mode status
 * This is called by the maintenance script to enable/disable maintenance mode
 */
export const setMaintenanceMode = mutation({
  args: {
    isActive: v.boolean(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Store maintenance status - clear all existing and insert new
    // We'll use a singleton pattern by clearing the table
    const existing = await ctx.db.query("maintenance").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: args.isActive,
        message: args.message || "System maintenance in progress",
        startedAt: args.isActive ? Date.now() : undefined,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("maintenance", {
        isActive: args.isActive,
        message: args.message || "System maintenance in progress",
        startedAt: args.isActive ? Date.now() : undefined,
        updatedAt: Date.now(),
      });
    }

    return { success: true, isActive: args.isActive };
  },
});

/**
 * Get current maintenance mode status
 * Can be called by client to check if maintenance is active
 */
export const getMaintenanceStatus = query({
  args: {},
  handler: async (ctx) => {
    const status = await ctx.db
      .query("maintenance")
      .first();

    if (!status) {
      return {
        isActive: false,
        message: null,
        startedAt: null,
        updatedAt: null,
      };
    }

    return {
      isActive: status.isActive || false,
      message: status.message || null,
      startedAt: status.startedAt || null,
      updatedAt: status.updatedAt || null,
    };
  },
});
