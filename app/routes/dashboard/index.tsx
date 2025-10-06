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
  const totalNetWorth = personalBalance + portfolioValue;
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
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Header */}
          <div className="px-4 lg:px-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome to QuickBuck! Build your financial empire.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="px-4 lg:px-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Net Worth
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    $
                    {totalNetWorth.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total assets value
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Cash Balance
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    $
                    {personalBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available funds
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Companies
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCompanies}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {myProducts} products listed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Portfolio Value
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    $
                    {portfolioValue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock investments
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 lg:px-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Get started with these common tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
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
                  <CardTitle>How to Play</CardTitle>
                  <CardDescription>
                    Build your financial empire in 4 steps
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Create a Company</p>
                      <p className="text-sm text-muted-foreground">
                        Start your business empire
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      2
                    </div>
                    <div>
                      <p className="font-medium">List Products</p>
                      <p className="text-sm text-muted-foreground">
                        Add products to sell
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Earn Money</p>
                      <p className="text-sm text-muted-foreground">
                        Products sell automatically every 10 min (fair
                        distribution!)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Go Public & Invest</p>
                      <p className="text-sm text-muted-foreground">
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
