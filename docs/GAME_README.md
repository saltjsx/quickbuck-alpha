# QuickBuck Finance Game

QuickBuck is a real-time multiplayer finance simulation game built into this application. Players can create companies, sell products, trade stocks, and compete to build financial empires.

## Game Features

### 🏦 Bank Account System

- Every player starts with a personal bank account containing **$10,000**
- All transactions use a **ledger system** for accurate balance tracking
- View real-time balances for all your accounts

### 🏢 Company Management

- **Create unlimited companies** with separate bank accounts
- **Grant access** to other players to manage your companies
- Companies become **publicly traded** when they reach **$50,000** in balance
- Transfer money between accounts and players

### 🛍️ Product Marketplace

- **List products** for your companies with:
  - Product name and description
  - Custom pricing
  - Image links
  - Tags for categorization
- **Automatic purchases** every 2 minutes:
  - Random products are purchased by the system
  - Spending ranges from **$3,000 to $5,000** per cycle
  - Production costs are randomly calculated between **23%-67%** of selling price
  - Net profit goes to the company account

### 📈 Stock Market

- **Invest in public companies** (those with $50K+ balance)
- Buy and sell shares at current market prices
- Track your portfolio performance with:
  - Current value
  - Cost basis
  - Gain/loss percentage
- View real-time company valuations

## How to Play

### 1. Initialize Your Account

When you first access the game, your personal account is automatically created with $10,000.

### 2. Create a Company

1. Go to the "My Companies" tab
2. Click "Create Company"
3. Enter company name and description
4. Your company starts with a separate bank account (initially $0)

### 3. List Products

1. Select one of your companies
2. Click "Add Product"
3. Fill in product details:
   - Name and description
   - Price (in USD)
   - Image URL (optional)
   - Tags (comma-separated)

### 4. Make Money

- Products are automatically purchased every 2 minutes
- The system randomly selects products to buy (budget: $3,000-$5,000)
- Your company receives the sale price minus production costs
- Watch your company balance grow!

### 5. Go Public

- Once your company reaches $50,000, it's automatically listed on the stock market
- Other players can now invest in your company
- Share price is determined by company valuation

### 6. Invest in Stocks

- Browse public companies in the "Stock Market" tab
- Purchase shares from your personal account
- Sell shares for profit (or loss!)
- Track your portfolio performance

## Game Mechanics

### Ledger System

All financial transactions are recorded in a central ledger:

- **Transfers**: Money moved between accounts
- **Product Purchases**: Revenue from product sales
- **Production Costs**: Costs deducted from sales
- **Stock Purchases**: Investment transactions
- **Stock Sales**: Returns from selling shares

Account balances are calculated in real-time by:

```
Balance = Sum(Incoming Transactions) - Sum(Outgoing Transactions)
```

### Automatic Product Purchases

Every 2 minutes:

1. System has a budget of $3,000-$5,000 (random)
2. Randomly selects active products to purchase
3. Calculates production cost (23-67% of price)
4. Credits company with (selling price - production cost)
5. Updates product sales statistics
6. Checks if company should go public

### Stock Market Mechanics

- Companies with $50K+ balance are automatically listed
- Initial share price: $0.01
- Total shares: 1,000,000 per company
- Share price updates based on company performance
- Players track portfolio with gain/loss metrics

## Strategy Tips

1. **Price Your Products Competitively**: Higher prices mean more profit per sale, but you need to be selected by the random purchase system
2. **Diversify Your Portfolio**: Create multiple companies and list various products
3. **Invest Early**: Buy stocks in promising companies before they explode
4. **Manage Cash Flow**: Keep enough cash for investments while growing your companies
5. **Collaborate**: Grant company access to trusted players to manage together

## Live Updates

The game features real-time updates powered by Convex:

- Account balances update instantly
- Product sales reflect immediately
- Stock prices update in real-time
- New public companies appear automatically

## Technical Stack

- **Frontend**: React Router v7, shadcn/ui components
- **Backend**: Convex (real-time database)
- **Authentication**: Clerk
- **Styling**: TailwindCSS v4

## Future Enhancements

Potential features for future versions:

- [ ] Player-to-player trading
- [ ] Company dividends
- [ ] Market analytics and charts
- [ ] Leaderboards
- [ ] Company mergers and acquisitions
- [ ] Loan system
- [ ] Tax system
- [ ] Product categories and filters
- [ ] Company upgrades and bonuses

Enjoy building your financial empire in QuickBuck! 🚀💰
