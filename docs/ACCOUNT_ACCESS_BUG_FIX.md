# Account Access Bug Fix

## Date

October 6, 2025

## Problem Description

Users reported three related issues:

1. Cannot access one company's account on the transfer screen
2. Two companies don't show up on the accounts page
3. Transfer page misreports company account balances

## Root Cause

The bug was in the `getUserAccounts` query in `convex/accounts.ts` at lines 96-122.

### The Issue

When fetching company accounts for a user, the code had an **index mismatch** problem:

```typescript
// Step 1: Fetch companies (includes nulls for deleted companies)
const companies = await Promise.all(companyIds.map((id) => ctx.db.get(id)));

// Step 2: Filter out nulls and fetch accounts
const companyAccounts = await Promise.all(
  companies
    .filter(Boolean) // ❌ This creates a NEW array with different indices
    .map((company: any) => ctx.db.get(company.accountId))
);

// Step 3: Map accounts back to add company names
const companyAccountsWithNames = companyAccounts
  .map((account: any, index) => {
    const company = companies[index]; // ❌ Using ORIGINAL array with old indices!
    return account && company
      ? { ...account, companyName: (company as any).name }
      : null;
  })
  .filter(Boolean);
```

### What Went Wrong

1. `companies` array might contain `null` values (for deleted companies that still have `companyAccess` records)
2. `.filter(Boolean)` removes nulls, creating a shorter array with different indices
3. When mapping `companyAccounts` back to add company names, it uses `companies[index]`
4. **The indices no longer match!** This causes:
   - Wrong company names assigned to accounts
   - Some accounts filtered out incorrectly (when matched with a null company)
   - Accounts not showing up on the accounts page
   - Inability to access certain accounts in dropdowns

## The Fix

Store the filtered array separately to maintain proper index alignment:

```typescript
// Step 1: Fetch companies
const companies = await Promise.all(companyIds.map((id) => ctx.db.get(id)));

// Step 2: Filter out null companies and store in NEW variable
const validCompanies = companies.filter(Boolean) as any[];

// Step 3: Fetch accounts using validCompanies
const companyAccounts = await Promise.all(
  validCompanies.map((company: any) => ctx.db.get(company.accountId))
);

// Step 4: Map with properly aligned indices
const companyAccountsWithNames = companyAccounts
  .map((account: any, index) => {
    const company = validCompanies[index]; // ✅ Now using the SAME filtered array!
    return account && company
      ? { ...account, companyName: company.name }
      : null;
  })
  .filter(Boolean);
```

## Files Changed

- `convex/accounts.ts` - Fixed `getUserAccounts` query (lines 96-122)

## Impact

✅ All company accounts now show up correctly in the accounts page
✅ All company accounts are accessible in the transfer screen dropdown
✅ Account balances display correctly (were always correct, just accounts were missing)
✅ No database schema changes required
✅ No data migration needed

## Testing Recommendations

1. Create multiple companies
2. Delete one company
3. Verify all remaining companies show up on accounts page
4. Verify all companies are accessible in transfer dropdown
5. Verify balances are correct for each account
6. Test transferring money between different account types

## Prevention

This type of bug can be prevented by:

- Being careful with array transformations (filter/map) and index usage
- Using the same array reference when indices are critical
- Adding TypeScript typing to catch null/undefined issues
- Writing unit tests for query logic with edge cases (deleted companies, null values)
