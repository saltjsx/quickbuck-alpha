# AI Purchase Service v3 - Price Tier Based Allocation

**Date**: October 18, 2025  
**Previous Version**: v2 (Quality-Weighted Distribution)  
**Change**: Shifted from quality-based to price-tier-based budget allocation

## Problem with v2

The previous version (v2) used exponential quality weighting where high-quality products received 50-70% of the budget. This created an imbalanced purchasing pattern:

- High-quality products got most of the money
- Low-quality products were starved (5-10% of budget)
- Created artificial price signals that didn't reflect realistic market behavior
- Bulk purchasing diversity was sacrificed for quality

## Solution: Price Tier Strategy (v3)

Instead of quality determining allocation, we now allocate based on **5 distinct price tiers**, with quality being only a minor modifier within each tier.

### Price Tiers & Budget Allocation

```
Ultra Cheap ($0-$10)     → 25-35% of budget
Very Cheap ($10-$50)     → 30-40% of budget  
Cheap ($50-$200)         → 20-25% of budget
Budget ($200-$500)       → 10-15% of budget
Premium ($500+)          → 5-10% of budget
```

### Quality Modifier (Secondary, ±10% only)

Quality only affects allocation **within** a tier:

- **High quality (90+)**: +5-10% bonus within tier
- **Medium quality (70-89)**: Baseline allocation
- **Low quality (50-69)**: Baseline allocation
- **Very low (<50)**: -5% discount (minimum $0)

## How It Works

### Step 1: Categorize Products into Tiers

```typescript
priceTiers = {
  ultraCheap: [products with price < $10],
  veryCheap: [products with price $10-$50],
  cheap: [products with price $50-$200],
  budget: [products with price $200-$500],
  premium: [products with price $500+]
}
```

### Step 2: Allocate Base Budget to Tiers

```
Total Budget: $10M
├─ Ultra Cheap: $3.0M (30%)
├─ Very Cheap: $3.5M (35%)
├─ Cheap: $2.0M (20%)
├─ Budget: $1.0M (10%)
└─ Premium: $0.5M (5%)
```

### Step 3: Distribute Within Each Tier

Split each tier's budget among products in that tier, with quality adjustments:

```
Ultra Cheap Tier ($3.0M for 25 products):
- Product A ($5, quality 95): $130k (base) + 10% = $143k
- Product B ($8, quality 70): $120k
- Product C ($9, quality 40): $114k (base) - 5% = $108.3k
- ... etc for all 25 products
Total tier spend: $3.0M
```

### Step 4: Apply 15% Bonus

Multiply all allocations by 1.15 to ensure we exceed target:

```
$10M × 1.15 = $11.5M total spend
```

## Why This Works Better

### 1. **Realistic Market Behavior**
Real wholesale buyers bulk-purchase cheap items and selectively buy premium items. This matches real commerce.

### 2. **Diverse Product Support**
All tiers get meaningful allocations:
- Cheap products: Get most revenue (volume)
- Premium products: Get focused spending (quality)
- Balanced ecosystem supports all price points

### 3. **Quality is Context-Sensitive**
A $5 product with quality 80 and a $500 product with quality 80 are allocated differently based on tier, not treated equally.

### 4. **Predictable Tier Distribution**
AI exactly knows what percentage each tier should get, easier to verify:
```
Expected: Ultra 30%, Very 35%, Cheap 20%, Budget 10%, Premium 5%
Actual:   Ultra 28%, Very 36%, Cheap 21%, Budget 10%, Premium 5% ✅
```

## Logging Output Example

```
🤖 Asking AI for aggressive budget allocation for batch 1/5...
💰 Target spend: $10,000,000 (up to $11,000,000 allowed)

✅ AI allocated $11,200,000 across 47 products

📋 Budget allocations by price tier:

   Tier Breakdown:
   • Ultra Cheap: $3,120,000 (27.9%)
   • Very Cheap: $4,000,000 (35.7%)
   • Cheap: $2,240,000 (20.0%)
   • Budget: $1,120,000 (10.0%)
   • Premium: $720,000 (6.4%)

   Top 10 Products:
   1. Bulk Cereal Boxes: $450,000 (4.5%) [Ultra Cheap] → 56,250 units
   2. Wholesale Milk: $320,000 (3.2%) [Very Cheap] → 1,280 units
   3. Premium Coffee Beans: $280,000 (2.8%) [Cheap] → 560 units
   ... and 37 more products

💰 Final allocated budget: $11,200,000 ✅
```

## Configuration

All tier percentages are defined in the AI prompt. To adjust:

1. Edit `ALLOCATION STRATEGY` section in prompt
2. Change percentage ranges for each tier
3. Update `BATCH SUMMARY` comments to match

Example adjustment for more premium focus:
```typescript
// Before
Ultra Cheap: 25-35% → Very Cheap: 30-40% → Premium: 5-10%

// After (premium-focused)
Ultra Cheap: 20-30% → Very Cheap: 25-35% → Premium: 15-20%
```

## Performance Characteristics

### Expected Results
- **Spend Efficiency**: 100-110% (consistent)
- **Budget Per Batch**: $10M - $11M
- **Ultra Cheap Allocation**: 25-35% (most volume)
- **Premium Allocation**: 5-10% (selective)
- **Quality Variance**: ±10% within tier

### Quality Impact
- Quality can shift allocation by max 10% **within a tier**
- A product cannot move to a different tier based on quality
- E.g., a $5 product with quality 40 stays in Ultra Cheap tier (not moved to Premium)

## Advantages Over v2

| Aspect | v2 (Quality) | v3 (Price Tier) |
|--------|--------------|-----------------|
| Allocation Method | Quality² weighting | Tier-based percentages |
| Quality Factor | 80% of decision | 10% modifier within tier |
| Price Factor | Ignored | 100% primary factor |
| Premium Products | Starved (5-10%) | Targeted (5-10%) |
| Cheap Products | Get random allocations | 25-40% of budget guaranteed |
| Market Realism | Unrealistic (all high quality) | Realistic (bulk + premium mix) |
| Tier Distribution | Chaotic, hard to verify | Clear, easy to verify |
| Ecosystem Balance | Broken | Healthy |

## Testing Recommendations

1. **Tier Distribution Audit**
   - Run 5 batches, check tier breakdown
   - Verify Ultra Cheap gets 25-35%
   - Verify Premium gets 5-10%

2. **Quality Impact Test**
   - Compare two identical products, different quality
   - Same tier = quality difference ±10%
   - Different tiers = tier determines allocation

3. **Consistency Test**
   - Run 10 batches
   - Track tier percentages per batch
   - Should stay within 2-3% of target

4. **Company Revenue Impact**
   - Measure revenue distribution by price point
   - Cheap products should get more total units
   - Premium products should get more total revenue

## Monitoring

Key metrics to watch:

```
✅ Spend efficiency: 95-110%
✅ Ultra Cheap tier: 25-35% of budget
✅ Very Cheap tier: 30-40% of budget
✅ Cheap tier: 20-25% of budget
✅ Budget tier: 10-15% of budget
✅ Premium tier: 5-10% of budget
✅ Quality modifier impact: ±10% max
⚠️ If any tier is 15%+ off: Flag for investigation
```

## Rollback

If price tier strategy causes issues:

```bash
git checkout HEAD~1 scripts/ai-purchase-service.ts
# Back to v2 (quality-weighted)
```

## Files Modified

- `scripts/ai-purchase-service.ts` - Updated allocation prompt and logging
- `docs/AI_PURCHASE_V3_PRICE_TIER_STRATEGY.md` - This file

## Success Criteria

✅ Each batch spends $9.5M - $11M (95-110% of target)  
✅ Ultra Cheap tier gets 25-35% of allocations  
✅ Very Cheap tier gets 30-40% of allocations  
✅ Premium tier gets 5-10% of allocations  
✅ Quality modifier ±10% within tier (not tier-determining)  
✅ Consistent tier distribution across batches (±3%)  
✅ All price points supported (not starving any tier)  
✅ Service completes without fatal errors  

---

**Status**: Ready for Testing  
**Version**: 3.0  
**Last Updated**: October 18, 2025
