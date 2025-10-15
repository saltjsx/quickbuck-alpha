# Company Sale System Implementation

## Overview

Implemented a comprehensive system that allows players to sell their companies to other players. The seller sets the price, and when a buyer purchases the company, all assets, products, stocks, and ownership are transferred.

## Backend Changes

### Schema Updates (`convex/schema.ts`)

1. **New Table: `companySaleOffers`**
   - Tracks active, completed, and cancelled sale offers
   - Fields:
     - `companyId`: The company being sold
     - `sellerId`: The current owner selling
     - `buyerId`: Optional specific buyer (null for open market)
     - `price`: The asking price
     - `status`: "active", "completed", or "cancelled"
     - `createdAt`, `completedAt`: Timestamps
   - Indexes for efficient querying by company, seller, buyer, and status

2. **Updated Ledger Type**
   - Added `"company_sale"` transaction type to track company purchases

### Backend Mutations & Queries (`convex/companies.ts`)

1. **`createSaleOffer`** - Mutation
   - Allows company owners to list their company for sale
   - Validates ownership and prevents duplicate active offers
   - Supports both open market and targeted offers

2. **`cancelSaleOffer`** - Mutation
   - Allows sellers to cancel their active sale offers
   - Only the seller can cancel their own offers

3. **`acceptSaleOffer`** - Mutation
   - Handles the complete ownership transfer process:
     - Validates buyer has sufficient funds
     - Transfers payment from buyer to seller
     - Updates company ownership (ownerId)
     - Updates company account ownership
     - Transfers company access rights
     - Transfers all stock holdings from seller to buyer
     - Marks offer as completed
     - Cancels any other active offers for the company
   - Creates ledger entry for the transaction

4. **`getActiveSaleOffers`** - Query
   - Returns all active sale offers
   - Optionally filters for a specific buyer
   - Enriches data with company and seller information

5. **`getCompanySaleOffer`** - Query
   - Gets the active sale offer for a specific company
   - Used to check if a company is already listed

6. **`getMySaleOffers`** - Query
   - Returns all sale offers created by the current user
   - Includes company information for each offer

## Frontend Changes

### New Components

1. **`SellCompanyDialog`** (`app/components/game/sell-company-dialog.tsx`)
   - Dialog for company owners to list their company for sale
   - Features:
     - Price input with validation
     - Suggested price (1.5x company balance)
     - Company balance display
     - Warning about permanent transfer
     - Shows existing offer with cancel option
   - Uses Convex mutations: `createSaleOffer`, `cancelSaleOffer`

2. **`CompanySaleOffersTab`** (`app/components/game/company-sale-offers-tab.tsx`)
   - Displays all available companies for sale
   - Features:
     - Grid of company cards with key metrics
     - Shows asking price, company balance, market cap (if public)
     - Seller information
     - Company tags
     - Purchase dialog with account selection
     - Validates buyer has sufficient funds
     - Shows which accounts can afford the purchase
   - Uses Convex mutations: `acceptSaleOffer`
   - Uses Convex queries: `getActiveSaleOffers`, `getUserAccounts`

### Updated Components

1. **`CompanyDashboard`** (`app/components/game/company-dashboard.tsx`)
   - Added `SellCompanyDialog` import
   - Added "Sell Company" button in the header actions
   - Button appears next to Edit and Delete actions

2. **Component Exports** (`app/components/game/index.ts`)
   - Exported `SellCompanyDialog`
   - Exported `CompanySaleOffersTab`

### New Routes

1. **`/dashboard/company-sales`** (`app/routes/dashboard/company-sales.tsx`)
   - New page dedicated to browsing companies for sale
   - Full page layout with `CompanySaleOffersTab`
   - SEO metadata for the page

2. **App Sidebar** (`app/components/dashboard/app-sidebar.tsx`)
   - Added "Company Sales" menu item between "My Companies" and "Marketplace"
   - Uses `IconBuilding` icon

## Key Features

### For Sellers:
- **List for Sale**: Company owners can set any price they want
- **View Status**: See if company is currently listed
- **Cancel Anytime**: Remove listing if they change their mind
- **Suggested Pricing**: UI suggests 1.5x company balance as a starting point
- **One Active Offer**: Only one active sale offer per company at a time

### For Buyers:
- **Browse Marketplace**: Dedicated page to view all available companies
- **Rich Information**: See company balance, market cap, share price, tags
- **Account Selection**: Choose which account to pay from
- **Balance Validation**: System prevents purchases if insufficient funds
- **Instant Ownership**: Immediate transfer upon purchase

### Security & Validation:
- **Ownership Verification**: Only owners can create sale offers
- **Fund Verification**: Buyers must have sufficient balance
- **Access Control**: Buyers must have access to payment account
- **Atomic Transfers**: All ownership changes happen in one transaction
- **Stock Transfer**: Seller's stock holdings automatically transfer to buyer
- **Access Rights Update**: Company access rights update automatically
- **Duplicate Prevention**: Only one active offer per company

## What Gets Transferred:

When a company is sold, the buyer receives:
1. ✅ **Ownership** - Becomes the new owner in the database
2. ✅ **Company Account** - Takes ownership of company's bank account
3. ✅ **Company Balance** - All funds in the company account
4. ✅ **All Products** - Active and inactive products
5. ✅ **Stock Holdings** - Any stocks the seller owned in this company
6. ✅ **Company Access** - Owner role in companyAccess table
7. ✅ **Public Status** - If company is public, remains public
8. ✅ **Market Position** - Share price and market cap maintained

The seller receives:
1. 💰 **Sale Price** - Paid to their personal account
2. 🔄 **Transaction Record** - Ledger entry of the sale

## Database Performance

The implementation follows the bandwidth optimization patterns from AGENTS.md:
- Uses compound indexes for efficient queries
- Batch fetches related data (companies, accounts, sellers)
- Limits result sets (50 offers max)
- Uses cached account balances
- Efficient status filtering with indexes

## Usage Example

### Selling a Company:
1. Navigate to "My Companies" or company dashboard
2. Click "Sell Company" button
3. Enter desired price (or use suggested price)
4. Confirm listing
5. Company appears in "Company Sales" marketplace

### Buying a Company:
1. Navigate to "Company Sales" from sidebar
2. Browse available companies
3. Click "Purchase Company" on desired company
4. Select payment account
5. Confirm purchase
6. Instantly receive ownership

## Future Enhancements (Not Implemented)

- Private sale offers (target specific buyers)
- Sale history/analytics
- Price negotiation system
- Company appraisal/valuation tools
- Bulk sale of multiple companies
- Sale offer expiration dates
- Commission/marketplace fees

## Testing Checklist

- [ ] Create a company and list it for sale
- [ ] View the listing in Company Sales page
- [ ] Cancel a sale offer
- [ ] Purchase a company from another player
- [ ] Verify ownership transfer
- [ ] Verify balance transfers correctly
- [ ] Verify stock holdings transfer
- [ ] Verify company access rights update
- [ ] Verify ledger transaction created
- [ ] Test with insufficient funds
- [ ] Test with multiple companies
- [ ] Test with public vs private companies

## Files Modified/Created

**Modified:**
- `convex/schema.ts` - Added table and updated ledger type
- `convex/companies.ts` - Added 6 new mutations/queries
- `app/components/game/company-dashboard.tsx` - Added sell button
- `app/components/game/index.ts` - Added exports
- `app/components/dashboard/app-sidebar.tsx` - Added menu item

**Created:**
- `app/components/game/sell-company-dialog.tsx` - Seller UI
- `app/components/game/company-sale-offers-tab.tsx` - Marketplace UI
- `app/routes/dashboard/company-sales.tsx` - Marketplace page
