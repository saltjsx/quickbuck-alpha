# Company Portfolio Feature - Quick Reference

**Date:** October 6, 2025  
**Status:** ✅ Active

## What's New?

Added a "Company Portfolios" tab to the Portfolio page to track stock investments made by your companies.

---

## Quick Overview

### Location

`Dashboard → Portfolio → Company Portfolios Tab`

### What You Can See

For each of your companies:

- Total portfolio value
- Total gain/loss
- Individual stock holdings
- Performance metrics per holding

---

## Features

### 1. Multi-Company View

View all your companies' portfolios in one place

### 2. Performance Tracking

- Green indicators for gains ↗
- Red indicators for losses ↘
- Percentage changes shown

### 3. Click-Through Navigation

Click any holding to view stock details and trade

### 4. Real-Time Updates

Portfolio values update automatically as stock prices change

---

## How to Use

### View Company Portfolios

1. Go to **Dashboard → Portfolio**
2. Click **Company Portfolios** tab
3. View all your companies' investments

### Manage Investments

1. Click on any stock holding
2. View stock details
3. Buy or sell shares from the company account

### Track Performance

- Check portfolio value for each company
- Monitor gains/losses
- Compare performance across companies

---

## UI Elements

### Company Section

```
┌────────────────────────────────────────┐
│ 🏢 Company Name (TICK)                 │
│                Portfolio Value: $X,XXX │
│                        +$XXX.XX ↗      │
├────────────────────────────────────────┤
│ Holdings (if any)                      │
└────────────────────────────────────────┘
```

### Holdings Display

```
🏢 Stock Name (TICK)
500 shares @ $10.50
        $5,500.00 +$250.00 (4.76%) ↗
```

---

## Empty States

### No Companies

```
No companies yet
Create a company to start investing!
[Create Company]
```

### No Investments

```
No investments yet
This company hasn't invested in any stocks
[Browse Stocks]
```

---

## Technical Details

### Data Source

- Uses existing `getHolderPortfolio` query
- Fetches portfolios for each company
- Calculates real-time metrics

### Performance

- Parallel queries for each company
- Optimized with existing indexes
- Progressive loading states

---

## Benefits

✅ Track all company investments in one place  
✅ Monitor investment performance  
✅ Compare strategies across companies  
✅ Quick access to stock details  
✅ Informed investment decisions

---

## Tips

💡 **Diversify**: Invest in multiple stocks per company  
💡 **Monitor**: Check regularly for performance updates  
💡 **Rebalance**: Adjust holdings based on performance  
💡 **Strategy**: Each company can have different investment strategies

---

**Version:** 1.0  
**File:** `app/routes/dashboard/portfolio.tsx`
