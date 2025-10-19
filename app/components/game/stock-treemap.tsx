import { useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { StockListItem } from "./stock-card";

interface StockTreemapProps {
  stocks: StockListItem[];
  onStockClick?: (stockId: string) => void;
}

interface TreemapNode {
  name: string;
  ticker: string;
  value: number;
  price: number;
  priceChange: number;
  stockId: string;
  fill: string;
}

// Calculate color based on price change percentage
const getColor = (changePercent: number): string => {
  // Normalize the change to a -10 to +10 range for color calculation
  const normalized = Math.max(-10, Math.min(10, changePercent));

  if (normalized > 0) {
    // Green shades for positive changes
    const intensity = Math.min(normalized / 10, 1);
    // Light green to dark green
    const r = Math.round(220 - intensity * 120); // 220 -> 100
    const g = Math.round(252 - intensity * 52); // 252 -> 200
    const b = Math.round(231 - intensity * 131); // 231 -> 100
    return `rgb(${r}, ${g}, ${b})`;
  } else if (normalized < 0) {
    // Red shades for negative changes
    const intensity = Math.min(Math.abs(normalized) / 10, 1);
    // Light red to dark red
    const r = Math.round(254 - intensity * 54); // 254 -> 200
    const g = Math.round(226 - intensity * 126); // 226 -> 100
    const b = Math.round(226 - intensity * 126); // 226 -> 100
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Neutral gray for no change
    return "rgb(229, 231, 235)";
  }
};

// Custom shape renderer for treemap cells with labels
const TreemapShape = (props: any) => {
  const { x, y, width, height, payload, fill } = props;

  if (!payload || !width || !height) {
    return null;
  }

  const { ticker, price, priceChange } = payload;
  const fontSize = Math.max(10, Math.min(width / 14, height / 12));

  return (
    <g>
      {/* Background rectangle */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill || "#8884d8"}
        stroke="#fff"
        strokeWidth={2}
      />
      {/* Ticker text */}
      {width > 50 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - fontSize * 0.8}
            textAnchor="middle"
            fill="#000"
            fontSize={fontSize * 1.2}
            fontWeight="bold"
            dominantBaseline="middle"
          >
            {ticker}
          </text>
          {/* Price text */}
          <text
            x={x + width / 2}
            y={y + height / 2 + fontSize * 0.4}
            textAnchor="middle"
            fill="#333"
            fontSize={fontSize * 0.9}
            dominantBaseline="middle"
          >
            ${typeof price === "number" ? price.toFixed(2) : "0.00"}
          </text>
          {/* Change text */}
          <text
            x={x + width / 2}
            y={y + height / 2 + fontSize * 1.5}
            textAnchor="middle"
            fill="#000"
            fontSize={fontSize * 0.8}
            fontWeight="600"
            dominantBaseline="middle"
          >
            {typeof priceChange === "number"
              ? `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}%`
              : "N/A"}
          </text>
        </>
      )}
    </g>
  );
};

export function StockTreemap({ stocks, onStockClick }: StockTreemapProps) {
  const treemapData = useMemo(() => {
    const nodes: TreemapNode[] = stocks.map((stock) => ({
      name: stock.name,
      ticker: stock.ticker,
      value: stock.marketCap > 0 ? stock.marketCap : 1,
      price: stock.currentPrice,
      priceChange: stock.priceChangePercent1h ?? 0,
      stockId: stock._id,
      fill: getColor(stock.priceChangePercent1h ?? 0),
    }));

    return [
      {
        name: "Stock Market",
        children: nodes,
      },
    ];
  }, [stocks]);

  const handleClick = (data: any) => {
    if (data && data.stockId && onStockClick) {
      onStockClick(data.stockId);
    }
  };

  if (stocks.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center text-muted-foreground">
        No stocks available
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={600}>
        <Treemap
          data={treemapData}
          dataKey="value"
          aspectRatio={4 / 3}
          stroke="#fff"
          fill="#8884d8"
          shape={<TreemapShape />}
          onClick={handleClick}
        >
          <Tooltip
            content={({ payload }) => {
              if (!payload || !payload[0]) return null;
              const data = payload[0].payload as TreemapNode | undefined;
              if (!data) return null;

              const { name, ticker, price, priceChange, value } = data;

              // Safety checks
              if (price === undefined || priceChange === undefined) return null;

              return (
                <div className="rounded-lg border bg-background p-3 shadow-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{name}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {ticker}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div>
                        Price:{" "}
                        <span className="font-medium">${price.toFixed(2)}</span>
                      </div>
                      <div>
                        1h Change:{" "}
                        <span
                          className={
                            priceChange >= 0
                              ? "font-medium text-green-600"
                              : "font-medium text-red-600"
                          }
                        >
                          {priceChange >= 0 ? "+" : ""}
                          {priceChange.toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Market Cap: ${(value / 1_000_000).toFixed(2)}M
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: getColor(5) }}
          />
          <span className="text-muted-foreground">Strong Gain</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: getColor(1) }}
          />
          <span className="text-muted-foreground">Slight Gain</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: getColor(0) }}
          />
          <span className="text-muted-foreground">No Change</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: getColor(-1) }}
          />
          <span className="text-muted-foreground">Slight Loss</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: getColor(-5) }}
          />
          <span className="text-muted-foreground">Strong Loss</span>
        </div>
      </div>
    </div>
  );
}
