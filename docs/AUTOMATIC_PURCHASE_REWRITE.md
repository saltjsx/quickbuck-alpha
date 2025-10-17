# Automatic Purchase System Rewrite - October 2025

## Overview

Complete rewrite of the automatic purchasing system and fix for the stock ownership exploit.

## Changes Made

### 1. Automatic Purchasing System (`convex/products.ts`)

#### Previous System Issues:
- Only considered 150 products per run (not fair for 350+ products)
- Random spend between $1M-$1.5M (inconsistent)
- Focused on quantity of purchases rather than revenue generation
- Some companies/products getting no purchases at all

#### New Revenue-Focused Algorithm:

**Fixed Parameters:**
- **Spend: $5,000,000 per run** (no longer random)
- **Frequency: Every 20 minutes** (changed from 10 minutes in crons.ts)
- **Coverage: Up to 1,000 active products** (increased from 150)

**Three-Phase Distribution:**

**Phase 1: Guaranteed Minimum (30% of budget)**
- EVERY product gets at least 1 purchase
- Ensures no company is left without income
- Prioritizes fair distribution over revenue

**Phase 2: Revenue-Weighted Distribution (70% of budget)**
- Budget allocated proportionally to product revenue potential
- Revenue potential = price × quality weight (0.5-1.0)
- Higher-priced, higher-quality products get more budget
- Quantity purchased based on allocated budget
- Cap: 1,000 units per product

**Phase 3: Bonus Round (remaining budget)**
- Any leftover budget goes to top 50 revenue generators
- Cap: 100 additional units per product

#### Key Improvements:
1. **All products guaranteed income** - Every active product gets at least 1 purchase
2. **Revenue-focused** - Higher value products get proportionally more purchases
3. **Fair distribution** - Weighted by revenue potential, not just random selection
4. **Predictable spend** - Always $5M, no randomness
5. **Better logging** - Console logs for each phase showing spend breakdown

### 2. Stock Ownership Exploit Fix (`convex/stocks.ts`)

#### The Exploit:
Users could accumulate >100% ownership of a company by:
1. Buying stocks through their company accounts
2. Transferring those stocks to their personal account or other companies they own
3. Repeating to exceed 100% total ownership

#### The Fix:

**New Helper Function: `calculateTotalOwnership()`**
- Calculates total ownership across ALL accounts controlled by a user
- Includes:
  - Direct user holdings
  - All companies owned by the user
  - Holdings from those companies
- Checks if adding new shares would exceed 100%

**Integration Points:**

1. **`buyStock` mutation**
   - Checks total ownership BEFORE allowing purchase
   - Considers all the buyer's accounts (personal + companies they own)
   - Blocks purchase if it would result in >100% total ownership

2. **`transferStock` mutation**
   - Checks receiver's total ownership BEFORE allowing transfer
   - Prevents transferring stocks that would exceed 100% for receiver
   - Blocks transfers between accounts owned by the same person if it exceeds limit

**Error Messages:**
- Clear feedback showing exact ownership percentage
- Explains why the transaction was blocked
- Example: "Cannot complete purchase: This would result in 102.45% total ownership across all your accounts. Maximum allowed is 100%."

### 3. Cron Schedule Update (`convex/crons.ts`)

Changed automatic purchase interval from **10 minutes** to **20 minutes**:
- Reduces database load
- More sustainable with $5M per run
- Still runs 72 times per day = $360M daily automated revenue
- Gives more time between runs for price updates and other cron jobs

## Testing Recommendations

### Automatic Purchases:
1. Monitor the next cron run at :00, :20, or :40 minutes
2. Check console logs for phase breakdown:
   - Phase 1: Should show guaranteed purchases for all products
   - Phase 2: Should show revenue-weighted distribution
   - Phase 3: Should show bonus round (if any budget left)
3. Verify ALL companies received some income
4. Check total spend is exactly $5,000,000

### Stock Ownership:
1. **Test Case 1: Direct Purchase Limit**
   - User owns 95% of Company A directly
   - Try to buy another 10% → Should fail with ownership warning

2. **Test Case 2: Cross-Account Purchase Limit**
   - User owns 60% of Company A personally
   - User's Company B owns 45% of Company A
   - Try to buy more through Company B → Should fail (already at 105%)

3. **Test Case 3: Transfer Limit**
   - User owns 80% through Company B
   - User owns 25% personally
   - Try to transfer from Company B to personal → Should fail

4. **Test Case 4: Valid Transactions**
   - User owns 50% total
   - Buy 40% more → Should succeed (90% total)
   - Transfer between own accounts → Should succeed if under 100%

## Performance Considerations

### Automatic Purchases:
- **Database Reads:** ~3-5 queries (fetch products, companies, accounts)
- **Database Writes:** Batched by company (efficient)
- **Expected Duration:** 10-30 seconds depending on product count
- **Memory:** Handles up to 1,000 products efficiently

### Stock Ownership Checks:
- **Additional Overhead:** 2-5 extra queries per stock transaction
- **Minimal Impact:** Only runs on buy/transfer (not frequent)
- **Trade-off:** Prevents exploit at cost of slight performance hit
- **Optimization:** Pre-fetches all related accounts in single batch

## Rollback Plan

If issues arise, revert these commits:

1. `convex/crons.ts` - Change interval back to 10 minutes
2. `convex/products.ts` - Restore previous `automaticPurchase` function
3. `convex/stocks.ts` - Remove `calculateTotalOwnership` function and its usage

## Future Improvements

### Automatic Purchases:
1. **Dynamic Budget:** Scale based on active product count
2. **Company Health Metrics:** Prioritize struggling companies
3. **Demand Simulation:** Vary purchases based on product popularity
4. **Seasonal Trends:** Time-based purchase patterns

### Stock Ownership:
1. **Caching:** Cache ownership calculations for frequent traders
2. **Soft Limits:** Warning at 90%, hard block at 100%
3. **Grace Period:** Allow temporary overages with forced sales
4. **Ownership Dashboard:** Show users their total ownership across all accounts

## Documentation Updated

- ✅ New document: `AUTOMATIC_PURCHASE_REWRITE.md` (this file)
- ✅ Code comments added to `calculateTotalOwnership()`
- ✅ Phase explanations in automatic purchase algorithm
- ⚠️ Consider updating `AGENTS.md` with new query patterns if performance issues arise

## Deployment Notes

1. **Zero Downtime:** Changes are backward compatible
2. **No Database Migration:** No schema changes required
3. **Monitoring:** Watch for errors in Convex dashboard after deployment
4. **Verification:** Check next cron run completes successfully

---

**Implemented:** October 17, 2025  
**Author:** AI Assistant  
**Version:** 3.0 (Automatic Purchases), 2.0 (Stock Ownership)
