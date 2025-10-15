import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Route } from "./+types/stocks.$companyId";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  DollarSign,
  Users,
  Activity,
  BarChart3,
  Building2,
  Wallet,
  PieChart,
  History,
  Layers,
  Banknote,
} from "lucide-react";
import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import { useToast } from "~/hooks/use-toast";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Stock Details - QuickBuck" },
    {
      name: "description",
      content:
        "View detailed stock information, price charts, and trading activity for companies in QuickBuck.",
    },
  ];
}

export default function StockDetailPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [shareAmount, setShareAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [buyerType, setBuyerType] = useState<"user" | "company">("user");
  const [timeRange, setTimeRange] = useState("7d");

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);

    if (timeRange === "1h" || timeRange === "6h") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    if (timeRange === "24h") {
      return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  const stockDetails = useQuery(
    api.stocks.getStockDetails,
    companyId ? { companyId: companyId as Id<"companies">, timeRange } : "skip"
  );
  const shareholders = useQuery(
    api.stocks.getCompanyShareholders,
    companyId ? { companyId: companyId as Id<"companies"> } : "skip"
  );
  const portfolio = useQuery(api.stocks.getPortfolio);
  const accounts = useQuery(api.accounts.getUserAccounts);

  // Determine holder for selected account
  const getSelectedHolder = () => {
    if (!selectedAccount || !accounts) return null;
    const account = accounts.find((a: any) => a._id === selectedAccount);
    if (!account) return null;

    if (buyerType === "user") {
      // For personal accounts, we need to get the user ID
      // Since portfolio is user-specific, we can use the portfolio query
      return null; // Use portfolio for user holdings
    } else if (buyerType === "company" && account.companyId) {
      return { holderId: account.companyId, holderType: "company" as const };
    }
    return null;
  };

  const selectedHolder = getSelectedHolder();
  const holderPortfolio = useQuery(
    api.stocks.getHolderPortfolio,
    selectedHolder || "skip"
  );

  const currentHolding =
    buyerType === "user"
      ? portfolio?.find((p: any) => p && p.companyId === companyId)
      : holderPortfolio?.find((p: any) => p && p.companyId === companyId);

  const buyStock = useMutation(api.stocks.buyStock);
  const sellStock = useMutation(api.stocks.sellStock);
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);

  if (
    stockDetails === undefined ||
    shareholders === undefined ||
    portfolio === undefined ||
    accounts === undefined
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="xl" className="text-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600">Loading stock details...</p>
        </div>
      </div>
    );
  }

  const { company, stats, priceHistory, recentTransactions } = stockDetails;
  const selectedAccountData = selectedAccount
    ? accounts.find((account: any) => account._id === selectedAccount)
    : null;
  const publicFloatPercent =
    shareholders.totalShares > 0
      ? (shareholders.sharesOutstanding / shareholders.totalShares) * 100
      : 0;

  const handleBuy = async () => {
    if (!selectedAccount || !shareAmount || isNaN(parseFloat(shareAmount))) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid share amount and select an account",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      const result = await buyStock({
        companyId: companyId as Id<"companies">,
        shares: parseFloat(shareAmount),
        fromAccountId: selectedAccount as Id<"accounts">,
        buyerType,
      });
      toast({
        title: "Purchase Successful",
        description: `Bought ${shareAmount} shares! Price moved from $${result.oldPrice.toFixed(
          2
        )} to $${result.newPrice.toFixed(2)} (${
          result.priceChangePercent > 0 ? "+" : ""
        }${result.priceChangePercent.toFixed(2)}%)`,
      });
      setShareAmount("");
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to buy stock",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSell = async () => {
    if (!selectedAccount || !shareAmount || isNaN(parseFloat(shareAmount))) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid share amount and select an account",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      const result = await sellStock({
        companyId: companyId as Id<"companies">,
        shares: parseFloat(shareAmount),
        toAccountId: selectedAccount as Id<"accounts">,
        sellerType: buyerType,
      });
      toast({
        title: "Sale Successful",
        description: `Sold ${shareAmount} shares! Price moved from $${result.oldPrice.toFixed(
          2
        )} to $${result.newPrice.toFixed(2)} (${
          result.priceChangePercent < 0 ? "" : "+"
        }${result.priceChangePercent.toFixed(2)}%)`,
      });
      setShareAmount("");
    } catch (error: any) {
      toast({
        title: "Sale Failed",
        description: error.message || "Failed to sell stock",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const chartData = (
    priceHistory.length > 0
      ? priceHistory
      : [{ timestamp: Date.now(), price: stats.currentPrice }]
  ).map((h) => ({
    timestamp: h.timestamp,
    price: h.price,
  }));

  const isPositive = stats.priceChange24h >= 0;

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-background via-background to-muted/40">
      <div className="@container/main mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard/stocks")}
            className="group w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Market
          </Button>
          {company.isPublic ? (
            <Badge variant="secondary" className="uppercase tracking-wide">
              Public Listing
            </Badge>
          ) : (
            <Badge variant="outline" className="uppercase tracking-wide">
              Private Listing
            </Badge>
          )}
        </div>

        <Card className="border-border/60 bg-background/80 backdrop-blur">
          <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {company.logoUrl ? (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-border/80 bg-muted/30 p-2">
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {company.name}
                  </h1>
                  <Badge variant="outline" className="font-mono text-base">
                    {company.ticker}
                  </Badge>
                </div>
                {company.description && (
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    {company.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Founded by {company.ownerName}
                  </span>
                  <span className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Treasury Balance&nbsp;
                    <span className="font-medium text-foreground">
                      $
                      {(company.balance ?? 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    {stats.sharesOutstanding.toLocaleString()} shares in
                    circulation
                  </span>
                </div>
                {company.tags && company.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {company.tags.slice(0, 4).map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 text-right">
              <div className="text-sm uppercase text-muted-foreground">
                Last Price
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">
                  ${stats.currentPrice.toFixed(2)}
                </span>
                <Badge variant={isPositive ? "default" : "destructive"}>
                  {isPositive ? "+" : ""}
                  {stats.priceChangePercent24h.toFixed(2)}%
                </Badge>
              </div>
              <div
                className={`flex items-center gap-2 text-sm ${
                  isPositive ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                ${Math.abs(stats.priceChange24h).toFixed(2)} in last 24h
              </div>
              <div className="text-xs text-muted-foreground">
                Market cap: $
                {stats.marketCap.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/60 bg-background/80 shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Market Cap
              </CardTitle>
              <CardDescription>Valuation at current price</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-semibold">
                $
                {stats.marketCap.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/80 shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-muted-foreground" />
                24h Volume
              </CardTitle>
              <CardDescription>Shares traded in 24 hours</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-semibold">
                {stats.volume24h.toLocaleString("en-US")}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/80 shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                7d High
              </CardTitle>
              <CardDescription>Peak price in selected range</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-semibold">
                ${stats.highPrice.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/80 shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                7d Low
              </CardTitle>
              <CardDescription>Floor price in selected range</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-semibold">
                ${stats.lowPrice.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          <Card className="border-border/60 bg-background/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Price History
              </CardTitle>
              <CardDescription>
                Intraday and multi-day pricing based on the selected period
              </CardDescription>
              <CardAction>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="1h">Last 1 Hour</SelectItem>
                    <SelectItem value="6h">Last 6 Hours</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="all">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  price: {
                    label: "Price",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[320px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        typeof value === "number"
                          ? formatTimestamp(value)
                          : value
                      }
                      minTickGap={24}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={[
                        (dataMin: number) => dataMin * 0.995,
                        (dataMax: number) => dataMax * 1.005,
                      ]}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) =>
                            typeof value === "number"
                              ? formatTimestamp(value)
                              : value
                          }
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Trade {company.ticker}
              </CardTitle>
              <CardDescription>
                Execute quick buy or sell orders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {currentHolding && (
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                  <p className="text-sm text-primary/80">Current Position</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {currentHolding.shares} shares
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                    <span>
                      Value: ${currentHolding.currentValue.toFixed(2)}
                    </span>
                    <span
                      className={
                        currentHolding.gainLoss >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }
                    >
                      {currentHolding.gainLoss >= 0 ? "+" : ""}$
                      {currentHolding.gainLoss.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="account">Settlement Account</Label>
                  <Select
                    value={selectedAccount}
                    onValueChange={setSelectedAccount}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account: any) => (
                        <SelectItem key={account._id} value={account._id}>
                          {account.name} · $
                          {account.balance?.toFixed(2) || "0.00"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAccountData && (
                    <p className="text-xs text-muted-foreground">
                      Available balance: $
                      {(selectedAccountData.balance ?? 0).toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyerType">Trading As</Label>
                  <Select
                    value={buyerType}
                    onValueChange={(v) => setBuyerType(v as "user" | "company")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Personal Profile</SelectItem>
                      <SelectItem value="company">Company Profile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shares">Order Size (shares)</Label>
                <Input
                  id="shares"
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={shareAmount}
                  onChange={(e) => setShareAmount(e.target.value)}
                />
                {shareAmount && !isNaN(parseFloat(shareAmount)) && (
                  <p className="text-sm text-muted-foreground">
                    Estimated value: $
                    {(parseFloat(shareAmount) * stats.currentPrice).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  className="w-full"
                  onClick={handleBuy}
                  disabled={isProcessing}
                >
                  Buy Shares
                </Button>
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={handleSell}
                  disabled={isProcessing || !selectedAccount || !shareAmount}
                >
                  Sell Shares
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card className="border-border/60 bg-background/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Most recent executions</CardDescription>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No transactions yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Shares</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="text-right">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.slice(0, 10).map((tx: any) => (
                        <TableRow key={tx._id}>
                          <TableCell>
                            <Badge
                              variant={
                                tx.transactionType === "buy"
                                  ? "default"
                                  : tx.transactionType === "sell"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {tx.transactionType}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.shares}</TableCell>
                          <TableCell>${tx.pricePerShare.toFixed(2)}</TableCell>
                          <TableCell>${tx.totalAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {new Date(tx.timestamp).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/60 bg-background/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Market Snapshot
                </CardTitle>
                <CardDescription>Key figures for rapid review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Total Shares
                    </p>
                    <p className="text-lg font-semibold">
                      {stats.totalShares.toLocaleString("en-US")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Public Float
                    </p>
                    <p className="text-lg font-semibold">
                      {publicFloatPercent.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {shareholders.sharesOutstanding.toLocaleString("en-US")}
                      &nbsp;shares
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Founder Holdings
                    </p>
                    <p className="text-lg font-semibold">
                      {shareholders.founderOwnership.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {shareholders.founderShares.toLocaleString("en-US")}
                      &nbsp;shares
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Daily Volume
                    </p>
                    <p className="text-lg font-semibold">
                      {stats.volume24h.toLocaleString("en-US")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Trailing 24 hours
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Ownership Structure
                </CardTitle>
                <CardDescription>Top holders ranked by equity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-4">
                  <div>
                    <p className="text-sm text-primary/80">Founder</p>
                    <p className="text-lg font-semibold">
                      {shareholders.founderName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {shareholders.founderOwnership.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {shareholders.founderShares.toLocaleString("en-US")}
                      &nbsp;shares
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {shareholders.shareholders.slice(0, 5).map((sh: any) => (
                    <div
                      key={sh.holderId}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {sh.holderName}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {sh.holderType}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {sh.ownershipPercent.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sh.shares.toLocaleString("en-US")} shares
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Layers className="h-4 w-4" /> Total Shares
                    </span>
                    <span className="font-mono">
                      {shareholders.totalShares.toLocaleString("en-US")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <PieChart className="h-4 w-4" /> Public Float
                    </span>
                    <span className="font-mono">
                      {shareholders.sharesOutstanding.toLocaleString("en-US")}
                      &nbsp;({publicFloatPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
