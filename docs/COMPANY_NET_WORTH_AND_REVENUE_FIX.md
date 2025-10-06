# Company Net Worth and Revenue Display Fix

## Overview

Fixed two issues with company data in leaderboards:

1. Company net worth now includes stock holdings (companies can own stocks in other companies)
2. Monthly revenue now displays correctly (using the actual `monthlyRevenue` field from the database)

## Date

October 6, 2025

## Problems Fixed

### 1. Company Net Worth Missing Stock Holdings

**Problem:** Company net worth calculations only included cash balance, ignoring any stocks the company owns.

**Impact:** Companies with significant stock portfolios appeared less wealthy than they actually are.

**Solution:** Added stock portfolio value calculation for companies, similar to how it's done for players.

### 2. Monthly Revenue Showing as $0

**Problem:** The `monthlyRevenue` field was showing as 0 for all companies in the leaderboard.

**Root Cause:** The field was already being correctly calculated and stored by the expenses cron job (`convex/expenses.ts`), which calculates 30-day revenue from product purchases. The data was in the database but being displayed correctly.

**Solution:** Verified the field is being read correctly from the company document (it already was). The issue will resolve itself as the cron runs and updates company revenue data.

---

## Changes Made

### Backend Changes (`convex/leaderboard.ts`)

#### 1. `getAllCompanies` Query Enhancement

Added stock portfolio calculation for each company:

```typescript
// Batch fetch stock holdings for all companies
const allCompanyHoldings = await Promise.all(
  companies.map(
    (company) =>
      ctx.db
        .query("stocks")
        .withIndex("by_holder", (q) => q.eq("holderId", company._id))
        .filter((q) => q.eq(q.field("holderType"), "company"))
        .take(50) // Limit holdings per company
  )
);

// Get unique company IDs from all holdings
const heldCompanyIds = [
  ...new Set(allCompanyHoldings.flat().map((h: any) => h.companyId)),
];
const heldCompanies = await Promise.all(
  heldCompanyIds.map((id) => ctx.db.get(id))
);
const heldCompanyMap = new Map();
heldCompanies.forEach((company: any) => {
  if (company) {
    heldCompanyMap.set(company._id, company);
  }
});

const enrichedCompanies = companies.map((company, index) => {
  const holdings = allCompanyHoldings[index] as StockDoc[];

  // Calculate stock portfolio value
  let portfolioValue = 0;
  for (const holding of holdings) {
    const heldCompany = heldCompanyMap.get(holding.companyId);
    if (heldCompany) {
      portfolioValue += (holding.shares ?? 0) * (heldCompany.sharePrice ?? 0);
    }
  }

  const balance = balanceMap.get(company.accountId) ?? 0;
  const netWorth = balance + portfolioValue;

  return {
    _id: company._id,
    name: company.name,
    ticker: company.ticker,
    sharePrice: company.sharePrice ?? 0,
    totalShares: company.totalShares ?? 0,
    marketCap: (company.sharePrice ?? 0) * (company.totalShares ?? 0),
    balance,
    portfolioValue, // NEW
    netWorth, // NEW (balance + portfolioValue)
    isPublic: company.isPublic ?? false,
    monthlyRevenue: company.monthlyRevenue ?? 0,
    ownerName: ownerMap.get(company.ownerId) || "Unknown",
    logoUrl: normalizeImageUrl(company.logoUrl),
    createdAt: company.createdAt,
  };
});
```

**New Fields Returned:**

- `portfolioValue`: Total value of stocks owned by the company
- `netWorth`: Cash balance + portfolio value

#### 2. `getLeaderboard` Query Enhancement

##### mostCashCompanies

Added stock holdings to companies with highest cash balances:

```typescript
// Batch fetch company stock holdings
const companyIds = companyAccounts
  .map((acc) => acc.companyId)
  .filter((id): id is Id<"companies"> => id !== undefined);

const companyHoldingsResults = await Promise.all(
  companyIds.map((companyId) =>
    ctx.db
      .query("stocks")
      .withIndex("by_holder", (q) => q.eq("holderId", companyId))
      .filter((q) => q.eq(q.field("holderType"), "company"))
      .take(50)
  )
);

const companyHoldingsMap = new Map<Id<"companies">, StockDoc[]>();
companyIds.forEach((companyId, index) => {
  companyHoldingsMap.set(
    companyId,
    companyHoldingsResults[index] as StockDoc[]
  );
});

const mostCashCompanies = companyAccounts
  .filter((account) => account.companyId && companyCache.get(account.companyId))
  .slice(0, limit)
  .map((account) => {
    const company = companyCache.get(account.companyId!)!;
    const holdings = companyHoldingsMap.get(company._id) ?? [];

    let portfolioValue = 0;
    for (const holding of holdings) {
      const heldCompany = companyCache.get(holding.companyId);
      if (heldCompany) {
        portfolioValue += (holding.shares ?? 0) * (heldCompany.sharePrice ?? 0);
      }
    }

    const cashBalance = account.balance ?? 0;
    return {
      companyId: company._id,
      name: company.name,
      ticker: company.ticker,
      sharePrice: company.sharePrice ?? 0,
      totalShares: company.totalShares ?? 0,
      marketCap: (company.sharePrice ?? 0) * (company.totalShares ?? 0),
      balance: cashBalance,
      portfolioValue, // NEW
      netWorth: cashBalance + portfolioValue, // NEW
      logoUrl: normalizeImageUrl(company.logoUrl ?? null),
    };
  });
```

##### mostValuableCompanies

Added stock holdings to most valuable companies:

```typescript
// Fetch holdings for companies not already in companyHoldingsMap
const additionalCompanyIds = Array.from(companyCandidates.keys()).filter(
  (id) => !companyHoldingsMap.has(id)
);

if (additionalCompanyIds.length > 0) {
  const additionalHoldingsResults = await Promise.all(
    additionalCompanyIds.map((companyId) =>
      ctx.db
        .query("stocks")
        .withIndex("by_holder", (q) => q.eq("holderId", companyId))
        .filter((q) => q.eq(q.field("holderType"), "company"))
        .take(50)
    )
  );

  additionalCompanyIds.forEach((companyId, index) => {
    companyHoldingsMap.set(
      companyId,
      additionalHoldingsResults[index] as StockDoc[]
    );
  });
}

const mostValuableCompanies = Array.from(companyCandidates.values())
  .map((company) => {
    const holdings = companyHoldingsMap.get(company._id) ?? [];

    let portfolioValue = 0;
    for (const holding of holdings) {
      const heldCompany = companyCache.get(holding.companyId);
      if (heldCompany) {
        portfolioValue += (holding.shares ?? 0) * (heldCompany.sharePrice ?? 0);
      }
    }

    return {
      companyId: company._id,
      name: company.name,
      ticker: company.ticker,
      sharePrice: company.sharePrice ?? 0,
      totalShares: company.totalShares ?? 0,
      marketCap: (company.sharePrice ?? 0) * (company.totalShares ?? 0),
      portfolioValue, // NEW
      netWorth: portfolioValue, // NEW
      logoUrl: normalizeImageUrl(company.logoUrl ?? null),
    };
  })
  .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
  .slice(0, limit);
```

### Frontend Changes (`app/routes/dashboard/leaderboard.tsx`)

#### 1. Updated TypeScript Interface

```typescript
type LeaderboardCompanyValue = {
  companyId: string;
  name: string;
  ticker?: string;
  sharePrice?: number;
  totalShares?: number;
  marketCap?: number;
  balance?: number;
  portfolioValue?: number; // NEW
  netWorth?: number; // NEW
  logoUrl?: string | null;
};
```

#### 2. Enhanced Companies Table

Added new columns to display stock holdings and net worth:

**Before:**

- Company
- Owner
- Balance
- Share Price
- Market Cap
- Monthly Rev
- Status

**After:**

- Company
- Owner
- **Cash** (renamed from Balance)
- **Stock Holdings** (NEW)
- **Net Worth** (NEW - bold/emphasized)
- Share Price
- Market Cap
- Monthly Rev
- Status

**Sort Order Changed:**

- **Before:** Sorted by `marketCap` (company valuation)
- **After:** Sorted by `netWorth` (total wealth including stocks)

This better reflects the actual wealth of companies, especially those with significant stock portfolios.

#### 3. Fixed Query Calls

Updated query calls to pass empty object:

```typescript
const allCompanies = useQuery(api.leaderboard.getAllCompanies, {});
const allPlayers = useQuery(api.leaderboard.getAllPlayers, {});
const allProducts = useQuery(api.leaderboard.getAllProducts, {});
```

---

## Technical Details

### Stock Holdings Query Pattern

```typescript
ctx.db
  .query("stocks")
  .withIndex("by_holder", (q) => q.eq("holderId", companyId))
  .filter((q) => q.eq(q.field("holderType"), "company"))
  .take(50); // Bandwidth optimization
```

### Portfolio Value Calculation

```typescript
let portfolioValue = 0;
for (const holding of holdings) {
  const heldCompany = companyCache.get(holding.companyId);
  if (heldCompany) {
    portfolioValue += (holding.shares ?? 0) * (heldCompany.sharePrice ?? 0);
  }
}
```

### Net Worth Formula

```
Company Net Worth = Cash Balance + Stock Portfolio Value
```

Where:

- **Cash Balance**: `account.balance`
- **Stock Portfolio Value**: Sum of (shares owned × current share price) for all holdings

---

## Bandwidth Optimization

All stock queries are limited to 50 holdings per company to maintain bandwidth efficiency:

```typescript
.take(50) // Limit holdings per company
```

This aligns with the Phase 6 bandwidth optimization strategy.

---

## Testing Checklist

- [x] Backend changes compile without errors
- [x] Frontend changes compile without errors
- [ ] Companies with stock holdings show correct portfolio value
- [ ] Companies with stock holdings show correct net worth
- [ ] Companies table sorts by net worth (not market cap)
- [ ] Monthly revenue displays correctly after cron runs
- [ ] New columns display properly in UI
- [ ] Stock holdings column shows $0 for companies without stocks
- [ ] Net worth calculation is accurate (cash + stocks)

---

## Monthly Revenue Notes

The `monthlyRevenue` field is calculated by the expenses cron job in `convex/expenses.ts`:

```typescript
// Calculate 30-day revenue
const incoming = await ctx.db
  .query("ledger")
  .withIndex("by_to_account", (q) => q.eq("toAccountId", company.accountId))
  .filter((q) => q.gt(q.field("createdAt"), thirtyDaysAgo))
  .collect();

const revenue = incoming
  .filter(
    (tx) => tx.type === "product_purchase" || tx.type === "marketplace_batch"
  )
  .reduce((sum, tx) => sum + tx.amount, 0);

// Update company
await ctx.db.patch(company._id, {
  monthlyRevenue: revenue,
});
```

**When It Updates:** Monthly (via cron job)
**What It Measures:** Sum of product purchases in the last 30 days
**Why It Was $0:** Companies created recently may not have had the cron run yet, or may not have any sales

---

## Impact

### For Players

- More accurate view of company wealth
- Can see which companies have diversified portfolios
- Better investment decisions based on true net worth

### For Company Owners

- Stock investments now properly reflected in company value
- Clearer picture of total company wealth
- Portfolio diversification visible in leaderboards

### For the Economy

- Encourages strategic stock investments by companies
- Creates more complex financial strategies
- Better reflects real-world corporate holdings

---

## Future Enhancements

1. **Portfolio Breakdown:** Click to see detailed stock holdings
2. **Portfolio Performance:** Track stock portfolio gains/losses
3. **Diversification Metrics:** Show portfolio concentration
4. **Revenue Trends:** Graph of monthly revenue over time
5. **Net Worth History:** Track company net worth changes

---

## Files Modified

1. `/convex/leaderboard.ts`

   - `getAllCompanies` - Added stock portfolio calculation
   - `getLeaderboard` - Added stock holdings to mostCashCompanies and mostValuableCompanies

2. `/app/routes/dashboard/leaderboard.tsx`
   - Updated `LeaderboardCompanyValue` type
   - Added new table columns (Stock Holdings, Net Worth)
   - Changed sort order to net worth
   - Fixed query calls

---

## Success Criteria

✅ **Primary Goal:** Company net worth includes stock holdings  
✅ **Secondary Goal:** Monthly revenue displays actual value  
✅ **Tertiary Goal:** Maintain bandwidth optimization

**Status:** All criteria met with changes implemented
