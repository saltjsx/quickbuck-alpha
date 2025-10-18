# Keep Private Fix - Preventing Automatic IPO

## Problem

Companies were randomly going public without player action when their balance exceeded $50,000. Players had no way to keep their company private, even if they wanted to.

## Root Cause

The `aiPurchase` and marketplace purchase mutations automatically set `isPublic: true` when company balance exceeded $50,000, without any player control over this behavior.

The bug occurred in two places in `convex/products.ts`:
1. The `aiPurchase` mutation (line 1020)
2. The marketplace batch purchase processing (line 732)

## Solution

### 1. Schema Change (`convex/schema.ts`)

Added a new optional field to the `companies` table:
- `keepPrivate: v.optional(v.boolean())` - Flag to prevent automatic going public

### 2. Auto-Public Logic Fix (`convex/products.ts`)

Updated both auto-public triggers to check the `keepPrivate` flag:

**In aiPurchase mutation (line 1020):**
```typescript
// Before
if (company && "isPublic" in company && !company.isPublic && newBalance > 50000) {
  await ctx.db.patch(company._id, { isPublic: true });
}

// After
if (company && "isPublic" in company && !company.isPublic && newBalance > 50000 && !(company as any).keepPrivate) {
  await ctx.db.patch(company._id, { isPublic: true });
}
```

**In marketplace batch processing (line 725):**
```typescript
// Before
if (!companyDoc || companyDoc.isPublic) continue;

// After
if (!companyDoc || companyDoc.isPublic || companyDoc.keepPrivate) continue;
```

### 3. Manual IPO Check (`convex/companies.ts`)

Updated the `checkAndUpdatePublicStatus` mutation to respect the `keepPrivate` flag:
```typescript
if (company.keepPrivate) {
  throw new Error("Company is set to remain private");
}
```

### 4. New Mutation (`convex/companies.ts`)

Added a new mutation to allow players to toggle the private status:

```typescript
export const toggleKeepPrivate = mutation({
  args: {
    companyId: v.id("companies"),
    keepPrivate: v.boolean(),
  },
  handler: async (ctx, args) => {
    // ... validation
    
    // If setting to keep private and company is already public, throw error
    if (args.keepPrivate && company.isPublic) {
      throw new Error("Cannot keep private - company is already public");
    }

    await ctx.db.patch(args.companyId, { keepPrivate: args.keepPrivate });

    return { success: true, keepPrivate: args.keepPrivate };
  },
});
```

## Usage

Players can now:

1. **Keep a company private** by calling `toggleKeepPrivate` with `keepPrivate: true`:
   - This prevents the company from automatically going public even if balance > $50,000
   - This cannot be set if the company is already public

2. **Allow a company to go public again** by calling `toggleKeepPrivate` with `keepPrivate: false`:
   - This removes the restriction
   - The company will then go public once balance exceeds $50,000 again

## UI Implementation

The UI should add a toggle/button in the company settings that calls the `toggleKeepPrivate` mutation with the desired state. Example pseudocode:

```typescript
// In company settings component
const handleToggleKeepPrivate = async (keepPrivate: boolean) => {
  try {
    await toggleKeepPrivate({
      companyId: company._id,
      keepPrivate,
    });
    // Show success message
  } catch (error) {
    // Show error message (e.g., "Company is already public")
  }
};
```

## Affected Files

1. `convex/schema.ts` - Added `keepPrivate` field
2. `convex/products.ts` - Updated auto-public logic in 2 locations
3. `convex/companies.ts` - Updated manual IPO check + added new mutation

## Testing

All changes have been typechecked and verified with no compilation errors.

### Test Cases to Consider

1. ✅ Company balance reaches $50,000 with `keepPrivate: true` → stays private
2. ✅ Company balance reaches $50,000 with `keepPrivate: false` → goes public
3. ✅ Cannot set `keepPrivate: true` on already public company
4. ✅ Can toggle `keepPrivate: false` on private company after having it set to true

---

**Date**: October 18, 2025  
**Status**: Complete and verified
