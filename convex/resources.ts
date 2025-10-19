/**
 * Resource Management System
 * 
 * Handles dynamic resource pricing, inventory management, and supply chain mechanics.
 * Resources are required to produce products, creating economic interdependence.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Default resources to initialize the system
 * Each resource has different volatility and base pricing
 */
const DEFAULT_RESOURCES = [
  // Raw Materials
  { name: "Steel", category: "raw_material", basePrice: 50, volatility: 0.15, description: "Essential metal for construction and manufacturing", unit: "kg" },
  { name: "Plastic", category: "raw_material", basePrice: 30, volatility: 0.20, description: "Versatile polymer for packaging and components", unit: "kg" },
  { name: "Silicon", category: "raw_material", basePrice: 100, volatility: 0.25, description: "Critical for electronics and semiconductors", unit: "kg" },
  { name: "Copper", category: "raw_material", basePrice: 75, volatility: 0.18, description: "Conductive metal for wiring and circuits", unit: "kg" },
  { name: "Aluminum", category: "raw_material", basePrice: 40, volatility: 0.12, description: "Lightweight metal for various applications", unit: "kg" },
  { name: "Wheat", category: "raw_material", basePrice: 20, volatility: 0.30, description: "Agricultural commodity for food products", unit: "kg" },
  { name: "Cotton", category: "raw_material", basePrice: 35, volatility: 0.22, description: "Natural fiber for textiles", unit: "kg" },
  { name: "Rubber", category: "raw_material", basePrice: 45, volatility: 0.17, description: "Elastic material for tires and seals", unit: "kg" },
  { name: "Lithium", category: "raw_material", basePrice: 150, volatility: 0.35, description: "Essential for battery production", unit: "kg" },
  { name: "Glass", category: "raw_material", basePrice: 25, volatility: 0.10, description: "Transparent material for displays and containers", unit: "kg" },
  
  // Components
  { name: "Microchip", category: "component", basePrice: 200, volatility: 0.28, description: "Integrated circuits for electronics", unit: "unit" },
  { name: "Battery", category: "component", basePrice: 120, volatility: 0.20, description: "Energy storage component", unit: "unit" },
  { name: "Display Panel", category: "component", basePrice: 180, volatility: 0.25, description: "Screen for electronic devices", unit: "unit" },
  { name: "Circuit Board", category: "component", basePrice: 90, volatility: 0.18, description: "Foundation for electronic components", unit: "unit" },
  { name: "Motor", category: "component", basePrice: 150, volatility: 0.15, description: "Mechanical power source", unit: "unit" },
  
  // Energy
  { name: "Electricity", category: "energy", basePrice: 0.15, volatility: 0.40, description: "Power for manufacturing processes", unit: "kWh" },
  { name: "Natural Gas", category: "energy", basePrice: 0.08, volatility: 0.35, description: "Fuel for heating and power generation", unit: "kWh" },
  { name: "Oil", category: "energy", basePrice: 0.12, volatility: 0.45, description: "Petroleum for fuel and petrochemicals", unit: "barrel" },
] as const;

/**
 * Initialize default resources in the database
 * Should be run once after schema deployment
 */
export const initializeResources = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if resources already exist
    const existingResources = await ctx.db.query("resources").collect();
    if (existingResources.length > 0) {
      throw new Error("Resources already initialized");
    }

    const now = Date.now();
    const resourceIds: Id<"resources">[] = [];

    for (const resource of DEFAULT_RESOURCES) {
      const id = await ctx.db.insert("resources", {
        name: resource.name,
        category: resource.category as "raw_material" | "component" | "energy",
        basePrice: resource.basePrice,
        currentPrice: resource.basePrice, // Start at base price
        volatility: resource.volatility,
        description: resource.description,
        unit: resource.unit,
        isActive: true,
        createdAt: now,
        lastPriceUpdate: now,
      });
      resourceIds.push(id);
    }

    return {
      success: true,
      message: `Initialized ${resourceIds.length} resources`,
      resourceIds,
    };
  },
});

/**
 * Get all active resources with current market prices
 */
export const getActiveResources = query({
  args: {},
  handler: async (ctx) => {
    const resources = await ctx.db
      .query("resources")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return resources;
  },
});

/**
 * Get resources by category
 */
export const getResourcesByCategory = query({
  args: {
    category: v.union(v.literal("raw_material"), v.literal("component"), v.literal("energy")),
  },
  handler: async (ctx, args) => {
    const resources = await ctx.db
      .query("resources")
      .withIndex("by_category_active", (q) => 
        q.eq("category", args.category).eq("isActive", true)
      )
      .collect();

    return resources;
  },
});

/**
 * Get company's resource inventory
 */
export const getCompanyInventory = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const inventory = await ctx.db
      .query("resourceInventory")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Enrich with resource details
    const enrichedInventory = await Promise.all(
      inventory.map(async (item) => {
        const resource = await ctx.db.get(item.resourceId);
        return {
          ...item,
          resource,
        };
      })
    );

    return enrichedInventory;
  },
});

/**
 * Purchase resources from the market
 */
export const purchaseResources = mutation({
  args: {
    companyId: v.id("companies"),
    purchases: v.array(
      v.object({
        resourceId: v.id("resources"),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify company access
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const hasAccess = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) => 
        q.eq("companyId", args.companyId).eq("userId", user._id)
      )
      .unique();

    if (!hasAccess && company.ownerId !== user._id) {
      throw new Error("Access denied");
    }

    // Get company account
    const companyAccount = await ctx.db.get(company.accountId);
    if (!companyAccount) {
      throw new Error("Company account not found");
    }

    // Calculate total cost
    let totalCost = 0;
    const purchaseDetails: Array<{
      resourceId: Id<"resources">;
      resource: Doc<"resources">;
      quantity: number;
      pricePerUnit: number;
      totalAmount: number;
    }> = [];

    for (const purchase of args.purchases) {
      if (purchase.quantity <= 0) {
        throw new Error("Quantity must be positive");
      }

      const resource = await ctx.db.get(purchase.resourceId);
      if (!resource || !resource.isActive) {
        throw new Error(`Resource not found or inactive: ${purchase.resourceId}`);
      }

      const amount = resource.currentPrice * purchase.quantity;
      totalCost += amount;

      purchaseDetails.push({
        resourceId: purchase.resourceId,
        resource,
        quantity: purchase.quantity,
        pricePerUnit: resource.currentPrice,
        totalAmount: amount,
      });
    }

    // Check if company can afford
    if (companyAccount.balance! < totalCost) {
      throw new Error(`Insufficient funds. Need $${totalCost.toFixed(2)}, have $${companyAccount.balance!.toFixed(2)}`);
    }

    // Get system account for resource purchases
    const systemAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", "System"))
      .unique();

    if (!systemAccount) {
      throw new Error("System account not found");
    }

    const now = Date.now();

    // Process each purchase
    for (const detail of purchaseDetails) {
      // Deduct from company balance
      await ctx.db.patch(companyAccount._id, {
        balance: companyAccount.balance! - detail.totalAmount,
      });
      companyAccount.balance! -= detail.totalAmount;

      // Credit system account
      await ctx.db.patch(systemAccount._id, {
        balance: (systemAccount.balance || 0) + detail.totalAmount,
      });

      // Record ledger transaction
      await ctx.db.insert("ledger", {
        fromAccountId: companyAccount._id,
        toAccountId: systemAccount._id,
        amount: detail.totalAmount,
        type: "resource_purchase",
        resourceId: detail.resourceId,
        description: `Purchased ${detail.quantity} ${detail.resource.unit} of ${detail.resource.name}`,
        createdAt: now,
      });

      // Update or create inventory record
      const existingInventory = await ctx.db
        .query("resourceInventory")
        .withIndex("by_company_resource", (q) => 
          q.eq("companyId", args.companyId).eq("resourceId", detail.resourceId)
        )
        .unique();

      if (existingInventory) {
        // Calculate new weighted average price
        const totalQuantity = existingInventory.quantity + detail.quantity;
        const newAveragePrice = 
          (existingInventory.averagePurchasePrice * existingInventory.quantity + 
           detail.pricePerUnit * detail.quantity) / totalQuantity;

        await ctx.db.patch(existingInventory._id, {
          quantity: totalQuantity,
          averagePurchasePrice: newAveragePrice,
          lastUpdated: now,
        });
      } else {
        await ctx.db.insert("resourceInventory", {
          companyId: args.companyId,
          resourceId: detail.resourceId,
          quantity: detail.quantity,
          averagePurchasePrice: detail.pricePerUnit,
          lastUpdated: now,
        });
      }

      // Record resource transaction
      await ctx.db.insert("resourceTransactions", {
        companyId: args.companyId,
        resourceId: detail.resourceId,
        type: "purchase",
        quantity: detail.quantity,
        pricePerUnit: detail.pricePerUnit,
        totalAmount: detail.totalAmount,
        createdAt: now,
      });
    }

    return {
      success: true,
      totalCost,
      purchases: purchaseDetails.map(d => ({
        resourceName: d.resource.name,
        quantity: d.quantity,
        pricePerUnit: d.pricePerUnit,
        totalAmount: d.totalAmount,
      })),
      newBalance: companyAccount.balance!,
    };
  },
});

/**
 * Sell resources to the market
 */
export const sellResources = mutation({
  args: {
    companyId: v.id("companies"),
    sales: v.array(
      v.object({
        resourceId: v.id("resources"),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify company access
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const hasAccess = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) => 
        q.eq("companyId", args.companyId).eq("userId", user._id)
      )
      .unique();

    if (!hasAccess && company.ownerId !== user._id) {
      throw new Error("Access denied");
    }

    // Get company account
    const companyAccount = await ctx.db.get(company.accountId);
    if (!companyAccount) {
      throw new Error("Company account not found");
    }

    // Calculate total revenue and validate inventory
    let totalRevenue = 0;
    const saleDetails: Array<{
      resourceId: Id<"resources">;
      resource: Doc<"resources">;
      quantity: number;
      pricePerUnit: number;
      totalAmount: number;
    }> = [];

    for (const sale of args.sales) {
      if (sale.quantity <= 0) {
        throw new Error("Quantity must be positive");
      }

      const resource = await ctx.db.get(sale.resourceId);
      if (!resource || !resource.isActive) {
        throw new Error(`Resource not found or inactive: ${sale.resourceId}`);
      }

      // Check inventory
      const inventory = await ctx.db
        .query("resourceInventory")
        .withIndex("by_company_resource", (q) => 
          q.eq("companyId", args.companyId).eq("resourceId", sale.resourceId)
        )
        .unique();

      if (!inventory || inventory.quantity < sale.quantity) {
        throw new Error(`Insufficient ${resource.name}. Have: ${inventory?.quantity || 0}, need: ${sale.quantity}`);
      }

      const amount = resource.currentPrice * sale.quantity;
      totalRevenue += amount;

      saleDetails.push({
        resourceId: sale.resourceId,
        resource,
        quantity: sale.quantity,
        pricePerUnit: resource.currentPrice,
        totalAmount: amount,
      });
    }

    // Get system account
    const systemAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", "System"))
      .unique();

    if (!systemAccount) {
      throw new Error("System account not found");
    }

    const now = Date.now();

    // Process each sale
    for (const detail of saleDetails) {
      // Credit company account
      await ctx.db.patch(companyAccount._id, {
        balance: companyAccount.balance! + detail.totalAmount,
      });
      companyAccount.balance! += detail.totalAmount;

      // Deduct from system account
      await ctx.db.patch(systemAccount._id, {
        balance: (systemAccount.balance || 0) - detail.totalAmount,
      });

      // Record ledger transaction
      await ctx.db.insert("ledger", {
        fromAccountId: systemAccount._id,
        toAccountId: companyAccount._id,
        amount: detail.totalAmount,
        type: "resource_sale",
        resourceId: detail.resourceId,
        description: `Sold ${detail.quantity} ${detail.resource.unit} of ${detail.resource.name}`,
        createdAt: now,
      });

      // Update inventory
      const inventory = await ctx.db
        .query("resourceInventory")
        .withIndex("by_company_resource", (q) => 
          q.eq("companyId", args.companyId).eq("resourceId", detail.resourceId)
        )
        .unique();

      if (inventory) {
        await ctx.db.patch(inventory._id, {
          quantity: inventory.quantity - detail.quantity,
          lastUpdated: now,
        });
      }

      // Record resource transaction
      await ctx.db.insert("resourceTransactions", {
        companyId: args.companyId,
        resourceId: detail.resourceId,
        type: "sale",
        quantity: detail.quantity,
        pricePerUnit: detail.pricePerUnit,
        totalAmount: detail.totalAmount,
        createdAt: now,
      });
    }

    return {
      success: true,
      totalRevenue,
      sales: saleDetails.map(d => ({
        resourceName: d.resource.name,
        quantity: d.quantity,
        pricePerUnit: d.pricePerUnit,
        totalAmount: d.totalAmount,
      })),
      newBalance: companyAccount.balance!,
    };
  },
});

/**
 * Update resource prices based on volatility
 * Called by cron job every 30 minutes
 */
export const updateResourcePrices = internalMutation({
  args: {},
  handler: async (ctx) => {
    const resources = await ctx.db
      .query("resources")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const now = Date.now();
    let updatedCount = 0;

    for (const resource of resources) {
      // Random price change based on volatility
      // Price can move ±(volatility * 100)% from base price
      const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
      const priceChange = resource.basePrice * resource.volatility * randomFactor;
      let newPrice = resource.currentPrice + priceChange;

      // Ensure price doesn't go below 10% of base or above 300% of base
      const minPrice = resource.basePrice * 0.1;
      const maxPrice = resource.basePrice * 3.0;
      newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));

      await ctx.db.patch(resource._id, {
        currentPrice: Math.round(newPrice * 100) / 100, // Round to 2 decimals
        lastPriceUpdate: now,
      });

      updatedCount++;
    }

    return {
      success: true,
      updatedCount,
      timestamp: now,
    };
  },
});

/**
 * Consume resources for production (internal - called by product creation)
 */
export const consumeResourcesForProduction = internalMutation({
  args: {
    companyId: v.id("companies"),
    productId: v.id("products"),
    resourceRequirements: v.array(
      v.object({
        resourceId: v.id("resources"),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate inventory for all resources first
    for (const requirement of args.resourceRequirements) {
      const inventory = await ctx.db
        .query("resourceInventory")
        .withIndex("by_company_resource", (q) => 
          q.eq("companyId", args.companyId).eq("resourceId", requirement.resourceId)
        )
        .unique();

      if (!inventory || inventory.quantity < requirement.quantity) {
        const resource = await ctx.db.get(requirement.resourceId);
        throw new Error(
          `Insufficient ${resource?.name || "resource"}. Have: ${inventory?.quantity || 0}, need: ${requirement.quantity}`
        );
      }
    }

    // Consume resources
    for (const requirement of args.resourceRequirements) {
      const inventory = await ctx.db
        .query("resourceInventory")
        .withIndex("by_company_resource", (q) => 
          q.eq("companyId", args.companyId).eq("resourceId", requirement.resourceId)
        )
        .unique();

      if (inventory) {
        await ctx.db.patch(inventory._id, {
          quantity: inventory.quantity - requirement.quantity,
          lastUpdated: now,
        });

        // Record consumption transaction
        await ctx.db.insert("resourceTransactions", {
          companyId: args.companyId,
          resourceId: requirement.resourceId,
          type: "consumption",
          quantity: requirement.quantity,
          pricePerUnit: inventory.averagePurchasePrice,
          totalAmount: inventory.averagePurchasePrice * requirement.quantity,
          productId: args.productId,
          createdAt: now,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Get resource transaction history for a company
 */
export const getResourceTransactionHistory = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const transactions = await ctx.db
      .query("resourceTransactions")
      .withIndex("by_company_created", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(limit);

    // Enrich with resource details
    const enrichedTransactions = await Promise.all(
      transactions.map(async (txn) => {
        const resource = await ctx.db.get(txn.resourceId);
        const product = txn.productId ? await ctx.db.get(txn.productId) : null;
        return {
          ...txn,
          resource,
          product,
        };
      })
    );

    return enrichedTransactions;
  },
});
