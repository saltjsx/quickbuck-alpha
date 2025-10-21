import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { toast } from "~/hooks/use-toast";
import {
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { Spinner } from "~/components/ui/spinner";
import { Separator } from "~/components/ui/separator";

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const MAX_LOAN_AMOUNT = 500_000;
const DAILY_INTEREST_RATE = 0.05; // 5%
const LOAN_DURATION_DAYS = 7;

type Loan = {
  _id: Id<"loans">;
  _creationTime: number;
  userId: Id<"users">;
  accountId: Id<"accounts">;
  principal: number;
  currentBalance: number;
  interestRate: number;
  daysRemaining: number;
  status: "active" | "repaid" | "defaulted";
  lastInterestApplied: number;
  dueDate: number;
  createdAt: number;
  repaidAt?: number;
};

export function LoansTab() {
  const personalAccount = useQuery(api.accounts.getPersonalAccount);
  const activeLoans = useQuery(api.loans.getActiveLoans);
  const allLoans = useQuery(api.loans.getAllLoans);
  const totalDebt = useQuery(api.loans.getTotalLoanDebt);

  const takeLoan = useMutation(api.loans.takeLoan);
  const repayLoan = useMutation(api.loans.repayLoan);

  const [loanAmount, setLoanAmount] = useState(10000);
  const [isLoanLoading, setIsLoanLoading] = useState(false);
  const [repaymentAmounts, setRepaymentAmounts] = useState<
    Record<string, number>
  >({});
  const [repayingLoans, setRepayingLoans] = useState<Set<string>>(new Set());

  const balance = personalAccount?.balance ?? 0;

  const handleTakeLoan = async () => {
    if (loanAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Loan amount must be positive",
        variant: "destructive",
      });
      return;
    }

    if (loanAmount > MAX_LOAN_AMOUNT) {
      toast({
        title: "Amount too high",
        description: `Maximum loan amount is ${formatCurrency(
          MAX_LOAN_AMOUNT
        )}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoanLoading(true);
      const result = await takeLoan({ amount: loanAmount });

      toast({
        title: "Loan approved!",
        description: result.message,
      });

      setLoanAmount(10000); // Reset to default
    } catch (error: any) {
      toast({
        title: "Loan rejected",
        description: error.message || "Unable to process loan",
        variant: "destructive",
      });
    } finally {
      setIsLoanLoading(false);
    }
  };

  const handleRepayLoan = async (loanId: Id<"loans">, loan: Loan) => {
    const repayAmount = repaymentAmounts[loanId] || loan.currentBalance;

    if (repayAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Repayment amount must be positive",
        variant: "destructive",
      });
      return;
    }

    if (repayAmount > balance) {
      toast({
        title: "Insufficient funds",
        description: `You only have ${formatCurrency(balance)} available`,
        variant: "destructive",
      });
      return;
    }

    try {
      setRepayingLoans((prev) => new Set(prev).add(loanId));
      const result = await repayLoan({ loanId, amount: repayAmount });

      toast({
        title: result.fullyRepaid ? "Loan fully repaid!" : "Payment processed",
        description: result.message,
      });

      // Clear the repayment amount input
      setRepaymentAmounts((prev) => {
        const next = { ...prev };
        delete next[loanId];
        return next;
      });
    } catch (error: any) {
      toast({
        title: "Repayment failed",
        description: error.message || "Unable to process payment",
        variant: "destructive",
      });
    } finally {
      setRepayingLoans((prev) => {
        const next = new Set(prev);
        next.delete(loanId);
        return next;
      });
    }
  };

  const calculateProjectedDebt = (amount: number) => {
    let projected = amount;
    for (let i = 0; i < LOAN_DURATION_DAYS; i++) {
      projected *= 1 + DAILY_INTEREST_RATE;
    }
    return projected;
  };

  if (
    personalAccount === undefined ||
    activeLoans === undefined ||
    allLoans === undefined ||
    totalDebt === undefined
  ) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Spinner className="mx-auto text-gray-800" size="xl" />
          <p className="mt-4 text-muted-foreground">Loading loan data...</p>
        </div>
      </div>
    );
  }

  if (!personalAccount) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <DollarSign className="h-5 w-5" />
            Create a personal account first
          </CardTitle>
          <CardDescription>
            Head to the Accounts page to initialize your account before taking
            out loans.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const projectedDebt = calculateProjectedDebt(loanAmount);
  const totalInterest = projectedDebt - loanAmount;

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <Card className="border-red-300/60 bg-red-50 dark:bg-red-950 dark:border-red-800/60">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-2 text-red-900 dark:text-red-100">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>High-Risk Loans</CardTitle>
          </div>
          <Badge
            variant="secondary"
            className="bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100"
          >
            {DAILY_INTEREST_RATE * 100}% Daily Interest
          </Badge>
        </CardHeader>
        <CardContent className="text-red-900/80 dark:text-red-100/80 space-y-2">
          <p className="font-semibold">⚠️ Loan Terms:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              Maximum loan: {formatCurrency(MAX_LOAN_AMOUNT)} (total across all
              active loans)
            </li>
            <li>
              Interest rate: {DAILY_INTEREST_RATE * 100}% per day (compound)
            </li>
            <li>Repayment period: {LOAN_DURATION_DAYS} days</li>
            <li>
              <span className="font-semibold text-red-700 dark:text-red-300">
                After {LOAN_DURATION_DAYS} days, the full amount is
                automatically deducted, even if your balance goes negative!
              </span>
            </li>
            <li>
              <span className="font-semibold text-red-700 dark:text-red-300">
                Loans negatively impact your net worth until fully repaid.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Current Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
            <p className="text-xs text-muted-foreground">
              Your personal account balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalDebt)}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeLoans.length} active loan
              {activeLoans.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Credit
            </CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(MAX_LOAN_AMOUNT - totalDebt)}
            </div>
            <p className="text-xs text-muted-foreground">
              Max loan minus current debt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Take New Loan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Take a New Loan
          </CardTitle>
          <CardDescription>
            Borrow up to {formatCurrency(MAX_LOAN_AMOUNT - totalDebt)}{" "}
            instantly. Repay within {LOAN_DURATION_DAYS} days or face automatic
            deduction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Loan Amount
            </label>
            <Input
              type="number"
              min={1}
              max={MAX_LOAN_AMOUNT - totalDebt}
              step="1000"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="mt-2"
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-4 space-y-2">
            <h4 className="font-semibold text-sm">Loan Projection</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Loan amount:</span>
              <span className="font-medium">{formatCurrency(loanAmount)}</span>

              <span className="text-muted-foreground">Interest rate:</span>
              <span className="font-medium">
                {DAILY_INTEREST_RATE * 100}% daily
              </span>

              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{LOAN_DURATION_DAYS} days</span>

              <span className="text-muted-foreground">Total interest:</span>
              <span className="font-medium text-destructive">
                {formatCurrency(totalInterest)}
              </span>

              <Separator className="col-span-2" />

              <span className="text-muted-foreground font-semibold">
                Total to repay:
              </span>
              <span className="font-bold text-lg">
                {formatCurrency(projectedDebt)}
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={
              isLoanLoading ||
              loanAmount <= 0 ||
              loanAmount > MAX_LOAN_AMOUNT - totalDebt
            }
            onClick={handleTakeLoan}
          >
            {isLoanLoading
              ? "Processing..."
              : `Borrow ${formatCurrency(loanAmount)}`}
          </Button>
        </CardContent>
      </Card>

      {/* Active Loans */}
      {activeLoans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Active Loans ({activeLoans.length})
            </CardTitle>
            <CardDescription>
              Manage your outstanding loans. Interest accrues daily.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeLoans.map((loan: Loan) => {
              const isRepaying = repayingLoans.has(loan._id);
              const repayAmount =
                repaymentAmounts[loan._id] || loan.currentBalance;
              const daysOverdue =
                loan.daysRemaining < 0 ? Math.abs(loan.daysRemaining) : 0;
              const isOverdue = daysOverdue > 0;

              return (
                <div
                  key={loan._id}
                  className={`rounded-lg border p-4 space-y-3 ${
                    isOverdue
                      ? "border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800/60"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">
                        Loan #{loan._id.slice(-8)}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Taken on {formatDate(loan.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={isOverdue ? "destructive" : "default"}
                      className="text-xs"
                    >
                      {isOverdue
                        ? `${daysOverdue} day${
                            daysOverdue !== 1 ? "s" : ""
                          } overdue`
                        : `${loan.daysRemaining} day${
                            loan.daysRemaining !== 1 ? "s" : ""
                          } left`}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Principal:</span>
                    <span className="font-medium">
                      {formatCurrency(loan.principal)}
                    </span>

                    <span className="text-muted-foreground">
                      Current balance:
                    </span>
                    <span className="font-bold text-destructive">
                      {formatCurrency(loan.currentBalance)}
                    </span>

                    <span className="text-muted-foreground">Due date:</span>
                    <span
                      className={
                        isOverdue
                          ? "font-semibold text-red-600 dark:text-red-400"
                          : ""
                      }
                    >
                      {formatDate(loan.dueDate)}
                    </span>
                  </div>

                  {isOverdue && (
                    <div className="rounded-md bg-red-100 border border-red-300 p-2 text-xs text-red-900 dark:bg-red-900 dark:border-red-700 dark:text-red-100">
                      ⚠️ <strong>OVERDUE!</strong> This loan will be
                      automatically deducted soon, even if it puts your balance
                      negative!
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Repayment amount
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={loan.currentBalance}
                        step="100"
                        value={repayAmount}
                        onChange={(e) =>
                          setRepaymentAmounts({
                            ...repaymentAmounts,
                            [loan._id]: Number(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() =>
                          setRepaymentAmounts({
                            ...repaymentAmounts,
                            [loan._id]: loan.currentBalance,
                          })
                        }
                      >
                        Max
                      </Button>
                    </div>

                    <Button
                      className="w-full"
                      disabled={
                        isRepaying || repayAmount <= 0 || repayAmount > balance
                      }
                      onClick={() => handleRepayLoan(loan._id, loan)}
                    >
                      {isRepaying
                        ? "Processing..."
                        : `Repay ${formatCurrency(repayAmount)}`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Loan History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Loan History
          </CardTitle>
          <CardDescription>
            All your loans, including repaid and defaulted ones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No loan history yet. Take your first loan above.
            </p>
          ) : (
            <div className="space-y-3">
              {allLoans.map((loan: Loan) => {
                const statusConfig = {
                  active: {
                    icon: Clock,
                    color: "text-blue-600",
                    bg: "bg-blue-50",
                    border: "border-blue-200",
                    label: "Active",
                  },
                  repaid: {
                    icon: CheckCircle2,
                    color: "text-green-600",
                    bg: "bg-green-50",
                    border: "border-green-200",
                    label: "Repaid",
                  },
                  defaulted: {
                    icon: XCircle,
                    color: "text-red-600",
                    bg: "bg-red-50",
                    border: "border-red-200",
                    label: "Defaulted",
                  },
                };

                const config = statusConfig[loan.status];
                const Icon = config.icon;

                return (
                  <div
                    key={loan._id}
                    className={`rounded-md border p-3 ${config.border} ${config.bg}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span className={`font-semibold ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            #{loan._id.slice(-8)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Principal:
                          </span>
                          <span>{formatCurrency(loan.principal)}</span>

                          <span className="text-muted-foreground">
                            {loan.status === "active"
                              ? "Current balance:"
                              : "Final balance:"}
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(loan.currentBalance)}
                          </span>

                          <span className="text-muted-foreground">Taken:</span>
                          <span>{formatDate(loan.createdAt)}</span>

                          {loan.repaidAt && (
                            <>
                              <span className="text-muted-foreground">
                                {loan.status === "repaid"
                                  ? "Repaid:"
                                  : "Defaulted:"}
                              </span>
                              <span>{formatDate(loan.repaidAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
