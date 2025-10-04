import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import type { Route } from "./+types/stocks";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Stock Market - QuickBuck" },
    {
      name: "description",
      content:
        "Browse public companies, view stock prices, and invest in the stock market in QuickBuck.",
    },
  ];
}

function MiniChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span className="text-xs text-muted-foreground">No data</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="price"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function StocksPage() {
  const navigate = useNavigate();
  const publicStocks = useQuery(api.stocks.getAllPublicStocks);

  if (publicStocks === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stock market...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8" />
              Stock Market
            </h1>
            <p className="text-muted-foreground mt-1">
              Invest in public companies and track your portfolio
            </p>
          </div>

          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Public Companies</CardTitle>
                <CardDescription>
                  Companies trading on the public market
                </CardDescription>
              </CardHeader>
              <CardContent>
                {publicStocks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No public companies yet
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Companies become public when they reach $50,000 in balance
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {publicStocks.map((stock: any) => {
                      const isPositive = stock.priceChange24h >= 0;
                      return (
                        <Card
                          key={stock._id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() =>
                            navigate(`/dashboard/stocks/${stock._id}`)
                          }
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                {stock.logoUrl && (
                                  <div className="flex-shrink-0">
                                    <img
                                      src={stock.logoUrl}
                                      alt={`${stock.name} logo`}
                                      className="h-12 w-12 object-contain rounded border"
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">
                                      {stock.name}
                                    </h3>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs mt-1"
                                  >
                                    {stock.ticker}
                                  </Badge>
                                </div>
                              </div>
                              <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </div>

                            {/* Mini Chart */}
                            <div className="mb-4 h-[60px] bg-muted/20 rounded-md p-2">
                              <MiniChart data={stock.priceHistory} />
                            </div>

                            <div className="flex items-end justify-between">
                              <div>
                                <p className="text-2xl font-bold">
                                  ${stock.currentPrice.toFixed(2)}
                                </p>
                                <div
                                  className={`flex items-center gap-1 text-sm ${
                                    isPositive
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {isPositive ? (
                                    <TrendingUp className="h-4 w-4" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4" />
                                  )}
                                  <span>
                                    ${Math.abs(stock.priceChange24h).toFixed(2)}{" "}
                                    (
                                    {stock.priceChangePercent24h > 0 ? "+" : ""}
                                    {stock.priceChangePercent24h.toFixed(2)}
                                    %)
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  Market Cap
                                </p>
                                <p className="font-semibold">
                                  $
                                  {stock.marketCap.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
