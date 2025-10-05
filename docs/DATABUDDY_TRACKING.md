# Databuddy Analytics Tracking Implementation

## Overview

This document describes all the custom analytics events tracked throughout the QuickBuck application using Databuddy SDK.

## Client ID

```
rXZTUb1ToZ2xp-MexNOlZ
```

## Configuration

The Databuddy SDK is configured in `app/root.tsx` with the following features enabled:

- ✅ trackHashChanges
- ✅ trackAttributes
- ✅ trackOutgoingLinks
- ✅ trackInteractions
- ✅ trackEngagement
- ✅ trackScrollDepth
- ✅ trackExitIntent
- ✅ trackBounceRate
- ✅ trackWebVitals
- ✅ trackErrors
- ✅ enableBatching

## Custom Events with Monetary Values

### 1. Company Management Events

#### `company_created`

**Location:** `app/components/game/create-company-dialog.tsx`
**Trigger:** When a user successfully creates a new company
**Properties:**

- `company_name` (string): Name of the company
- `ticker` (string): Stock ticker symbol
- `has_description` (boolean): Whether description was provided
- `has_logo` (boolean): Whether logo URL was provided
- `tags_count` (number): Number of tags added
- `tags` (string): Comma-separated list of tags
- `timestamp` (string): ISO timestamp

#### `company_creation_failed`

**Location:** `app/components/game/create-company-dialog.tsx`
**Trigger:** When company creation fails
**Properties:**

- `error_message` (string): Error details
- `company_name` (string): Attempted company name
- `ticker` (string): Attempted ticker symbol
- `timestamp` (string): ISO timestamp

### 2. Product Management Events

#### `product_created`

**Location:** `app/components/game/create-product-dialog.tsx`
**Trigger:** When a user successfully creates a new product
**Properties:**

- `product_name` (string): Name of the product
- `price` (number): **💰 Product price in USD**
- `currency` (string): "USD"
- `has_image` (boolean): Whether image URL was provided
- `tags_count` (number): Number of tags
- `tags` (string): Comma-separated tags
- `description_length` (number): Length of description
- `timestamp` (string): ISO timestamp

#### `product_creation_failed`

**Location:** `app/components/game/create-product-dialog.tsx`
**Trigger:** When product creation fails
**Properties:**

- `product_name` (string): Attempted product name
- `price` (number): **💰 Attempted price**
- `error_message` (string): Error details
- `timestamp` (string): ISO timestamp

#### `product_updated`

**Location:** `app/components/game/edit-product-dialog.tsx`
**Trigger:** When a product is successfully updated
**Properties:**

- `product_id` (string): Product ID
- `product_name` (string): Product name
- `old_price` (number): **💰 Previous price**
- `new_price` (number): **💰 Updated price**
- `price_changed` (boolean): Whether price was modified
- `price_change_amount` (number): **💰 Price difference**
- `currency` (string): "USD"
- `has_image` (boolean): Whether image exists
- `tags_count` (number): Number of tags
- `timestamp` (string): ISO timestamp

#### `product_update_failed`

**Location:** `app/components/game/edit-product-dialog.tsx`
**Trigger:** When product update fails
**Properties:**

- `product_id` (string): Product ID
- `product_name` (string): Product name
- `error_message` (string): Error details
- `timestamp` (string): ISO timestamp

#### `product_viewed`

**Location:** `app/components/game/marketplace-tab.tsx`
**Trigger:** When a user clicks on a product in the marketplace
**Properties:**

- `product_id` (string): Product ID
- `product_name` (string): Product name
- `company_name` (string): Company that owns the product
- `price` (number): **💰 Product price**
- `currency` (string): "USD"
- `total_sales` (number): Number of sales
- `tags` (string): Product tags
- `has_image` (boolean): Whether product has image
- `timestamp` (string): ISO timestamp

### 3. Marketplace Events

#### `marketplace_viewed`

**Location:** `app/components/game/marketplace-tab.tsx`
**Trigger:** When marketplace tab loads with products
**Properties:**

- `products_count` (number): Number of products available
- `total_products_value` (number): **💰 Sum of all product prices**
- `currency` (string): "USD"
- `timestamp` (string): ISO timestamp

### 4. Account Management Events

#### `accounts_viewed`

**Location:** `app/components/game/accounts-tab.tsx`
**Trigger:** When user views their accounts
**Properties:**

- `accounts_count` (number): Number of accounts
- `total_balance` (number): **💰 Total balance across all accounts**
- `currency` (string): "USD"
- `has_company_accounts` (boolean): Whether user has company accounts
- `timestamp` (string): ISO timestamp

#### `account_initialized`

**Location:** `app/components/game/accounts-tab.tsx`
**Trigger:** When user initializes their first account
**Properties:**

- `timestamp` (string): ISO timestamp

### 5. Stock Market Events

#### `stock_market_viewed`

**Location:** `app/components/game/stock-market-tab.tsx`
**Trigger:** When user views the stock market
**Properties:**

- `public_companies_count` (number): Number of public companies
- `total_market_cap` (number): **💰 Total market capitalization**
- `currency` (string): "USD"
- `timestamp` (string): ISO timestamp

#### `portfolio_viewed`

**Location:** `app/components/game/stock-market-tab.tsx`
**Trigger:** When user views their stock portfolio
**Properties:**

- `holdings_count` (number): Number of stock holdings
- `total_portfolio_value` (number): **💰 Total portfolio value**
- `total_gain_loss` (number): **💰 Total profit/loss**
- `currency` (string): "USD"
- `timestamp` (string): ISO timestamp

#### `stock_company_viewed`

**Location:** `app/components/game/stock-market-tab.tsx`
**Trigger:** When user clicks on a company in stock market
**Properties:**

- `company_id` (string): Company ID
- `company_name` (string): Company name
- `ticker` (string): Stock ticker
- `share_price` (number): **💰 Current share price**
- `company_value` (number): **💰 Total company value**
- `currency` (string): "USD"
- `timestamp` (string): ISO timestamp

### 6. Navigation & Page View Events

#### `homepage_viewed`

**Location:** `app/routes/home.tsx`
**Trigger:** When user visits homepage
**Properties:**

- `user_signed_in` (boolean): Authentication status
- `timestamp` (string): ISO timestamp

#### `sign_in_page_viewed`

**Location:** `app/routes/sign-in.tsx`
**Trigger:** When user visits sign-in page
**Properties:**

- `timestamp` (string): ISO timestamp

#### `sign_up_page_viewed`

**Location:** `app/routes/sign-up.tsx`
**Trigger:** When user visits sign-up page
**Properties:**

- `timestamp` (string): ISO timestamp

#### `navigation_clicked`

**Location:** `app/components/homepage/navbar.tsx`
**Trigger:** When user clicks navigation links
**Properties:**

- `section` (string): Section navigated to (hero, features, how-to-play)
- `location` (string): "navbar"
- `timestamp` (string): ISO timestamp

### 7. Automatic Button Tracking (via data-track attributes)

The following buttons have automatic tracking enabled:

**Navbar Buttons:**

- `dashboard_button_clicked` - Dashboard button (signed in users)
- `login_button_clicked` - Login button
- `signup_button_clicked` - Sign Up button
- `get_started_button_clicked` - Get Started button (scrolled navbar)

## Monetary Value Summary

All events with monetary values include:

- `price` fields for product-related events
- `balance` fields for account-related events
- `total_*` fields for aggregated values
- `share_price` and `company_value` for stock market events
- `gain_loss` for portfolio performance
- All monetary values are in USD

## Revenue Tracking Opportunities

To track actual revenue/transactions, consider adding these events:

1. `product_purchased` - When automatic purchases occur
2. `stock_purchased` - When users buy stocks
3. `stock_sold` - When users sell stocks
4. `balance_transfer` - When money moves between accounts

## Analytics Dashboard Insights

With these events, you can track:

- **Total Product Value Created** - Sum of all `product_created.price`
- **Average Product Price** - Average of `product_created.price`
- **Price Change Trends** - `product_updated.price_change_amount`
- **Total Market Capitalization** - `stock_market_viewed.total_market_cap`
- **User Wealth Distribution** - `accounts_viewed.total_balance`
- **Portfolio Performance** - `portfolio_viewed.total_gain_loss`
- **Product Engagement** - `product_viewed` count
- **Conversion Funnels** - From `homepage_viewed` → `sign_up_page_viewed` → `account_initialized` → `company_created`

## Testing

To test tracking in development:

1. Remove `disabled={import.meta.env.DEV}` from Databuddy component (currently not set)
2. Open browser console and check for network requests to `basket.databuddy.cc`
3. Use the Databuddy dashboard to view real-time events

## Best Practices

1. All events include `timestamp` for temporal analysis
2. All monetary events include `currency: "USD"` for clarity
3. Error events track failure reasons for debugging
4. Events use snake_case naming convention
5. Properties are descriptive and consistent across events
