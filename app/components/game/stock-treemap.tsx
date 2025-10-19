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
  size: number;
  price: number;
  priceChange: number;
  stockId: string;
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

// Custom content renderer for treemap cells
const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, ticker, price, priceChange } = props;

  // Don't render if too small
  if (width < 40 || height < 30) {
    return null;
  }

  const fontSize = Math.min(width / 8, height / 5, 14);
  const tickerFontSize = fontSize * 1.2;
  const priceFontSize = fontSize * 0.9;
  const changeFontSize = fontSize * 0.85;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: getColor(priceChange),
          stroke: "#fff",
          strokeWidth: 2,
          cursor: "pointer",
        }}
      />
      {/* Ticker */}
      <text
        x={x + width / 2}
        y={y + height / 2 - fontSize}
        textAnchor="middle"
        fill="#000"
        fontSize={tickerFontSize}
        fontWeight="bold"
      >
        {ticker}
      </text>
      {/* Price */}
      <text
        x={x + width / 2}
        y={y + height / 2 + fontSize * 0.3}
        textAnchor="middle"
        fill="#333"
        fontSize={priceFontSize}
      >
        ${price.toFixed(2)}
      </text>
      {/* Change Percent */}
      <text
        x={x + width / 2}
        y={y + height / 2 + fontSize * 1.5}
        textAnchor="middle"
        fill="#000"
        fontSize={changeFontSize}
        fontWeight="600"
      >
        {priceChange >= 0 ? "+" : ""}
        {priceChange.toFixed(2)}%
      </text>
    </g>
  );
};

export function StockTreemap({ stocks, onStockClick }: StockTreemapProps) {
  const treemapData = useMemo(() => {
    const nodes: TreemapNode[] = stocks.map((stock) => ({
      name: stock.name,
      ticker: stock.ticker,
      size: stock.marketCap,
      price: stock.currentPrice,
      priceChange: stock.priceChangePercent1h ?? 0,
      stockId: stock._id,
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
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          fill="#8884d8"
          content={<CustomTreemapContent />}
          onClick={handleClick}
        >
          <Tooltip
            content={({ payload }) => {
              if (!payload || !payload[0]) return null;
              const data = payload[0].payload as TreemapNode;
              return (
                <div className="rounded-lg border bg-background p-3 shadow-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{data.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {data.ticker}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div>
                        Price:{" "}
                        <span className="font-medium">
                          ${data.price.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        1h Change:{" "}
                        <span
                          className={
                            data.priceChange >= 0
                              ? "font-medium text-green-600"
                              : "font-medium text-red-600"
                          }
                        >
                          {data.priceChange >= 0 ? "+" : ""}
                          {data.priceChange.toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Market Cap: ${(data.size / 1_000_000).toFixed(2)}M
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
