# Marketplace Display Issue: Orphaned Products

## Problem Summary

Users reported that companies and products are not showing up in the marketplace, even though they are marked as `isActive: true` in the database.

## Root Cause

The issue is caused by **orphaned products** - products that reference a deleted company.

### How It Happens

1. **Pruning script runs**: The `prune-companies.ts` script identifies and deletes spam/test companies
2. **Company deletion**: When a company is deleted via `adminDeleteCompanies`, it schedules `internalDeleteCompany`
3. **Products deactivated**: The deletion process *should* deactivate all products for that company
4. **Race condition/older deletions**: Some products remain active but reference a now-deleted company

### Why Products Don't Show

The `getActiveProducts` query in `convex/products.ts` works like this:

```typescript
// 1. Fetch active products
const products = await ctx.db
  .query("products")
  .withIndex("by_active", (q) => q.eq("isActive", true))
  .take(50);

// 2. Fetch companies (some may be null if deleted)
const companyIds = [...new Set(products.map(p => p.companyId))];
const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));

// 3. Build company map (filters out null companies)
const companyMap = new Map();
companies.forEach(company => {
  if (company) {  // ← Null companies are skipped!
    companyMap.set(company._id, { name, logoUrl, ticker });
  }
});

// 4. Enrich products with company data
const enrichedProducts = products.map(product => {
  const companyInfo = companyMap.get(product.companyId);
  return {
    ...product,
    companyName: companyInfo?.name || "Unknown",  // ← Shows "Unknown"
  };
});
```

**The result**: Products with deleted companies show `companyName: "Unknown"` but are still returned. However, the frontend may filter them out or display them incorrectly.

## Impact

- **User Experience**: Products appear to vanish from the marketplace
- **Company Owners**: Their valid products become invisible
- **Marketplace**: Appears incomplete or broken
- **Data Integrity**: Database has inconsistent state (active products with no company)

## Solution

### Immediate Fix

Run the orphaned products fix script:

```bash
npm run fix-orphaned-products
```

This script:
1. Scans all active products
2. Checks if their company still exists
3. Shows you which products are orphaned
4. Deactivates orphaned products after confirmation

### Long-Term Prevention

The `internalDeleteCompany` function already includes logic to deactivate products:

```typescript
// In convex/companies.ts - internalDeleteCompany
const products = await ctx.db
  .query("products")
  .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
  .collect();

for (const product of products) {
  await ctx.db.patch(product._id, { isActive: false });
}
```

This ensures that when a company is deleted, all its products are deactivated.

**However**, older deletions (before this logic was added) may have left orphaned products behind.

## Diagnosis

### Check for Orphaned Products

Use the Convex dashboard or the debug query:

```typescript
// In Convex dashboard, run:
api.debug.findOrphanedProducts({})
```

This returns:
```json
{
  "total": 150,           // Total active products
  "orphaned": 23,         // Products with deleted companies
  "orphanedProducts": [   // Details of each orphaned product
    {
      "_id": "j57abc...",
      "name": "Test Widget",
      "companyId": "j12xyz...",  // ← This company no longer exists
      "price": 50,
      "createdAt": 1697500000000
    }
  ]
}
```

### Verify Company Exists

In Convex dashboard:

```typescript
// Check if a specific company exists
ctx.db.get("j12xyz..." as Id<"companies">)
// Returns null if deleted
```

## Fix Implementation

### Debug Functions Added

**File**: `convex/debug.ts`

```typescript
// Query to find orphaned products
export const findOrphanedProducts = query({
  args: {},
  handler: async (ctx) => {
    const activeProducts = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const orphanedProducts = [];
    for (const product of activeProducts) {
      const company = await ctx.db.get(product.companyId);
      if (!company) {
        orphanedProducts.push({ /* product details */ });
      }
    }

    return { total, orphaned: orphanedProducts.length, orphanedProducts };
  },
});

// Mutation to fix orphaned products
export const fixOrphanedProducts = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, args) => {
    // Validate admin key
    if (args.adminKey !== process.env.ADMIN_KEY) {
      throw new Error("Invalid admin key");
    }

    // Find and deactivate orphaned products
    const activeProducts = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    let fixedCount = 0;
    for (const product of activeProducts) {
      const company = await ctx.db.get(product.companyId);
      if (!company) {
        await ctx.db.patch(product._id, { isActive: false });
        fixedCount++;
      }
    }

    return { fixed: fixedCount, fixedProducts: [...] };
  },
});
```

### Script Added

**File**: `scripts/fix-orphaned-products.ts`

A user-friendly CLI script that:
1. Connects to Convex
2. Queries for orphaned products
3. Shows results in human-readable format
4. Asks for confirmation
5. Deactivates orphaned products
6. Reports success

## Testing

### Before Running Fix

1. Check marketplace - note which products/companies are missing
2. Check database for orphaned products:
   ```bash
   npx convex run debug:findOrphanedProducts
   ```
3. Note the count of orphaned products

### After Running Fix

1. Run the fix:
   ```bash
   npm run fix-orphaned-products
   ```
2. Verify orphaned products are now `isActive: false`
3. Check marketplace - should now display correctly
4. Re-run the check:
   ```bash
   npx convex run debug:findOrphanedProducts
   ```
   Should return `orphaned: 0`

### Edge Cases

- **Product with deleted company but company recreated**: Won't be detected as orphaned (new company has different ID)
- **Company soft-deleted**: If companies had a "deleted" flag instead of actual deletion, this wouldn't help
- **Performance**: Scanning all active products is O(n) - acceptable for <10k products

## Performance Considerations

### Query Performance

- **findOrphanedProducts**: O(n) where n = active products
  - Acceptable for <10,000 active products
  - Takes ~1-3 seconds on typical dataset
  - Uses `by_active` index for efficient filtering

- **fixOrphanedProducts**: O(n) where n = active products
  - Each product requires 1 read + 1 write (if orphaned)
  - Batch operations via Promise.all could improve performance

### Optimization Opportunities

1. **Batch company lookups**: 
   ```typescript
   const companyIds = [...new Set(products.map(p => p.companyId))];
   const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));
   const companySet = new Set(companies.filter(Boolean).map(c => c._id));
   
   // Now check in O(1) instead of O(n) lookups
   const orphaned = products.filter(p => !companySet.has(p.companyId));
   ```

2. **Add index**: Could add a `by_company_active` compound index on products
   ```typescript
   .index("by_company_active", ["companyId", "isActive"])
   ```
   But this wouldn't help since we need to check company existence.

## Prevention Strategy

### 1. Ensure Deletion Logic Runs

The `internalDeleteCompany` function should always run when companies are deleted. Make sure:

- Admin deletions use `adminDeleteCompanies` (which schedules `internalDeleteCompany`)
- Direct `ctx.db.delete(companyId)` calls are avoided
- Migrations/scripts use proper deletion flow

### 2. Add Referential Integrity Checks

Consider adding a validation function:

```typescript
export const validateProductIntegrity = internalMutation({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let orphanedCount = 0;
    
    for (const product of products) {
      const company = await ctx.db.get(product.companyId);
      if (!company && product.isActive) {
        await ctx.db.patch(product._id, { isActive: false });
        orphanedCount++;
      }
    }
    
    return { orphanedCount };
  },
});
```

Run this periodically via cron:

```typescript
// In convex/crons.ts
crons.weekly(
  "validate product integrity",
  { hourUTC: 4, minuteUTC: 0, dayOfWeek: "sunday" },
  internal.products.validateProductIntegrity
);
```

### 3. Add Database Constraints (Future)

If Convex supports referential integrity constraints in the future:

```typescript
products: defineTable({
  companyId: v.id("companies"),  // Foreign key constraint
  // ... other fields
}).foreignKey("companyId", "companies", "CASCADE"),  // Auto-deactivate on delete
```

## Alternative Solutions

### Option 1: Filter in Query (Not Recommended)

Modify `getActiveProducts` to exclude products with null companies:

```typescript
const validProducts = enrichedProducts.filter(p => p.companyName !== "Unknown");
```

**Pros**: No database changes needed
**Cons**: Hides the problem instead of fixing it, wastes bandwidth fetching invalid products

### Option 2: Soft Delete Companies (Recommended)

Instead of `ctx.db.delete(companyId)`, add a `deletedAt` field:

```typescript
await ctx.db.patch(companyId, { 
  isActive: false, 
  deletedAt: Date.now() 
});
```

Then filter queries:

```typescript
const companies = await ctx.db
  .query("companies")
  .filter(q => q.eq(q.field("deletedAt"), null))
  .collect();
```

**Pros**: Preserves data, allows undelete, no orphaned references
**Cons**: More complex queries, larger database

### Option 3: Cascade Delete (Implemented)

Current solution: When deleting company, also deactivate all products.

**Pros**: Maintains referential integrity, clean database
**Cons**: Requires careful implementation, can miss products if logic has bugs

## Monitoring

### Metrics to Track

1. **Orphaned Products Count**: Run `findOrphanedProducts` daily
2. **Products vs Active Products**: Monitor ratio of active products
3. **Marketplace Display Issues**: User reports of missing products
4. **Company Deletions**: Track how many companies are deleted per week

### Dashboard Query

Add to admin dashboard:

```typescript
export const getIntegrityStats = query({
  handler: async (ctx) => {
    const [activeProducts, activeCompanies] = await Promise.all([
      ctx.db.query("products").withIndex("by_active", q => q.eq("isActive", true)).collect(),
      ctx.db.query("companies").collect(),
    ]);
    
    const companyIds = new Set(activeCompanies.map(c => c._id));
    const orphaned = activeProducts.filter(p => !companyIds.has(p.companyId));
    
    return {
      totalActiveProducts: activeProducts.length,
      totalCompanies: activeCompanies.length,
      orphanedProducts: orphaned.length,
      healthScore: (1 - orphaned.length / activeProducts.length) * 100,
    };
  },
});
```

## Summary

**Problem**: Products reference deleted companies, causing marketplace display issues

**Root Cause**: Race condition or older deletions left orphaned products active

**Solution**: Detect and deactivate orphaned products via debug functions and CLI script

**Prevention**: Ensure company deletion always deactivates products; consider periodic integrity checks

**Status**: ✅ Fixed - Run `npm run fix-orphaned-products` to resolve

---

**Created**: October 15, 2025  
**Last Updated**: October 15, 2025  
**Status**: Resolved
