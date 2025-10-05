# Stock Pricing System

## Overview

The stock market now uses a **fundamental-based valuation system** that ties stock prices to company balance/cash while incorporating realistic market dynamics. This creates a more authentic stock market experience similar to real-world markets.

## Key Concepts

### 1. Book Value & Valuation Multiples

Stock prices are now based on **book value per share** multiplied by a **valuation multiplier**:

```
Book Value Per Share = Company Balance / Total Shares
Fair Value = Book Value Per Share × Valuation Multiplier
```

**Valuation Multipliers** (similar to P/E or P/B ratios):

- Small companies (< $10k): **3x** multiplier
- Growing companies ($10k - $100k): **5x** multiplier
- Medium companies ($100k - $500k): **5.5x** multiplier
- Large companies ($500k - $1M): **6x** multiplier
- Enterprise companies (> $1M): **7x** multiplier

### 2. Market Sentiment

Each company has a **marketSentiment** value (0.8 - 1.2) that:

- Represents investor confidence and market conditions
- Fluctuates ±2% every 5 minutes (via cron job)
- Affects the valuation multiplier (can add/remove up to 20%)
- Creates realistic market volatility

### 3. Price Discovery

Stock prices don't jump instantly to fair value. Instead:

- **Convergence Rate**: Prices move 15% toward fair value with each update
- **Market Noise**: ±1% random fluctuation added to simulate market activity
- **Transaction Impact**: Buy/sell orders still affect price (up to ±10% per transaction)
- **Fair Value Correction**: After transactions, prices are pulled 10% back toward fair value

## Example Scenarios

### Scenario 1: Company Goes Public

A company with **$60,000 balance** and **1,000,000 shares**:

```
Book Value Per Share = $60,000 / 1,000,000 = $0.06
Valuation Multiplier = 5x (growing company)
IPO Price = $0.06 × 5 = $0.30 per share
Market Cap = $0.30 × 1,000,000 = $300,000
```

The company is valued at **5x its cash balance**, similar to how a profitable startup might be valued at 5x revenue.

### Scenario 2: Company Grows

The company's balance grows to **$200,000**:

```
New Book Value = $200,000 / 1,000,000 = $0.20
Valuation Multiplier = 5.5x (medium company now)
Fair Value = $0.20 × 5.5 = $1.10 per share
```

Over the next few updates, the stock price will gradually move from $0.30 toward $1.10, not instantly.

### Scenario 3: Market Conditions Change

If market sentiment drops to **0.9** (bearish):

```
Adjusted Multiplier = 5.5 × 0.9 = 4.95x
Fair Value = $0.20 × 4.95 = $0.99 per share
```

The stock price will drift down even if the company balance stays the same.

### Scenario 4: Large Buy Order

A user buys **50,000 shares** (5% of total):

1. Transaction price impact: ~2% increase
2. Current price: $1.10 → $1.12
3. Fair value correction: 10% pull toward $1.10 → final price ~$1.11

## Database Bandwidth Optimization

The system is designed to minimize database queries:

1. **Batch Operations**: The cron job fetches all public companies and their accounts in one go
2. **Cached Balances**: Balance is stored directly on the `accounts` table, no ledger summation needed
3. **Efficient History**: Only last 90 days of price history is kept (automatic cleanup)
4. **Aggregated Queries**: Price history is aggregated to hourly intervals for charts
5. **Limited Queries**: Stock list views use batch fetching with Map-based lookups

## Schema Changes

### Companies Table

Added new field:

```typescript
marketSentiment: v.optional(v.number()); // 0.8 - 1.2, default 1.0
```

This field tracks market confidence for each company individually.

## How It Works In Practice

### Every 5 Minutes (Cron Job)

1. Fetch all public companies + their account balances (2 queries total)
2. For each company:
   - Update market sentiment (±2% random walk)
   - Calculate fair value based on balance and sentiment
   - Move current price 15% toward fair value + add ±1% noise
   - Record new price in history
3. Total: ~2-3 database operations per company

### On Stock Purchase/Sale

1. Execute the transaction (update balances)
2. Calculate transaction price impact (based on % of shares traded)
3. Apply fair value correction (10% pull toward fundamental value)
4. Update stock price
5. Record transaction in history

### IPO (Going Public)

When a company hits $50,000 balance:

1. Calculate fair IPO price (balance / shares × 5.0)
2. Set `isPublic = true`, `sharePrice = fairValue`, `marketSentiment = 1.0`
3. Record initial price in history

## Benefits

✅ **Realistic Valuations**: Companies with $200k balance might have $1M+ valuations  
✅ **Market Dynamics**: Prices fluctuate based on sentiment, not just trades  
✅ **Fundamental Anchor**: Prices can't deviate too far from company fundamentals  
✅ **Gradual Movement**: No instant jumps, prices trend over time  
✅ **Low Bandwidth**: Efficient batch operations and caching  
✅ **Scalable**: Works well even with many public companies

## Configuration

Key parameters you can adjust in `convex/stocks.ts`:

```typescript
// Base valuation multipliers by company size
valuationMultiplier = 3.0 - 7.0

// Market sentiment bounds
marketSentiment = 0.8 - 1.2 (±20%)

// Sentiment change per update
sentimentChange = ±2% per 5 minutes

// Price convergence rate
convergenceRate = 15% per update

// Market noise
marketNoise = ±1% per update

// Transaction impact
maxPriceChangePercent = 10% per transaction

// Fair value correction after trade
correctionFactor = 10%
```

## Future Enhancements

Possible additions:

- Company-specific events that affect sentiment
- Industry-wide sentiment shifts
- Dividend payments affecting stock price
- Stock splits for high-priced stocks
- Market-wide bull/bear cycles
- Trading volume affecting volatility
