import { memo, useMemo } from "react";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";

type PricePoint = { price: number; timestamp: number };

export interface StockListItem {
  _id: string;
  name: string;
  ticker: string;
  logoUrl?: string | null;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  priceChange1h?: number;
  priceChangePercent1h?: number;
  marketCap: number;
  priceHistory: PricePoint[];
  description?: string;
}

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatMarketCap(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export const StockCard = memo(function StockCard({
  stock,
  onClick,
}: {
  stock: StockListItem;
  onClick?: () => void;
}) {
  const isUp = (stock?.priceChange24h ?? 0) >= 0;

  const chartData = useMemo(() => {
    const data = (stock.priceHistory ?? []).map((d) => ({
      ...d,
      value: d.price,
    }));
    if (data.length === 0) {
      return [
        { timestamp: Date.now() - 60000, value: stock.currentPrice },
        { timestamp: Date.now(), value: stock.currentPrice },
      ];
    }
    return data;
  }, [stock.priceHistory, stock.currentPrice]);

  return (
    <Card
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className="group relative h-full cursor-pointer rounded-xl border p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-12 w-12">
            {stock.logoUrl ? (
              <AvatarImage src={stock.logoUrl} alt={stock.name} />
            ) : null}
            <AvatarFallback>
              {stock.ticker?.slice(0, 2)?.toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold leading-6">
                {stock.name}
              </h3>
              <Badge variant="outline" className="font-mono text-[10px]">
                {stock.ticker}
              </Badge>
            </div>
            {stock.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                Trading as: {stock.description}
              </p>
            )}
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="font-semibold">
                {formatCurrency(stock.currentPrice)}
              </span>
              <span
                className={
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium " +
                  (isUp
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400")
                }
              >
                {isUp ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {(isUp ? "+" : "-") +
                  Math.abs(stock.priceChangePercent24h).toFixed(2)}
                %
              </span>
            </div>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="mt-4 h-20 w-full rounded-md border bg-muted/40 p-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, bottom: 0, left: 0, right: 0 }}
          >
            <defs>
              <linearGradient
                id={`grad-${stock._id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={isUp ? "#10b981" : "#ef4444"}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isUp ? "#10b981" : "#ef4444"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ fontSize: 12, padding: 8 }}
              formatter={(v) => [formatCurrency(Number(v)), "Price"]}
              labelFormatter={() => ""}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isUp ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              fill={`url(#grad-${stock._id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-muted-foreground">Market Cap</div>
        <div className="font-medium">{formatMarketCap(stock.marketCap)}</div>
      </div>
    </Card>
  );
});

export default StockCard;
