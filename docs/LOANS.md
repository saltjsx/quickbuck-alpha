# Loans System Documentation

## Overview

The Loans System allows players to take high-risk, high-interest loans to quickly access capital for their businesses. This feature adds a strategic risk/reward element to the game economy.

---

## Features

### Loan Terms

- **Maximum Loan Amount**: $500,000 (total across all active loans)
- **Interest Rate**: 5% per day (compound interest)
- **Repayment Period**: 7 days
- **Auto-Deduction**: After 7 days, the full loan amount (with interest) is automatically deducted from the player's account, even if it results in a negative balance
- **Net Worth Impact**: Active loans negatively impact the player's net worth calculation

### Key Mechanics

1. **Instant Disbursement**: Loans are deposited immediately into the player's personal account
2. **Daily Interest**: Interest compounds daily at 5% (applied by cron job at 2 AM UTC)
3. **Flexible Repayment**: Players can make partial or full repayments at any time
4. **Default Handling**: Overdue loans are automatically deducted, marking the loan as "defaulted"
5. **Credit Limit**: Total outstanding debt cannot exceed $500,000

---

## Implementation Details

### Database Schema

**Table: `loans`**

```typescript
{
  userId: Id<"users">,              // Loan owner
  accountId: Id<"accounts">,        // Personal account receiving funds
  principal: number,                // Original loan amount
  currentBalance: number,           // Current amount owed (principal + interest)
  interestRate: number,             // Daily interest rate (0.05 = 5%)
  daysRemaining: number,            // Days left to repay
  status: "active" | "repaid" | "defaulted",
  lastInterestApplied: number,      // Timestamp of last interest application
  dueDate: number,                  // Timestamp when loan must be repaid
  createdAt: number,                // Loan creation timestamp
  repaidAt?: number                 // Timestamp when loan was repaid/defaulted
}
```

**Indexes:**
- `by_user` - Query all loans for a user
- `by_user_status` - Query user's active/repaid/defaulted loans
- `by_status` - Query all loans by status
- `by_status_dueDate` - Query loans by status and due date (for cron processing)
- `by_lastInterestApplied` - Query loans needing interest application

---

## Backend Functions

### Queries

#### `getActiveLoans`
Returns all active loans for the authenticated user.

**Returns:**
```typescript
Loan[]
```

#### `getAllLoans`
Returns all loans (active, repaid, defaulted) for the authenticated user, limited to most recent 50.

**Returns:**
```typescript
Loan[]
```

#### `getTotalLoanDebt`
Returns the total outstanding debt (sum of all active loan balances) for the authenticated user.

**Returns:**
```typescript
number
```

---

### Mutations

#### `takeLoan`
Creates a new loan and deposits funds into the user's personal account.

**Arguments:**
```typescript
{
  amount: number  // Loan amount (1 - 500,000)
}
```

**Validation:**
- User must be authenticated
- User must have a personal account
- Loan amount must be positive
- Loan amount cannot exceed $500,000
- Total debt (existing + new) cannot exceed $500,000

**Process:**
1. Validates loan amount and credit limit
2. Creates loan record with 7-day due date
3. Transfers funds from System account to user's personal account
4. Records ledger transaction (`loan_disbursement`)

**Returns:**
```typescript
{
  success: boolean,
  loan: Loan,
  message: string
}
```

---

#### `repayLoan`
Makes a partial or full payment on an active loan.

**Arguments:**
```typescript
{
  loanId: Id<"loans">,
  amount: number
}
```

**Validation:**
- User must be authenticated
- Loan must exist and belong to the user
- Loan must be active
- Repayment amount must be positive
- User must have sufficient balance

**Process:**
1. Validates loan ownership and status
2. Calculates repayment amount (capped at current balance)
3. Transfers funds from user's account to System account
4. Records ledger transaction (`loan_repayment`)
5. Updates loan status:
   - If fully repaid → status = "repaid", repaidAt = now
   - If partially repaid → currentBalance reduced

**Returns:**
```typescript
{
  success: boolean,
  fullyRepaid: boolean,
  remainingBalance?: number,
  message: string
}
```

---

### Internal Mutations

#### `applyDailyInterest`
Cron job that applies compound interest to all active loans and processes defaults.

**Schedule:** Daily at 2:00 AM UTC

**Process:**
1. Queries all active loans
2. For each loan where >24 hours have passed since last interest application:
   - Calculates compound interest for days passed: `balance * (1 + rate)^days`
   - Updates `currentBalance` and `lastInterestApplied`
   - Decrements `daysRemaining`
3. For loans where `dueDate` has passed or `daysRemaining <= 0`:
   - Auto-deducts full loan balance from user's account (even if negative)
   - Transfers funds to System account
   - Records ledger transaction (`loan_default`)
   - Updates loan: status = "defaulted", currentBalance = 0, repaidAt = now

**Returns:**
```typescript
{
  totalLoans: number,    // Total active loans processed
  updated: number,       // Loans with interest applied
  defaulted: number,     // Loans automatically deducted
  timestamp: number
}
```

---

## Ledger Integration

The loans system integrates with the existing ledger table for transaction tracking:

**New Ledger Types:**
- `loan_disbursement` - Loan funds transferred from System to user
- `loan_repayment` - User repays loan (partial or full)
- `loan_default` - Automatic deduction of overdue loan

**Example Ledger Entry:**
```typescript
{
  fromAccountId: systemAccountId,
  toAccountId: personalAccountId,
  amount: 10000,
  type: "loan_disbursement",
  description: "Loan disbursement: $10,000",
  createdAt: 1697500000000
}
```

---

## Net Worth Calculation

The loans system impacts net worth calculation in `users.ts`:

**Updated Formula:**
```typescript
netWorth = cashBalance + portfolioValue + ownerEquityValue - totalLoanDebt
```

**Effect:**
- Active loans with $50,000 balance reduce net worth by $50,000
- Repaid/defaulted loans do not impact net worth
- This creates strategic tension: loans provide capital but hurt leaderboard position

---

## Frontend Components

### `LoansTab` Component

**Location:** `app/components/game/loans-tab.tsx`

**Features:**
1. **Warning Banner** - Highlights high-risk nature of loans with key terms
2. **Status Cards** - Shows available balance, total debt, available credit
3. **Take New Loan** - Form to request a new loan with projection calculator
4. **Active Loans** - Manages outstanding loans with repayment interface
5. **Loan History** - Shows all loans (active, repaid, defaulted) with status badges

**Loan Projection Calculator:**
- Calculates total interest over 7 days: `principal * (1.05)^7`
- Shows total amount to repay if loan runs full term
- Updates in real-time as user adjusts loan amount

**Repayment Interface:**
- Input field with validation
- "Max" button to set repayment to full balance
- Disabled if insufficient funds
- Shows overdue warning for late loans

---

## Route Configuration

**Route:** `/dashboard/loans`

**File:** `app/routes/dashboard/loans.tsx`

**Sidebar Navigation:**
- Icon: `IconCurrencyDollar` (dollar sign)
- Position: After "Gamble" in sidebar

---

## Interest Calculation Examples

### Example 1: Full-Term Loan
- Principal: $10,000
- Interest Rate: 5% daily
- Duration: 7 days

**Day-by-Day Breakdown:**
- Day 0: $10,000.00
- Day 1: $10,500.00 (10,000 × 1.05)
- Day 2: $11,025.00 (10,500 × 1.05)
- Day 3: $11,576.25
- Day 4: $12,155.06
- Day 5: $12,762.82
- Day 6: $13,400.96
- Day 7: $14,071.00 ← **Total to repay**

**Total Interest:** $4,071.00 (40.71% over 7 days)

---

### Example 2: Early Repayment
- Principal: $20,000
- Repaid after 3 days

**Calculation:**
- Day 0: $20,000.00
- Day 1: $21,000.00
- Day 2: $22,050.00
- Day 3: $23,152.50 ← **Repayment amount**

**Total Interest:** $3,152.50 (15.76% over 3 days)

---

### Example 3: Partial Repayment
- Principal: $50,000
- Partial repayment: $25,000 after 2 days

**Calculation:**
- Day 0: $50,000.00
- Day 1: $52,500.00
- Day 2: $55,125.00
- Repay: $25,000.00
- New balance: $30,125.00
- Day 3: $31,631.25
- ...continues for remaining days

---

## Risk/Reward Strategy

### High-Risk Scenarios
1. **Leveraged Stock Trading**: Loan → Buy undervalued stocks → Sell high → Repay early
2. **Company Bootstrapping**: Loan → Create company → Launch products → Generate revenue
3. **Market Timing**: Loan → Wait for market crash → Buy stocks cheap → Profit

### Risks
1. **Compound Interest**: 5% daily compounds to 40.71% over full term
2. **Forced Default**: Auto-deduction can put balance deeply negative
3. **Net Worth Hit**: Loans reduce leaderboard position until repaid
4. **Opportunity Cost**: Interest payments reduce overall profitability

---

## Cron Job Schedule

**Function:** `internal.loans.applyDailyInterest`

**Schedule:** Daily at 2:00 AM UTC

**Purpose:**
1. Apply compound interest to all active loans (>24 hours since last application)
2. Auto-deduct overdue loans (dueDate passed or daysRemaining ≤ 0)
3. Mark defaulted loans with status update

**Performance:**
- Uses `by_status` index to query only active loans
- Processes loans in batches
- Updates only loans that need interest (>1 day since last update)

---

## Testing Checklist

### Functional Tests
- [ ] Take loan with valid amount
- [ ] Reject loan exceeding max amount
- [ ] Reject loan exceeding credit limit (with existing debt)
- [ ] Make full loan repayment
- [ ] Make partial loan repayment
- [ ] Reject repayment with insufficient funds
- [ ] Verify interest compounds correctly (manual calculation)
- [ ] Verify loan auto-deduction on overdue (wait for cron or trigger manually)
- [ ] Verify negative balance after default
- [ ] Verify net worth calculation includes loan debt

### UI Tests
- [ ] Loan projection calculator updates in real-time
- [ ] Overdue loans show warning banner
- [ ] Repayment "Max" button sets correct amount
- [ ] Status badges show correct colors (active/repaid/defaulted)
- [ ] History shows all loans in reverse chronological order
- [ ] Loading states show during mutations
- [ ] Toast notifications show success/error messages

### Edge Cases
- [ ] Take loan with exact max amount ($500,000)
- [ ] Take loan with $0.01 (should reject - minimum not enforced but impractical)
- [ ] Repay loan with amount > balance (should cap at loan balance)
- [ ] Multiple loans reaching due date simultaneously
- [ ] Loan interest applied while user offline
- [ ] Defaulted loan with balance already negative

---

## Performance Considerations

### Indexes
- All loan queries use compound indexes for optimal performance
- `by_user_status` allows efficient filtering of user's active loans
- `by_status_dueDate` enables fast cron job processing of overdue loans

### Caching
- No caching implemented (loans change daily with interest)
- Consider adding cache for total debt if net worth queries become slow

### Scalability
- Cron job processes all active loans daily (potential bottleneck at scale)
- Consider pagination if >10,000 active loans
- Interest calculation is O(days_passed) per loan (acceptable for 1-7 days)

---

## Future Enhancements

### Potential Features
1. **Variable Interest Rates**: Based on user's credit score (repayment history)
2. **Longer Loan Terms**: 14-day or 30-day options with lower rates
3. **Loan Refinancing**: Consolidate multiple loans into one
4. **Collateral Loans**: Lower rates if backed by stocks or assets
5. **Interest-Only Payments**: Pay interest to delay principal repayment
6. **Loan Notifications**: Email/toast when loan is nearing due date
7. **Credit Score System**: Track repayment history, impact future rates
8. **Loan Marketplace**: Players can lend to each other for custom rates

### Analytics
- Track total loans issued
- Track total interest collected
- Track default rate
- Average loan size
- Most common use cases (via surveys or data analysis)

---

## Security Considerations

### Validation
- All monetary values validated to prevent negative loans
- User authentication required for all operations
- Loan ownership verified before repayment
- Balance checks prevent insufficient fund repayments

### Edge Cases Handled
- Concurrent loan requests (database transactions ensure consistency)
- Cron job idempotency (checks lastInterestApplied to avoid double-charging)
- Defaulted loans cannot be repaid (status check)
- System account always has sufficient funds for disbursements

---

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Total Active Loans**: Should not grow unbounded
2. **Default Rate**: % of loans that default vs repaid
3. **Average Loan Size**: Detect unusual patterns
4. **System Account Balance**: Should grow (interest income) or stay stable
5. **Negative User Balances**: Track users impacted by defaults

### Alerts
- Alert if cron job fails to run (interest not applied)
- Alert if System account balance drops unexpectedly
- Alert if default rate exceeds threshold (e.g., >20%)

---

## Related Documentation

- [AGENTS.md](./AGENTS.md) - Database optimization and indexing strategy
- [BANDWIDTH_OPTIMIZATION.md](./docs/BANDWIDTH_OPTIMIZATION.md) - Query performance
- [DICE_GAME.md](./DICE_GAME.md) - Similar gambling feature implementation

---

**Created:** October 15, 2025  
**Version:** 1.0  
**Author:** QuickBuck Development Team
