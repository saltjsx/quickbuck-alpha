import { useMemo, useState } from "react";
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
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TrendingUp, Search } from "lucide-react";
import type { Route } from "./+types/stocks";
import { Spinner } from "~/components/ui/spinner";
import StockCard, { type StockListItem } from "~/components/game/stock-card";

// Stocks page shows all public companies with:
// - Search by name or ticker (client-side filter)
// - Sort options (market cap, price, gainers/losers, alpha)
// - Toggle view (grid vs compact - currently styling uses grid; compact uses tighter gaps)
// Data is sourced from api.stocks.getAllPublicStocks which is indexed for efficient reads.

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

export default function StocksPage() {
  const navigate = useNavigate();
  const publicStocks = useQuery(api.stocks.getAllPublicStocks);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<
    "marketCapDesc" | "priceDesc" | "priceAsc" | "gainers" | "losers" | "alpha"
  >("marketCapDesc");
  const [view, setView] = useState<"grid" | "compact">("grid");

  if (publicStocks === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="xl" className="text-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600">Loading stock market...</p>
        </div>
      </div>
    );
  }

  const filteredSorted = useMemo<StockListItem[]>(() => {
    const q = (query || "").trim().toLowerCase();
    let arr = (publicStocks as StockListItem[]) || [];
    if (q) {
      arr = arr.filter((s) =>
        [s.name, s.ticker].some((v) => v?.toLowerCase().includes(q))
      );
    }
    switch (sort) {
      case "alpha":
        arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "priceDesc":
        arr = [...arr].sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case "priceAsc":
        arr = [...arr].sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case "gainers":
        arr = [...arr].sort(
          (a, b) => b.priceChangePercent24h - a.priceChangePercent24h
        );
        break;
      case "losers":
        arr = [...arr].sort(
          (a, b) => a.priceChangePercent24h - b.priceChangePercent24h
        );
        break;
      case "marketCapDesc":
      default:
        arr = [...arr].sort((a, b) => b.marketCap - a.marketCap);
        break;
    }
    return arr;
  }, [publicStocks, query, sort]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 py-6">
        {/* Header */}
        <div className="px-4 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
                <TrendingUp className="h-8 w-8" /> Stock Market
              </h1>
              <p className="text-muted-foreground mt-1">
                Browse publicly traded companies and invest smartly.
              </p>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="grid">Grid</TabsTrigger>
                <TabsTrigger value="compact">Compact</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 lg:px-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or ticker"
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                    <SelectTrigger aria-label="Sort by">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketCapDesc">
                        Market Cap (desc)
                      </SelectItem>
                      <SelectItem value="gainers">Top Gainers (24h)</SelectItem>
                      <SelectItem value="losers">Top Losers (24h)</SelectItem>
                      <SelectItem value="priceDesc">
                        Price (high → low)
                      </SelectItem>
                      <SelectItem value="priceAsc">
                        Price (low → high)
                      </SelectItem>
                      <SelectItem value="alpha">Alphabetical (A→Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="px-4 lg:px-8">
          {filteredSorted.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No matching public companies
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try clearing the search or adjusting sort options.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div
              className={
                view === "grid"
                  ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  : "grid gap-2"
              }
            >
              {filteredSorted.map((stock) => (
                <div key={stock._id}>
                  <StockCard
                    stock={stock}
                    onClick={() => navigate(`/dashboard/stocks/${stock._id}`)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
