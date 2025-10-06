# Stock Transfer - Quick Reference

**Date:** October 6, 2025  
**Status:** ✅ Active

## What's New?

Added stock transfer functionality to the Transfers page! You can now transfer stock shares to other players or companies.

---

## Quick Access

**Location:** `Dashboard → Transactions → Stocks Tab`

---

## How to Transfer Stocks

### Step-by-Step

1. **Go to Transfers Page**

   - Dashboard → Transactions

2. **Select "Stocks" Tab**

   - Click the Stocks tab (📈 icon)

3. **Choose Stock to Transfer**

   - View your stock holdings
   - Click the stock you want to transfer

4. **Enter Number of Shares**

   - Type how many shares to transfer
   - Must be between 1 and your total shares

5. **Select Recipient Type**

   - Click "Player" to transfer to another user
   - Click "Company" to transfer to a company

6. **Search for Recipient**

   - Type name, username, or ticker
   - Click recipient from search results

7. **Review & Submit**
   - Check the transfer preview
   - Click "Transfer Shares"
   - See success confirmation!

---

## Two Transfer Types

### Money Transfers

💰 **Money Tab** - Transfer funds between accounts

- Personal to Company
- Company to User
- Company to Company

### Stock Transfers

📈 **Stocks Tab** - Transfer stock shares

- User to User (gift shares to friends)
- User to Company (corporate investments)
- Simple and fast!

---

## Features

### ✅ What You Can Do

- Transfer any stocks you own
- Choose how many shares to transfer
- Send to players or companies
- See real-time validation
- Preview before confirming
- Get instant confirmation

### 🛡️ Safety Features

- Can't transfer more than you own
- Balance checks before transfer
- Clear error messages
- Transaction logging
- Atomic operations (all or nothing)

---

## Use Cases

### Gift to Friends

```
Transfer 10 shares of AAPL to your friend
Perfect for rewards or celebrations
```

### Company Investment

```
Transfer 50 shares of TSLA to your company
Build corporate investment portfolio
```

### Portfolio Restructuring

```
Move shares between your entities
Optimize your investment strategy
```

---

## Interface Elements

### Stock Selection

```
┌────────────────────────────────┐
│ 🏢 Apple Inc (AAPL)           │
│ 100 shares @ $150.00          │
└────────────────────────────────┘
```

### Recipient Types

```
[👤 Player]  [🏢 Company]
```

### Transfer Preview

```
From: You (100 shares)
  →  50 shares (AAPL)
To: John Doe (@john)
```

---

## Validation Rules

| Rule                 | Limit             |
| -------------------- | ----------------- |
| **Minimum Shares**   | 1 share           |
| **Maximum Shares**   | Your total owned  |
| **Recipient Search** | 1-2 chars minimum |
| **Stock Selection**  | Must own shares   |

---

## Tips

💡 **Check Holdings**: View your stocks in Portfolio first  
💡 **Verify Recipient**: Double-check before submitting  
💡 **Start Small**: Test with small amounts first  
💡 **Keep Records**: Note important transfers  
💡 **Corporate Strategy**: Use for company portfolios

---

## Error Messages

| Message                         | Meaning                     |
| ------------------------------- | --------------------------- |
| "Please select a stock holding" | Choose a stock first        |
| "Please select a recipient"     | Search and pick recipient   |
| "Invalid number of shares"      | Enter positive number       |
| "Insufficient shares"           | Trying to transfer too many |

---

## Benefits

### For You

- ✅ Easy share gifting
- ✅ Flexible portfolio management
- ✅ Quick company investments
- ✅ Simple, intuitive interface

### For Gameplay

- ✅ Player-to-player trading
- ✅ Complex investment strategies
- ✅ Social interactions
- ✅ Corporate structures

---

## Examples

### Example 1: Gift to Friend

```
Stock: Apple Inc (AAPL)
Shares: 10 of 100
To: Jane Doe (Player)
Result: ✅ Transferred successfully
```

### Example 2: Company Investment

```
Stock: Tesla (TSLA)
Shares: 50 of 50 (all)
To: MyCorp (Company)
Result: ✅ Transferred successfully
```

---

## FAQ

**Q: Can I transfer to myself?**  
A: No, backend prevents self-transfers

**Q: Is there a fee?**  
A: No, transfers are free

**Q: Can I cancel?**  
A: No, transfers are final once submitted

**Q: Can I transfer fractional shares?**  
A: No, only whole shares (1, 2, 3...)

**Q: Do I need the recipient's permission?**  
A: No, transfers are immediate

---

## Related Pages

- **Portfolio**: View your stock holdings
- **Stock Market**: Buy stocks to transfer
- **Company Portfolios**: See company-owned shares
- **Transfers (Money)**: Transfer funds instead

---

## Summary

Transfer stocks easily between users and companies with the new Stocks tab on the Transfers page!

**Quick Link:** Dashboard → Transactions → Stocks Tab 📈

---

**Version:** 1.0  
**File:** `app/routes/dashboard/transactions.tsx`
