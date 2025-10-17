import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const MAX_LOAN_AMOUNT = 500_000_000;
const DAILY_INTEREST_RATE = 0.05; // 5% daily
const LOAN_DURATION_DAYS = 7;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Helper to get personal account
async function getPersonalAccount(ctx: any, userId: string) {
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_owner_type", (q: any) =>
      q.eq("ownerId", userId).eq("type", "personal")
    )
    .first();

  if (!account) {
    throw new Error("Personal account not found. Create one first.");
  }

  return account;
}

// Helper to get system account
async function getSystemAccount(ctx: any) {
  let systemAccount = await ctx.db
    .query("accounts")
    .withIndex("by_name", (q: any) => q.eq("name", "System"))
    .first();

  if (!systemAccount) {
    // Get or create a designated system user (not a real player)
    let systemUser = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("name"), "System"))
      .first();
    
    if (!systemUser) {
      const systemUserId = await ctx.db.insert("users", {
        name: "System",
        email: "system@quickbuck.internal",
        tokenIdentifier: "system-internal-account",
      });
      systemUser = await ctx.db.get(systemUserId);
    }

    const systemAccountId = await ctx.db.insert("accounts", {
      name: "System",
      type: "personal" as const,
      ownerId: systemUser._id,
      balance: Number.MAX_SAFE_INTEGER,
      createdAt: Date.now(),
    });
    
    systemAccount = await ctx.db.get(systemAccountId);
  }

  return systemAccount;
}

// Helper to record ledger transaction
async function recordLedger(
  ctx: any,
  fromAccountId: any,
  toAccountId: any,
  amount: number,
  type: string,
  description?: string
) {
  await ctx.db.insert("ledger", {
    fromAccountId,
    toAccountId,
    amount,
    type,
    description,
    createdAt: Date.now(),
  });
}

// Helper to update account balance
async function updateAccountBalance(
  ctx: any,
  accountId: any,
  delta: number
) {
  const account = await ctx.db.get(accountId);
  if (!account) throw new Error("Account not found");

  const newBalance = (account.balance ?? 0) + delta;
  await ctx.db.patch(accountId, { balance: newBalance });

  return newBalance;
}

// Get active loans for a user
export const getActiveLoans = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return [];

    const loans = await ctx.db
      .query("loans")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .collect();

    return loans;
  },
});

// Get all loans (including repaid and defaulted)
export const getAllLoans = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return [];

    const loans = await ctx.db
      .query("loans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    return loans;
  },
});

// Get total loan debt (for net worth calculation)
export const getTotalLoanDebt = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return 0;

    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .collect();

    return activeLoans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  },
});

// Take out a new loan
export const takeLoan = mutation({
  args: {
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    // Validate loan amount
    if (args.amount <= 0) {
      throw new Error("Loan amount must be positive");
    }

    if (args.amount > MAX_LOAN_AMOUNT) {
      throw new Error(`Maximum loan amount is $${MAX_LOAN_AMOUNT.toLocaleString()}`);
    }

    // Check for existing active loans
    const existingLoans = await ctx.db
      .query("loans")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .collect();

    const totalDebt = existingLoans.reduce(
      (sum, loan) => sum + loan.currentBalance,
      0
    );

    if (totalDebt + args.amount > MAX_LOAN_AMOUNT) {
      throw new Error(
        `Total debt would exceed $${MAX_LOAN_AMOUNT.toLocaleString()}. Current debt: $${totalDebt.toLocaleString()}`
      );
    }

    // Get accounts
    const personalAccount = await getPersonalAccount(ctx, user._id);
    const systemAccount = await getSystemAccount(ctx);

    const now = Date.now();
    const dueDate = now + LOAN_DURATION_DAYS * ONE_DAY_MS;

    // Create loan record
    const loanId = await ctx.db.insert("loans", {
      userId: user._id,
      accountId: personalAccount._id,
      principal: args.amount,
      currentBalance: args.amount,
      interestRate: DAILY_INTEREST_RATE,
      daysRemaining: LOAN_DURATION_DAYS,
      status: "active",
      lastInterestApplied: now,
      dueDate,
      createdAt: now,
    });

    // Transfer funds from system to user
    await updateAccountBalance(ctx, systemAccount._id, -args.amount);
    await updateAccountBalance(ctx, personalAccount._id, args.amount);

    // Record transaction
    await recordLedger(
      ctx,
      systemAccount._id,
      personalAccount._id,
      args.amount,
      "loan_disbursement",
      `Loan disbursement: $${args.amount.toLocaleString()}`
    );

    const loan = await ctx.db.get(loanId);

    return {
      success: true,
      loan,
      message: `Loan of $${args.amount.toLocaleString()} approved! Due in ${LOAN_DURATION_DAYS} days at ${DAILY_INTEREST_RATE * 100}% daily interest.`,
    };
  },
});

// Repay a loan (full or partial)
export const repayLoan = mutation({
  args: {
    loanId: v.id("loans"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Loan not found");

    if (loan.userId !== user._id) {
      throw new Error("This loan does not belong to you");
    }

    if (loan.status !== "active") {
      throw new Error("This loan is not active");
    }

    if (args.amount <= 0) {
      throw new Error("Repayment amount must be positive");
    }

    const personalAccount = await getPersonalAccount(ctx, user._id);
    const systemAccount = await getSystemAccount(ctx);

    const currentBalance = personalAccount.balance ?? 0;
    
    if (currentBalance < args.amount) {
      throw new Error(
        `Insufficient funds. You have $${currentBalance.toLocaleString()} but need $${args.amount.toLocaleString()}`
      );
    }

    // Calculate repayment amount (can't repay more than owed)
    const repaymentAmount = Math.min(args.amount, loan.currentBalance);
    const newLoanBalance = loan.currentBalance - repaymentAmount;

    // Transfer funds from user to system
    await updateAccountBalance(ctx, personalAccount._id, -repaymentAmount);
    await updateAccountBalance(ctx, systemAccount._id, repaymentAmount);

    // Record transaction
    await recordLedger(
      ctx,
      personalAccount._id,
      systemAccount._id,
      repaymentAmount,
      "loan_repayment",
      `Loan repayment: $${repaymentAmount.toLocaleString()}`
    );

    // Update loan
    if (newLoanBalance <= 0.01) {
      // Fully repaid
      await ctx.db.patch(args.loanId, {
        currentBalance: 0,
        status: "repaid",
        repaidAt: Date.now(),
      });

      return {
        success: true,
        fullyRepaid: true,
        message: `Loan fully repaid! You paid $${repaymentAmount.toLocaleString()}.`,
      };
    } else {
      // Partially repaid
      await ctx.db.patch(args.loanId, {
        currentBalance: newLoanBalance,
      });

      return {
        success: true,
        fullyRepaid: false,
        remainingBalance: newLoanBalance,
        message: `Payment of $${repaymentAmount.toLocaleString()} received. Remaining balance: $${newLoanBalance.toLocaleString()}.`,
      };
    }
  },
});

// Internal: Apply daily interest to all active loans
export const applyDailyInterest = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - ONE_DAY_MS;

    // Get all active loans that need interest applied (last applied > 1 day ago)
    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let updated = 0;
    let defaulted = 0;

    for (const loan of activeLoans) {
      // Check if a day has passed since last interest
      if (loan.lastInterestApplied > oneDayAgo) {
        continue; // Not yet time for interest
      }

      const daysPassed = Math.floor(
        (now - loan.lastInterestApplied) / ONE_DAY_MS
      );

      if (daysPassed < 1) continue;

      // Apply compound interest for each day
      let newBalance = loan.currentBalance;
      for (let i = 0; i < daysPassed; i++) {
        newBalance = newBalance * (1 + loan.interestRate);
      }

      const newDaysRemaining = Math.max(
        0,
        loan.daysRemaining - daysPassed
      );

      // Check if loan is due
      if (now >= loan.dueDate || newDaysRemaining <= 0) {
        // Auto-deduct from account
        const account = await ctx.db.get(loan.accountId);
        if (account) {
          const systemAccount = await getSystemAccount(ctx);
          const currentBalance = account.balance ?? 0;

          // Deduct even if it goes negative
          await updateAccountBalance(ctx, loan.accountId, -newBalance);
          await updateAccountBalance(ctx, systemAccount._id, newBalance);

          // Record transaction
          await recordLedger(
            ctx,
            loan.accountId,
            systemAccount._id,
            newBalance,
            "loan_default",
            `Automatic loan deduction (defaulted): $${newBalance.toLocaleString()}`
          );

          // Mark as defaulted
          await ctx.db.patch(loan._id, {
            currentBalance: 0,
            status: "defaulted",
            repaidAt: now,
            daysRemaining: 0,
          });

          defaulted++;
        }
      } else {
        // Update loan with new interest
        await ctx.db.patch(loan._id, {
          currentBalance: newBalance,
          lastInterestApplied: now,
          daysRemaining: newDaysRemaining,
        });

        updated++;
      }
    }

    return {
      totalLoans: activeLoans.length,
      updated,
      defaulted,
      timestamp: now,
    };
  },
});
