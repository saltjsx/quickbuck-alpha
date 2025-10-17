# Stock Market Volatility Reduction - October 17, 2025

## Problem
The stock market was experiencing extreme volatility, causing market crashes and making the system unstable for players.

## Solution
Significantly reduced all volatility factors in the stock pricing system to create a more stable, predictable market.

---

## Changes Made

### 1. Configuration Constants (Reduced Volatility)

**Before:**
```typescript
const BASE_ADJUSTMENT_FACTOR = 0.02;  // 2% base adjustment
const VOLATILITY_MULTIPLIER = 0.4;    // 40% random volatility
const IMPACT_MULTIPLIER = 0.25;       // 25% player trade impact
const MAX_SWING_PERCENT = 0.15;       // Extreme swings up to 15% per update
```

**After:**
```typescript
const BASE_ADJUSTMENT_FACTOR = 0.005; // 0.5% base adjustment (75% reduction)
const VOLATILITY_MULTIPLIER = 0.05;   // 5% random volatility (87.5% reduction)
const IMPACT_MULTIPLIER = 0.08;       // 8% player trade impact (68% reduction)
const MAX_SWING_PERCENT = 0.03;       // Max swing 3% per update (80% reduction)
```

**Impact:** Prices now move much more gradually and predictably.

---

### 2. Player Trade Impact (Reduced)

**Before:**
```typescript
// Add random volatility to trades (±25% variation on impact)
const volatilityFactor = 1 + (Math.random() - 0.5) * 0.5;
```

**After:**
```typescript
// Add minimal random volatility to trades (±10% variation on impact)
const volatilityFactor = 1 + (Math.random() - 0.5) * 0.2;
```

**Impact:** Player trades cause smaller, more predictable price changes.

---

### 3. Automatic Price Updates (Stabilized)

#### Global Market Sentiment

**Before:**
```typescript
const globalSentiment = (Math.random() - 0.5) * 2; // -1 to 1
const marketMood = globalSentiment > 0.5 ? "bullish" : 
                   globalSentiment < -0.5 ? "bearish" : 
                   "neutral";
```

**After:**
```typescript
const globalSentiment = (Math.random() - 0.5) * 0.2; // -0.1 to 0.1
const marketMood = globalSentiment > 0.03 ? "slightly bullish" : 
                   globalSentiment < -0.03 ? "slightly bearish" : 
                   "stable";
```

**Impact:** Market-wide sentiment changes are now minimal, preventing coordinated crashes.

---

#### Market Shock Events

**Before:**
```typescript
// Market shock event (10% chance of major volatility event)
const hasShockEvent = Math.random() < 0.1;
const shockIntensity = hasShockEvent ? (Math.random() < 0.5 ? -1 : 1) : 0;
const shockComponent = shockIntensity * currentPrice * MAX_SWING_PERCENT;
```

**After:**
```typescript
// Market shock events disabled for stability
const hasShockEvent = false;
const shockIntensity = 0;
const shockComponent = 0;
```

**Impact:** No more sudden market crashes or booms from random events.

---

#### Random Walk

**Before:**
```typescript
const randomWalk = (Math.random() - 0.5) * 2; // -1 to 1
const randomVolatility = randomWalk * VOLATILITY_MULTIPLIER;
```

**After:**
```typescript
const randomWalk = (Math.random() - 0.5) * 0.2; // -0.1 to 0.1
const randomVolatility = randomWalk * VOLATILITY_MULTIPLIER;
```

**Impact:** Random price movements are now tiny, not extreme.

---

#### Momentum Component

**Before:**
```typescript
momentum = ((recentPrice - oldPrice) / oldPrice) * 0.5; // 50% momentum factor
```

**After:**
```typescript
momentum = ((recentPrice - oldPrice) / oldPrice) * 0.05; // 5% momentum factor
```

**Impact:** Price trends don't self-amplify into runaway movements.

---

#### Market Sentiment Component

**Before:**
```typescript
const sentimentComponent = globalSentiment * currentPrice * 0.05;
```

**After:**
```typescript
const sentimentComponent = globalSentiment * currentPrice * 0.01;
```

**Impact:** Global market mood has minimal effect on individual stocks.

---

#### Maximum Price Movement

**Before:**
```typescript
const maxMove = currentPrice * MAX_SWING_PERCENT * 2; // Up to 30% per update
```

**After:**
```typescript
const maxMove = currentPrice * MAX_SWING_PERCENT; // Up to 3% per update
```

**Impact:** Single price updates can't cause dramatic changes.

---

## Results

### Volatility Comparison

| Factor | Before | After | Reduction |
|--------|--------|-------|-----------|
| Base Adjustment | 2% | 0.5% | 75% |
| Random Volatility | 40% | 5% | 87.5% |
| Player Impact | 25% | 8% | 68% |
| Max Swing/Update | 15% | 3% | 80% |
| Global Sentiment | -100% to +100% | -10% to +10% | 90% |
| Momentum Factor | 50% | 5% | 90% |
| Shock Events | 10% chance | Disabled | 100% |
| Max Single Move | 30% | 3% | 90% |

### Expected Behavior

**Before:**
- Stock prices could swing ±15% every 5 minutes
- Market crashes were common (shock events)
- Player trades caused dramatic price spikes
- Momentum created runaway trends
- Overall: Chaotic, unpredictable market

**After:**
- Stock prices move ±0.5-3% every 5 minutes
- No sudden market crashes
- Player trades cause modest price changes
- Trends are gradual and dampened
- Overall: Stable, predictable market

---

## Deployment

No schema changes required. Simply deploy the updated `convex/stocks.ts` file:

```bash
npx convex deploy
```

The changes take effect immediately on the next stock price update (every 5 minutes).

---

## Monitoring

### Check Stock Stability

1. **Convex Dashboard → Data → stockPriceHistory**
   - Look at recent price changes
   - Should see smaller, gradual movements

2. **Watch Price Charts**
   - Stocks should trend smoothly
   - No sudden spikes or crashes

3. **Company Balances**
   - Companies should maintain stable values
   - No mass bankruptcies from crashes

### Expected Price Movement Examples

| Scenario | Before | After |
|----------|--------|-------|
| No trading activity | ±10-15% per hour | ±1-3% per hour |
| Small buy order (1% of shares) | +2-5% | +0.5-1% |
| Large sell order (5% of shares) | -5-15% | -1-3% |
| Market sentiment shift | ±20-30% per day | ±5-10% per day |

---

## Fine-Tuning

If the market is still too volatile or too static, adjust these constants:

### Make More Stable (Less Volatile)
```typescript
const BASE_ADJUSTMENT_FACTOR = 0.002; // Even smaller adjustments
const VOLATILITY_MULTIPLIER = 0.02;   // Even less randomness
const IMPACT_MULTIPLIER = 0.05;       // Smaller trade impact
const MAX_SWING_PERCENT = 0.01;       // Cap at 1% per update
```

### Make More Dynamic (More Volatile)
```typescript
const BASE_ADJUSTMENT_FACTOR = 0.01;  // Faster adjustment
const VOLATILITY_MULTIPLIER = 0.1;    // More randomness
const IMPACT_MULTIPLIER = 0.12;       // Bigger trade impact
const MAX_SWING_PERCENT = 0.05;       // Cap at 5% per update
```

---

## Rollback Plan

If you need to revert to the old volatile system, restore these values:

```typescript
const BASE_ADJUSTMENT_FACTOR = 0.02;
const VOLATILITY_MULTIPLIER = 0.4;
const IMPACT_MULTIPLIER = 0.25;
const MAX_SWING_PERCENT = 0.15;
```

And restore the shock event logic:
```typescript
const hasShockEvent = Math.random() < 0.1;
const shockIntensity = hasShockEvent ? (Math.random() < 0.5 ? -1 : 1) : 0;
```

---

## Summary

✅ **Reduced volatility by 75-90% across all factors**  
✅ **Disabled market shock events**  
✅ **Dampened momentum and sentiment effects**  
✅ **Created predictable, stable market behavior**  
✅ **No schema changes required**  
✅ **Immediate effect on deployment**  

The stock market should now be much more stable and won't crash the entire economy!

---

**Version:** 1.0  
**Date:** October 17, 2025  
**Status:** Ready to Deploy
