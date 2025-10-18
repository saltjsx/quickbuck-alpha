# AI Purchase Scale-Up - Quick Reference

## Key Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| AI Service Min Spend per Batch | $1M | $10M | **10x** ↑ |
| Automatic Purchase Total | $5M | $50M | **10x** ↑ |
| Max Quantity per Purchase | 100 units | 100,000 units | **1000x** ↑ |
| Cheap Item Bulk Orders | 50-80 | 500-1,000 | **10x** ↑ |
| Mid-Range Item Bulk Orders | 30-50 | 200-400 | **7x** ↑ |
| Expensive Item Bulk Orders | 10-20 | 50-100 | **5x** ↑ |

## Revenue Impact per Company

### Before
- Low-quality product: ~$100-500 per batch
- Medium-quality product: ~$500-2,000 per batch
- High-quality product: ~$2,000-10,000 per batch
- **Company total per batch: $500K-$2M**

### After
- Low-quality product: ~$5,000-50,000 per batch
- Medium-quality product: ~$50,000-500,000 per batch
- High-quality product: ~$500,000-$50M+ per batch
- **Company total per batch: $10M-$50M+ ✅**

## Quality Prioritization

✅ **Still Maintained:**
- AI explicitly prioritizes high-quality products
- High-quality items get 5-10x more units than low quality
- Low-quality/spam products minimized or skipped
- Quality is PRIMARY filtering factor before quantity

## Code Changes

### scripts/ai-purchase-service.ts
```typescript
// Line 29
const MIN_SPEND_PER_BATCH = 10000000; // Was: 1000000 (10x increase)
```

### convex/products.ts

**automaticPurchase function:**
```typescript
// Line 271
const totalSpend = 50000000; // Was: 5000000 (10x increase)

// Lines 615-625 - Bonus purchases
// Cheap: 500-1,000 units (was 50-80)
// Mid: 200-400 units (was 30-50)
// Expensive: 50-100 units (was 10-20)
```

**adminAIPurchase function:**
```typescript
// Line 920
const quantity = Math.max(1, Math.min(100000, ...)); // Was: 100 (1000x increase)
```

## Verification

✅ TypeCheck: Passed  
✅ No Errors: 0  
✅ All changes ready for production

---

Run AI purchase service and watch companies make millions! 🚀💰
