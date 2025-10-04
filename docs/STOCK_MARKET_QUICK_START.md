# 🚀 Stock Market Quick Start

## What's New?

A fully functional stock market where:

- **Buy/Sell shares** of public companies
- **Prices change dramatically** based on trade size
- **Companies can invest** in other companies
- **Automatic price updates** every 5 minutes
- **Beautiful charts and visualizations**

## Getting Started

### 1. Create a Company (if you haven't)

- Go to `/dashboard/companies`
- Click "Create Company"
- Fill in details including **ticker symbol** (e.g., "ACME")
- Build your company balance to $50,000

### 2. Company Goes Public

- When balance hits $50,000, company automatically becomes public
- 1 million shares issued at $0.01 each
- Now appears on the stock market

### 3. Start Trading

- Go to `/dashboard/stocks`
- See all public companies
- Click any stock for details
- Buy or sell shares

## Example Scenarios

### Scenario 1: Early Investor 🎯

```
1. Find new public company at $0.01/share
2. Buy 10,000 shares = $100
3. Wait for company to grow
4. Price rises to $5.00/share
5. Your investment now worth $50,000!
6. 50,000% return! 🚀
```

### Scenario 2: Market Manipulation 📈

```
1. Company XYZ trading at $1.00
2. You buy 100,000 shares (10% of supply)
3. Price rockets to $3.50 (+250%)
4. Other investors see gains, start buying
5. Price hits $5.00
6. You sell all shares
7. Price crashes to $1.50
8. You made $400,000 profit
9. Latecomers lost money 💸
```

### Scenario 3: Corporate Empire 🏢

```
1. Your company "TechCo" has $500k balance
2. You spot competitor "StartupX" at $0.50/share
3. Buy 600,000 shares (60% ownership)
4. Now control StartupX
5. Use their products to boost your company
6. Both companies grow
7. Your stake appreciates
```

## Price Impact Examples

| Shares Bought | % of Supply | Price Impact |
| ------------- | ----------- | ------------ |
| 100           | 0.01%       | +0.02%       |
| 1,000         | 0.1%        | +0.2%        |
| 10,000        | 1%          | +2%          |
| 50,000        | 5%          | +15%         |
| 100,000       | 10%         | +35%         |
| 500,000       | 50%         | +80% (max)   |

**Same percentages for selling, but price decreases!**

## Navigation

- `/dashboard/stocks` - Market overview & your portfolio
- `/dashboard/stocks/[companyId]` - Detailed stock page with trading

## Key Features on Stock Pages

### Market Overview:

- ✅ All public stocks listed
- ✅ Mini 7-day price charts
- ✅ Current price & 24h change (green ↑ or red ↓)
- ✅ Market capitalization
- ✅ Click any stock to trade

### Your Portfolio:

- ✅ Total portfolio value
- ✅ Total gains/losses
- ✅ All your holdings
- ✅ Individual P&L for each stock

### Stock Detail Page:

- ✅ Large interactive price chart
- ✅ Buy/Sell interface
- ✅ Select personal or company account
- ✅ Trade as yourself or your company
- ✅ Real-time cost calculation
- ✅ Market stats (cap, volume, high/low)
- ✅ Ownership breakdown
- ✅ Recent transaction history

## Pro Tips

1. **Buy early** - New public companies start at $0.01
2. **Watch the charts** - Trends show momentum
3. **Diversify** - Don't bet everything on one stock
4. **Company investing** - Use company funds for bigger plays
5. **Price impact** - Large trades move markets significantly
6. **Volume matters** - High volume = liquid market
7. **Monitor ownership** - Who else is buying?

## Warning Signs 🚨

- Price drops > 50% in one trade = someone dumping
- No recent transactions = low liquidity
- Founder owns < 20% = risky
- High volume with flat price = manipulation

## Testing Your Setup

1. **Create test company** with $100k balance
2. **Go to stocks page** - should see it listed
3. **Click the stock** - should open detail page
4. **Try buying 100 shares** - should succeed
5. **Check price increased** slightly
6. **View portfolio tab** - should show your holding
7. **Try selling shares** - should work
8. **Wait 5 minutes** - price should fluctuate slightly

## Troubleshooting

### "Company not found"

- Company isn't public yet (needs $50k+ balance)
- Check `/dashboard/companies` to build balance

### "Insufficient funds"

- Check your account balance
- Remember: cost = shares × current price
- Price may have gone up since you checked

### "Insufficient shares"

- You're trying to sell more than you own
- Check holdings in portfolio tab

### "No access to this company"

- For corporate trading, you need manager/owner role
- Make sure you selected the right account type

### Charts not showing

- Need at least a few price history points
- Wait 5-10 minutes for cron to run
- Or make some trades to generate history

## What Happens Automatically

Every 5 minutes, the system:

1. ✅ Gets all public companies
2. ✅ Applies random ±2% price change
3. ✅ Records new price in history
4. ✅ Updates charts
5. ✅ Simulates natural market movement

## Files to Check

If something's not working:

- `convex/stocks.ts` - All trading logic
- `convex/crons.ts` - Automatic updates
- `convex/schema.ts` - Database structure
- `app/routes/dashboard/stocks.tsx` - Market UI
- `app/routes/dashboard/stocks.$companyId.tsx` - Trading UI

## Success Metrics

Your stock market is working if:

- ✅ Companies appear on market after $50k
- ✅ Can buy shares successfully
- ✅ Price increases with large buys
- ✅ Price decreases with large sells
- ✅ Portfolio shows accurate P&L
- ✅ Charts display price history
- ✅ Ownership shows all stakeholders
- ✅ Transactions appear in history
- ✅ Prices fluctuate every 5 minutes

## Have Fun!

The stock market is now live! You can:

- 📈 Build your investment portfolio
- 💰 Make (or lose) fortunes
- 🏢 Create corporate conglomerates
- 📊 Watch market dynamics unfold
- 🎮 Enjoy a fully simulated economy

**Remember**: This is a game economy, so manipulation, pump-and-dumps, and wild speculation are all part of the fun! 🎉

---

Need help? Check:

- `STOCK_MARKET_SYSTEM.md` - Complete technical documentation
- `STOCK_MARKET_COMPLETE.md` - Implementation summary
