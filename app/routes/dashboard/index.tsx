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
import {
  Wallet,
  Building2,
  ShoppingBag,
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
  const personalAccount = useQuery(api.accounts.getPersonalAccount);
  const companies = useQuery(api.companies.getUserCompanies);
  const portfolio = useQuery(api.stocks.getPortfolio);
  const products = useQuery(api.products.getActiveProducts);

  const isLoading = personalAccount === undefined || companies === undefined;

  const personalBalance = personalAccount?.balance || 0;
  const totalCompanies = companies?.length || 0;
  const portfolioValue =
    portfolio?.reduce(
      (sum: number, holding: any) => sum + (holding?.currentValue || 0),
      0
    ) || 0;
  const ownerEquity =
    companies?.reduce((sum: number, company: any) => {
      if (
        company?.role === "owner" ||
        company?.ownerId === personalAccount?.ownerId
      ) {
        return sum + (company?.ownerEquityValue || 0);
      }
      return sum;
    }, 0) || 0;
  const totalNetWorth = personalBalance + portfolioValue + ownerEquity;
  const myProducts =
    products?.filter((p: any) =>
      companies?.some((c: any) => c._id === p.companyId)
    ).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="xl" className="text-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-3 py-3 md:gap-4 md:py-4">
          {/* Header */}
          <div className="px-4 lg:px-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Welcome to QuickBuck! Build your financial empire.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="px-4 lg:px-6">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <Card className="py-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Net Worth
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    $
                    {totalNetWorth.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Total assets value
                  </p>
                </CardContent>
              </Card>

              <Card className="py-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Cash Balance
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    $
                    {personalBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Available funds
                  </p>
                </CardContent>
              </Card>

              <Card className="py-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Companies
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{totalCompanies}</div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {myProducts} products listed
                  </p>
                </CardContent>
              </Card>

              <Card className="py-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Portfolio Value
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    $
                    {portfolioValue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Stock investments
                  </p>
                </CardContent>
              </Card>

              <Card className="py-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Founder Equity
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    $
                    {ownerEquity.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Value of your owned companies
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 lg:px-6">
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                  <CardDescription className="text-xs">
                    Get started with these common tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <Link to="/dashboard/companies">
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span>Manage Companies</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/dashboard/marketplace">
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span>Browse Marketplace</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/dashboard/stocks">
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span>Trade Stocks</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/dashboard/accounts">
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span>View Accounts</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">How to Play</CardTitle>
                  <CardDescription className="text-xs">
                    Build your financial empire in 4 steps
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-semibold">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-sm">Create a Company</p>
                      <p className="text-xs text-muted-foreground">
                        Start your business empire
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-semibold">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-sm">List Products</p>
                      <p className="text-xs text-muted-foreground">
                        Add products to sell
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-semibold">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-sm">Earn Money</p>
                      <p className="text-xs text-muted-foreground">
                        Products sell automatically every 10 min (fair distribution)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-semibold">
                      4
                    </div>
                    <div>
                      <p className="font-medium text-sm">Go Public & Invest</p>
                      <p className="text-xs text-muted-foreground">
                        Reach $50K to list on stock market
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
