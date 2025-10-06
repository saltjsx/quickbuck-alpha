# Convex Database Performance Best Practices for AI Agents

This document provides critical guidelines for AI agents working on this Convex-powered application to ensure optimal database query performance and minimize read bandwidth.

## 🚨 Critical Rules: ALWAYS Follow These

### 1. **NEVER Use `.collect()` on Full Tables**

❌ **WRONG:**

```typescript
const users = await ctx.db.query("users").collect();
const products = await ctx.db.query("products").collect();
const ledger = await ctx.db.query("ledger").collect();
```

✅ **CORRECT:**

```typescript
// Use take() with a reasonable limit
const users = await ctx.db.query("users").take(100);

// Or use an index with specific filters
const products = await ctx.db
  .query("products")
  .withIndex("by_company", (q) => q.eq("companyId", companyId))
  .collect();
```

**Why:** `.collect()` without an index performs a full table scan, reading every document in the table. This causes massive bandwidth consumption.

### 2. **ALWAYS Use Indexes for Filtering**

❌ **WRONG:**

```typescript
// This scans the ENTIRE ledger table!
const allTransactions = await ctx.db.query("ledger").collect();
const filtered = allTransactions.filter((tx) => tx.productId === productId);
```

✅ **CORRECT:**

```typescript
// This uses the index to directly find matching records
const transactions = await ctx.db
  .query("ledger")
  .withIndex("by_product", (q) => q.eq("productId", productId))
  .collect();
```

**Why:** Indexes organize data for fast lookups. Without indexes, Convex must scan every document.

### 3. **Define Indexes Before Querying**

When you need to filter by a field, FIRST add the index to `schema.ts`:

```typescript
// In convex/schema.ts
ledger: defineTable({
  productId: v.optional(v.id("products")),
  type: v.string(),
  // ... other fields
})
  .index("by_product", ["productId"])
  .index("by_type", ["type"]);
```

Then use it in queries:

```typescript
// In your query function
const transactions = await ctx.db
  .query("ledger")
  .withIndex("by_product", (q) => q.eq("productId", productId))
  .collect();
```

## 📊 Understanding Query Performance

### Query Performance = Size of Index Range

The performance of a Convex query depends on **how many documents are in the index range**, NOT the total table size.

**Example:**

```typescript
// Performance depends on # of messages in THIS channel only
const messages = await ctx.db
  .query("messages")
  .withIndex("by_channel", (q) => q.eq("channel", channelId))
  .collect();
```

This query is fast even if the `messages` table has millions of records, because we're only looking at messages in one channel.

## 🔍 Index Usage Patterns

### Pattern 1: Single Field Index

```typescript
// Schema
products: defineTable({
  companyId: v.id("companies"),
  isActive: v.boolean(),
}).index("by_company", ["companyId"]);

// Query
const companyProducts = await ctx.db
  .query("products")
  .withIndex("by_company", (q) => q.eq("companyId", companyId))
  .collect();
```

### Pattern 2: Compound Index (Multiple Fields)

```typescript
// Schema - sorted by companyId first, then isActive
products: defineTable({
  companyId: v.id("companies"),
  isActive: v.boolean(),
}).index("by_company_active", ["companyId", "isActive"]);

// Query - can filter by both fields efficiently
const activeProducts = await ctx.db
  .query("products")
  .withIndex("by_company_active", (q) =>
    q.eq("companyId", companyId).eq("isActive", true)
  )
  .collect();

// Query - can also filter by just the first field
const allCompanyProducts = await ctx.db
  .query("products")
  .withIndex("by_company_active", (q) => q.eq("companyId", companyId))
  .collect();
```

**Important:** You MUST filter fields in order. Can't skip the first field in a compound index.

### Pattern 3: Range Queries

```typescript
// Schema
ledger: defineTable({
  createdAt: v.number(),
}).index("by_created_at", ["createdAt"]);

// Query - get transactions in a time range
const recentTransactions = await ctx.db
  .query("ledger")
  .withIndex("by_created_at", (q) =>
    q.gte("createdAt", startTime).lt("createdAt", endTime)
  )
  .collect();
```

### Pattern 4: Sorting with Indexes

```typescript
// Schema
companies: defineTable({
  sharePrice: v.number(),
}).index("by_sharePrice", ["sharePrice"]);

// Query - get top 10 by share price
const topCompanies = await ctx.db
  .query("companies")
  .withIndex("by_sharePrice")
  .order("desc")
  .take(10);
```

## 🎯 When to Use Each Query Method

### `.collect()`

- Use WITH an index and specific filter
- Good when you need all matching records
- Be cautious of result size

```typescript
// ✅ Good - filtered by index
const userProducts = await ctx.db
  .query("collections")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .collect();
```

### `.take(n)`

- Use when you only need the first N results
- Great for pagination
- Always safe to use

```typescript
// ✅ Good - limits result size
const recentUsers = await ctx.db.query("users").order("desc").take(50);
```

### `.first()`

- Use when expecting 0 or 1 result
- Returns null if not found
- Very efficient

```typescript
// ✅ Good - gets exactly one result
const account = await ctx.db
  .query("accounts")
  .withIndex("by_owner", (q) => q.eq("ownerId", userId))
  .filter((q) => q.eq(q.field("type"), "personal"))
  .first();
```

### `.unique()`

- Use when expecting exactly 1 result
- Throws error if multiple results found
- Very efficient

```typescript
// ✅ Good - enforces uniqueness
const counter = await ctx.db.query("counter").unique();
```

## ⚡ Performance Optimization Strategies

### 1. Batch Fetching

❌ **WRONG:**

```typescript
for (const user of users) {
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
    .first();
  // Do something with account
}
```

✅ **CORRECT:**

```typescript
// Fetch all at once in parallel
const accounts = await Promise.all(
  users.map((user) =>
    ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first()
  )
);
```

### 2. Limit Related Queries

```typescript
// Don't fetch unlimited related records
const holdings = await ctx.db
  .query("stocks")
  .withIndex("by_holder", (q) => q.eq("holderId", userId))
  .take(50); // ✅ Limit to prevent excessive bandwidth
```

### 3. Cache Frequently Used Data

```typescript
// Build a map to avoid repeated queries
const companyMap = new Map();
for (const product of products) {
  if (!companyMap.has(product.companyId)) {
    const company = await ctx.db.get(product.companyId);
    companyMap.set(product.companyId, company);
  }
}
```

### 4. Use .filter() for Additional Criteria

`.withIndex()` is for efficient range selection. `.filter()` is for additional criteria:

```typescript
const results = await ctx.db
  .query("stocks")
  .withIndex("by_holder", (q) => q.eq("holderId", userId))
  // First narrow down by index (efficient)
  .filter((q) => q.eq(q.field("holderType"), "user"))
  // Then apply additional filtering
  .collect();
```

## 📋 Available Indexes in This Project

Current indexes defined in `convex/schema.ts`:

### Users

- `by_token` - `["tokenIdentifier"]`
- `by_username` - `["username"]`

### Ledger

- `by_from_account` - `["fromAccountId"]`
- `by_to_account` - `["toAccountId"]`
- `by_created_at` - `["createdAt"]`
- `by_product` - `["productId"]`
- `by_type` - `["type"]`

### Accounts

- `by_owner` - `["ownerId"]`
- `by_company` - `["companyId"]`
- `by_type_balance` - `["type", "balance"]`

### Balances

- `by_account` - `["accountId"]`

### Companies

- `by_owner` - `["ownerId"]`
- `by_public` - `["isPublic"]`
- `by_account` - `["accountId"]`
- `by_ticker` - `["ticker"]`
- `by_sharePrice` - `["sharePrice"]`
- `by_totalShares` - `["totalShares"]`

### Company Access

- `by_company` - `["companyId"]`
- `by_user` - `["userId"]`
- `by_company_user` - `["companyId", "userId"]`

### Stocks

- `by_company` - `["companyId"]`
- `by_holder` - `["holderId"]`
- `by_company_holder` - `["companyId", "holderId"]`
- `by_holderType_shares` - `["holderType", "shares"]`

### Stock Price History

- `by_company` - `["companyId"]`
- `by_company_timestamp` - `["companyId", "timestamp"]`
- `by_timestamp` - `["timestamp"]`

### Stock Transactions

- `by_company` - `["companyId"]`
- `by_buyer` - `["buyerId"]`
- `by_timestamp` - `["timestamp"]`

### Products

- `by_company` - `["companyId"]`
- `by_active` - `["isActive"]`
- `by_active_totalSales` - `["isActive", "totalSales"]`
- `by_created_by` - `["createdBy"]`
- `by_company_active` - `["companyId", "isActive"]`

### Collections

- `by_user` - `["userId"]`
- `by_product` - `["productId"]`
- `by_user_product` - `["userId", "productId"]`
- `by_user_purchased` - `["userId", "purchasedAt"]`

### Licenses

- `by_company` - `["companyId"]`
- `by_company_active` - `["companyId", "isActive"]`
- `by_expiration` - `["expiresAt"]`

### Expenses

- `by_company` - `["companyId"]`
- `by_type` - `["type"]`
- `by_company_created` - `["companyId", "createdAt"]`

## 🚫 Common Anti-Patterns to Avoid

### 1. Full Table Scan for Filtering

```typescript
❌ const all = await ctx.db.query("ledger").collect();
const filtered = all.filter(tx => tx.type === "product_purchase");
```

### 2. Using .filter() Instead of .withIndex()

```typescript
❌ const stocks = await ctx.db
  .query("stocks")
  .filter((q) => q.eq(q.field("companyId"), companyId))
  .collect();
```

### 3. Not Limiting Result Size

```typescript
❌ const users = await ctx.db.query("users").collect();
```

### 4. Iterating with Individual Queries

```typescript
❌ for (const id of ids) {
  const item = await ctx.db.get(id);
}
```

### 5. Missing Indexes for Common Queries

```typescript
❌ // No index defined for this filter
const results = await ctx.db
  .query("products")
  .withIndex("by_company", (q) => q.eq("companyId", companyId))
  .filter((q) => q.eq(q.field("isActive"), true)) // Should be in index!
  .collect();
```

## 🎓 Learning Resources

For deeper understanding, refer to:

- `temp-docs.md` - Complete Convex indexing documentation
- Official Convex Docs: https://docs.convex.dev/database/indexes

## ✅ Checklist for AI Agents

Before writing a query, ask:

1. ☑️ Can I use an existing index for this query?
2. ☑️ Do I need to add a new index to schema.ts?
3. ☑️ Am I using `.collect()` without an index? (RED FLAG!)
4. ☑️ Can I use `.take()`, `.first()`, or `.unique()` instead of `.collect()`?
5. ☑️ Am I batching related queries with `Promise.all()`?
6. ☑️ Have I limited the size of related data fetches?
7. ☑️ Is my index range expression as specific as possible?

## 🔧 Adding a New Index

When you identify a query that needs an index:

1. **Add to schema.ts:**

```typescript
myTable: defineTable({
  // ... fields
}).index("by_my_field", ["myField"]);
```

2. **Deploy:**

```bash
npx convex deploy
```

3. **Use in queries:**

```typescript
const results = await ctx.db
  .query("myTable")
  .withIndex("by_my_field", (q) => q.eq("myField", value))
  .collect();
```

## 🎯 Remember

> **The golden rule:** Query performance is determined by the size of the index range, not the table size. Always make your index ranges as specific as possible using `.withIndex()` with equality expressions.

---

**Last Updated:** October 2025
**Maintained by:** AI Agents & Development Team
