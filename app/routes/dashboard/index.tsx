import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Wallet,
  Building2,
  TrendingUp,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/index";
import { Spinner } from "~/components/ui/spinner";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - QuickBuck" },
    {
      name: "description",
      content:
        "View your net worth, manage companies, and track your progress in the QuickBuck multiplayer finance simulation game.",
    },
  ];
}

export default function Page() {
  // Consolidated dashboard data
  const overview = useQuery(api.users.getDashboardOverview);
  // Separate personal account fetch for transactions (hook constraints)
  const personalAccount = useQuery(api.accounts.getPersonalAccount);
  const recentTx = useQuery(
    api.accounts.getTransactions,
    personalAccount?._id ? { accountId: personalAccount._id, limit: 8 } : "skip"
  );

  if (overview === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spinner size="xl" className="text-gray-900 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Welcome to QuickBuck</p>
          <p className="text-muted-foreground">
            Sign in to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  const cash = overview.personalAccount?.balance ?? 0;
  const portfolioValue = overview.portfolioValue ?? 0;
  const ownerEquityValue = overview.ownerEquityValue ?? 0;
  const loanDebt = overview.totalLoanDebt ?? 0;
  const netWorth = overview.netWorth ?? 0;

  const breakdown = useMemo(() => {
    const positive = cash + portfolioValue + ownerEquityValue;
    const total = positive + loanDebt; // loanDebt is positive number representing debt
    const base = positive > 0 ? positive : 1;
    return {
      cashPct: (cash / base) * 100,
      portfolioPct: (portfolioValue / base) * 100,
      equityPct: (ownerEquityValue / base) * 100,
      debtPct: total > 0 ? (loanDebt / total) * 100 : 0,
    };
  }, [cash, portfolioValue, ownerEquityValue, loanDebt]);

  const ownedCompanies = useMemo(
    () =>
      (overview.companies || [])
        .filter((c: any) => c.ownerId === overview.personalAccount?.ownerId)
        .sort(
          (a: any, b: any) =>
            (b.ownerEquityValue ?? 0) - (a.ownerEquityValue ?? 0)
        )
        .slice(0, 5),
    [overview.companies, overview.personalAccount?.ownerId]
  );

  const topHoldings = useMemo(
    () =>
      (overview.portfolio || [])
        .sort((a: any, b: any) => (b.currentValue ?? 0) - (a.currentValue ?? 0))
        .slice(0, 6),
    [overview.portfolio]
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 md:gap-8 py-6">
        {/* Header */}
        <div className="px-4 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of your financial world.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="px-4 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">
                    Net Worth
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  $
                  {netWorth.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cash + Portfolio + Equity − Debt
                </p>
              </CardContent>
            </Card>

            <Card className="p-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">
                    Cash Balance
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  $
                  {cash.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available in your account
                </p>
              </CardContent>
            </Card>

            <Card className="p-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">
                    Portfolio Value
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  $
                  {portfolioValue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Current stock holdings
                </p>
              </CardContent>
            </Card>

            <Card className="p-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">
                    Companies
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  {overview.totalCompanies ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  You have active access
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Net Worth Breakdown & Quick Actions */}
        <div className="px-4 lg:px-8 grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle>Net Worth Breakdown</CardTitle>
              <CardDescription>
                Composition of your assets and liabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${breakdown.cashPct}%` }}
                />
                <div
                  className="h-full bg-blue-500/80"
                  style={{ width: `${breakdown.portfolioPct}%` }}
                />
                <div
                  className="h-full bg-green-500/80"
                  style={{ width: `${breakdown.equityPct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-primary" /> Cash $
                  {cash.toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-blue-500/80" />{" "}
                  Portfolio ${portfolioValue.toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-green-500/80" /> Equity
                  ${ownerEquityValue.toLocaleString()}
                </div>
                {loanDebt > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-red-500/80" /> Debt
                    −${loanDebt.toLocaleString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump into common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/dashboard/companies">
                <Button
                  variant="outline"
                  className="w-full justify-between h-11"
                >
                  <span>Manage Companies</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard/marketplace">
                <Button
                  variant="outline"
                  className="w-full justify-between h-11"
                >
                  <span>Browse Marketplace</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard/stocks">
                <Button
                  variant="outline"
                  className="w-full justify-between h-11"
                >
                  <span>Trade Stocks</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard/accounts">
                <Button
                  variant="outline"
                  className="w-full justify-between h-11"
                >
                  <span>View Accounts</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio + Companies + Activity */}
        <div className="px-4 lg:px-8 grid gap-4 xl:grid-cols-3">
          {/* Portfolio Snapshot */}
          <Card className="xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle>Portfolio Snapshot</CardTitle>
              <CardDescription>Your top holdings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {topHoldings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don’t have any holdings yet.
                </p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {topHoldings.map((h: any) => (
                    <div
                      key={h._id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <div className="font-medium">
                          {h.companyTicker || h.companyName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {h.shares} shares • ${h.currentPrice.toLocaleString()}
                          /share
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          ${(h.currentValue ?? 0).toLocaleString()}
                        </div>
                        <div className="mt-1">
                          <Badge
                            variant={
                              (h.gainLoss ?? 0) >= 0 ? "default" : "destructive"
                            }
                            className="text-xs"
                          >
                            {(h.gainLoss ?? 0) >= 0 ? "+" : ""}
                            {(h.gainLossPercent ?? 0).toFixed(2)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Owned Companies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Owned Companies</CardTitle>
              <CardDescription>Your top 5 by equity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ownedCompanies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No owned companies yet.
                </p>
              ) : (
                ownedCompanies.map((c: any) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Ownership: {(c.ownerOwnershipPercent ?? 0).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ${(c.ownerEquityValue ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Balance: ${(c.balance ?? 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="px-4 lg:px-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest transactions on your personal account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!recentTx ? (
                <p className="text-sm text-muted-foreground">
                  Loading recent activity…
                </p>
              ) : recentTx.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recent activity.
                </p>
              ) : (
                <div className="divide-y">
                  {recentTx.map((tx: any) => (
                    <div
                      key={tx._id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                        <div>
                          <div className="text-sm font-medium capitalize">
                            {tx.type.replaceAll("_", " ")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tx.fromAccountName} → {tx.toAccountName}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ${tx.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Help / How to Play */}
        <div className="px-4 lg:px-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>How to Play</CardTitle>
              <CardDescription>
                Build your financial empire in 4 steps
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {[
                "Create a Company",
                "List Products",
                "Earn Money",
                "Go Public & Invest",
              ].map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium">{step}</p>
                    <p className="text-sm text-muted-foreground">
                      {i === 0 && "Start your business empire"}
                      {i === 1 && "Add products to sell"}
                      {i === 2 &&
                        "Products sell automatically every 10 minutes"}
                      {i === 3 && "Reach $50K to list on stock market"}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
