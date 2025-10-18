# AI Purchase Service v2 - Aggressive Spending Rewrite

**Date**: October 18, 2025  
**Problem**: Service was only spending ~$4M per batch instead of the target $10M  
**Solution**: Complete rewrite with aggressive spending strategy

## Key Changes

### 1. **Changed Budget Philosophy**
- **Old**: `MIN_SPEND_PER_BATCH` - tried to spend exactly $10M, never exceed
- **New**: `TARGET_SPEND_PER_BATCH` - target $10M, allow up to $11M (10% buffer)
- **Why**: Rounding and price constraints made exact spending impossible

### 2. **Math.ceil() Instead of Math.floor()**
- **Old**: `Math.floor(spendAmount / price)` - rounded quantities DOWN, losing money
- **New**: `Math.ceil(spendAmount / price)` - rounds quantities UP, ensuring full spend
- **Impact**: Every product purchase now spends slightly more rather than less

Example:
```typescript
// Product costs $7.50, allocated $100
// Old: Math.floor(100 / 7.50) = 13 units = $97.50 spent (lost $2.50)
// New: Math.ceil(100 / 7.50) = 14 units = $105 spent (spent extra $5)
```

### 3. **Removed Minimum Quantity Restrictions**
- **Old**: `Math.max(1, quantity)` forced buying at least 1 unit even with $0 allocation
- **New**: Respects actual allocations, filters out zero allocations properly
- **Why**: Was wasting budget on products that shouldn't be purchased

### 4. **Exponential Quality Weighting**
- **Old**: Linear quality weighting: `allocation = quality / totalQuality × budget`
- **New**: Quadratic weighting: `allocation = quality² / totalQuality² × budget × 1.15`
- **Impact**: High-quality products (90-100) get exponentially more budget
- **Bonus**: 15% budget multiplier ensures we exceed target rather than fall short

Example:
```typescript
// Products: A (quality 100), B (quality 50)
// Old weights: 100 and 50 → A gets 66.7%, B gets 33.3%
// New weights: 10,000 and 2,500 → A gets 80%, B gets 20%
// With 15% bonus: Total = 115% of budget
```

### 5. **Aggressive AI Prompt Rewrite**
- **Old**: "You MUST allocate EXACTLY $10M (not more, not less)"
- **New**: "You MUST allocate AT LEAST $10M, going OVER by 10% is ENCOURAGED"
- **Tone**: Changed from conservative to aggressive wholesale buyer
- **Quality tiers**: More aggressive allocations (50-70% for excellent products)

### 6. **Better Scaling Logic**
- **Old**: If AI under-allocated, scaled proportionally then capped at target
- **New**: If AI under-allocated, scales to 105% of target (guaranteed overspend)
- **Why**: Better to overspend than underspend in a simulation economy

### 7. **Enhanced Logging**
- Tracks expected vs actual spend
- Shows percentage of target achieved
- Warns if spending < 95% or > 110% of target
- Logs top 10 allocations for transparency
- Per-batch and total efficiency metrics

## Budget Allocation Strategy

### Quality-Based Tiers
```
Quality 90-100 (EXCELLENT): 50-70% of budget
Quality 70-89  (GOOD):      25-40% of budget  
Quality 50-69  (FAIR):      10-20% of budget
Quality <50    (POOR):      5-10% of budget
```

### Calculation Formula
```typescript
// Step 1: Calculate quality weights (squared for exponential scaling)
weight = quality²

// Step 2: Sum all weights
totalWeight = Σ(quality²)

// Step 3: Allocate with 15% bonus
baseAllocation = (weight / totalWeight) × $10M
finalAllocation = baseAllocation × 1.15

// Step 4: Round up quantities
quantity = Math.ceil(finalAllocation / price)
actualSpend = quantity × price
```

## Expected Results

### Before (v1)
- Typical spend: $4M - $6M per batch
- Efficiency: 40-60% of target
- Reason: Math.floor() + conservative AI + minimum quantities

### After (v2)
- Expected spend: $10M - $11M per batch
- Efficiency: 100-110% of target
- Reason: Math.ceil() + aggressive AI + smart scaling

### Example with 3 Batches
```
Batch 1: $10.2M (102% of target) ✅
Batch 2: $10.8M (108% of target) ✅
Batch 3: $10.5M (105% of target) ✅
Total: $31.5M / $30M target = 105% efficiency
```

## Risk Mitigation

### Overspend Protection
- Hard cap: `TARGET_SPEND + MAX_OVERSPEND = $11M per batch`
- If AI allocates > $11M, purchases are still made (acceptable overspend)
- System doesn't fail if budget exceeded, just logs warning

### Quality Assurance
- Every product ID validated against batch
- Invalid products filtered out before purchase
- Detailed error logging for debugging
- Graceful failure per batch (doesn't stop entire run)

## Testing Recommendations

1. **Dry Run Test**: Log allocations without executing purchases
2. **Single Batch Test**: Run with 1 batch to verify $10M+ spend
3. **Quality Distribution Test**: Check if high-quality products get most budget
4. **Overspend Test**: Verify we don't exceed $11M per batch
5. **Full Run Test**: 10+ batches to confirm consistency

## Monitoring Metrics

Watch for these in production:
- **Spend Efficiency**: Should be 95-110% consistently
- **Average per Batch**: Should be $10M - $11M
- **Quality Correlation**: High-quality products should have highest sales
- **Error Rate**: Should be < 5% of purchases

## Files Modified

- `scripts/ai-purchase-service.ts` - Complete rewrite

## Rollback Plan

If v2 causes issues:
```bash
git checkout HEAD~1 scripts/ai-purchase-service.ts
```

## Success Criteria

✅ Each batch spends at least $9.5M (95% of target)  
✅ Each batch spends at most $11M (110% of target)  
✅ High-quality products (90+) get 50-70% of budget  
✅ Low-quality products (<50) get <10% of budget  
✅ Error rate < 5%  
✅ Service completes without fatal errors  

---

**Status**: Ready for Testing  
**Next Steps**: Run in development environment with monitoring
