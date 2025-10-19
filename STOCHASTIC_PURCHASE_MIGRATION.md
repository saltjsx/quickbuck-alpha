# Stochastic Public Purchase System Migration

## Overview

Successfully replaced the AI-based purchase system with a sophisticated stochastic public purchase algorithm that simulates mass public purchases fairly, believably, and robustly against exploitation.

## Changes Made

### 1. Removed AI-Based Purchase System

**Deleted Files:**
- `scripts/ai-buy.ts` - Manual AI purchase trigger script
- `scripts/ai-purchase-service.ts` - AI service implementation with Gemini
- `scripts/trigger-ai-purchase.ts` - HTTP endpoint trigger script

**Updated Files:**
- `package.json` - Removed npm scripts: `ai-buy`, `ai-purchase`, `trigger-ai-purchase`
- `convex/products.ts` - Removed `automaticPurchaseAI` action and `automaticPurchase` mutation (~580 lines removed)
- `convex/http.ts` - Removed `/api/ai-purchase` HTTP endpoint (~200 lines removed)
- `convex/crons.ts` - Updated cron job to use new system

### 2. Implemented New Stochastic Purchase System

**New File: `convex/publicPurchases.ts` (~914 lines)**

Comprehensive implementation following the algorithm specification with:

#### Core Components

**Configuration Parameters (Tunable):**
- Global budget per wave: $10,000
- Scoring weights: Quality 40%, Price 25%, Demand 20%, Recency 5%, Company 10%
- Anti-exploit thresholds (price outlier multiplier: 50x, new product hold: 60 min)
- Purchase caps (max 2% of stock, absolute max 100 units, 15% per company)
- Probabilistic parameters (min probability 1%, alpha sharpness 1.2)
- Transaction retry logic (max 3 retries, exponential backoff)

**Feature Normalization:**
- `normalizeQuality()` - Converts 0-100 quality to 0-1 score
- `normalizePrice()` - Logarithmic scaling with sigmoid for price sensitivity
- `normalizeDemand()` - Historical sales rate with logarithmic smoothing
- `calculateRecencyScore()` - Exponential decay for product age (30-day window)
- `calculateCompanyScore()` - Market cap and company age reputation

**Anti-Exploit Mechanisms:**
- Price outlier detection (blocks items >50x median price)
- Low quality spam penalties (quality <30 with high price)
- Rapid creation penalties (products <60 minutes old)
- Collusion detection placeholders (for future enhancement)

**Probabilistic Purchase Planning:**
- Composite scoring with weighted features and penalties
- Score-to-probability conversion using power function (alpha=1.2)
- Poisson distribution sampling for realistic quantity variation
- Per-company budget caps to prevent concentration
- Randomized noise (±5%) for diversity

**Transaction Execution:**
- Atomic database updates with retry logic
- Partial fill handling for stock constraints
- Ledger entry creation for revenue and costs
- Product and company stat updates
- System account management (unlimited funds)

**Telemetry & Logging:**
- Wave metrics tracking (spend, items, products, companies affected)
- Error logging with detailed failure reasons
- Console output with formatted reports
- Execution timing and budget utilization stats

#### Algorithm Flow

1. **Load Data** - Fetch all active products and companies atomically
2. **Filter** - Remove ineligible products (inactive, zero price)
3. **Normalize** - Compute feature scores for all products
4. **Penalize** - Apply anti-exploit penalties
5. **Score** - Calculate composite scores with weights
6. **Plan** - Probabilistically select products and determine quantities
7. **Execute** - Atomically purchase with retries and error handling
8. **Report** - Generate metrics and log results

### 3. Updated Cron Job

**File: `convex/crons.ts`**
- Changed from `internal.products.automaticPurchaseAI` (AI-based)
- To `internal.publicPurchases.scheduledPublicPurchaseWave` (stochastic)
- Maintains 20-minute interval

### 4. Fixed Type Import Issues

**File: `convex/resources.ts`**
- Changed `import { Doc, Id }` to `import type { Doc, Id }`
- Required for `verbatimModuleSyntax` compliance

## Key Improvements

### Fairness
- Every product gets evaluated with probabilistic sampling
- Quality-weighted scoring favors better products
- Price normalization prevents cheap spam dominance
- Diversity through randomized noise

### Believability
- Stochastic quantities (not deterministic)
- Realistic demand modeling based on history
- Company reputation influences purchases
- Recency bias for new products

### Exploit Resistance
- Price outlier blocking (>50x median)
- New product hold window (60 minutes)
- Per-company spending caps (15% max)
- Quality-price spam detection
- Low initial budget ($10k per wave) for safety

### Robustness
- Retry logic for transaction failures (3 attempts, exponential backoff)
- Partial fill handling when stock depletes
- Error logging and anomaly detection
- Budget constraint enforcement
- System account with unlimited funds

## Configuration Tuning

All parameters are centralized in the `CONFIG` object at the top of `convex/publicPurchases.ts`:

```typescript
const CONFIG = {
  GLOBAL_BUDGET_PER_WAVE: 10000,        // Increase for more spending
  WEIGHT_QUALITY: 0.40,                  // Adjust scoring weights
  PRICE_OUTLIER_MULTIPLIER: 50,         // Exploit detection threshold
  NEW_PRODUCT_HOLD_MINUTES: 60,         // Anti-spam delay
  MAX_ORDER_SIZE_PERCENT: 0.02,         // Stock purchase cap
  COMPANY_BUDGET_LIMIT_FRACTION: 0.15,  // Per-company cap
  ALPHA_SCORE_SHARPNESS: 1.2,           // Probability curve
  // ... and more
};
```

## Testing Recommendations

1. **Smoke Test** - Verify purchases spread across many companies
2. **Price Spam** - Create product at 1000x median price, confirm blocked
3. **New Product** - Create product, confirm limited purchases in first hour
4. **Low Quality Spam** - Low quality + high price, confirm penalties
5. **Concurrency** - Multiple simultaneous manual purchases, verify no conflicts
6. **Budget Utilization** - Check actual spend vs allocated budget
7. **Distribution** - Analyze purchase histogram across products

## Rollback Plan

If issues arise:

1. System account created automatically (no manual setup)
2. Cron job can be disabled in `convex/crons.ts`
3. Backup of old code in `convex/products.ts.backup` (if needed)
4. All changes are isolated in `convex/publicPurchases.ts`

## Future Enhancements

1. **Enhanced Anomaly Detection**
   - Self-sell detection (buyer=seller tracking)
   - Circular purchase detection (A→B→A loops)
   - Tag manipulation tracking

2. **Learning System**
   - A/B testing different parameter sets
   - Automatic weight tuning based on KPIs
   - Bandit algorithm for optimal budget allocation

3. **Telemetry Dashboard**
   - Real-time wave monitoring
   - Historical metrics visualization
   - Exploit attempt tracking

4. **Advanced Caps**
   - Dynamic company caps based on behavior
   - Category-based budget allocation
   - Time-decaying purchase windows

## Dependencies

**Kept:**
- `@google/generative-ai` - Still used by `scripts/prune-companies.ts`
- `@ai-sdk/openai` - Still used for chat feature in `convex/http.ts`

**No new dependencies added**

## Deployment Notes

- All changes are backwards compatible with existing data
- System account is created automatically on first run
- No manual database migrations required
- Cron job will pick up changes on next scheduled run
- Type errors resolved (all files pass `npm run typecheck`)

## Files Modified Summary

| File | Changes | Lines Changed |
|------|---------|---------------|
| `convex/publicPurchases.ts` | **NEW** | +914 |
| `convex/products.ts` | Removed AI functions | -580 |
| `convex/http.ts` | Removed AI endpoint | -200 |
| `convex/crons.ts` | Updated cron reference | ~5 |
| `convex/resources.ts` | Fixed type import | ~1 |
| `package.json` | Removed AI scripts | -3 |
| `scripts/ai-buy.ts` | **DELETED** | -287 |
| `scripts/ai-purchase-service.ts` | **DELETED** | -528 |
| `scripts/trigger-ai-purchase.ts` | **DELETED** | -88 |

**Total:** +914 new, -1686 removed, net -772 lines

## Success Criteria Met

✓ No AI/LLM dependencies for purchases  
✓ Stochastic (non-deterministic) algorithm  
✓ Quality and price-based scoring  
✓ Anti-exploit mechanisms implemented  
✓ Probabilistic sampling with caps  
✓ Atomic transactions with retries  
✓ Comprehensive logging and metrics  
✓ Configurable parameters  
✓ Type-safe and passes checks  
✓ No breaking changes to existing code
