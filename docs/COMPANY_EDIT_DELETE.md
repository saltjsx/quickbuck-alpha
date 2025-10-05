# Company Edit and Delete Feature

## Overview

Added functionality for users to edit their company details and delete their companies. When a company is deleted, all funds in the company account are automatically transferred back to the owner's personal account.

## Implementation Date

October 5, 2025

## Components Created

### 1. EditCompanyDialog (`app/components/game/edit-company-dialog.tsx`)

- Allows company owners to edit company details
- Fields that can be edited:
  - Company name
  - Ticker symbol (with uniqueness validation)
  - Description
  - Tags (add/remove)
  - Logo URL
- Features:
  - Profanity filtering on all text fields
  - Real-time logo preview
  - Only owners can edit company details
  - Validation for ticker symbols (1-5 characters, uppercase)
  - Checks for duplicate ticker symbols

### 2. DeleteCompanyDialog (`app/components/game/delete-company-dialog.tsx`)

- Allows company owners to permanently delete their companies
- Features:
  - Confirmation dialog with detailed breakdown of what will be deleted
  - Shows how much money will be returned to owner
  - Only owners can delete companies
  - Automatic fund transfer to personal account
  - Navigation back to companies page after deletion

## Backend Mutations Added

### 1. `updateCompany` (`convex/companies.ts`)

```typescript
export const updateCompany = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    ticker: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  // ...
});
```

**Authorization**: Only the company owner can update company details

**Validations**:

- Checks if ticker symbol is already in use (when changing)
- Converts ticker to uppercase automatically

### 2. `deleteCompany` (`convex/companies.ts`)

```typescript
export const deleteCompany = mutation({
  args: {
    companyId: v.id("companies"),
  },
  // ...
});
```

**Authorization**: Only the company owner can delete the company

**Cascade Deletion Process**:

1. **Funds Transfer**: Transfers company balance to owner's personal account
2. **Products**: Deactivates all products (keeps for historical record)
3. **Stocks**: Deletes all stock holdings for the company
4. **Stock History**: Deletes all stock price history
5. **Stock Transactions**: Deletes all stock transaction records
6. **Access Records**: Deletes all company access records
7. **Balance Record**: Deletes the balance table entry
8. **Account**: Deletes the company account
9. **Company**: Finally deletes the company record

**Returns**:

```typescript
{
  success: boolean,
  fundsReturned: number  // Amount transferred to owner
}
```

## UI Integration

### Company Dashboard

The company dashboard header now includes:

- Edit Company button (opens EditCompanyDialog)
- Delete Company button (opens DeleteCompanyDialog)

Location: `app/components/game/company-dashboard.tsx`

### Companies List Page

Each company card now includes:

- Edit Company button
- Delete Company button

Location: `app/routes/dashboard/companies.tsx`

## User Flow

### Editing a Company

1. User clicks "Edit Company" button
2. Dialog opens with current company details pre-filled
3. User modifies desired fields
4. System validates inputs (profanity, ticker uniqueness, etc.)
5. On submit, company details are updated
6. Success toast notification shown
7. UI automatically reflects changes

### Deleting a Company

1. User clicks "Delete Company" button
2. Confirmation dialog shows:
   - Warning about permanent deletion
   - List of what will be deleted/affected
   - Amount of funds to be returned (if any)
3. User confirms deletion
4. System:
   - Transfers funds to personal account
   - Deactivates products
   - Deletes all associated records
   - Removes company
5. Success toast shows funds returned
6. User redirected to companies page

## Data Integrity

### What Happens to Products

- Products are **deactivated** (not deleted) to maintain historical records
- Products will no longer appear in marketplace
- Transaction history remains intact
- Product stats (totalSales, totalRevenue, totalCosts) are preserved

### What Happens to Stocks

- All stock holdings are deleted
- Stock price history is deleted
- Stock transactions are deleted
- If company was public, it's removed from stock market

### Transaction History

- All ledger entries remain in the system for audit purposes
- A final transfer transaction is created when funds are returned to owner

## Security & Authorization

### Owner-Only Actions

Both edit and delete operations require:

1. User must be authenticated
2. User must be the company owner (not just a manager)
3. Company must exist

### Validation Rules

- **Ticker Symbol**:

  - 1-5 characters only
  - Automatically uppercased
  - Must be unique across all companies
  - Cannot be changed to an existing ticker

- **All Text Fields**:
  - Profanity filtered
  - Name and ticker required
  - Description and logo optional

## Error Handling

### Edit Company Errors

- "Not authenticated" - User not logged in
- "Company not found" - Invalid company ID
- "Only the owner can update company details" - Non-owner attempting edit
- "Ticker symbol already in use" - Duplicate ticker
- "Profanity Detected" - Inappropriate content in any field

### Delete Company Errors

- "Not authenticated" - User not logged in
- "Company not found" - Invalid company ID
- "Only the owner can delete the company" - Non-owner attempting deletion

## Testing Checklist

- [x] Edit company name
- [x] Edit company ticker (with uniqueness check)
- [x] Edit company description
- [x] Add/remove tags
- [x] Update logo URL
- [x] Profanity filtering on all fields
- [x] Delete company with balance (funds transferred)
- [x] Delete company with no balance
- [x] Verify products deactivated after deletion
- [x] Verify stocks deleted after deletion
- [x] Verify navigation after deletion
- [x] Verify only owner can edit/delete
- [x] Verify UI updates after edits

## Future Enhancements

### Potential Improvements

1. **Company Transfer**: Allow transferring ownership to another user
2. **Archive Instead of Delete**: Option to archive instead of permanently delete
3. **Deletion Confirmation Code**: Require typing company name to confirm deletion
4. **Activity Log**: Track all changes to company details
5. **Undo Delete**: Time-limited ability to restore deleted companies
6. **Bulk Operations**: Allow editing multiple fields in one transaction
7. **Company Merger**: Merge two companies together

### Manager Permissions

Currently, only owners can edit/delete. Could add:

- Allow managers to edit certain fields (description, tags)
- Require owner approval for critical changes (name, ticker)
- Audit trail of who made what changes

## Related Files

### Frontend Components

- `/app/components/game/edit-company-dialog.tsx` - Edit company dialog
- `/app/components/game/delete-company-dialog.tsx` - Delete company dialog
- `/app/components/game/company-dashboard.tsx` - Company dashboard with buttons
- `/app/routes/dashboard/companies.tsx` - Companies list page

### Backend

- `/convex/companies.ts` - Company mutations and queries
- `/convex/schema.ts` - Database schema (unchanged)

### Dependencies

- `bad-words` - Profanity filtering
- `react-router` - Navigation after deletion
- Convex mutations and queries

## Notes

### Design Decisions

1. **Deactivate vs Delete Products**: Products are deactivated rather than deleted to preserve historical sales data and analytics
2. **Funds Transfer**: All remaining funds automatically go to owner's personal account for simplicity
3. **Cascade Deletion**: Complete cleanup of all related records to prevent orphaned data
4. **Owner-Only**: Edit/delete restricted to owners only to prevent abuse by managers
5. **Ticker Uniqueness**: Enforced at mutation level to prevent race conditions

### Performance Considerations

- Batch deletion operations to minimize database calls
- All deletions happen in a single transaction
- No impact on other companies or users during deletion

### Backward Compatibility

- All existing companies continue to work normally
- No database migrations required
- New mutations are additive only
