"use client";

import { useMemo } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  DollarSign,
  Edit,
  LayoutDashboard,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import type { ChartConfig } from "~/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useToast } from "~/hooks/use-toast";
import { CreateProductDialog } from "./create-product-dialog";
import { DeleteCompanyDialog } from "./delete-company-dialog";
import { DistributeDividendDialog } from "./distribute-dividend-dialog";
import { EditCompanyDialog } from "./edit-company-dialog";
import { EditProductDialog } from "./edit-product-dialog";

interface CompanyDashboardProps {
  companyId: Id<"companies">;
}

const revenueProfitChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-2))",
  },
};

const topProductsChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-2))",
  },
};

const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(Number.isFinite(value) ? value : 0);
};

const formatTickerInitials = (ticker?: string, fallback?: string) => {
  if (ticker && ticker.length > 0) {
    return ticker.slice(0, 2).toUpperCase();
  }
  if (fallback && fallback.length > 0) {
    const parts = fallback.split(" ");
    const initials = parts.slice(0, 2).map((part) => part[0] ?? "");
    return initials.join("").toUpperCase() || "QB";
  }
  return "QB";
};

export function CompanyDashboard({ companyId }: CompanyDashboardProps) {
  const dashboardData = useQuery(api.companies.getCompanyDashboard, {
    companyId,
  });
  const updateProduct = useMutation(api.products.updateProduct);
  const { toast } = useToast();

  // Move useMemo before any early returns to comply with Rules of Hooks
  const topProducts = useMemo(() => {
    if (!dashboardData?.products) return [];

    return dashboardData.products
      .filter((product) => product.revenue > 0)
      .slice()
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((product) => ({
        name:
          product.name.length > 15
            ? `${product.name.substring(0, 15)}…`
            : product.name,
        revenue: product.revenue,
        profit: product.profit,
      }));
  }, [dashboardData?.products]);

  const toggleProductStatus = async (
    productId: Id<"products">,
    currentStatus: boolean
  ) => {
    try {
      await updateProduct({
        productId,
        isActive: !currentStatus,
      });
    } catch (error) {
      console.error("Failed to toggle product status:", error);
      toast({
        title: "Update failed",
        description: "Could not change product status. Try again.",
        variant: "destructive",
      });
    }
  };

  if (dashboardData === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Spinner size="xl" className="mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading company dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Unable to load this company dashboard.
      </div>
    );
  }

  const { company, totals, products, chartData } = dashboardData;
  const tags = Array.isArray(company.tags) ? company.tags : [];

  const activeProductCount = products.filter(
    (product) => product.isActive
  ).length;
  const activeUnitsSold = products.reduce(
    (sum, product) => sum + (product.unitsSold ?? 0),
    0
  );

  const profitMargin =
    totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  const trendData = chartData.map((entry) => ({
    day: new Date(entry.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    revenue: entry.revenue,
    profit: entry.profit,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild className="bg-transparent">
          <Link to="/dashboard/companies" className="gap-2 inline-flex">
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              <Avatar className="h-20 w-20 rounded-lg">
                <AvatarImage
                  src={company.logoUrl || undefined}
                  alt={company.name}
                />
                <AvatarFallback className="rounded-lg text-xl">
                  {formatTickerInitials(company.ticker, company.name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold text-balance">
                    {company.name}
                  </h1>
                  {company.ticker && (
                    <Badge variant="secondary" className="font-mono">
                      {company.ticker}
                    </Badge>
                  )}
                  <Badge variant={company.isPublic ? "default" : "outline"}>
                    {company.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>
                {company.description && (
                  <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
                    {company.description}
                  </p>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <CreateProductDialog
                companyId={company._id}
                trigger={
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                }
              />
              <EditCompanyDialog
                company={{
                  _id: company._id,
                  name: company.name,
                  description: company.description,
                  tags,
                  ticker: company.ticker,
                  logoUrl: company.logoUrl,
                }}
              />
              <Button
                asChild
                size="sm"
                variant="outline"
                className="bg-transparent gap-2"
              >
                <Link to={`/dashboard/companies/${company._id}`}>
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              {company.isPublic && (
                <DistributeDividendDialog
                  companyId={company._id}
                  companyName={company.name}
                  companyBalance={company.balance}
                  companyOwnerId={company.ownerId}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Dividends
                    </Button>
                  }
                />
              )}
              <DeleteCompanyDialog
                companyId={company._id}
                companyName={company.name}
                balance={company.balance}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Company Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(company.balance, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Current available funds
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.revenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              All-time revenue generated
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.profit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {profitMargin.toFixed(1)}% lifetime margin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProductCount}</div>
            <p className="text-xs text-muted-foreground">
              {activeUnitsSold.toLocaleString()} total units sold
            </p>
          </CardContent>
        </Card>
      </div>

      {trendData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Profit Trends</CardTitle>
            <CardDescription>
              Daily performance over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={revenueProfitChartConfig}
              className="h-[300px]"
            >
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-revenue)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-revenue)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-profit)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-profit)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        formatCurrency(Number(value), {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      }
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--color-profit)"
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Profit Trends</CardTitle>
            <CardDescription>
              No revenue activity recorded in the last 30 days.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            Manage your product catalog and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              You have not launched any products yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Costs</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const margin =
                      product.revenue > 0
                        ? (product.profit / product.revenue) * 100
                        : 0;

                    return (
                      <TableRow key={product._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 rounded-md">
                              <AvatarImage
                                src={product.imageUrl || undefined}
                                alt={product.name}
                              />
                              <AvatarFallback className="rounded-md">
                                {product.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {product.name}
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {product.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.price, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {(product.unitsSold ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(product.costs)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            product.profit >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(product.profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {margin.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={product.isActive ? "default" : "secondary"}
                          >
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <EditProductDialog
                                product={{
                                  _id: product._id,
                                  name: product.name,
                                  description: product.description,
                                  price: product.price,
                                  imageUrl: product.imageUrl,
                                  tags: product.tags,
                                  isActive: product.isActive,
                                }}
                                trigger={
                                  <DropdownMenuItem
                                    onSelect={(event) => event.preventDefault()}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                }
                              />
                              <DropdownMenuItem
                                onSelect={() =>
                                  void toggleProductStatus(
                                    product._id,
                                    product.isActive
                                  )
                                }
                              >
                                {product.isActive ? (
                                  <>
                                    <Package className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Products by Revenue</CardTitle>
            <CardDescription>
              Comparison of revenue and profit for best-performing products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={topProductsChartConfig}
              className="h-[360px]"
            >
              <BarChart
                data={topProducts}
                margin={{ top: 16, right: 16, left: 0, bottom: 32 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  angle={-40}
                  textAnchor="end"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        formatCurrency(Number(value), {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      }
                    />
                  }
                />
                <Legend wrapperStyle={{ paddingTop: 12 }} />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="profit"
                  fill="var(--color-profit)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
