# Equal Budget Split Update - Fair Purchasing System

**Date:** October 6, 2025  
**Version:** 3.0  
**Status:** ✅ Active

## Summary of Changes

The fair purchasing system has been updated to provide an even more balanced distribution across all price ranges by implementing equal budget splits and random product selection.

---

## What Changed?

### Previous System (v2.0)

- Budget was allocated proportionally based on weighted price mass of each tier
- All products in each tier were considered for purchases
- Purchase amounts were calculated based on price weights

### New System (v3.0)

- **Budget is split equally** across the three price ranges (33.33% each)
- **16 random products** are selected from each price range
- **Budget is distributed randomly** among the selected 16 products

---

## Key Improvements

### 1. Equal Budget Allocation

```typescript
// Split budget equally across three tiers
const budgetPerTier = totalSpend / 3;
const cheapBudget = budgetPerTier; // 33.33% of total
const mediumBudget = budgetPerTier; // 33.33% of total
const expensiveBudget = budgetPerTier; // 33.33% of total
```

**Why This Matters:**

- Every price tier gets an equal share of the total budget
- Ensures high-value products get adequate budget allocation
- More predictable revenue distribution across all price ranges

### 2. Random Product Selection (16 per tier)

```typescript
// Randomly select up to 16 products from this tier
const shuffledTier = [...tierProducts].sort(() => Math.random() - 0.5);
const selectedProducts = shuffledTier.slice(
  0,
  Math.min(16, tierProducts.length)
);
```

**Why This Matters:**

- Adds variability and excitement to each purchase cycle
- Prevents the same products from always getting purchases
- Gives all products in a tier a fair chance over time
- More engaging for players

### 3. Random Budget Distribution

```typescript
// Generate random budget shares for each selected product
const randomShares = selectedProducts.map(() => Math.random());
const totalRandomShare = randomShares.reduce((sum, share) => sum + share, 0);

// Normalize shares to sum to 1
const normalizedShares = randomShares.map((share) => share / totalRandomShare);

// Assign budget to each product
const productBudgets = selectedProducts.map((product, idx) => ({
  product,
  budget: normalizedShares[idx] * tierBudget,
}));
```

**Why This Matters:**

- Each of the 16 selected products gets a random share of the tier's budget
- More realistic shopping behavior (not uniform purchases)
- Adds unpredictability which increases replay value
- Some products may get more purchases in one cycle, others in the next

---

## Example Scenario

### Budget: $375,000 (mid-range)

**Budget Allocation:**

- Cheap tier (≤$150): $125,000
- Medium tier ($150-$1,000): $125,000
- Expensive tier (≥$1,000): $125,000

### Cheap Tier (40 products available)

1. **Select 16 random products** from the 40 available
2. **Generate random shares** for each (e.g., [0.05, 0.08, 0.03, ..., 0.06])
3. **Allocate budget proportionally:**

   - Product A gets 5% of $125K = $6,250
   - Product B gets 8% of $125K = $10,000
   - Product C gets 3% of $125K = $3,750
   - etc.

4. **Purchase products:**
   - If Product A costs $50, buy ~125 units
   - If Product B costs $100, buy ~100 units
   - If Product C costs $25, buy ~150 units

### Medium Tier (30 products available)

1. **Select 16 random products** from the 30 available
2. **Generate random shares** and allocate $125,000
3. **Purchase accordingly**

### Expensive Tier (20 products available)

1. **Select 16 random products** from the 20 available
2. **Generate random shares** and allocate $125,000
3. **Purchase accordingly**

---

## Expected Impact

### Revenue Distribution

**More Predictable Per Tier:**

- Each tier gets exactly 1/3 of the budget
- No tier is disadvantaged based on product count or prices

**More Variable Per Product:**

- In any given cycle, some products may sell more, others less
- Over multiple cycles, averages out to fair distribution
- Adds excitement and unpredictability

### Player Experience

**Benefits:**

- ✅ All pricing strategies remain viable
- ✅ High-price products get adequate budget
- ✅ More engaging with varying sales patterns
- ✅ Fair over time across all cycles
- ✅ Unpredictability keeps game interesting

**Example Player Stats (10 products, $375K budget):**

| Tier      | Products | Budget | Selected | Expected Sales/Product (avg) |
| --------- | -------- | ------ | -------- | ---------------------------- |
| Cheap     | 3        | $125K  | 3        | Variable (80-200 units)      |
| Medium    | 4        | $125K  | 4        | Variable (5-20 units)        |
| Expensive | 3        | $125K  | 3        | Variable (1-5 units)         |

_Note: Actual sales vary each cycle due to random selection and budget distribution_

---

## Technical Details

### Price Tier Definitions

```typescript
const cheapProducts = products.filter((p) => p.price <= 150);
const mediumProducts = products.filter((p) => p.price > 150 && p.price < 1000);
const expensiveProducts = products.filter((p) => p.price >= 1000);
```

**Boundaries:**

- **Cheap:** $0 - $150
- **Medium:** $150.01 - $999.99
- **Expensive:** $1,000+

### Purchase Algorithm

```typescript
const purchaseFromTier = async (tierProducts: any[], tierBudget: number) => {
  // 1. Select 16 random products
  const shuffledTier = [...tierProducts].sort(() => Math.random() - 0.5);
  const selectedProducts = shuffledTier.slice(
    0,
    Math.min(16, tierProducts.length)
  );

  // 2. Generate random budget shares
  const randomShares = selectedProducts.map(() => Math.random());
  const normalizedShares = randomShares.map(
    (share) => share / totalRandomShare
  );

  // 3. Allocate budgets
  const productBudgets = selectedProducts.map((product, idx) => ({
    product,
    budget: normalizedShares[idx] * tierBudget,
  }));

  // 4. Purchase products (expensive first to ensure they get purchased)
  productBudgets.sort((a, b) => b.product.price - a.product.price);

  for (const { product, budget } of productBudgets) {
    // Buy as many units as the allocated budget allows
    // (up to MAX_PURCHASES_PER_PRODUCT = 50)
  }

  // 5. Bonus round with any remaining budget
};
```

### Safety Features

- **Max purchases per product:** 50 units (prevents runaway purchases)
- **Price floor:** $0.01 minimum (prevents division by zero)
- **Expensive products first:** Ensures high-value items get purchased before budget runs out
- **Bonus round:** Uses any remaining budget for additional random purchases

---

## Strategy Guide for Players

### Diversification Still Key

Even with equal budget splits, having products across all tiers is recommended:

```
Recommended Portfolio (10 products):
- 3 cheap (≤$150)       → Frequent sales, steady income
- 4 medium ($150-$1K)   → Balanced volume and margins
- 3 expensive ($1K+)    → High-margin sales
```

### Understanding the Randomness

**Each Cycle:**

- 16 products are randomly selected from each tier
- Your products may or may not be selected
- If selected, they get a random share of the tier's budget

**Over Time:**

- Selection probability: 16/N (where N = products in tier)
- If N ≤ 16, your products are always selected
- Revenue averages out to be fair

**Example:**

- If there are 40 cheap products, each has a 40% chance (16/40) of being selected per cycle
- Over 10 cycles, each product will be selected ~4 times on average
- This adds variability while maintaining long-term fairness

### Optimal Pricing

**Within Each Tier:**

- **Cheap:** $100-150 (max profit before medium tier)
- **Medium:** $400-700 (sweet spot for this range)
- **Expensive:** $1,000-2,000 (most common expensive purchases)

**Why?**

- Higher prices within your tier = higher revenue per sale
- But still within the tier to benefit from that tier's budget

---

## Testing Checklist

- [x] Budget split equally (33.33% per tier)
- [x] 16 products randomly selected per tier
- [x] Random budget shares sum to 100% per tier
- [x] Expensive products purchase first (priority)
- [x] Max 50 purchases per product enforced
- [x] Bonus round uses remaining budget
- [x] No TypeScript errors
- [x] Ledger transactions correct
- [x] Company balances update properly

---

## Monitoring Metrics

**Track These Post-Deployment:**

1. **Selection Fairness**

   - Track how often each product is selected over 100 cycles
   - Target: Within ±20% of expected probability

2. **Budget Utilization**

   - How much of each tier's budget is spent
   - Target: 90%+ utilization per tier

3. **Revenue Variability**

   - Standard deviation of revenue per product per cycle
   - Higher variability is expected and good (adds excitement)

4. **Player Satisfaction**
   - Feedback on fairness and engagement
   - Monitor complaints vs. excitement about the system

---

## Comparison: Old vs New

| Feature             | Old System (v2.0)      | New System (v3.0)         |
| ------------------- | ---------------------- | ------------------------- |
| Budget allocation   | Weighted by price mass | Equal split (33.33% each) |
| Product selection   | All products           | 16 random per tier        |
| Budget distribution | Weight-based           | Random shares             |
| Predictability      | Moderate               | Lower (more exciting)     |
| Fairness            | Fair                   | More fair                 |
| Variety             | Moderate               | High                      |
| Player engagement   | Good                   | Better                    |

---

## Summary

### What Players Will Notice

- ✅ All price tiers get equal budget attention
- ✅ Sales vary more from cycle to cycle (adds excitement)
- ✅ Over time, revenue is fair and balanced
- ✅ High-priced items get adequate opportunities
- ✅ More unpredictable, more engaging gameplay

### Technical Improvements

- ✅ Simpler budget calculation (1/3 split)
- ✅ Better balance across price ranges
- ✅ More engaging purchase patterns
- ✅ Maintained all safety features
- ✅ No breaking changes to database or API

**The system remains fair while adding more excitement and unpredictability!** 🎉

---

**Implementation Date:** October 6, 2025  
**Version:** 3.0  
**Status:** ✅ Active  
**File Modified:** `convex/products.ts`
