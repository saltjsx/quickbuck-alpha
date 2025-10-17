# Stock Pricing System - Simplified Balance-Based Model

## Overview

Complete rewrite of the stock pricing system to use a simplified, balance-driven model. The new system has two primary mechanisms:

1. **Automatic Price Adjustment** - Every 10 minutes, prices gradually move toward a target based on company balance
2. **Player Trade Impact** - Immediate price changes when players buy or sell shares

## Key Changes from Old System

### Before (Complex):
- Multiple factors: fair value, momentum, volatility, sentiment, volume ratios
- 5-minute update intervals
- Complex mathematical models with tanh functions, dampening curves
- IPO price = 5x balance
- Unpredictable price movements

### After (Simplified):
- Single primary factor: company balance
- 10-minute update intervals
- Simple linear adjustment toward target
- IPO price = 10x balance
- Predictable, transparent price movements

---

## 1. Initial Public Offering (IPO) Price

**When**: A company goes public when its balance exceeds $50,000

**Formula**:
```
Total Initial Market Value = Company Balance × 10
IPO Share Price = (Company Balance × 10) / 1,000,000 shares
```

**Example**:
- Company has $100,000 balance
- Total market value = $100,000 × 10 = $1,000,000
- Each company has exactly 1,000,000 shares
- IPO price = $1,000,000 / 1,000,000 = **$1.00 per share**

**Code Location**: `convex/companies.ts` - `checkAndUpdatePublicStatus()`

---

## 2. Automatic Price Adjustment (Every 10 Minutes)

**Purpose**: Gradually move stock prices toward a target that reflects the company's financial health (balance).

**Update Frequency**: Every 10 minutes (via cron job)

**Algorithm**:

```typescript
// Step 1: Calculate target price based on current balance
Target Price = (Company Balance × 10) / 1,000,000

// Step 2: Calculate difference between current and target
Price Difference = Target Price - Current Price

// Step 3: Adjust price by small percentage of difference
Adjustment = Price Difference × ADJUSTMENT_FACTOR
New Price = Current Price + Adjustment

// ADJUSTMENT_FACTOR = 0.03 (3% per update)
```

**Characteristics**:

- **Gradual Movement**: Only 3% of the gap is closed each update
- **Convergence**: Prices slowly converge toward balance-based target
- **Stability**: Large balance changes cause gradual price adjustments, not shocks
- **Floor**: Price never goes below $0.01

**Example Scenario**:

| Time | Balance | Target Price | Current Price | Adjustment | New Price |
|------|---------|--------------|---------------|------------|-----------|
| Start | $100,000 | $1.00 | $0.50 | +$0.015 | $0.515 |
| +10m | $100,000 | $1.00 | $0.515 | +$0.015 | $0.530 |
| +20m | $100,000 | $1.00 | $0.530 | +$0.014 | $0.544 |
| +30m | $120,000 | $1.20 | $0.544 | +$0.020 | $0.564 |

After balance increases to $120,000, the target jumps to $1.20, but the price adjusts gradually.

**Code Location**: `convex/stocks.ts` - `updateStockPrices()`

**Tuning Parameter**:
```typescript
const ADJUSTMENT_FACTOR = 0.03; // Range: 0.01 to 0.05
```
- **Lower (0.01)**: Very gradual, takes longer to reach target
- **Higher (0.05)**: Faster adjustments, more responsive to balance changes

---

## 3. Player Trade Impact

**Purpose**: Create immediate short-term price fluctuations when players buy or sell shares.

**When**: Triggered immediately upon buy/sell transaction

**Algorithm**:

```typescript
// Step 1: Calculate transaction value
Transaction Value = Number of Shares × Current Price

// Step 2: Calculate total market cap
Total Market Cap = Current Price × 1,000,000 shares

// Step 3: Calculate price change percentage
Price Change % = (Transaction Value / Total Market Cap) × IMPACT_MULTIPLIER

// Step 4: Apply change based on buy/sell direction
If BUYING:
  New Price = Current Price + (Current Price × Price Change %)
  
If SELLING:
  New Price = Current Price - (Current Price × Price Change %)

// IMPACT_MULTIPLIER = 0.15
```

**Characteristics**:

- **Proportional**: Larger transactions have bigger impact
- **Immediate**: Price changes instantly when trade executes
- **Market Cap Relative**: Impact depends on trade size relative to total company value
- **Bidirectional**: Buys increase price, sells decrease price

**Example Trade**:

Company:
- Current price: $1.00
- Total shares: 1,000,000
- Market cap: $1,000,000

Player buys 10,000 shares:
```
Transaction Value = 10,000 × $1.00 = $10,000
Price Change % = ($10,000 / $1,000,000) × 0.15 = 0.0015 (0.15%)
New Price = $1.00 + ($1.00 × 0.0015) = $1.0015
```

Player buys 100,000 shares:
```
Transaction Value = 100,000 × $1.00 = $100,000
Price Change % = ($100,000 / $1,000,000) × 0.15 = 0.015 (1.5%)
New Price = $1.00 + ($1.00 × 0.015) = $1.015
```

**Code Location**: `convex/stocks.ts` - `calculatePlayerTradeImpact()`

**Tuning Parameter**:
```typescript
const IMPACT_MULTIPLIER = 0.15; // Higher = bigger price swings
```
- **Lower (0.05)**: More stable, less volatile
- **Higher (0.30)**: More volatile, bigger swings from trades

---

## 4. How the Two Mechanisms Work Together

### Baseline + Fluctuations Model

**Automatic Adjustment (10-minute baseline)**:
- Acts as the "anchor" or fundamental value
- Always pulling price toward balance-based target
- Provides long-term price direction

**Player Trades (immediate fluctuations)**:
- Create short-term volatility around the baseline
- Reflect supply/demand in real-time
- Prices fluctuate but always return toward balance-based target

### Example Timeline:

```
Time 0:00  - Balance: $100,000, Target: $1.00, Price: $1.00
Time 0:05  - Player buys 50,000 shares → Price: $1.0075
Time 0:08  - Player sells 30,000 shares → Price: $1.0030
Time 0:10  - [AUTO UPDATE] Price adjusts toward $1.00 → Price: $1.0029
Time 0:15  - Player buys 20,000 shares → Price: $1.0059
Time 0:20  - [AUTO UPDATE] Price adjusts toward $1.00 → Price: $1.0057
Time 0:25  - Balance increases to $150,000, Target now: $1.50
Time 0:30  - [AUTO UPDATE] Price adjusts toward $1.50 → Price: $1.0205
Time 0:40  - [AUTO UPDATE] Price adjusts toward $1.50 → Price: $1.0350
```

### Visual Representation:

```
Price
  │
$1.50 ┼─────────────────Target (after balance increase)
  │                     ╱
$1.20 ┼                ╱
  │               ╱
$1.10 ┼          ╱
  │        ╱  ← Price gradually moves up
$1.00 ┼───◊──◊◊◊◊  ← Small fluctuations from player trades
  │
$0.90 ┼
  │
      └─────────────────────────────────────> Time
      0    10   20   30   40   50   60 (minutes)
```

---

## Configuration Parameters

### Adjustable Constants

**Location**: `convex/stocks.ts`

```typescript
// Automatic price adjustment speed (0.01 to 0.05 recommended)
const ADJUSTMENT_FACTOR = 0.03;

// Player trade price impact sensitivity
const IMPACT_MULTIPLIER = 0.15;
```

**Location**: `convex/crons.ts`

```typescript
// How often automatic adjustments occur
crons.interval("update stock prices", { minutes: 10 }, ...);
```

### Tuning Guide

**For More Stability:**
- Decrease `ADJUSTMENT_FACTOR` to 0.01-0.02
- Decrease `IMPACT_MULTIPLIER` to 0.05-0.10
- Increase update interval to 15-20 minutes

**For More Volatility:**
- Increase `ADJUSTMENT_FACTOR` to 0.04-0.05
- Increase `IMPACT_MULTIPLIER` to 0.20-0.30
- Decrease update interval to 5 minutes

**For Faster Balance Response:**
- Increase `ADJUSTMENT_FACTOR` to 0.05
- Keep other settings moderate

---

## Benefits of New System

### 1. Transparency
- Players can understand why prices move
- Clear relationship between company success and stock price
- Predictable price targets

### 2. Simplicity
- Easy to explain and understand
- Fewer moving parts, less bugs
- Easier to balance and tune

### 3. Balance-Driven
- Stock prices directly reflect company financial health
- Profitable companies → higher balances → higher stock prices
- Aligns incentives correctly

### 4. Player Agency
- Players still affect prices through trading
- Large trades have visible impact
- Market manipulation is still possible but transparent

### 5. Performance
- Much simpler calculations
- No complex historical analysis required
- Faster execution, less database reads

---

## Anti-Exploit Measures

The system maintains all existing anti-exploit protections:

1. **Rate Limiting**: Max 3 trades per 5 seconds
2. **Minimum Trade Size**: 0.01% of total shares (for companies with >1000 shares)
3. **Ownership Cap**: Cannot exceed 100% ownership across all accounts
4. **Price Floor**: Minimum $0.01 per share

---

## Testing Recommendations

### Test Case 1: IPO Pricing
1. Create company with $100,000 balance
2. Wait for it to go public
3. Verify IPO price = $1.00

### Test Case 2: Automatic Adjustment
1. Company at $1.00 price with $100,000 balance
2. Add $50,000 to balance (now $150,000)
3. Wait for 10-minute update
4. Price should increase toward $1.50 (new target)
5. Verify increase is ~3% of gap: $1.00 + ($0.50 × 0.03) = $1.015

### Test Case 3: Player Buy Impact
1. Company at $1.00 price, 1M shares
2. Player buys 50,000 shares
3. Transaction value = $50,000
4. Market cap = $1,000,000
5. Expected change = ($50,000 / $1,000,000) × 0.15 = 0.75%
6. New price ≈ $1.0075

### Test Case 4: Player Sell Impact
1. Company at $1.00 price, 1M shares
2. Player sells 30,000 shares
3. Transaction value = $30,000
4. Expected change = -($30,000 / $1,000,000) × 0.15 = -0.45%
5. New price ≈ $0.9955

### Test Case 5: Combined Effects
1. Start: Price $1.00, Balance $100,000
2. Player buys → Price increases slightly
3. Wait 10 min → Auto adjustment pulls back toward $1.00
4. Increase balance to $200,000
5. Wait 10 min → Price starts moving toward $2.00
6. Verify gradual convergence over multiple updates

---

## Migration Notes

### Removed Features:
- ❌ Market sentiment tracking
- ❌ Momentum calculations
- ❌ Volatility analysis
- ❌ Complex fair value formulas
- ❌ Volume ratio calculations
- ❌ Directional flow metrics

### Retained Features:
- ✅ IPO process (improved formula)
- ✅ Player trade impact (simplified)
- ✅ Price history tracking
- ✅ Rate limiting
- ✅ Ownership validation
- ✅ Anti-exploit measures

### Database Schema:
- **No changes required** - All existing fields still used
- `marketSentiment` field now unused but kept for potential future use
- `stockPriceHistory` continues tracking all price changes

---

## Future Enhancements (Optional)

Possible additions while keeping the core simplicity:

1. **Volume Multiplier**: Increase `IMPACT_MULTIPLIER` during high trading volume
2. **Momentum Factor**: Add small momentum bonus to ADJUSTMENT_FACTOR when balance is consistently growing
3. **Volatility Damping**: Reduce `IMPACT_MULTIPLIER` for stable companies
4. **Market Hours**: Different adjustment rates during "market open" vs "after hours"
5. **News Events**: Temporary multipliers triggered by major company events

---

**Implemented**: October 17, 2025  
**Version**: 4.0 (Complete Rewrite)  
**Author**: Balance-Based Pricing System
