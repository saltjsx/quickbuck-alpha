import { query } from "./_generated/server";
import { v } from "convex/values";

export const getStockPriceHistory = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("asc")
      .collect();

    return results.map(r => ({
      price: r.price,
      timestamp: r._creationTime,
    }));
  },
});