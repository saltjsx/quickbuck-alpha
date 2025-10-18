# AI Purchase Service v3 - Quick Reference

## What Changed

✅ **From**: Quality-based allocation (high quality = 50-70% of budget)  
✅ **To**: Price-tier based allocation (cheap products = 25-40%, premium = 5-10%)  

## Key Changes

### Budget Allocation (by Price Tier)

| Tier | Price Range | Budget | Logic |
|------|-------------|--------|-------|
| **Ultra Cheap** | < $10 | 25-35% | Volume buying, highest quantity |
| **Very Cheap** | $10-50 | 30-40% | Bulk wholesale standard |
| **Cheap** | $50-200 | 20-25% | Moderate bulk purchases |
| **Budget** | $200-500 | 10-15% | Strategic selective buying |
| **Premium** | $500+ | 5-10% | Low volume, high value items |

### Quality Role

- **Old**: Quality determines 80% of allocation (exponential weighting)
- **New**: Quality is a minor modifier (±10% within tier only)
- **Impact**: Can't move product to different tier based on quality

### Example

```
Two products in Very Cheap tier ($10-50):
- Product A: Quality 95 → Gets tier allocation + 10% bonus
- Product B: Quality 40 → Gets tier allocation - 5% discount

Both stay in Very Cheap tier regardless of quality difference.
Premium product in Premium tier:
- Product C: Quality 40 → Still gets 5-10% of budget (premium tier)
Not demoted to cheap tier for low quality.
```

## Logging Changes

Now shows **tier breakdown** instead of just top products:

```
📋 Budget allocations by price tier:

   Tier Breakdown:
   • Ultra Cheap: $3,120,000 (27.9%)
   • Very Cheap: $4,000,000 (35.7%)
   • Cheap: $2,240,000 (20.0%)
   • Budget: $1,120,000 (10.0%)
   • Premium: $720,000 (6.4%)

   Top 10 Products:
   1. Product A: $450,000 (4.5%) [Ultra Cheap] → 56,250 units
   2. Product B: $320,000 (3.2%) [Very Cheap] → 1,280 units
   ...
```

## Expected Behavior

### Spending
- Target: $10M per batch
- Typical: $10.5M - $11M per batch (5-10% overspend)
- Acceptable: Anything $9.5M - $11M

### Distribution
- Cheap products get most of the money (quantity over value)
- Premium products get focused strategic buying
- Balanced ecosystem vs quality-starved

### Tier Consistency
- Should maintain tier percentages ±3% across batches
- If tier is 10%+ off target, likely AI prompt issue

## What Improved

| Problem | v2 | v3 |
|---------|----|----|
| Low-quality products starved | 5-10% of budget | 25-40% of budget |
| Premium products over-allocated | 40-50% of budget | 5-10% of budget |
| Market realism | Poor (unrealistic buying) | Good (wholesale-like) |
| Tier verification | Impossible | Easy (clear percentages) |
| All price points supported | No | Yes |

## Testing This

Run one batch and check:

```bash
tsx scripts/ai-purchase-service.ts
```

Look for tier breakdown in output. Should see:
- Ultra/Very Cheap: ~60-75% combined (most quantity)
- Premium: 5-10% (least quantity, highest value)

## Configuration

To adjust tier percentages, edit the AI prompt in `getAIPurchaseDecisions()`:

```typescript
ALLOCATION STRATEGY:
- Ultra Cheap ($<10): 25-35% of total budget  // ← Change here
- Very Cheap ($10-50): 30-40% of total budget
- etc...
```

## Quick Troubleshooting

| Issue | Check |
|-------|-------|
| Tier is 10%+ off | AI prompt clarity - is instruction clear? |
| Quality products still getting starved | Is quality modifier being applied? Check logs. |
| Overspending too much (>$12M) | Increase tier % cap or lower 1.15 multiplier |
| Underspending (<$9M) | Decrease tier % cap or increase 1.15 multiplier |

## Files

- **Implementation**: `/scripts/ai-purchase-service.ts`
- **Full Docs**: `/docs/AI_PURCHASE_V3_PRICE_TIER_STRATEGY.md`
- **Previous Version**: `/docs/AI_PURCHASE_V2_AGGRESSIVE_SPENDING.md`

---

**TL;DR**: Budget allocation now determined by product price tier (cheap gets most, premium gets least) instead of quality. Quality only adjusts allocations ±10% within a tier.
