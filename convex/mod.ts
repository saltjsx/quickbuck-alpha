import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Query to get a user by username or email (for mod panel)
export const searchUser = query({
  args: {
    query: v.string(),
    modKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.modKey !== process.env.MOD_PASSKEY) {
      throw new Error("Invalid mod key");
    }

    const searchLower = args.query.toLowerCase();

    // Try to find by username first
    const byUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.query))
      .first();

    if (byUsername) {
      return [byUsername];
    }

    // Try to find by email (partial match)
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.filter((u) =>
      u.email?.toLowerCase().includes(searchLower) ||
      u.username?.toLowerCase().includes(searchLower)
    );
  },
});

// Get all warnings for a user (mod panel version)
export const getUserWarningsForMod = query({
  args: {
    userId: v.id("users"),
    modKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.modKey !== process.env.MOD_PASSKEY) {
      throw new Error("Invalid mod key");
    }

    const warnings = await ctx.db
      .query("userWarnings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return warnings.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get all companies owned by a user
export const getUserCompanies = query({
  args: {
    userId: v.id("users"),
    modKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.modKey !== process.env.MOD_PASSKEY) {
      throw new Error("Invalid mod key");
    }

    const companies = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    return companies;
  },
});

// Get all products by a company
export const getCompanyProducts = query({
  args: {
    companyId: v.id("companies"),
    modKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.modKey !== process.env.MOD_PASSKEY) {
      throw new Error("Invalid mod key");
    }

    const products = await ctx.db
      .query("products")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    return products;
  },
});

// Mod: Warn a user
export const modWarnUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
    modKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.modKey !== process.env.MOD_PASSKEY) {
      throw new Error("Invalid mod key");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

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
      reason: args.reason,
    };
  },
});

// Mod: Ban a user
export const modBanUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
    modKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.modKey !== process.env.MOD_PASSKEY) {
      throw new Error("Invalid mod key");
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

    // Create ban record
    const banId = await ctx.db.insert("userBans", {
      email,
      userId: args.userId,
      reason: args.reason,
      bannedAt: Date.now(),
      bannedBy: "MOD_PANEL",
    });

    return {
      success: true,
      banId,
      userId: args.userId,
      reason: args.reason,
    };
  },
});

// Mod: Delete a product
export const modDeleteProduct = mutation({
  args: {
    productId: v.id("products"),
    modKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.modKey !== process.env.MOD_PASSKEY) {
      throw new Error("Invalid mod key");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Deactivate the product
    await ctx.db.patch(args.productId, { isActive: false });

    return {
      success: true,
      productId: args.productId,
      productName: product.name,
    };
  },
});

// Mod: Delete a company
export const modDeleteCompany = mutation({
  args: {
    companyId: v.id("companies"),
    modKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.modKey !== process.env.MOD_PASSKEY) {
      throw new Error("Invalid mod key");
    }

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Deactivate all products
    const products = await ctx.db
      .query("products")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const product of products) {
      await ctx.db.patch(product._id, { isActive: false });
    }

    // Delete all stocks for this company
    const stocks = await ctx.db
      .query("stocks")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const stock of stocks) {
      await ctx.db.delete(stock._id);
    }

    // Delete company
    await ctx.db.delete(args.companyId);

    return {
      success: true,
      companyId: args.companyId,
      companyName: company.name,
    };
  },
});
