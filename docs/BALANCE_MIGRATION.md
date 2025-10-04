# Balance Migration Guide

## Problem

The app was experiencing errors due to reading too many documents (>32,000) from the ledger table when calculating account balances. This happened because balances were calculated on-the-fly by summing all transactions.

## Solution

Added a `balance` field to the `accounts` table to cache the balance. All transaction mutations now update this cached balance directly instead of recalculating from the ledger.

## Changes Made

### 1. Schema Update (`convex/schema.ts`)

- Added `balance: v.optional(v.number())` field to accounts table

### 2. Accounts (`convex/accounts.ts`)

- Modified `getBalance` to read from cached balance field
- Modified `getUserAccounts` to use cached balances (no more calculation)
- Modified `initializeAccount` to set initial balance of $10,000
- Modified `transfer` mutation to update balances on both accounts
- Added `recalculateBalance` mutation for single account migration
- Added `recalculateAllBalances` mutation for bulk migration

### 3. Products (`convex/products.ts`)

- Modified marketplace simulation to update company account balances directly

### 4. Stocks (`convex/stocks.ts`)

- Modified `buyStock` to update balances on both accounts
- Modified `sellStock` to update balances on both accounts

### 5. Companies (`convex/companies.ts`)

- Modified company creation to set initial balance of 0

## Migration Steps

### Option 1: Recalculate All Balances (Recommended)

Run this in your browser console or create a temporary React component:

```javascript
// In browser console (while on your app)
const convex = window.convex; // or however you access your convex client

// Recalculate all balances
const result = await convex.mutation(api.accounts.recalculateAllBalances, {});
console.log("Migration results:", result);
```

### Option 2: Manual Migration via Convex Dashboard

1. Go to your Convex dashboard
2. Navigate to the "Functions" tab
3. Find `accounts:recalculateAllBalances`
4. Click "Run" with no arguments
5. Wait for completion (this may take a while if you have many accounts)

### Option 3: Fresh Start (If database is not important)

1. Clear the database tables:
   - Go to Convex Dashboard > Data
   - Delete all records from `ledger`, `accounts`, and related tables
2. Restart the app - all new accounts will have cached balances

## Verification

After migration, verify that:

1. All accounts show correct balances
2. Transfers work correctly
3. Stock purchases/sales work correctly
4. Product purchases update balances

You can verify individual accounts with:

```javascript
// Get account balance
const balance = await convex.query(api.accounts.getBalance, {
  accountId: "YOUR_ACCOUNT_ID",
});
console.log("Balance:", balance);
```

## Important Notes

- The `ledger` table is now used primarily for transaction history/audit trail
- All balance calculations now use the cached `balance` field on accounts
- The `calculateBalance` helper function still exists but should only be used for migration
- New transactions automatically update cached balances

## Troubleshooting

If you still see errors about too many documents:

1. Make sure you've run the migration (`recalculateAllBalances`)
2. Check that all new transactions are using the updated mutation code
3. Verify the schema has been deployed with the `balance` field

If balances seem incorrect:

1. Run `recalculateBalance` for the specific account
2. Check the ledger table for any unusual transactions
3. Verify all transaction mutations are updating balances correctly
