# Database Optimization Quick Reference

> **TL;DR:** How to write efficient Convex queries in QuickBuck

## 🚨 Critical Rules

### 1. NEVER Load All Records Then Filter

```typescript
// ❌ BAD - Loads everything into memory
const all = await ctx.db.query("ledger").collect();
const filtered = all.filter((tx) => tx.accountId === id);

// ✅ GOOD - Use indexed query
const filtered = await ctx.db
  .query("ledger")
  .withIndex("by_account", (q) => q.eq("accountId", id))
  .collect();
```

### 2. ALWAYS Use Cached Account Balances

```typescript
// ❌ BAD - Queries balances table
const balanceRecord = await ctx.db
  .query("balances")
  .withIndex("by_account", (q) => q.eq("accountId", id))
  .first();

// ✅ GOOD - Use cached balance on account
const account = await ctx.db.get(accountId);
const balance = account?.balance ?? 0;
```

### 3. ALWAYS Batch Related Queries

```typescript
// ❌ BAD - Sequential queries (N round trips)
const enriched = await Promise.all(
  items.map(async (item) => {
    const related = await ctx.db.get(item.relatedId);
    return { ...item, related };
  })
);

// ✅ GOOD - Batch fetch (1 round trip)
const relatedIds = items.map((i) => i.relatedId);
const related = await Promise.all(relatedIds.map((id) => ctx.db.get(id)));
const relatedMap = new Map();
related.forEach((r, i) => relatedMap.set(relatedIds[i], r));

const enriched = items.map((item) => ({
  ...item,
  related: relatedMap.get(item.relatedId),
}));
```

### 4. ALWAYS Limit Result Sets

```typescript
// ❌ BAD - Unbounded query
const users = await ctx.db.query("users").collect();

// ✅ GOOD - Limited query
const users = await ctx.db.query("users").take(100);

// ✅ BETTER - Limited + sliced results
const users = await ctx.db.query("users").take(500);
const results = filtered.slice(0, 20);
```

### 5. ALWAYS Time-Bound Historical Queries

```typescript
// ❌ BAD - Loads all history
const history = await ctx.db
  .query("stockPriceHistory")
  .withIndex("by_company", (q) => q.eq("companyId", id))
  .collect();

// ✅ GOOD - Last 30 days only
const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
const history = await ctx.db
  .query("stockPriceHistory")
  .withIndex("by_company_timestamp", (q) =>
    q.eq("companyId", id).gt("timestamp", thirtyDaysAgo)
  )
  .collect();
```

---

## 📋 Common Patterns

### Pattern: Fetch User's Data

```typescript
// Get user ID
const userId = await getCurrentUserId(ctx);
if (!userId) throw new Error("Not authenticated");

// Get personal account (with cached balance)
const account = await ctx.db
  .query("accounts")
  .withIndex("by_owner", (q) => q.eq("ownerId", userId))
  .filter((q) => q.eq(q.field("type"), "personal"))
  .first();

const balance = account?.balance ?? 0;
```

### Pattern: Enrich with Related Data

```typescript
// 1. Fetch main data
const products = await ctx.db
  .query("products")
  .withIndex("by_active", (q) => q.eq("isActive", true))
  .collect();

// 2. Extract unique related IDs
const companyIds = [...new Set(products.map((p) => p.companyId))];

// 3. Batch fetch related data
const companies = await Promise.all(companyIds.map((id) => ctx.db.get(id)));

// 4. Build lookup map
const companyMap = new Map();
companies.forEach((c) => {
  if (c) companyMap.set(c._id, c);
});

// 5. Enrich (no additional queries)
const enriched = products.map((p) => ({
  ...p,
  companyName: companyMap.get(p.companyId)?.name,
}));
```

### Pattern: Get Account Transactions

```typescript
// Use indexed queries for both directions
const incoming = await ctx.db
  .query("ledger")
  .withIndex("by_to_account", (q) => q.eq("toAccountId", accountId))
  .order("desc")
  .take(50);

const outgoing = await ctx.db
  .query("ledger")
  .withIndex("by_from_account", (q) => q.eq("fromAccountId", accountId))
  .order("desc")
  .take(50);

// Combine and sort
const all = [...incoming, ...outgoing]
  .sort((a, b) => b.createdAt - a.createdAt)
  .slice(0, 50);
```

### Pattern: Update Balance

```typescript
// Only update the account table (single source of truth)
await ctx.db.patch(accountId, {
  balance: newBalance,
});

// DO NOT update balances table - it's deprecated
```

### Pattern: Search with Limits

```typescript
// Limit initial fetch
const items = await ctx.db.query("items").take(500);

// Filter in memory
const searchLower = searchTerm.toLowerCase();
const matched = items
  .filter((item) => item.name.toLowerCase().includes(searchLower))
  .slice(0, 20); // Limit results

return matched;
```

---

## 🎯 Optimization Checklist

When writing a new query, ask yourself:

- [ ] Am I using the correct index?
- [ ] Am I limiting the result set?
- [ ] Am I time-bounding historical data?
- [ ] Am I batching related queries?
- [ ] Am I using cached balances?
- [ ] Am I avoiding `.collect()` then filter?
- [ ] Could I combine multiple queries?
- [ ] Is this query O(N) or worse?

---

## 🔍 Available Indexes

### Ledger Table

- `by_created_at` - For time-ordered queries
- `by_from_account` - For outgoing transactions
- `by_to_account` - For incoming transactions

### Accounts Table

- `by_owner` - Find accounts by owner
- `by_type_balance` - Sort by account type and balance

### Companies Table

- `by_public` - Get public companies
- `by_ticker` - Look up by ticker symbol

### Stocks Table

- `by_holder` - Get holdings by holder ID
- `by_company` - Get all holders of a company
- `by_company_holder` - Lookup specific holding
- `by_holderType_shares` - Top stockholders

### Stock Price History

- `by_company` - All prices for a company
- `by_company_timestamp` - Time-filtered prices

### Products

- `by_active` - Get active products
- `by_company` - Products by company
- `by_active_totalSales` - Top selling products

---

## 🚀 Performance Tips

### Tip 1: Batch Operations

Group similar operations together:

```typescript
// ✅ GOOD - One batch operation
await Promise.all(
  items.map((item) => ctx.db.patch(item._id, { status: "processed" }))
);
```

### Tip 2: Use Maps for Lookups

O(1) lookup instead of O(N):

```typescript
const map = new Map();
items.forEach((item) => map.set(item.id, item));

// Fast lookup
const item = map.get(id);
```

### Tip 3: Single-Pass Processing

Process all data in one iteration:

```typescript
const stats = transactions.reduce(
  (acc, tx) => {
    acc.total += tx.amount;
    acc.count += 1;
    if (tx.type === "revenue") acc.revenue += tx.amount;
    if (tx.type === "cost") acc.costs += tx.amount;
    return acc;
  },
  { total: 0, count: 0, revenue: 0, costs: 0 }
);
```

### Tip 4: Early Returns

Stop processing when possible:

```typescript
if (!userId) return [];
if (items.length === 0) return [];
```

### Tip 5: Denormalize When Needed

Store computed values to avoid recalculation:

```typescript
// Store totalSales on product instead of counting transactions
await ctx.db.patch(productId, {
  totalSales: product.totalSales + 1,
  totalRevenue: product.totalRevenue + price,
});
```

---

## ⚠️ Common Mistakes

### Mistake 1: Sequential Queries in Loops

```typescript
// ❌ BAD
for (const item of items) {
  const related = await ctx.db.get(item.relatedId);
  // Process...
}

// ✅ GOOD
const relatedData = await Promise.all(
  items.map((item) => ctx.db.get(item.relatedId))
);
```

### Mistake 2: Not Using Indexes

```typescript
// ❌ BAD - Table scan
const company = await ctx.db
  .query("companies")
  .filter((q) => q.eq(q.field("ticker"), "AAPL"))
  .first();

// ✅ GOOD - Index scan
const company = await ctx.db
  .query("companies")
  .withIndex("by_ticker", (q) => q.eq("ticker", "AAPL"))
  .first();
```

### Mistake 3: Loading Too Much Data

```typescript
// ❌ BAD - Loads everything
const all = await ctx.db.query("ledger").collect();

// ✅ GOOD - Limited and filtered
const recent = await ctx.db
  .query("ledger")
  .withIndex("by_created_at")
  .order("desc")
  .take(100);
```

### Mistake 4: Redundant Queries

```typescript
// ❌ BAD - Queries same data multiple times
const account1 = await ctx.db.get(accountId);
const balance = account1?.balance ?? 0;
const account2 = await ctx.db.get(accountId); // Duplicate!

// ✅ GOOD - Query once, use multiple times
const account = await ctx.db.get(accountId);
const balance = account?.balance ?? 0;
const name = account?.name ?? "Unknown";
```

---

## 📊 Query Complexity Guide

### O(1) - Excellent

- Direct ID lookup: `ctx.db.get(id)`
- Map lookup: `map.get(key)`

### O(log N) - Good

- Indexed queries: `.withIndex("by_field")`
- Binary search operations

### O(N) - Acceptable

- Single pass through results: `.map()`, `.filter()`
- Limited `.take(N)` queries

### O(N²) - Avoid

- Nested loops over queries
- Sequential queries in map

### O(N × M) - Very Bad

- Cartesian products
- Multiple nested sequential queries

---

## 🎓 Further Reading

- [Phase 1 Optimizations](./DATABASE_BANDWIDTH_OPTIMIZATION.md)
- [Phase 2 Optimizations](./BANDWIDTH_OPTIMIZATION_PHASE2.md)
- [Phase 3 Optimizations](./BANDWIDTH_OPTIMIZATION_PHASE3.md)
- [Complete Summary](./DATABASE_OPTIMIZATION_COMPLETE.md)
- [Convex Index Documentation](https://docs.convex.dev/database/indexes)

---

**Last Updated:** October 5, 2025  
**Status:** ✅ Active - Use these patterns for all new queries
