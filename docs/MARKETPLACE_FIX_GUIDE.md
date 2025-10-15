# Marketplace Fix - Products Not Showing Up

## TL;DR

If products/companies aren't showing up in the marketplace, run this command:

```bash
npm run fix-orphaned-products
```

## What Happened?

When the pruning scripts deleted spam/test companies, some products were left active but pointing to deleted companies. These "orphaned" products don't show up properly in the marketplace.

## How to Fix

1. Open your terminal in the project directory

2. Run the fix script:
   ```bash
   npm run fix-orphaned-products
   ```

3. The script will:
   - Check how many orphaned products exist
   - Show you the list
   - Ask if you want to deactivate them
   - Require your admin key for confirmation

4. After running, the marketplace should display correctly

## What Gets Fixed?

- ✅ Products with deleted companies are deactivated
- ✅ Marketplace shows only valid products
- ✅ No more "Unknown" company names
- ✅ Database integrity restored

## Technical Details

The issue occurs because:
1. Companies get deleted via pruning scripts
2. Their products should be deactivated automatically
3. Some older deletions left products active
4. The marketplace query filters them out, making them invisible

The fix script:
- Finds all active products
- Checks if their company still exists
- Deactivates products with missing companies
- Reports results

## Prevention

This is now prevented for future deletions:
- Company deletion automatically deactivates all products
- The fix script handles any existing orphans

## Questions?

Check `ORPHANED_PRODUCTS_FIX.md` for complete technical documentation.

---

**Created**: October 15, 2025
