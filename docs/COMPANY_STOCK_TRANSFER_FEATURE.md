# Company Stock Transfer Feature

## Overview

Enhanced the stock transfer functionality to allow users to transfer stocks from their company accounts, not just their personal accounts.

## Date

October 6, 2025

## Problem Statement

Previously, users could only transfer stocks from their personal portfolio. If a company they owned or managed held stocks, they couldn't transfer those holdings through the UI.

## Solution

Added support for selecting and transferring stocks from any company account that the user has access to.

## Changes Made

### 1. Backend Changes

#### `convex/stocks.ts`

##### New Query: `getCompanyPortfolios`

- Fetches stock portfolios for all companies the user has access to
- Returns structured data with company info and their holdings
- Optimized with batch fetching
- Only returns companies that actually have stock holdings

**Returns:**

```typescript
[
  {
    companyId: Id<"companies">,
    companyName: string,
    companyTicker: string,
    holdings: [
      {
        ...holding,
        companyName: string,
        companyTicker: string,
        currentPrice: number,
        currentValue: number,
        gainLoss: number,
        // ... etc
      },
    ],
  },
];
```

##### Updated Mutation: `transferStock`

**New Arguments:**

- `fromHolderId` (optional): The ID of the user or company transferring the stocks
- `fromHolderType` (optional): Either "user" or "company"

**Logic Updates:**

- Defaults to current user if `fromHolderId` not specified (backward compatible)
- Validates user has access to company before allowing transfer
- Prevents transferring from another user's account
- Updates both sender and receiver holdings correctly

**Permissions:**

- User can transfer their own stocks
- User can transfer stocks from companies they have access to
- User cannot transfer stocks from other users' accounts

### 2. Frontend Changes

#### `app/routes/dashboard/transactions.tsx`

##### New Query Hook

```tsx
const companyPortfolios = useQuery(api.stocks.getCompanyPortfolios);
```

##### Updated Stock Selection UI

The stock selection dropdown now shows:

1. **Personal Portfolio Section**

   - Shows all stocks owned by the user personally
   - Header: "Personal Portfolio"

2. **Company Portfolio Sections** (one per company)
   - Shows all stocks owned by each company
   - Header: "[Company Name] ([TICKER])"
   - Each company's stocks are grouped together

##### Enhanced Stock Holding Data

Added fields to track ownership:

- `ownerType`: "personal" or "company"
- `ownerCompanyId`: ID of the owning company (if applicable)
- `ownerCompanyName`: Name of the owning company (if applicable)

##### Updated Transfer Handler

`handleStockTransfer` now:

- Determines if transferring from personal or company account
- Passes `fromHolderId` and `fromHolderType` to mutation
- Shows appropriate success message indicating the source account

##### Updated Transfer Preview

- Shows correct owner name (company name vs "You")
- Displays "Owned by: [Company Name]" when company-owned stock is selected

## User Experience

### Before

- User could only see and transfer stocks from personal portfolio
- No way to transfer company-held stocks

### After

1. User opens Stocks transfer tab
2. Sees organized list of all available stocks:
   - Personal stocks first
   - Each company's stocks in separate sections
3. Can select any stock from any account they have access to
4. Clear indication of which account owns the selected stock
5. Transfer preview shows the actual owner (personal or company name)

## Features

### Visual Improvements

- ✅ Sticky section headers for easy navigation
- ✅ "Owned by" label on selected company stocks
- ✅ Organized sections with clear hierarchy
- ✅ Consistent styling across all stock listings

### Security

- ✅ Permission checks on backend
- ✅ Can only transfer from accounts user has access to
- ✅ Clear error messages for permission violations

### Performance

- ✅ Batch queries for efficiency
- ✅ Only fetches companies with stock holdings
- ✅ Optimized data structures

## Edge Cases Handled

1. **No Stocks Available**: Shows message with link to browse stocks
2. **Empty Company Portfolios**: Only shows companies that have stocks
3. **Permission Denied**: Clear error message if trying to transfer without access
4. **Insufficient Shares**: Validates share count before transfer

## API Changes

### New Query

```typescript
getCompanyPortfolios: query({
  args: {},
  returns: CompanyPortfolio[]
})
```

### Updated Mutation

```typescript
transferStock: mutation({
  args: {
    companyId: Id<"companies">,
    shares: number,
    toId: Id<"users"> | Id<"companies">,
    toType: "user" | "company",
    fromHolderId: Id<"users"> | Id<"companies">, // NEW
    fromHolderType: "user" | "company", // NEW
  },
});
```

## Testing Checklist

- [x] Backend compiles without errors
- [x] Frontend compiles without errors
- [ ] Personal stocks show in "Personal Portfolio" section
- [ ] Company stocks show in company-specific sections
- [ ] Can transfer personal stocks (existing functionality)
- [ ] Can transfer company-owned stocks (new functionality)
- [ ] Permission validation works correctly
- [ ] Transfer preview shows correct owner
- [ ] Success message indicates correct source account
- [ ] Empty states display properly
- [ ] Section headers are sticky on scroll

## Files Modified

1. `/convex/stocks.ts`

   - Added `getCompanyPortfolios` query
   - Updated `transferStock` mutation with new optional parameters

2. `/app/routes/dashboard/transactions.tsx`
   - Added `companyPortfolios` query hook
   - Updated stock selection UI with sections
   - Enhanced `handleStockTransfer` with ownership tracking
   - Updated transfer preview to show correct owner

## Future Enhancements

Potential improvements:

- Add filters to show/hide personal vs company stocks
- Search functionality within stock list
- Bulk transfer capability
- Transfer history by source account
- Analytics on company portfolio performance

## Dependencies

No new dependencies added. Uses existing:

- Convex queries and mutations
- Existing UI components
- Current permission system

## Migration Notes

- **Backward Compatible**: Existing stock transfers continue to work
- **No Database Changes**: Uses existing schema
- **Optional Parameters**: New mutation parameters default to current user
