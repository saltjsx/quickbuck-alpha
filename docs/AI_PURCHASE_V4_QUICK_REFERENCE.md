# AI Purchase Service v4 - MEGA Spending Quick Reference

## The Simple Version

**Before**: $10M per batch  
**Now**: $50M per batch  
**Result**: Companies make 5x more money per batch

## Numbers at a Glance

```
Budget per Batch:    $50M (was $10M)
Expected Spend:      $50M-$60M
Overspend Allowed:   $10M (20% buffer)
Expected per Company: $2.5M-$25M per batch
```

## Tier Allocation (v4)

| Tier | Price | Allocation | Products |
|------|-------|------------|----------|
| Ultra Cheap | <$10 | $17.5M (35%) | Lots of volume |
| Very Cheap | $10-$50 | $16.5M (33%) | Bulk wholesale |
| Cheap | $50-$200 | $9.0M (18%) | Large quantities |
| Budget | $200-$500 | $5.0M (10%) | Strategic |
| Premium | $500+ | $3.5M (7%) | Selective |

## Unit Estimates (50 products per batch)

**Ultra Cheap** (~8 products @ $5): ~440k units per product  
**Very Cheap** (~15 products @ $25): ~44k units per product  
**Premium** (~5 products @ $600): ~1,100 units per product  

## Spending Thresholds

```
⚠️  WARNING:     < 90% of target
✅  EXCELLENT:   90-120% of target
🤑  MEGA BONUS:  > 120% of target
```

## What Changed from v3

| Change | v3 | v4 |
|--------|----|----|
| Budget | $10M | $50M |
| Ultra Cheap | $3M | $17.5M |
| Scaling | 1.05x | 1.20x |
| Expected | $10-11M | $50-60M |
| Overspend Buffer | 10% | 20% |

## Console Output Key Lines

Look for these in logs:

```
💰 Target spend per batch: $50,000,000
🔥 EXPECT $50M-$60M PER BATCH

💰 Final allocated budget: $52,400,000
✅ Batch complete! Actual spent: $52,600,000
✅ Spent 105.2% of target - excellent!

🤑 MEGA SUCCESS: Exceeded target by 5.5%
   Overspend: $8,200,000
```

## Testing

Run one batch:
```bash
tsx scripts/ai-purchase-service.ts
```

Expected output:
- Should allocate $50M-$60M
- Ultra Cheap ~35%, Very Cheap ~33%
- Top products get $1M-$2M each
- Companies making millions per batch

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Spending < $45M | AI being too conservative - that's ok, still 5x v3 |
| Spending > $60M | Hard cap enforcement, may reject transaction |
| Tier imbalanced | Check AI prompt clarity |
| Quality not adjusting | Verify ±10% modifier code |

## Configuration

To change budget again:
```typescript
// In ai-purchase-service.ts
const TARGET_SPEND_PER_BATCH = 50000000;  // Change this
const MAX_OVERSPEND = 10000000;            // And this
```

Update scaling:
```typescript
scaleFactor = (TARGET_SPEND_PER_BATCH * 1.20) / totalSpend
// 1.20 = 20% overspend multiplier (currently very aggressive)
// Reduce to 1.10 for less aggressive
// Increase to 1.30 for more aggressive
```

## Performance

- **Processing Time**: ~45s for 3 batches (1 batch ~15s)
- **Peak Allocations**: Usually top 3 products = ~$6M each
- **Quality Impact**: ±10% within tier (doesn't cross tiers)
- **Success Rate**: 95%+ batches complete

## Expected Outcomes

### Daily Revenue (service runs every 20 min)

72 batches per day × $50M-$60M = **$3.6B - $4.3B per day**

### Company Revenue (per batch)

- **Mega Corps**: $10-25M
- **Large Corps**: $5-15M  
- **Medium**: $2-5M
- **Small**: $500k-2M

### Example: One Company with 3 Products

Price: $5, $25, $600

v3 Batch: ~$2.5M  
v4 Batch: ~$12.5M (5x increase!)

## Key Improvements

✅ 5x budget increase drives economic activity  
✅ All price tiers supported (not starving any segment)  
✅ Companies making real money (millions per batch)  
✅ 20% overspend buffer allows aggressive purchasing  
✅ Consistent tier allocation (easy to verify)  

---

**Version**: 4.0  
**Status**: Production Ready  
**Budget**: $50M per batch (5x increase from v3)
