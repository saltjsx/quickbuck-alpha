import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User management
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  // Quickbuck tables
  accounts: defineTable({
    type: v.union(v.literal("personal"), v.literal("company")),
    userId: v.string(),
    companyId: v.optional(v.string()),
    balance: v.number(), // in cents
    canGoNegative: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_company", ["companyId"])
    .index("by_balance", ["balance"]),

  companies: defineTable({
    name: v.string(),
    ticker: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    logoUrl: v.optional(v.string()),
    ownerId: v.string(),
    accountId: v.string(),
    isPublic: v.boolean(),
    totalRevenue: v.number(), // in cents
    totalProfit: v.number(), // in cents
    costsDue: v.number(), // in cents
  })
    .index("by_owner", ["ownerId"])
    .index("by_ticker", ["ticker"])
    .index("by_public", ["isPublic"])
    .index("by_revenue", ["totalRevenue"])
    .index("by_account", ["accountId"]),

  products: defineTable({
    companyId: v.string(),
    name: v.string(),
    description: v.string(),
    price: v.number(), // in cents
    imageUrl: v.optional(v.string()),
    tags: v.array(v.string()),
    totalSold: v.number(),
    totalRevenue: v.number(), // in cents
  })
    .index("by_company", ["companyId"])
    .index("by_revenue", ["totalRevenue"]),

  marketplaceListings: defineTable({
    productId: v.string(),
    companyId: v.string(),
    quantity: v.number(),
    pricePerUnit: v.number(), // in cents
    productionCostPerUnit: v.number(), // in cents
    status: v.union(v.literal("available"), v.literal("sold"), v.literal("cancelled")),
  })
    .index("by_product", ["productId"])
    .index("by_company", ["companyId"])
    .index("by_status", ["status"]),

  transactions: defineTable({
    type: v.string(),
    fromAccountId: v.optional(v.string()),
    toAccountId: v.optional(v.string()),
    amount: v.number(), // in cents
    description: v.string(),
    metadata: v.optional(v.any()),
    balanceAfter: v.optional(v.number()), // in cents
  })
    .index("by_from_account", ["fromAccountId"])
    .index("by_to_account", ["toAccountId"])
    .index("by_type", ["type"]),

  orders: defineTable({
    buyerAccountId: v.string(),
    listingId: v.string(),
    productId: v.string(),
    companyId: v.string(),
    quantity: v.number(),
    pricePerUnit: v.number(), // in cents
    totalAmount: v.number(), // in cents
    transactionId: v.string(),
    paidWithCrypto: v.optional(v.boolean()),
    cryptoTokenId: v.optional(v.string()),
  })
    .index("by_buyer", ["buyerAccountId"])
    .index("by_product", ["productId"])
    .index("by_company", ["companyId"]),

  stocks: defineTable({
    companyId: v.string(),
    ticker: v.string(),
    totalShares: v.number(),
    currentPrice: v.number(), // in cents
    marketCap: v.number(), // in cents
    priceHistory: v.array(
      v.object({
        timestamp: v.number(),
        price: v.number(),
      })
    ),
  })
    .index("by_company", ["companyId"])
    .index("by_ticker", ["ticker"])
    .index("by_market_cap", ["marketCap"]),

  stockHoldings: defineTable({
    accountId: v.string(),
    stockId: v.string(),
    companyId: v.string(),
    shares: v.number(),
    averageCost: v.number(), // in cents per share
  })
    .index("by_account", ["accountId"])
    .index("by_stock", ["stockId"])
    .index("by_company", ["companyId"]),

  cryptoTokens: defineTable({
    ticker: v.string(),
    name: v.string(),
    creatorAccountId: v.string(),
    totalSupply: v.number(),
    currentPrice: v.number(), // in cents
    priceHistory: v.array(
      v.object({
        timestamp: v.number(),
        price: v.number(),
      })
    ),
  })
    .index("by_ticker", ["ticker"])
    .index("by_creator", ["creatorAccountId"]),

  cryptoHoldings: defineTable({
    accountId: v.string(),
    tokenId: v.string(),
    amount: v.number(),
    averageCost: v.number(), // in cents per token
  })
    .index("by_account", ["accountId"])
    .index("by_token", ["tokenId"]),

  loans: defineTable({
    accountId: v.string(),
    principal: v.number(), // in cents
    remainingPrincipal: v.number(), // in cents
    interestRate: v.number(),
    accruedInterest: v.number(), // in cents
    lastAccrualDate: v.number(), // timestamp
    status: v.union(v.literal("active"), v.literal("repaid"), v.literal("defaulted")),
    nextPaymentDue: v.optional(v.number()), // timestamp
  })
    .index("by_account", ["accountId"])
    .index("by_status", ["status"]),

  offers: defineTable({
    companyId: v.string(),
    fromAccountId: v.string(),
    toAccountId: v.string(),
    amount: v.number(), // in cents
    percentage: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("countered"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    parentOfferId: v.optional(v.string()),
    resolvedAt: v.optional(v.number()), // timestamp
    metadata: v.optional(v.any()),
  })
    .index("by_company", ["companyId"])
    .index("by_from_account", ["fromAccountId"])
    .index("by_to_account", ["toAccountId"])
    .index("by_status", ["status"]),

  notifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("offer"),
      v.literal("counter_offer"),
      v.literal("offer_accepted"),
      v.literal("offer_rejected"),
      v.literal("general")
    ),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    metadata: v.optional(v.any()),
    relatedOfferId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_read", ["read"]),

  upgrades: defineTable({
    name: v.string(),
    description: v.string(),
    cost: v.number(), // in cents
    iconUrl: v.optional(v.string()),
    category: v.string(),
  }).index("by_category", ["category"]),

  userUpgrades: defineTable({
    userId: v.string(),
    upgradeId: v.string(),
    purchasedAt: v.number(), // timestamp
    transactionId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_upgrade", ["upgradeId"]),

  collectionItems: defineTable({
    accountId: v.string(),
    productId: v.string(),
    companyId: v.string(),
    quantity: v.number(),
    totalPaid: v.number(), // in cents
    averageCost: v.number(), // in cents per item
  })
    .index("by_account", ["accountId"])
    .index("by_product", ["productId"]),

  tickLocks: defineTable({
    tickId: v.string(),
    locked: v.boolean(),
    lockedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_tick_id", ["tickId"]),
});
