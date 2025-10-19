import { useMemo, useState } from "react";
import type { StockListItem } from "./stock-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

interface StockTreemapProps {
  stocks: StockListItem[];
  onStockClick?: (stockId: string) => void;
}

interface TreemapCell {
  stock: StockListItem;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

// Calculate color based on price change percentage
const getColor = (changePercent: number): string => {
  const normalized = Math.max(-10, Math.min(10, changePercent));

  if (normalized > 0) {
    const intensity = Math.min(normalized / 10, 1);
    const r = Math.round(220 - intensity * 120);
    const g = Math.round(252 - intensity * 52);
    const b = Math.round(231 - intensity * 131);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (normalized < 0) {
    const intensity = Math.min(Math.abs(normalized) / 10, 1);
    const r = Math.round(254 - intensity * 54);
    const g = Math.round(226 - intensity * 126);
    const b = Math.round(226 - intensity * 126);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    return "rgb(229, 231, 235)";
  }
};

// Simple squarified treemap algorithm
function squarify(
  data: StockListItem[],
  x: number,
  y: number,
  width: number,
  height: number
): TreemapCell[] {
  if (data.length === 0) return [];

  const totalValue = data.reduce((sum, stock) => sum + stock.marketCap, 0);
  if (totalValue === 0) return [];

  const cells: TreemapCell[] = [];
  let currentX = x;
  let currentY = y;
  let remainingWidth = width;
  let remainingHeight = height;

  // Sort by market cap descending
  const sortedData = [...data].sort((a, b) => b.marketCap - a.marketCap);

  for (let i = 0; i < sortedData.length; i++) {
    const stock = sortedData[i];
    const ratio = stock.marketCap / totalValue;
    const area = ratio * (width * height);

    let cellWidth: number;
    let cellHeight: number;

    // Alternate between horizontal and vertical splits
    if (remainingWidth >= remainingHeight) {
      // Split horizontally
      cellWidth = Math.min(area / remainingHeight, remainingWidth);
      cellHeight = remainingHeight;

      cells.push({
        stock,
        x: currentX,
        y: currentY,
        width: cellWidth,
        height: cellHeight,
        color: getColor(stock.priceChangePercent1h ?? 0),
      });

      currentX += cellWidth;
      remainingWidth -= cellWidth;
    } else {
      // Split vertically
      cellWidth = remainingWidth;
      cellHeight = Math.min(area / remainingWidth, remainingHeight);

      cells.push({
        stock,
        x: currentX,
        y: currentY,
        width: cellWidth,
        height: cellHeight,
        color: getColor(stock.priceChangePercent1h ?? 0),
      });

      currentY += cellHeight;
      remainingHeight -= cellHeight;
    }
  }

  return cells;
}

export function StockTreemap({ stocks, onStockClick }: StockTreemapProps) {
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);

  const cells = useMemo(() => {
    if (!stocks || stocks.length === 0) return [];

    // Filter stocks with valid market cap
    const validStocks = stocks.filter((s) => s.marketCap > 0);
    if (validStocks.length === 0) return [];

    return squarify(validStocks, 0, 0, 100, 100);
  }, [stocks]);

  if (stocks.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center text-muted-foreground">
        No stocks available
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className="relative w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
        style={{ height: 600 }}
      >
        <TooltipProvider>
          {cells.map((cell, index) => {
            const { stock, x, y, width, height, color } = cell;
            const isHovered = hoveredStock === stock._id;

            // Calculate if we have enough space to show text
            const pixelWidth = (width / 100) * 100; // Approximate pixel width
            const pixelHeight = (height / 100) * 600; // Approximate pixel height
            const showText = pixelWidth > 80 && pixelHeight > 60;
            const showCompactText = pixelWidth > 50 && pixelHeight > 40;

            return (
              <Tooltip key={stock._id}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute cursor-pointer transition-all duration-200 hover:opacity-90 hover:brightness-95 border border-white dark:border-gray-700"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      backgroundColor: color,
                      transform: isHovered ? "scale(0.98)" : "scale(1)",
                    }}
                    onClick={() => onStockClick?.(stock._id)}
                    onMouseEnter={() => setHoveredStock(stock._id)}
                    onMouseLeave={() => setHoveredStock(null)}
                  >
                    <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                      {showText ? (
                        <>
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                            {stock.ticker}
                          </div>
                          <div className="text-xs text-gray-800 dark:text-gray-200 mt-1">
                            ${stock.currentPrice.toFixed(2)}
                          </div>
                          <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                            {(stock.priceChangePercent1h ?? 0) >= 0 ? "+" : ""}
                            {(stock.priceChangePercent1h ?? 0).toFixed(2)}%
                          </div>
                        </>
                      ) : showCompactText ? (
                        <>
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                            {stock.ticker}
                          </div>
                          <div className="text-[10px] font-semibold text-gray-900 dark:text-gray-100">
                            {(stock.priceChangePercent1h ?? 0) >= 0 ? "+" : ""}
                            {(stock.priceChangePercent1h ?? 0).toFixed(1)}%
                          </div>
                        </>
                      ) : (
                        <div className="font-bold text-gray-900 dark:text-gray-100 text-[10px]">
                          {stock.ticker}
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{stock.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {stock.ticker}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div>
                        Price:{" "}
                        <span className="font-medium">
                          ${stock.currentPrice.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        1h Change:{" "}
                        <span
                          className={
                            (stock.priceChangePercent1h ?? 0) >= 0
                              ? "font-medium text-green-600"
                              : "font-medium text-red-600"
                          }
                        >
                          {(stock.priceChangePercent1h ?? 0) >= 0 ? "+" : ""}
                          {(stock.priceChangePercent1h ?? 0).toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Market Cap: ${(stock.marketCap / 1_000_000).toFixed(2)}M
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded border border-gray-300"
            style={{ backgroundColor: getColor(5) }}
          />
          <span className="text-muted-foreground">Strong Gain</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded border border-gray-300"
            style={{ backgroundColor: getColor(1) }}
          />
          <span className="text-muted-foreground">Slight Gain</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded border border-gray-300"
            style={{ backgroundColor: getColor(0) }}
          />
          <span className="text-muted-foreground">No Change</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded border border-gray-300"
            style={{ backgroundColor: getColor(-1) }}
          />
          <span className="text-muted-foreground">Slight Loss</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded border border-gray-300"
            style={{ backgroundColor: getColor(-5) }}
          />
          <span className="text-muted-foreground">Strong Loss</span>
        </div>
      </div>
    </div>
  );
}
