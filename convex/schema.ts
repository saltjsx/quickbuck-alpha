import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
    username: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_username", ["username"]),

  // Ledger system - all transactions
  ledger: defineTable({
    fromAccountId: v.id("accounts"),
    toAccountId: v.id("accounts"),
    amount: v.number(),
    type: v.union(
      v.literal("transfer"),
      v.literal("product_purchase"),
      v.literal("product_cost"),
      v.literal("initial_deposit"),
      v.literal("stock_purchase"),
      v.literal("stock_sale"),
      v.literal("marketplace_batch"), // NEW: batch marketplace transactions
      v.literal("expense") // Company expenses
    ),
    description: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    batchCount: v.optional(v.number()), // NEW: number of items in batch
    createdAt: v.number(),
  })
    .index("by_from_account", ["fromAccountId"])
    .index("by_to_account", ["toAccountId"])
    .index("by_created_at", ["createdAt"])
    .index("by_product", ["productId"]) // For filtering ledger by product
    .index("by_type", ["type"]), // For filtering ledger by transaction type

  // Bank accounts - for both personal and company accounts
  accounts: defineTable({
    name: v.string(),
    type: v.union(v.literal("personal"), v.literal("company")),
    ownerId: v.id("users"), // The primary owner
    companyId: v.optional(v.id("companies")),
    balance: v.optional(v.number()), // Cached balance for performance
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_company", ["companyId"])
    .index("by_type_balance", ["type", "balance"]),

  // Balances table - fast balance lookups (replaces calculating from ledger)
  balances: defineTable({
    accountId: v.id("accounts"),
    balance: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_account", ["accountId"]),

  // Companies
  companies: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()), // Industry tags for categorization
    ticker: v.string(), // Stock ticker symbol (e.g., "AAPL")
    logoUrl: v.optional(v.string()), // Company logo image URL
    ownerId: v.id("users"),
    accountId: v.id("accounts"),
    isPublic: v.boolean(), // Listed on stock market (balance > $50,000)
    totalShares: v.number(), // Total shares available
    sharePrice: v.number(), // Current share price
    marketSentiment: v.optional(v.number()), // Market sentiment multiplier (0.8 - 1.2)
    // Expense tracking
    lastExpenseDate: v.optional(v.number()), // Last time expenses were charged
    monthlyRevenue: v.optional(v.number()), // Rolling 30-day revenue for calculating expenses
    // Tax settings
    taxRate: v.optional(v.number()), // Corporate tax rate (default 21%)
    lastTaxPayment: v.optional(v.number()), // Last time taxes were paid
    unpaidTaxes: v.optional(v.number()), // Accumulated unpaid taxes
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_public", ["isPublic"])
    .index("by_account", ["accountId"])
    .index("by_ticker", ["ticker"])
    .index("by_sharePrice", ["sharePrice"])
    .index("by_totalShares", ["totalShares"]),

  // Company access - who can manage the company
  companyAccess: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("manager")),
    grantedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_user", ["userId"])
    .index("by_company_user", ["companyId", "userId"]),

  // Stock holdings
  stocks: defineTable({
    companyId: v.id("companies"),
    holderId: v.union(v.id("users"), v.id("companies")), // Can be user or company
    holderType: v.union(v.literal("user"), v.literal("company")),
    shares: v.number(),
    averagePurchasePrice: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_holder", ["holderId"])
    .index("by_company_holder", ["companyId", "holderId"])
    .index("by_holderType_shares", ["holderType", "shares"]),

  // Stock price history for charts
  stockPriceHistory: defineTable({
    companyId: v.id("companies"),
    price: v.number(),
    marketCap: v.number(),
    volume: v.number(), // Trading volume in last period
    timestamp: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_timestamp", ["companyId", "timestamp"])
    .index("by_timestamp", ["timestamp"]), // For filtering all history by time range

  // Stock transactions for tracking individual trades
  stockTransactions: defineTable({
    companyId: v.id("companies"),
    buyerId: v.union(v.id("users"), v.id("companies")),
    buyerType: v.union(v.literal("user"), v.literal("company")),
    shares: v.number(),
    pricePerShare: v.number(),
    totalAmount: v.number(),
    transactionType: v.union(v.literal("buy"), v.literal("sell"), v.literal("transfer")),
    fromId: v.optional(v.union(v.id("users"), v.id("companies"))), // For transfers
    toId: v.optional(v.union(v.id("users"), v.id("companies"))), // For transfers
    timestamp: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_buyer", ["buyerId"])
    .index("by_timestamp", ["timestamp"]),

  // Products
  products: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    tags: v.array(v.string()),
    companyId: v.id("companies"),
    createdBy: v.id("users"),
    isActive: v.boolean(),
    totalSales: v.number(),
    totalRevenue: v.optional(v.number()),
    totalCosts: v.optional(v.number()),
    // Quality & Maintenance
    quality: v.optional(v.number()), // Quality rating 0-100 (default 100)
    lastMaintenanceDate: v.optional(v.number()), // Last time maintenance was performed
    maintenanceCost: v.optional(v.number()), // Cost to maintain quality per period
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_active", ["isActive"])
    .index("by_active_totalSales", ["isActive", "totalSales"])
    .index("by_created_by", ["createdBy"])
    .index("by_company_active", ["companyId", "isActive"]), // For filtering company's active products

  // Collections - user-purchased marketplace items
  collections: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    purchasePrice: v.number(),
    purchasedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_product", ["productId"])
    .index("by_user_product", ["userId", "productId"])
    .index("by_user_purchased", ["userId", "purchasedAt"]),

  // Licenses - required to operate in certain industries
  licenses: defineTable({
    companyId: v.id("companies"),
    licenseType: v.string(), // "tech", "food", "transport", "finance", "manufacturing", "retail"
    cost: v.number(), // Purchase cost
    expiresAt: v.number(), // License expiration date
    purchasedAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_active", ["companyId", "isActive"])
    .index("by_expiration", ["expiresAt"]),

  // Expenses - tracking all company expenses
  expenses: defineTable({
    companyId: v.id("companies"),
    type: v.union(
      v.literal("operating_costs"), // Rent, staff wages, logistics
      v.literal("taxes"), // Corporate taxes
      v.literal("license_fee"), // License renewal/purchase
      v.literal("maintenance") // Product R&D/maintenance
    ),
    amount: v.number(),
    description: v.string(),
    productId: v.optional(v.id("products")), // For maintenance expenses
    licenseId: v.optional(v.id("licenses")), // For license fees
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_type", ["type"])
    .index("by_company_created", ["companyId", "createdAt"]),
});
