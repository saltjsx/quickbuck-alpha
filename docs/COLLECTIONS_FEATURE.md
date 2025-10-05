# Collections Feature

## Overview

The Collections feature allows players to purchase items from the marketplace and add them to their personal collection. This creates a new engagement layer where players can collect items beyond just investing in stocks.

## Features

### 1. Purchase Items from Marketplace

Players can now purchase products directly from the marketplace:

- Each product in the marketplace has a "Purchase" button
- Players need sufficient balance in their personal account
- Purchase deducts from player's account and credits the company
- Creates a ledger transaction for tracking

### 2. Collections Tab in Portfolio

A new "Collections" tab has been added to the Portfolio page with two sections:

#### Collection Statistics

- **Total Items**: Number of items in the collection
- **Total Spent**: Total amount spent on purchases
- **Current Value**: Current market value of all items
- **Value Change**: Gain/loss percentage based on price changes

#### Collection Items Grid

Displays all purchased items with:

- Product image
- Product name and company
- Purchase price vs current price
- Price change percentage
- Tags
- Purchase date

### 3. Price Tracking

The system tracks:

- Original purchase price
- Current market price
- Value appreciation/depreciation

## Database Schema

### Collections Table

```typescript
collections: defineTable({
  userId: v.id("users"),
  productId: v.id("products"),
  purchasePrice: v.number(),
  purchasedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_product", ["productId"])
  .index("by_user_product", ["userId", "productId"])
  .index("by_user_purchased", ["userId", "purchasedAt"]);
```

## Convex Functions

### Mutations

#### `purchaseItem`

Purchase an item from the marketplace and add it to collection.

**Args:**

- `productId`: ID of the product to purchase

**Flow:**

1. Validates user authentication
2. Checks product availability
3. Verifies user has sufficient balance
4. Transfers funds from user to company
5. Creates ledger entry
6. Adds item to collection
7. Updates product sales statistics

### Queries

#### `getMyCollection`

Retrieves all items in the user's collection with enriched data.

**Returns:**
Array of collection items with product and company information.

#### `getCollectionStats`

Calculates collection statistics for the user.

**Returns:**

- `totalItems`: Number of items
- `totalSpent`: Total amount spent
- `totalValue`: Current total value
- `priceChange`: Value change amount
- `priceChangePercent`: Value change percentage

#### `checkOwnership`

Checks if a user already owns a specific product.

**Args:**

- `productId`: ID of the product to check

**Returns:**
Boolean indicating ownership.

## Components

### `CollectionsTab`

Location: `/app/components/game/collections-tab.tsx`

Main component that displays:

- Collection statistics card
- Grid of collection items
- Empty state when no items

### Marketplace Purchase Integration

Location: `/app/routes/dashboard/marketplace.tsx`

Enhanced marketplace with:

- Purchase buttons on each product
- Balance checking
- Success/error toasts
- Disabled state for insufficient funds

### Portfolio Tabs

Location: `/app/routes/dashboard/portfolio.tsx`

Updated portfolio with tabs:

- **Stocks Tab**: Original stock holdings view
- **Collections Tab**: New collections view

## User Flow

1. **Browse Marketplace**: User views available products
2. **Purchase Item**: Click "Purchase" button on desired product
3. **Transaction**:
   - Funds transferred from personal account to company
   - Item added to collection
   - Transaction recorded in ledger
4. **View Collection**: Navigate to Portfolio → Collections tab
5. **Track Value**: See purchase price vs current price
6. **Value Changes**: As product prices change, collection value updates

## Transaction Flow

```
User Account (-$X) → Company Account (+$X)
      ↓
  Ledger Entry (product_purchase)
      ↓
  Collection Item Created
      ↓
  Product Sales Counter ++
```

## Future Enhancements

Potential additions:

1. **Rarity System**: Limited edition items with scarcity
2. **Trading System**: Player-to-player item trading
3. **Display Showcase**: Feature collection items on profile
4. **Achievement Badges**: Complete collection sets for rewards
5. **Item Categories**: Filter and sort by categories
6. **Price History**: Track item price changes over time
7. **Resale System**: Sell items back or to other players
8. **Bundle Deals**: Purchase multiple items at discount

## Technical Notes

- Collections are user-specific and tied to `userId`
- Each purchase is a one-time transaction
- Multiple purchases of the same product create separate collection entries
- Product prices can change, affecting collection value
- All transactions create ledger entries for accountability
- No limit on collection size (can be added if needed)

## Integration Points

The Collections feature integrates with:

- **Accounts System**: For balance management
- **Ledger System**: For transaction tracking
- **Products System**: For marketplace items
- **Companies System**: For revenue distribution
- **Portfolio System**: For collections display

## Error Handling

Common errors handled:

- "Not authenticated": User not logged in
- "Product not found": Invalid product ID
- "Product is not available": Inactive product
- "No personal account found": User hasn't initialized account
- "Insufficient funds": Balance too low
- "Company not found": Invalid company reference
