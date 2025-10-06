# QuickBuck Testing Guide

## Manual Testing Checklist

### ✅ Phase 1: Account Setup (2 minutes)

- [ ] Navigate to `/dashboard/game`
- [ ] Page loads without errors
- [ ] Dashboard shows "Net Worth: $0.00"
- [ ] "Accounts" tab shows empty or personal account
- [ ] Click "Initialize Account" (if needed)
- [ ] Personal account appears with $10,000.00
- [ ] Dashboard updates to show "Cash Balance: $10,000.00"

### ✅ Phase 2: Company Creation (3 minutes)

- [ ] Click "My Companies" tab
- [ ] Click "Create Company" button
- [ ] Dialog opens with form
- [ ] Enter company name: "Test Company Inc."
- [ ] Enter description: "A test company"
- [ ] Click "Create Company"
- [ ] Dialog closes
- [ ] New company appears in list
- [ ] Company shows $0.00 balance
- [ ] Company status shows "Private" badge
- [ ] Company role shows "Owner" badge

### ✅ Phase 3: Product Creation (5 minutes)

- [ ] In "My Companies" tab, find your company
- [ ] Click "Add Product" button
- [ ] Dialog opens with product form
- [ ] Fill in product details:
  - Name: "Test Widget"
  - Description: "A test product"
  - Price: 99.99
  - Tags: "test, electronics"
- [ ] Click "Create Product"
- [ ] Dialog closes
- [ ] Switch to "Marketplace" tab
- [ ] Your product appears in grid
- [ ] Product shows correct name, price, and tags
- [ ] Product shows "0 sales" initially

### ✅ Phase 4: Multiple Products (5 minutes)

Create 4 more products with different prices:

- [ ] Product 2: "Gadget Pro" @ $149.99
- [ ] Product 3: "Smart Device" @ $79.99
- [ ] Product 4: "Tech Tool" @ $199.99
- [ ] Product 5: "Innovation X" @ $124.99
- [ ] All 5 products visible in marketplace
- [ ] All show correct prices and details

### ✅ Phase 5: Automatic Purchases (10 minutes)

**Wait 2 minutes for first purchase cycle**

- [ ] Note current time: **\_\_**
- [ ] Wait until 2 minutes pass
- [ ] Check "Marketplace" tab
- [ ] One or more products show increased sales count
- [ ] Switch to "My Companies" tab
- [ ] Company balance increased from $0.00
- [ ] Balance shows profit (price - production cost)
- [ ] Switch to "Accounts" tab
- [ ] Company account shows same balance

**Verify Transaction Math:**

```
Example calculation:
Product Price: $99.99
Expected Cost: ~$45-$67 (45-67% of price)
Expected Profit: ~$33-$55 per sale
```

### ✅ Phase 6: Balance Growth (20 minutes)

**Monitor balance growth over multiple purchase cycles**

| Time | Sales | Balance  | Notes        |
| ---- | ----- | -------- | ------------ |
| 0:00 | 0     | $0.00    | Initial      |
| 2:00 | 1-2   | $50-150  | First cycle  |
| 4:00 | 3-5   | $150-400 | Second cycle |
| 6:00 | 5-8   | $300-700 | Third cycle  |

- [ ] Balance increases with each cycle
- [ ] Multiple products getting purchased
- [ ] Sales count increments correctly
- [ ] No negative balances

### ✅ Phase 7: Multiple Companies (5 minutes)

- [ ] Create second company: "Fashion Co"
- [ ] Add 3 products to second company
- [ ] Both companies appear in "My Companies"
- [ ] Both companies earn independently
- [ ] "Accounts" tab shows both accounts
- [ ] Total cash balance updates correctly

### ✅ Phase 8: Public Listing (Simulated)

**Note: This requires $50,000 balance - can test with modified threshold**

To test quickly, temporarily modify `/convex/products.ts`:

```typescript
// Change from:
if (balance > 50000 && !company.isPublic) {
// To:
if (balance > 500 && !company.isPublic) {
```

- [ ] Wait for company to reach $500 (modified threshold)
- [ ] Company badge changes from "Private" to "Public"
- [ ] Company appears in "Stock Market" tab
- [ ] Share price displayed ($0.01)
- [ ] Company value shown

### ✅ Phase 9: Stock Market (After Public Listing)

- [ ] Go to "Stock Market" tab
- [ ] Click "Market" sub-tab
- [ ] Public company listed
- [ ] Shows company name, owner, value
- [ ] Shows share price

### ✅ Phase 10: Portfolio (Future Feature)

**Note: Buy/Sell stock functionality can be added**

- [ ] Portfolio tab exists
- [ ] Shows "No holdings yet" message

## 🔍 Automated Test Scenarios

### Scenario 1: Ledger Accuracy

```javascript
// Pseudo-test
1. Get initial balance: B0
2. Record transaction of +$X
3. Get new balance: B1
4. Assert: B1 === B0 + X
```

### Scenario 2: Production Cost Range

```javascript
// Verify production costs
1. Record product price: P
2. Record production cost: C
3. Assert: C >= P * 0.23
4. Assert: C <= P * 0.67
```

### Scenario 3: Purchase Budget

```javascript
// Verify purchase budget
1. Track total purchases in cycle
2. Assert: total >= $30000
3. Assert: total <= $5000
```

## 🐛 Known Issues to Test

### Issue 1: Race Conditions

- [ ] Multiple users creating companies simultaneously
- [ ] Multiple products purchased at exact same time
- [ ] Balance calculation during concurrent transactions

### Issue 2: Negative Balances

- [ ] Cannot transfer more than available balance
- [ ] Cannot buy stocks with insufficient funds
- [ ] Production costs never exceed sale price

### Issue 3: Public Listing Edge Cases

- [ ] Company at exactly $50,000
- [ ] Company drops below $50,000 after going public
- [ ] Multiple companies reaching $50K simultaneously

## 📊 Performance Tests

### Load Test 1: Many Products

- [ ] Create 100 products across 10 companies
- [ ] Marketplace renders without lag
- [ ] Purchase cycle completes in reasonable time
- [ ] All products visible and scrollable

### Load Test 2: Many Transactions

- [ ] Generate 1,000 transactions
- [ ] Balance calculation remains fast
- [ ] Transaction history loads quickly
- [ ] No timeout errors

### Load Test 3: Real-time Updates

- [ ] Open game in two browser windows
- [ ] Make change in window 1
- [ ] Verify update appears in window 2
- [ ] Response time < 1 second

## 🔐 Security Tests

### Test 1: Account Access

- [ ] Cannot view other users' accounts
- [ ] Cannot transfer from other users' accounts
- [ ] Cannot modify other users' products

### Test 2: Company Access

- [ ] Cannot add products to other companies
- [ ] Cannot grant access to other companies
- [ ] Owner permissions work correctly

### Test 3: Input Validation

- [ ] Cannot create product with negative price
- [ ] Cannot transfer negative amounts
- [ ] Cannot create empty company name

## 📝 Test Results Template

```markdown
## Test Session: [Date]

### Tester: [Name]

### Environment: [Local/Staging/Production]

### Browser: [Chrome/Firefox/Safari]

### Results Summary

- Tests Passed: \_\_/50
- Tests Failed: \_\_/50
- Tests Skipped: \_\_/50

### Critical Issues

1. [Description]
2. [Description]

### Minor Issues

1. [Description]
2. [Description]

### Suggestions

1. [Improvement]
2. [Improvement]

### Notes

[Additional observations]
```

## 🎯 Quick Smoke Test (5 minutes)

**Before every deployment:**

- [ ] Load game page
- [ ] Create company
- [ ] Add product
- [ ] Wait 2 minutes
- [ ] Verify sale occurred
- [ ] Check balance updated

## 🔧 Debug Commands

### Check Convex Dashboard

```
Visit: https://dashboard.convex.dev/d/laudable-clam-629
- View tables: ledger, accounts, products, companies
- Check data integrity
- Monitor function calls
```

### Browser Console Checks

```javascript
// Check for errors
console.clear();
// Reload page and watch for errors

// Check Convex connection
// Should see WebSocket connection in Network tab
```

### Check Cron Job

```
In Convex Dashboard:
1. Go to Functions
2. Find "automatic product purchases"
3. Check last run time
4. View execution logs
```

## 📞 When to Report Issues

### Critical (Report Immediately)

- Application crashes
- Cannot create accounts
- Money disappears
- Transactions fail silently

### High Priority (Report within 24h)

- Public listing not working
- Stock purchases fail
- Balance calculations wrong
- Real-time updates delayed

### Medium Priority (Report within week)

- UI rendering issues
- Slow performance
- Minor calculation errors
- Missing data in views

### Low Priority (Report when convenient)

- UI polish needed
- Feature requests
- Documentation errors
- Minor bugs

---

**Happy Testing! 🧪**

Report issues to: [Your GitHub Issues Page]
