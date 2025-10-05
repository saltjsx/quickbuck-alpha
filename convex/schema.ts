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
      v.literal("marketplace_batch") // NEW: batch marketplace transactions
    ),
    description: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    batchCount: v.optional(v.number()), // NEW: number of items in batch
    createdAt: v.number(),
  })
    .index("by_from_account", ["fromAccountId"])
    .index("by_to_account", ["toAccountId"])
    .index("by_created_at", ["createdAt"]),

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
    .index("by_company_timestamp", ["companyId", "timestamp"]),

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
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_active", ["isActive"])
    .index("by_active_totalSales", ["isActive", "totalSales"])
    .index("by_created_by", ["createdBy"]),
});
