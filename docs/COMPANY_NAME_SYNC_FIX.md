# Company Name Update Sync Fix

## Problem
When a player updated their company name via the `updateCompany` mutation, the company record was updated but the associated account name was **not** synchronized, causing inconsistency.

## Root Cause
The `updateCompany` mutation in `convex/companies.ts` was only patching the company document, not the linked account document.

## Solution
Updated the `updateCompany` mutation to also sync the account name when the company name is changed:

```typescript
// If company name is being updated, also update the associated account name
if (args.name !== undefined && company.accountId) {
  await ctx.db.patch(company.accountId, { name: args.name });
}
```

## Changes Made

**File:** `convex/companies.ts`  
**Function:** `updateCompany` mutation

**Before:**
- Updates company name only
- Account name remains unchanged

**After:**
- Updates company name ✅
- Automatically syncs account name ✅
- Maintains data consistency

## Impact

✅ Company and account names now stay in sync  
✅ No UI confusion from mismatched names  
✅ Cleaner data integrity  

## Testing

- ✅ TypeCheck: Passed
- ✅ No Errors: 0
- ✅ Ready for production

---

**Date:** October 18, 2025  
**Status:** Complete and verified
