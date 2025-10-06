import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

/**
 * Company Expenses System
 * 
 * This module handles:
 * 1. Operating Costs - rent, staff, logistics (scales with revenue)
 * 2. Taxes - corporate tax on profits
 * 3. License Fees - required to operate in certain industries
 * 4. Maintenance - product quality degradation and R&D costs
 */

// Helper to get current user ID
async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
    .unique();
  
  return user?._id || null;
}

// License costs by industry
const LICENSE_COSTS: Record<string, number> = {
  "tech": 5000,
  "food": 3000,
  "transport": 4000,
  "finance": 10000,
  "manufacturing": 6000,
  "retail": 2000,
  "other": 1000,
};

// License duration (in days)
const LICENSE_DURATION_DAYS = 90; // 90 days (3 months)

// Get required license type based on company tags
function getRequiredLicenseType(tags: string[]): string | null {
  const tagLower = tags.map(t => t.toLowerCase());
  
  if (tagLower.some(t => t.includes("tech") || t.includes("software") || t.includes("ai"))) return "tech";
  if (tagLower.some(t => t.includes("food") || t.includes("restaurant") || t.includes("beverage"))) return "food";
  if (tagLower.some(t => t.includes("transport") || t.includes("logistics") || t.includes("shipping"))) return "transport";
  if (tagLower.some(t => t.includes("finance") || t.includes("bank") || t.includes("invest"))) return "finance";
  if (tagLower.some(t => t.includes("manufacturing") || t.includes("factory") || t.includes("industrial"))) return "manufacturing";
  if (tagLower.some(t => t.includes("retail") || t.includes("store") || t.includes("shop"))) return "retail";
  
  return "other";
}

// Purchase a license for a company
export const purchaseLicense = mutation({
  args: {
    companyId: v.id("companies"),
    licenseType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has access to company
    const access = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", args.companyId).eq("userId", userId)
      )
      .first();

    if (!access) throw new Error("No access to this company");

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Validate license type
    if (!LICENSE_COSTS[args.licenseType]) {
      throw new Error(
        `Invalid license type: ${args.licenseType}. ` +
        `Valid types: ${Object.keys(LICENSE_COSTS).join(", ")}`
      );
    }

    const cost = LICENSE_COSTS[args.licenseType] || LICENSE_COSTS["other"];

    // Check if company has enough balance
    const account = await ctx.db.get(company.accountId);
    const balance = account?.balance ?? 0;

    if (balance < cost) {
      throw new Error(`Insufficient funds. License costs $${cost.toLocaleString()}`);
    }

    // Deduct from company balance
    await ctx.db.patch(company.accountId, {
      balance: balance - cost,
    });

    // Get system account
    let systemAccount = await ctx.db
      .query("accounts")
      .filter((q) => q.eq(q.field("name"), "System"))
      .first();

    if (!systemAccount) {
      throw new Error("System account not found");
    }

    // Create license
    const expiresAt = Date.now() + (LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const licenseId = await ctx.db.insert("licenses", {
      companyId: args.companyId,
      licenseType: args.licenseType,
      cost,
      expiresAt,
      purchasedAt: Date.now(),
      isActive: true,
    });

    // Record expense
    await ctx.db.insert("expenses", {
      companyId: args.companyId,
      type: "license_fee",
      amount: cost,
      description: `${args.licenseType.toUpperCase()} license purchase`,
      licenseId,
      createdAt: Date.now(),
    });

    // Record ledger transaction
    await ctx.db.insert("ledger", {
      fromAccountId: company.accountId,
      toAccountId: systemAccount._id,
      amount: cost,
      type: "expense",
      description: `License fee: ${args.licenseType}`,
      createdAt: Date.now(),
    });

    return {
      success: true,
      licenseId,
      cost,
      expiresAt,
    };
  },
});

// Get company licenses
export const getCompanyLicenses = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const licenses = await ctx.db
      .query("licenses")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const now = Date.now();
    
    return licenses.map(license => ({
      ...license,
      isExpired: license.expiresAt < now,
      daysRemaining: Math.max(0, Math.ceil((license.expiresAt - now) / (24 * 60 * 60 * 1000))),
    }));
  },
});

// Check if company has valid license
export const hasValidLicense = query({
  args: { 
    companyId: v.id("companies"),
    licenseType: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_company_active", (q) =>
        q.eq("companyId", args.companyId).eq("isActive", true)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("licenseType"), args.licenseType),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    return !!license;
  },
});

// Perform product maintenance (increases quality)
export const performMaintenance = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Check if user has access to company
    const access = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", product.companyId).eq("userId", userId)
      )
      .first();

    if (!access) throw new Error("No access to this product's company");

    const company = await ctx.db.get(product.companyId);
    if (!company) throw new Error("Company not found");

    // Calculate maintenance cost (5-15% of product price)
    // Use product ID as seed for deterministic "randomness"
    const seed = parseInt(args.productId.slice(-8), 16) % 100;
    const maintenanceCost = product.price * (0.05 + (seed / 1000));

    // Check if company has enough balance
    const account = await ctx.db.get(company.accountId);
    const balance = account?.balance ?? 0;

    if (balance < maintenanceCost) {
      throw new Error(`Insufficient funds. Maintenance costs $${maintenanceCost.toFixed(2)}`);
    }

    // Deduct from company balance
    await ctx.db.patch(company.accountId, {
      balance: balance - maintenanceCost,
    });

    // Get system account
    let systemAccount = await ctx.db
      .query("accounts")
      .filter((q) => q.eq(q.field("name"), "System"))
      .first();

    if (!systemAccount) {
      throw new Error("System account not found");
    }

    // Update product quality (restore to 100)
    await ctx.db.patch(args.productId, {
      quality: 100,
      lastMaintenanceDate: Date.now(),
      maintenanceCost,
    });

    // Record expense
    await ctx.db.insert("expenses", {
      companyId: product.companyId,
      type: "maintenance",
      amount: maintenanceCost,
      description: `Maintenance for ${product.name}`,
      productId: args.productId,
      createdAt: Date.now(),
    });

    // Record ledger transaction
    await ctx.db.insert("ledger", {
      fromAccountId: company.accountId,
      toAccountId: systemAccount._id,
      amount: maintenanceCost,
      type: "expense",
      description: `Product maintenance: ${product.name}`,
      createdAt: Date.now(),
    });

    return {
      success: true,
      cost: maintenanceCost,
      newQuality: 100,
    };
  },
});

// Cron job: Process all company expenses (operating costs, taxes, quality degradation)
export const processCompanyExpenses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Get all companies (limit to 100 at a time to avoid timeouts)
    const companies = await ctx.db.query("companies").take(100);

    // Get system account
    let systemAccount = await ctx.db
      .query("accounts")
      .filter((q) => q.eq(q.field("name"), "System"))
      .first();

    if (!systemAccount) {
      console.error("System account not found");
      return { error: "System account not found" };
    }

    let totalExpenses = 0;
    let companiesProcessed = 0;

    for (const company of companies) {
      try {
        // Skip if expenses were charged in last 24 hours
        if (company.lastExpenseDate && (now - company.lastExpenseDate) < (24 * 60 * 60 * 1000)) {
          continue;
        }

        const account = await ctx.db.get(company.accountId);
        const balance = account?.balance ?? 0;

        // Calculate 30-day revenue
        const incoming = await ctx.db
          .query("ledger")
          .withIndex("by_to_account", (q) => q.eq("toAccountId", company.accountId))
          .filter((q) => q.gt(q.field("createdAt"), thirtyDaysAgo))
          .collect();

        const revenue = incoming
          .filter(tx => tx.type === "product_purchase" || tx.type === "marketplace_batch")
          .reduce((sum, tx) => sum + tx.amount, 0);

        // 1. OPERATING COSTS (2-5% of monthly revenue, minimum $100)
        const operatingCostRate = 0.02 + Math.random() * 0.03;
        const operatingCosts = Math.max(100, revenue * operatingCostRate);

        // 2. CORPORATE TAXES (21% of profits, paid monthly)
        const outgoing = await ctx.db
          .query("ledger")
          .withIndex("by_from_account", (q) => q.eq("fromAccountId", company.accountId))
          .filter((q) => q.gt(q.field("createdAt"), thirtyDaysAgo))
          .collect();

        const costs = outgoing
          .filter(tx => tx.type === "product_cost" || tx.type === "marketplace_batch" || tx.type === "expense")
          .reduce((sum, tx) => sum + tx.amount, 0);

        const profit = revenue - costs;
        const taxRate = company.taxRate ?? 0.21; // Default 21% corporate tax
        const taxes = Math.max(0, profit * taxRate);

        const totalExpenseAmount = operatingCosts + taxes;

        // Only charge if company can afford it (don't bankrupt companies)
        if (balance >= totalExpenseAmount) {
          // Deduct expenses
          await ctx.db.patch(company.accountId, {
            balance: balance - totalExpenseAmount,
          });

          // Record operating costs expense
          await ctx.db.insert("expenses", {
            companyId: company._id,
            type: "operating_costs",
            amount: operatingCosts,
            description: "Monthly operating costs (rent, staff, logistics)",
            createdAt: now,
          });

          // Record operating costs ledger
          await ctx.db.insert("ledger", {
            fromAccountId: company.accountId,
            toAccountId: systemAccount._id,
            amount: operatingCosts,
            type: "expense",
            description: "Operating costs",
            createdAt: now,
          });

          // Record tax expense
          if (taxes > 0) {
            await ctx.db.insert("expenses", {
              companyId: company._id,
              type: "taxes",
              amount: taxes,
              description: `Corporate tax (${(taxRate * 100).toFixed(0)}% of profit)`,
              createdAt: now,
            });

            // Record tax ledger
            await ctx.db.insert("ledger", {
              fromAccountId: company.accountId,
              toAccountId: systemAccount._id,
              amount: taxes,
              type: "expense",
              description: "Corporate taxes",
              createdAt: now,
            });
          }

          totalExpenses += totalExpenseAmount;
        } else {
          // Track unpaid taxes for companies that can't afford them
          const unpaidTaxes = (company.unpaidTaxes ?? 0) + taxes;
          await ctx.db.patch(company._id, {
            unpaidTaxes,
          });
        }

        // Update company expense tracking
        await ctx.db.patch(company._id, {
          lastExpenseDate: now,
          monthlyRevenue: revenue,
        });

        companiesProcessed++;
      } catch (error) {
        console.error(`Error processing expenses for company ${company._id}:`, error);
      }
    }

    return {
      companiesProcessed,
      totalExpenses,
    };
  },
});

// Cron job: Degrade product quality over time
export const degradeProductQuality = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Get all active products (limit to avoid timeouts)
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .take(200);

    let productsUpdated = 0;

    for (const product of products) {
      // Skip if maintenance was performed in last 7 days
      if (product.lastMaintenanceDate && (now - product.lastMaintenanceDate) < (7 * 24 * 60 * 60 * 1000)) {
        continue;
      }

      // Initialize quality if not set
      const currentQuality = product.quality ?? 100;
      
      // Degrade quality by 5-15 points per week
      const degradation = 5 + Math.random() * 10;
      const newQuality = Math.max(0, currentQuality - degradation);

      await ctx.db.patch(product._id, {
        quality: newQuality,
      });

      productsUpdated++;
    }

    return {
      productsUpdated,
    };
  },
});

// Cron job: Expire old licenses
export const expireLicenses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get all active licenses that have expired
    const expiredLicenses = await ctx.db
      .query("licenses")
      .withIndex("by_expiration")
      .filter((q) =>
        q.and(
          q.lt(q.field("expiresAt"), now),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    for (const license of expiredLicenses) {
      await ctx.db.patch(license._id, {
        isActive: false,
      });
    }

    return {
      licensesExpired: expiredLicenses.length,
    };
  },
});

// Get company expenses for dashboard
export const getCompanyExpenses = query({
  args: { 
    companyId: v.id("companies"),
    days: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check access
    const access = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", args.companyId).eq("userId", userId)
      )
      .first();

    if (!access) throw new Error("No access to this company");

    const days = args.days ?? 30;
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_company_created", (q) =>
        q.eq("companyId", args.companyId)
      )
      .filter((q) => q.gt(q.field("createdAt"), cutoff))
      .collect();

    // Calculate totals by type
    const totals = {
      operating_costs: 0,
      taxes: 0,
      license_fee: 0,
      maintenance: 0,
      total: 0,
    };

    expenses.forEach(expense => {
      totals[expense.type] += expense.amount;
      totals.total += expense.amount;
    });

    return {
      expenses,
      totals,
    };
  },
});

// Get expense summary for all companies (admin view)
export const getExpenseSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return null;

    // Get user's companies
    const companyAccess = await ctx.db
      .query("companyAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const summaries = [];

    for (const access of companyAccess) {
      const company = await ctx.db.get(access.companyId);
      if (!company) continue;

      const expenses = await ctx.db
        .query("expenses")
        .withIndex("by_company_created", (q) =>
          q.eq("companyId", access.companyId)
        )
        .filter((q) => q.gt(q.field("createdAt"), thirtyDaysAgo))
        .collect();

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      summaries.push({
        companyId: company._id,
        companyName: company.name,
        totalExpenses,
        unpaidTaxes: company.unpaidTaxes ?? 0,
      });
    }

    return summaries;
  },
});

// Get available license types and their costs
export const getLicenseTypes = query({
  args: {},
  handler: async () => {
    return Object.entries(LICENSE_COSTS).map(([type, cost]) => ({
      type,
      cost,
      duration: LICENSE_DURATION_DAYS,
    }));
  },
});
