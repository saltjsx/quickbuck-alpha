# Stock Market System - Complete Implementation

## Overview

The QuickBuck stock market system is a fully-featured trading platform that simulates real market dynamics with price impact from large trades, automatic price fluctuations, and comprehensive tracking of ownership and transactions.

## Key Features

### 1. **Dynamic Price Impact System**

- Large purchases cause significant price increases
- Large sales cause significant price decreases
- Impact scales exponentially with trade size relative to total shares
- Small trades (< 1% of shares): 0.5-2% price impact
- Medium trades (1-5% of shares): 2-15% price impact
- Large trades (>5% of shares): 15%+ price impact with exponential scaling
- Maximum price change capped at 80% per trade

### 2. **Automated Market Updates**

- Stock prices update every 5 minutes automatically
- Simulates natural market movements with ±2% random fluctuations
- Price history tracked for charting and analytics
- Volume tracking for all trades

### 3. **Multi-Entity Trading**

- **Personal Investing**: Users can buy/sell stocks for themselves
- **Corporate Investing**: Companies can invest in other companies
- Ownership visualization shows all stakeholders
- Transfer stocks between users and companies

### 4. **Comprehensive Stock Pages**

#### Market Overview (`/dashboard/stocks`)

- **Market Tab**:
  - All publicly traded companies
  - Mini price charts showing 7-day trends
  - Real-time price with 24h change
  - Market cap display
  - Click any stock to view details
- **Portfolio Tab**:
  - Total portfolio value with gains/losses
  - Individual holdings with performance metrics
  - Click any holding to trade

#### Detailed Stock Page (`/dashboard/stocks/:companyId`)

- **Price Chart**: Interactive 7-day price history
- **Trading Interface**:
  - Buy/sell with account selection
  - Trade as personal or company
  - Real-time cost calculation
  - Price impact preview
- **Statistics Cards**:
  - Market capitalization
  - 24-hour trading volume
  - 7-day high/low prices
  - Current price with 24h change
- **Ownership Visualization**:
  - Founder's remaining shares
  - All shareholders ranked by ownership %
  - Shows both users and companies
  - Ownership percentages and share counts
- **Transaction History**:
  - Recent buy/sell/transfer activity
  - Timestamps and prices
  - Transaction types clearly marked

### 5. **Going Public**

- Companies automatically become public when balance exceeds $50,000
- 1 million shares issued at $0.01 initial price
- Ticker symbol required for each company

## Technical Implementation

### Database Schema

#### New Tables:

```typescript
stocks: {
  companyId: Id<"companies">,
  holderId: Id<"users"> | Id<"companies">,
  holderType: "user" | "company",
  shares: number,
  averagePurchasePrice: number,
  createdAt: number,
  updatedAt: number,
}

stockPriceHistory: {
  companyId: Id<"companies">,
  price: number,
  marketCap: number,
  volume: number,
  timestamp: number,
}

stockTransactions: {
  companyId: Id<"companies">,
  buyerId: Id<"users"> | Id<"companies">,
  buyerType: "user" | "company",
  shares: number,
  pricePerShare: number,
  totalAmount: number,
  transactionType: "buy" | "sell" | "transfer",
  fromId?: Id,
  toId?: Id,
  timestamp: number,
}
```

### Key Functions

#### Trading Functions:

- `buyStock()`: Purchase shares with dynamic pricing
- `sellStock()`: Sell shares with price impact
- `transferStock()`: Gift/transfer shares between entities

#### Query Functions:

- `getPortfolio()`: User's complete holdings with metrics
- `getAllPublicStocks()`: Market overview with charts
- `getStockDetails()`: Detailed company information
- `getCompanyShareholders()`: Ownership breakdown

#### Internal Functions:

- `updateStockPrices()`: Cron job for market simulation
- `calculateNewPrice()`: Price impact algorithm

### Price Impact Algorithm

```typescript
function calculateNewPrice(
  currentPrice: number,
  sharesBought: number,
  totalShares: number,
  isBuying: boolean
): number {
  const impactPercentage = (sharesBought / totalShares) * 100;

  let priceChangePercent = 0;
  if (impactPercentage < 1) {
    priceChangePercent = impactPercentage * 2;
  } else if (impactPercentage < 5) {
    priceChangePercent = 2 + (impactPercentage - 1) * 3.25;
  } else {
    priceChangePercent = 15 + Math.pow(impactPercentage - 5, 1.3);
  }

  priceChangePercent = Math.min(priceChangePercent, 80);
  const multiplier = isBuying
    ? 1 + priceChangePercent / 100
    : 1 - priceChangePercent / 100;

  return Math.max(0.01, currentPrice * multiplier);
}
```

## Market Dynamics

### Price Volatility

- **Organic Growth**: Companies become more valuable as they earn revenue
- **Market Manipulation**: Large investors can dramatically affect prices
- **Pump and Dump**: Possible to artificially inflate then crash prices
- **Strategic Investing**: Early investment in promising companies pays off
- **Risk Management**: Diversification important as stocks can crash

### Trading Strategies

#### For Investors:

1. **Early Entry**: Buy before company goes public
2. **Growth Investing**: Target companies with high revenue
3. **Momentum Trading**: Follow price trends
4. **Value Investing**: Buy undervalued companies
5. **Portfolio Diversification**: Spread risk across multiple stocks

#### For Companies:

1. **Strategic Acquisitions**: Buy controlling stakes in competitors
2. **Diversification**: Invest profits in other companies
3. **Market Making**: Provide liquidity by active trading
4. **Defensive Holdings**: Prevent hostile takeovers

### Economic Impact

- **Wealth Transfer**: Savvy traders can accumulate massive wealth
- **Company Power**: High stock price = more market influence
- **Investor Risk**: Large positions can lose value rapidly from sales
- **Market Cycles**: Natural boom/bust cycles emerge

## Usage Examples

### Buying Stock as a User

```typescript
await buyStock({
  companyId: "company123",
  shares: 100,
  fromAccountId: "personalAccount",
  buyerType: "user",
});
```

### Selling Stock

```typescript
await sellStock({
  companyId: "company123",
  shares: 50,
  toAccountId: "personalAccount",
  sellerType: "user",
});
```

### Corporate Investment

```typescript
await buyStock({
  companyId: "targetCompany",
  shares: 10000,
  fromAccountId: "companyAccount",
  buyerType: "company",
});
```

## Performance Metrics

### What's Tracked:

- **Current Value**: Real-time portfolio worth
- **Cost Basis**: Original investment amount
- **Gain/Loss**: Absolute and percentage returns
- **24h Change**: Short-term price movement
- **Market Cap**: Company total valuation
- **Volume**: Trading activity levels

### Visualizations:

- Line charts for price history
- Mini charts for market overview
- Ownership pie charts (conceptual)
- Transaction timelines

## Future Enhancements

Potential additions:

- Options/derivatives trading
- Limit orders and stop-losses
- Dividends paid to shareholders
- Stock splits
- IPO system for going public
- Short selling
- Margin trading
- Market maker bots
- Real-time WebSocket updates
- Advanced charting (candlesticks, etc.)
- Social trading features
- Leaderboards

## Best Practices

### For Developers:

1. Always validate share amounts > 0
2. Check account permissions for company trading
3. Use transactions for atomic operations
4. Cache frequently accessed data
5. Index all query patterns

### For Users:

1. Start with small positions
2. Research company financials
3. Monitor your portfolio regularly
4. Don't invest more than you can afford to lose
5. Diversify across multiple stocks

## Troubleshooting

### Common Issues:

**"Insufficient funds"**:

- Check account balance
- Remember cost = shares × current price
- Price may have increased since you checked

**"Insufficient shares"**:

- You're trying to sell more than you own
- Check your holdings in portfolio tab

**"Company not found"**:

- Company may have been deleted
- Or companyId is invalid

**"No access to this company"**:

- You need manager/owner role to trade as company
- Check company access permissions

## Cron Configuration

The stock market runs on a 5-minute update cycle:

```typescript
crons.interval(
  "update stock prices",
  { minutes: 5 },
  internal.stocks.updateStockPrices
);
```

This creates natural market movements and ensures prices don't stagnate.

## Security Considerations

- All trades require authentication
- Account ownership verified before trading
- Company access checked for corporate trades
- Minimum price floor of $0.01 prevents zeroing
- Maximum price impact prevents market manipulation
- Transaction history immutable for audit trail

---

**Built with**: Convex, React Router, TypeScript, Recharts, Tailwind CSS
