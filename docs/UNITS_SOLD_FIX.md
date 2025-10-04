# Units Sold Calculation Fix

## Problem

The units sold numbers in the company dashboard were severely inaccurate. For example:

- Product selling for $5.70
- Revenue shown as $946.20
- Units sold showing as only 6
- **Expected**: $946.20 / $5.70 = 166 units, not 6!

## Root Cause Analysis

### Initial Investigation

First thought the issue was using `totalSales` field vs counting transactions, but the real problem was deeper:

### Actual Root Cause

The bug was in how transactions were being filtered in `getCompanyDashboard`:

**Problematic Code:**

```typescript
// Got ALL company transactions first
const incoming = await ctx.db
  .query("ledger")
  .withIndex("by_to_account", (q) => q.eq("toAccountId", company.accountId))
  .collect();

// Filtered to product purchases
const revenueTransactions = incoming.filter(
  (tx) => tx.type === "product_purchase"
);

// Then tried to filter AGAIN by productId for each product
const productRevenue = revenueTransactions
  .filter((tx) => tx.productId === product._id)
  .reduce((sum, tx) => sum + tx.amount, 0);
```

### The Bug

The double-filtering approach had issues:

1. Pre-filtering by company account might miss some transactions
2. The nested filtering logic wasn't working correctly for counting
3. Revenue was calculated correctly (sum of amounts) but count was wrong
4. This caused: correct revenue total, but incorrect unit count

## Solution

### Changes Made

#### 1. Updated `getCompanyDashboard` in `convex/companies.ts`

**Before:**

```typescript
unitsSold: product.totalSales,
```

**After:**

````typescript
## Solution

### Fixed Approach
Query ALL ledger transactions and filter directly by product ID:

```typescript
// Get ALL transactions (not pre-filtered by company)
const allLedgerTransactions = await ctx.db.query("ledger").collect();

// Filter for THIS specific product's purchases
const productPurchases = allLedgerTransactions.filter(
  tx => tx.productId &&
        tx.productId === product._id &&
        tx.type === "product_purchase"
);

// Count = number of transactions
const unitsSold = productPurchases.length;

// Revenue = sum of transaction amounts
const productRevenue = productPurchases.reduce((sum, tx) => sum + tx.amount, 0);

// Average price for verification
const avgSalePrice = unitsSold > 0 ? productRevenue / unitsSold : 0;
````

### Why This Works

1. **Single source of truth**: Query ledger directly, no pre-filtering
2. **Consistent counting**: Same filter for both count and sum
3. **Accurate results**: Units sold now matches revenue calculation
4. **Handles price changes**: Shows average sale price vs current price

### Changes Made

#### Updated `getCompanyDashboard` in `convex/companies.ts`

**Before (Broken):**

```typescript
const revenueTransactions = incoming.filter(
  (tx) => tx.type === "product_purchase"
);
const unitsSold = revenueTransactions.filter(
  (tx) => tx.productId === product._id
).length;
```

**After (Fixed):**

```typescript
const allLedgerTransactions = await ctx.db.query("ledger").collect();
const productPurchases = allLedgerTransactions.filter(
  (tx) =>
    tx.productId &&
    tx.productId === product._id &&
    tx.type === "product_purchase"
);
const unitsSold = productPurchases.length;
```

```

#### 2. #### Enhanced Company Dashboard Table

Added new column to show diagnostic information:

- **Current Price**: The price the product is currently listed at
- **Avg Sale Price**: The average price across all historical sales (for verification)
- **Units Sold**: Accurate count based on ledger transactions
- **Revenue**: Sum of all sale amounts

This allows verification: `revenue ≈ unitsSold × avgSalePrice` ✓

## Benefits

### Accuracy
- Units sold now accurately reflects the number of purchase transactions
- Revenue calculation matches the units sold count
- Handles price changes correctly

### Transparency
- Shows both current and average sale price
- Makes it clear when prices have changed
- Users can verify: `revenue ≈ unitsSold × avgSalePrice`

### Reliability
- Based on immutable ledger transactions
- No risk of counter fields getting out of sync
- Single source of truth (the ledger)

## Example Scenarios

### Scenario 1: Consistent Pricing
- Product price: $100
- Units sold: 5
- Revenue: $500
- Avg sale price: $100 ✓

### Scenario 2: Price Changed
- Started at $100, changed to $150 after 3 sales
- Units sold: 5 (3 at $100, 2 at $150)
- Revenue: $600 (3×$100 + 2×$150)
- Current price: $150
- Avg sale price: $120 ($600/5) ✓

### Scenario 3: No Sales Yet
- Units sold: 0
- Revenue: $0
- Avg sale price: $0
- Current price: $100 ✓

## Technical Details

### Data Flow
1. `automaticPurchase` creates ledger entries with `type: "product_purchase"`
2. Each ledger entry records the `amount` (price at time of sale)
3. Dashboard queries all ledger entries filtered by `productId`
4. Counts entries for units sold
5. Sums amounts for revenue
6. Divides revenue by units for average price

### Why This Is Better
- **Auditable**: Every sale has a ledger entry
- **Accurate**: Based on actual transaction records
- **Historical**: Preserves price history
- **Flexible**: Works regardless of price changes
- **Verifiable**: Easy to trace back to source data

## Migration Notes

### Existing Data
- No migration needed
- `totalSales` field still exists but isn't used for dashboard
- Marketplace still uses `totalSales` (could be updated later)
- All historical data preserved in ledger

### Future Considerations
Could optionally:
1. Remove `totalSales` field entirely (not recommended, good for marketplace performance)
2. Add a cron job to sync `totalSales` with ledger (redundant but ensures consistency)
3. Add more analytics like sales velocity, trending products, etc.

## Verification Steps

To verify the fix is working:

1. Navigate to a company dashboard
2. Check the product table
3. Verify: `revenue ≈ unitsSold × avgSalePrice`
4. If prices were changed, verify `avgSalePrice ≠ currentPrice`
5. Check that units sold is a whole number
6. Confirm revenue is the sum of all sales

## Related Files

- `convex/companies.ts` - Backend calculation logic
- `app/components/game/company-dashboard.tsx` - Frontend display
- `convex/products.ts` - Automatic purchase logic (unchanged)
- `convex/schema.ts` - Database schema (unchanged)
```
