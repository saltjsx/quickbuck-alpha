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
      v.literal("marketplace_batch"),
      v.literal("expense"),
      v.literal("gamble"),
      v.literal("gamble_payout"),
      v.literal("dividend"),
      v.literal("loan_disbursement"),
      v.literal("loan_repayment"),
      v.literal("loan_default"),
      v.literal("company_sale"),
      v.literal("ai_purchase")
    ),
    description: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    batchCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_from_account", ["fromAccountId"])
    .index("by_to_account", ["toAccountId"])
    .index("by_created_at", ["createdAt"])
    .index("by_product", ["productId"])
    .index("by_type", ["type"])
    .index("by_from_account_created", ["fromAccountId", "createdAt"])
    .index("by_to_account_created", ["toAccountId", "createdAt"])
    .index("by_to_account_type", ["toAccountId", "type"])
    .index("by_from_account_type", ["fromAccountId", "type"])
    .index("by_to_account_type_created", ["toAccountId", "type", "createdAt"])
    .index("by_from_account_type_created", ["fromAccountId", "type", "createdAt"]),

  accounts: defineTable({
    name: v.string(),
    type: v.union(v.literal("personal"), v.literal("company")),
    ownerId: v.id("users"),
    companyId: v.optional(v.id("companies")),
    balance: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_company", ["companyId"])
    .index("by_type_balance", ["type", "balance"])
    .index("by_owner_type", ["ownerId", "type"])
    .index("by_name", ["name"]),

  balances: defineTable({
    accountId: v.id("accounts"),
    balance: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_account", ["accountId"]),

  gambles: defineTable({
    userId: v.id("users"),
    accountId: v.id("accounts"),
    game: v.union(
      v.literal("slots"),
      v.literal("blackjack"),
      v.literal("roulette"),
      v.literal("dice")
    ),
    bet: v.number(),
    payout: v.number(),
    net: v.number(),
    outcome: v.string(),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_game", ["userId", "game"])
    .index("by_game_created", ["game", "createdAt"]),

  blackjackStates: defineTable({
    gameId: v.id("gambles"),
    userId: v.id("users"),
    accountId: v.id("accounts"),
    bet: v.number(),
    deck: v.array(
      v.object({
        label: v.string(),
        value: v.number(),
      })
    ),
    playerHand: v.array(
      v.object({
        label: v.string(),
        value: v.number(),
      })
    ),
    dealerHand: v.array(
      v.object({
        label: v.string(),
        value: v.number(),
      })
    ),
    actions: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_game", ["gameId"]),

  companies: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    ticker: v.string(),
    logoUrl: v.optional(v.string()),
    ownerId: v.id("users"),
    accountId: v.id("accounts"),
    isPublic: v.boolean(),
    totalShares: v.number(),
    sharePrice: v.number(),
    marketSentiment: v.optional(v.number()),
    lastExpenseDate: v.optional(v.number()),
    monthlyRevenue: v.optional(v.number()),
    taxRate: v.optional(v.number()),
    lastTaxPayment: v.optional(v.number()),
    unpaidTaxes: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_public", ["isPublic"])
    .index("by_account", ["accountId"])
    .index("by_ticker", ["ticker"])
    .index("by_sharePrice", ["sharePrice"])
    .index("by_totalShares", ["totalShares"])
    .index("by_public_sharePrice", ["isPublic", "sharePrice"])
    .index("by_public_totalShares", ["isPublic", "totalShares"]),

  companyAccess: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("manager")),
    grantedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_user", ["userId"])
    .index("by_company_user", ["companyId", "userId"]),

  stocks: defineTable({
    companyId: v.id("companies"),
    holderId: v.union(v.id("users"), v.id("companies")),
    holderType: v.union(v.literal("user"), v.literal("company")),
    shares: v.number(),
    averagePurchasePrice: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_holder", ["holderId"])
    .index("by_company_holder", ["companyId", "holderId"])
    .index("by_holderType_shares", ["holderType", "shares"])
    .index("by_holder_holderType", ["holderId", "holderType"])
    .index("by_company_holder_holderType", ["companyId", "holderId", "holderType"])
    .index("by_company_shares", ["companyId", "shares"]),

  stockPriceHistory: defineTable({
    companyId: v.id("companies"),
    price: v.number(),
    marketCap: v.number(),
    volume: v.number(),
    timestamp: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_timestamp", ["companyId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  stockTransactions: defineTable({
    companyId: v.id("companies"),
    buyerId: v.union(v.id("users"), v.id("companies")),
    buyerType: v.union(v.literal("user"), v.literal("company")),
    shares: v.number(),
    pricePerShare: v.number(),
    totalAmount: v.number(),
    transactionType: v.union(v.literal("buy"), v.literal("sell"), v.literal("transfer")),
    fromId: v.optional(v.union(v.id("users"), v.id("companies"))),
    toId: v.optional(v.union(v.id("users"), v.id("companies"))),
    timestamp: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_buyer", ["buyerId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_company_timestamp", ["companyId", "timestamp"]),

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
    quality: v.optional(v.number()),
    lastMaintenanceDate: v.optional(v.number()),
    maintenanceCost: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_active", ["isActive"])
    .index("by_active_totalSales", ["isActive", "totalSales"])
    .index("by_created_by", ["createdBy"])
    .index("by_company_active", ["companyId", "isActive"])
    .index("by_active_totalRevenue", ["isActive", "totalRevenue"])
    .index("by_active_price", ["isActive", "price"])
    .index("by_company_active_revenue", ["companyId", "isActive", "totalRevenue"]),

  collections: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    purchasePrice: v.number(),
    purchasedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_product", ["productId"])
    .index("by_user_product", ["userId", "productId"])
    .index("by_user_purchased", ["userId", "purchasedAt"])
    .index("by_product_purchased", ["productId", "purchasedAt"])
    .index("by_purchased_at", ["purchasedAt"]),

  licenses: defineTable({
    companyId: v.id("companies"),
    licenseType: v.string(),
    cost: v.number(),
    expiresAt: v.number(),
    purchasedAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_active", ["companyId", "isActive"])
    .index("by_expiration", ["expiresAt"])
    .index("by_active_expiration", ["isActive", "expiresAt"]),

  expenses: defineTable({
    companyId: v.id("companies"),
    type: v.union(
      v.literal("operating_costs"),
      v.literal("taxes"),
      v.literal("license_fee"),
      v.literal("maintenance")
    ),
    amount: v.number(),
    description: v.string(),
    productId: v.optional(v.id("products")),
    licenseId: v.optional(v.id("licenses")),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_type", ["type"])
    .index("by_company_created", ["companyId", "createdAt"])
    .index("by_company_type", ["companyId", "type"])
    .index("by_company_type_created", ["companyId", "type", "createdAt"]),

  // ULTRA-OPTIMIZATION: Cached company metrics to avoid repeated ledger scans
  companyMetrics: defineTable({
    companyId: v.id("companies"),
    period: v.union(v.literal("30d"), v.literal("7d"), v.literal("all_time")),
    totalRevenue: v.number(),
    totalCosts: v.number(),
    totalExpenses: v.number(),
    totalProfit: v.number(),
    transactionCount: v.number(),
    lastUpdated: v.number(),
    payloadVersion: v.optional(v.number()),
  })
    .index("by_company", ["companyId"])
    .index("by_company_period", ["companyId", "period"])
    .index("by_lastUpdated", ["lastUpdated"]),

  loans: defineTable({
    userId: v.id("users"),
    accountId: v.id("accounts"),
    principal: v.number(), // Original loan amount
    currentBalance: v.number(), // Current amount owed (principal + interest)
    interestRate: v.number(), // Daily interest rate (0.05 = 5%)
    daysRemaining: v.number(), // Days left to repay
    status: v.union(
      v.literal("active"),
      v.literal("repaid"),
      v.literal("defaulted")
    ),
    lastInterestApplied: v.number(), // Timestamp of last interest application
    dueDate: v.number(), // Timestamp when loan must be repaid
    createdAt: v.number(),
    repaidAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_status_dueDate", ["status", "dueDate"])
    .index("by_lastInterestApplied", ["lastInterestApplied"]),

  companySaleOffers: defineTable({
    companyId: v.id("companies"),
    sellerId: v.id("users"), // The current owner selling the company
    buyerId: v.optional(v.id("users")), // The buyer (null if open offer, specific if targeted)
    price: v.number(), // The asking price
    status: v.union(
      v.literal("active"), // Available for purchase
      v.literal("completed"), // Sale completed
      v.literal("cancelled") // Offer cancelled
    ),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_company", ["companyId"])
    .index("by_seller", ["sellerId"])
    .index("by_buyer", ["buyerId"])
    .index("by_status", ["status"])
    .index("by_status_created", ["status", "createdAt"])
    .index("by_company_status", ["companyId", "status"]),

  userWarnings: defineTable({
    userId: v.id("users"),
    reason: v.string(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    isAcknowledged: v.boolean(),
    acknowledgedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_acknowledged", ["isAcknowledged"]),

  userBans: defineTable({
    email: v.string(),
    userId: v.id("users"),
    reason: v.string(),
    bannedAt: v.number(),
    bannedBy: v.optional(v.string()), // Admin who performed the ban
  })
    .index("by_email", ["email"])
    .index("by_user", ["userId"]),
});

