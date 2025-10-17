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
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  DollarSign,
  Users,
  Activity,
  BarChart3,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import { useToast } from "~/hooks/use-toast";
import { Spinner } from "~/components/ui/spinner";

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
  const [timeRange, setTimeRange] = useState("7d");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const { toast } = useToast();

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
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
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
  const selectedAccountObj = accounts?.find(
    (a: any) => a._id === selectedAccount
  );

  const derivedBuyerType: "user" | "company" = selectedAccountObj?.companyId
    ? "company"
    : "user";

  const companyHolderParams =
    derivedBuyerType === "company" && selectedAccountObj?.companyId
      ? {
          holderId: selectedAccountObj.companyId as Id<"companies">,
          holderType: "company" as const,
        }
      : null;

  const holderPortfolio = useQuery(
    api.stocks.getHolderPortfolio,
    companyHolderParams || "skip"
  );

  const currentHolding =
    derivedBuyerType === "company"
      ? holderPortfolio?.find((p: any) => p && p.companyId === companyId)
      : portfolio?.find((p: any) => p && p.companyId === companyId);

  const buyStock = useMutation(api.stocks.buyStock);
  const sellStock = useMutation(api.stocks.sellStock);

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

  const chartData = (
    priceHistory.length > 0
      ? priceHistory
      : [{ timestamp: Date.now(), price: stats.currentPrice }]
  ).map((h) => ({ timestamp: h.timestamp, price: h.price }));

  const isPositive = stats.priceChange24h >= 0;

  const minTradeSize =
    stats.totalShares > 1000 ? Math.ceil(stats.totalShares * 0.0001) : 1;
  const accountBalance = (selectedAccountObj?.balance as number) ?? 0;
  const currentPrice = stats.currentPrice;
  const totalCost =
    shareAmount && !isNaN(parseFloat(shareAmount))
      ? parseFloat(shareAmount) * currentPrice
      : 0;
  const maxBuyShares = Math.max(
    0,
    Math.floor(accountBalance / Math.max(0.01, currentPrice))
  );
  const maxSellShares = Math.max(0, currentHolding?.shares ?? 0);

  const setQuickShares = (kind: "min" | "10" | "100" | "1000" | "max") => {
    if (kind === "min") return setShareAmount(String(minTradeSize));
    if (kind === "max")
      return setShareAmount(
        String(mode === "buy" ? maxBuyShares : maxSellShares)
      );
    const val = Number(kind);
    setShareAmount(String(val));
  };

  const onSubmitTrade = async () => {
    if (!selectedAccount || !shareAmount || isNaN(parseFloat(shareAmount))) {
      toast({
        title: "Invalid input",
        description: "Enter a valid share amount and select an account",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      if (mode === "buy") {
        const result = await buyStock({
          companyId: companyId as Id<"companies">,
          shares: parseFloat(shareAmount),
          fromAccountId: selectedAccount as Id<"accounts">,
          buyerType: derivedBuyerType,
        });
        toast({
          title: "Purchase successful",
          description: `Bought ${shareAmount} shares. $${result.oldPrice.toFixed(
            2
          )} → $${result.newPrice.toFixed(2)} (${
            result.priceChangePercent > 0 ? "+" : ""
          }${result.priceChangePercent.toFixed(2)}%)`,
        });
      } else {
        const result = await sellStock({
          companyId: companyId as Id<"companies">,
          shares: parseFloat(shareAmount),
          toAccountId: selectedAccount as Id<"accounts">,
          sellerType: derivedBuyerType,
        });
        toast({
          title: "Sale successful",
          description: `Sold ${shareAmount} shares. $${result.oldPrice.toFixed(
            2
          )} → $${result.newPrice.toFixed(2)} (${
            result.priceChangePercent < 0 ? "" : "+"
          }${result.priceChangePercent.toFixed(2)}%)`,
        });
      }
      setShareAmount("");
    } catch (error: any) {
      toast({
        title: "Trade failed",
        description: error.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 py-6">
        <div className="px-4 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard/stocks")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Market
          </Button>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {company.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="h-16 w-16 object-contain rounded border"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {company.name}
                  </h1>
                  <Badge variant="outline" className="font-mono">
                    {company.ticker}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  Founded by {company.ownerName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-semibold">
                ${stats.currentPrice.toFixed(2)}
              </div>
              <div
                className={`mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm ${
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-red-500/10 text-red-600"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>
                  {stats.priceChangePercent24h > 0 ? "+" : ""}
                  {stats.priceChangePercent24h.toFixed(2)}% • $
                  {Math.abs(stats.priceChange24h).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left content */}
            <div className="lg:col-span-8 space-y-6">
              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Market Cap
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      $
                      {stats.marketCap.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      24h Volume
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.volume24h.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      7d High
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${stats.highPrice.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      7d Low
                    </CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${stats.lowPrice.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      <CardTitle>Price History</CardTitle>
                    </div>
                    <Tabs
                      value={timeRange}
                      onValueChange={(v) => setTimeRange(v)}
                    >
                      <TabsList>
                        <TabsTrigger value="1h">1h</TabsTrigger>
                        <TabsTrigger value="6h">6h</TabsTrigger>
                        <TabsTrigger value="24h">24h</TabsTrigger>
                        <TabsTrigger value="7d">7d</TabsTrigger>
                        <TabsTrigger value="30d">30d</TabsTrigger>
                        <TabsTrigger value="all">All</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <CardDescription>
                    Price updates during the selected time period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      price: { label: "Price", color: "hsl(var(--chart-1))" },
                    }}
                    className="h-[420px] w-full"
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
                              : String(value)
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
                          tickFormatter={(value) =>
                            `$${Number(value).toFixed(2)}`
                          }
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              labelFormatter={(value) =>
                                typeof value === "number"
                                  ? formatTimestamp(value)
                                  : String(value)
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

              {/* Recent transactions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Latest trading activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentTransactions.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">
                        No transactions yet
                      </p>
                    ) : (
                      recentTransactions.slice(0, 10).map((tx: any) => (
                        <div
                          key={tx._id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
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
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(tx.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {tx.shares} shares @ $
                              {tx.pricePerShare.toFixed(2)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Total: ${tx.totalAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right trade panel */}
            <div className="lg:col-span-4">
              <Card className="sticky top-16">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Trade {company.ticker}</CardTitle>
                    <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                      <TabsList>
                        <TabsTrigger value="buy">Buy</TabsTrigger>
                        <TabsTrigger value="sell">Sell</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <CardDescription>
                    {mode === "buy"
                      ? "Purchase shares using your selected account"
                      : "Sell shares to your selected account"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentHolding && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Your Holdings
                      </p>
                      <p className="text-lg font-semibold">
                        {currentHolding.shares} shares
                      </p>
                      <p className="text-sm">
                        Value: ${currentHolding.currentValue.toFixed(2)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="account">Account</Label>
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
                            {account.name} - $
                            {account.balance?.toFixed(2) || "0.00"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shares">Number of Shares</Label>
                    <Input
                      id="shares"
                      type="number"
                      placeholder="0"
                      value={shareAmount}
                      onChange={(e) => setShareAmount(e.target.value)}
                      min={minTradeSize}
                    />
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickShares("min")}
                      >
                        Min
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickShares("10")}
                      >
                        10
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickShares("100")}
                      >
                        100
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickShares("1000")}
                      >
                        1k
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickShares("max")}
                      >
                        Max
                      </Button>
                    </div>
                    {shareAmount && !isNaN(parseFloat(shareAmount)) && (
                      <div className="text-sm text-muted-foreground">
                        {mode === "buy" ? (
                          <>Total cost: ${totalCost.toFixed(2)}</>
                        ) : (
                          <>
                            Estimated proceeds: $
                            {(parseFloat(shareAmount) * currentPrice).toFixed(
                              2
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full h-11"
                    onClick={onSubmitTrade}
                    disabled={isProcessing || !selectedAccount || !shareAmount}
                  >
                    {mode === "buy" ? "Buy" : "Sell"}
                  </Button>

                  <div className="text-xs text-muted-foreground">
                    Min trade size: {minTradeSize.toLocaleString()} shares.
                    Price may move on execution due to market impact.
                  </div>
                </CardContent>
              </Card>

              {/* Ownership */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Ownership Structure
                  </CardTitle>
                  <CardDescription>Who owns {company.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div>
                        <p className="font-medium">
                          {shareholders.founderName}
                        </p>
                        <p className="text-sm text-muted-foreground">Founder</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {shareholders.founderOwnership.toFixed(2)}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {shareholders.founderShares.toLocaleString()} shares
                        </p>
                      </div>
                    </div>

                    {shareholders.shareholders.slice(0, 5).map((sh: any) => (
                      <div
                        key={sh.holderId}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{sh.holderName}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {sh.holderType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {sh.ownershipPercent.toFixed(2)}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {sh.shares.toLocaleString()} shares
                          </p>
                        </div>
                      </div>
                    ))}

                    <div className="pt-3 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Total Shares:</span>
                        <span className="font-mono">
                          {shareholders.totalShares.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Publicly Held:</span>
                        <span className="font-mono">
                          {shareholders.sharesOutstanding.toLocaleString()} (
                          {(
                            (shareholders.sharesOutstanding /
                              shareholders.totalShares) *
                            100
                          ).toFixed(2)}
                          %)
                        </span>
                      </div>
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
