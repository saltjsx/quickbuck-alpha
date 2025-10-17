# Upgrades Feature - QuickBuck

## Overview

The **Upgrades** feature introduces strategic power-ups that players can purchase and use to gain advantages in the game. These upgrades are expensive and provide significant strategic value.

## Upgrade Types

### 1. Revenue Boost
Instantly increase a company's product revenue by a percentage.

- **Low Tier**: 10% boost - $5,000,000
- **Medium Tier**: 20% boost - $15,000,000
- **High Tier**: 30% boost - $30,000,000

**Usage**: Can only be used on companies you own. Applies to all active products.

### 2. Stock Price Boost
Increase any public company's stock price by a percentage.

- **Low Tier**: 5% boost - $10,000,000
- **High Tier**: 10% boost - $25,000,000

**Usage**: Can be used on any public company, including competitors.

### 3. Stock Price Lower
Decrease any public company's stock price by a percentage.

- **Low Tier**: 5% decrease - $12,000,000
- **High Tier**: 10% decrease - $30,000,000

**Usage**: Can be used on any public company. Strategic for market manipulation.

## Database Schema

### `upgrades` Table
Stores the available upgrade templates.

```typescript
{
  name: string;
  description: string;
  type: "revenue_boost" | "stock_price_boost" | "stock_price_lower";
  tier: "low" | "medium" | "high";
  effectPercentage: number;
  price: number;
  isActive: boolean;
  createdAt: number;
}
```

### `userUpgrades` Table
Tracks user-purchased upgrades and their usage.

```typescript
{
  userId: Id<"users">;
  upgradeId: Id<"upgrades">;
  purchasePrice: number;
  isUsed: boolean;
  usedAt?: number;
  targetId?: Id<"companies"> | Id<"stocks">;
  targetType?: "company" | "stock";
  effectApplied?: number;
  purchasedAt: number;
}
```

## Backend Functions

### Queries

- **`getActiveUpgrades()`**: Returns all available upgrades for purchase
- **`getUserUpgrades()`**: Returns all upgrades owned by the authenticated user
- **`getUnusedUpgrades()`**: Returns only unused upgrades in the user's inventory

### Mutations

- **`initializeUpgrades()`**: Initialize the upgrades table with default upgrades (run once)
- **`purchaseUpgrade({ upgradeId })`**: Purchase an upgrade from the shop
- **`useRevenueBoost({ userUpgradeId, companyId })`**: Apply revenue boost to a company
- **`useStockPriceBoost({ userUpgradeId, companyId })`**: Boost a stock's price
- **`useStockPriceLower({ userUpgradeId, companyId })`**: Lower a stock's price

## UI Components

### Main Component
- **`app/components/game/upgrades-tab.tsx`**: Main upgrades interface with shop and inventory tabs

### Dialogs
- **`use-revenue-boost-dialog.tsx`**: Select company to apply revenue boost
- **`use-stock-price-boost-dialog.tsx`**: Select stock to boost price
- **`use-stock-price-lower-dialog.tsx`**: Select stock to lower price

## Routes

- **`/dashboard/upgrades`**: Main upgrades page

## Setup Instructions

### 1. Deploy Schema Changes

The schema has been updated with two new tables:
- `upgrades`
- `userUpgrades`

Convex will automatically apply these changes when you run `npx convex dev`.

### 2. Initialize Upgrades

After the schema is deployed, run the initialization script:

```bash
npx tsx scripts/init-upgrades.ts
```

This will populate the `upgrades` table with the 7 default upgrade packs.

### 3. Verify Installation

1. Navigate to `/dashboard/upgrades`
2. You should see the upgrade shop with all available upgrades
3. Try purchasing an upgrade (if you have enough balance)
4. Check your inventory to see purchased upgrades

## Business Logic

### Purchase Flow

1. User clicks "Purchase Upgrade" on an upgrade card
2. System checks if user has sufficient balance
3. Deducts price from user's personal account
4. Credits amount to system account
5. Records transaction in ledger
6. Creates `userUpgrade` record with `isUsed: false`

### Usage Flow

1. User clicks "Use Upgrade" on an unused upgrade in inventory
2. Dialog opens to select target (company or stock)
3. User selects target and confirms
4. System validates:
   - Upgrade hasn't been used
   - User owns the upgrade
   - Target meets requirements (e.g., user owns company for revenue boost)
5. Applies the effect:
   - **Revenue Boost**: Updates all product `totalRevenue` for the company
   - **Stock Price Boost/Lower**: Updates company `sharePrice` and records in price history
6. Marks upgrade as `isUsed: true` and records target information

### Validation Rules

- **Revenue Boost**: Can only be applied to companies owned by the user
- **Stock Price Boost/Lower**: Can be applied to any public company
- **One-time Use**: Each upgrade can only be used once
- **Minimum Price**: Stock prices cannot go below $0.01

## Pricing Strategy

Upgrades are intentionally **very expensive**:
- Cheapest: $5,000,000 (Revenue Boost Low)
- Most expensive: $30,000,000 (Revenue Boost High & Stock Price Lower High)

This creates:
1. Aspirational goals for players
2. Rewards for active gameplay and company building
3. Meaningful strategic decisions
4. Prevention of market manipulation spam

## Performance Optimizations

### Indexes

- `by_type` - Filter upgrades by type
- `by_tier` - Filter by tier
- `by_active_type` - Shop display
- `by_user_used` - Inventory filtering
- `by_user_purchased` - Purchase history

### Bandwidth Considerations

- Upgrades are cached client-side via Convex's automatic caching
- User upgrades are fetched with enriched data (upgrade details + target names)
- Unused upgrades query uses compound index for efficiency

## Future Enhancements

Potential additions:
1. **Time-limited Upgrades**: Boosts that expire after X hours
2. **Stacking Upgrades**: Allow multiple smaller boosts
3. **Combo Upgrades**: Discounts for buying upgrade bundles
4. **Achievement Upgrades**: Special upgrades unlocked by achievements
5. **Defensive Upgrades**: Protection against stock price attacks
6. **Market Intelligence**: Reveal competitor data

## Testing Checklist

- [ ] Purchase each type of upgrade
- [ ] Use revenue boost on owned company
- [ ] Use stock price boost on public company
- [ ] Use stock price lower on competitor
- [ ] Verify balance deductions
- [ ] Verify ledger entries
- [ ] Test with insufficient balance
- [ ] Test using already-used upgrade
- [ ] Verify inventory updates in real-time
- [ ] Test with no companies (revenue boost should show empty state)
- [ ] Test with no public companies (stock upgrades should show empty state)

## Support

For issues or questions about the upgrades feature:
1. Check Convex dashboard for function execution logs
2. Verify schema deployment in Convex dashboard
3. Check browser console for client-side errors
4. Review ledger table for transaction history

---

**Feature Version**: 1.0.0  
**Last Updated**: October 17, 2025
