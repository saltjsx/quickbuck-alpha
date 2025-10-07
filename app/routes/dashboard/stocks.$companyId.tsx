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
  Clock,
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
  const myHolding = portfolio.find((p) => p && p.companyId === companyId);

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
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard/stocks")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Market
            </Button>

            <div className="flex items-start justify-between mb-6">
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
                    <h1 className="text-3xl font-bold">{company.name}</h1>
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
                <p className="text-3xl font-bold">
                  ${stats.currentPrice.toFixed(2)}
                </p>
                <div
                  className={`flex items-center gap-1 justify-end ${
                    isPositive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>
                    ${Math.abs(stats.priceChange24h).toFixed(2)} (
                    {stats.priceChangePercent24h > 0 ? "+" : ""}
                    {stats.priceChangePercent24h.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
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
                  <CardTitle className="text-sm font-medium">7d High</CardTitle>
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
                  <CardTitle className="text-sm font-medium">7d Low</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${stats.lowPrice.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price Chart */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Price History
                </CardTitle>
                <CardDescription>
                  Every price update captured during the selected time period
                </CardDescription>
                <CardAction>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="6h">6 Hours</SelectItem>
                      <SelectItem value="24h">24 Hours</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
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
                  className="h-[500px] w-full"
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

            <div className="grid gap-6 md:grid-cols-2">
              {/* Trading */}
              <Card>
                <CardHeader>
                  <CardTitle>Trade {company.ticker}</CardTitle>
                  <CardDescription>
                    Buy or sell shares of {company.name}
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
                        <span
                          className={
                            currentHolding.gainLoss >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {" "}
                          ({currentHolding.gainLoss >= 0 ? "+" : ""}$
                          {currentHolding.gainLoss.toFixed(2)})
                        </span>
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
                    <Label htmlFor="buyerType">Trading As</Label>
                    <Select
                      value={buyerType}
                      onValueChange={(v) =>
                        setBuyerType(v as "user" | "company")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Personal</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
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
                    />
                    {shareAmount && !isNaN(parseFloat(shareAmount)) && (
                      <p className="text-sm text-muted-foreground">
                        Total cost: $
                        {(parseFloat(shareAmount) * stats.currentPrice).toFixed(
                          2
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleBuy}
                      disabled={isProcessing}
                    >
                      Buy
                    </Button>
                    <Button
                      className="flex-1"
                      variant="destructive"
                      onClick={handleSell}
                      disabled={
                        isProcessing || !selectedAccount || !shareAmount
                      }
                    >
                      Sell
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Ownership */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Ownership Structure
                  </CardTitle>
                  <CardDescription>Who owns {company.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Founder */}
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

                    {/* Other Shareholders */}
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

            {/* Recent Transactions */}
            <Card className="mt-6">
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
                            {tx.shares} shares @ ${tx.pricePerShare.toFixed(2)}
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
        </div>
      </div>
    </div>
  );
}
