import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  type LucideIcon,
  Trophy,
  PiggyBank,
  Building2,
  DollarSign,
  ShoppingCart,
  User,
  Package,
  ArrowUpDown,
} from "lucide-react";
import { Trophy, Building2, User, Package } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Skeleton } from "~/components/ui/skeleton";
import type { MetaFunction } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

type LeaderboardPlayer = {
  accountId: string;
  userId: string;
  name: string;
  username?: string | null;
  balance?: number;
  cashBalance?: number;
  portfolioValue?: number;
  ownerEquityValue?: number;
  netWorth?: number;
  avatarUrl?: string | null;
};

type LeaderboardCompanyValue = {
  companyId: string;
  name: string;
  ticker?: string;
  sharePrice?: number;
  totalShares?: number;
  marketCap?: number;
  balance?: number;
  portfolioValue?: number;
  netWorth?: number;
  logoUrl?: string | null;
};

type LeaderboardProduct = {
  productId: string;
  name: string;
  totalSales?: number;
  price?: number;
  companyName: string;
  companyTicker?: string;
  companyLogoUrl?: string | null;
  imageUrl?: string | null;
};

type LeaderboardData = {
  highestBalancePlayers: LeaderboardPlayer[];
  highestNetWorthPlayers: LeaderboardPlayer[];
  mostValuableCompanies: LeaderboardCompanyValue[];
  mostCashCompanies: LeaderboardCompanyValue[];
  bestSellingProducts: LeaderboardProduct[];
  lastUpdated?: number;
};

type LeaderboardMetric = {
  label: string;
  value: string;
  highlight?: boolean;
};

type LeaderboardItem = {
  key: string;
  rank: number;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  fallback: string;
  metrics: LeaderboardMetric[];
};

type LeaderboardSection = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: LeaderboardItem[];
  emptyMessage: string;
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3) || "QB"
  );
}

function getRankBadgeClasses(rank: number) {
  switch (rank) {
    case 1:
      return "bg-amber-500/90 text-amber-50 shadow-sm";
    case 2:
      return "bg-slate-400/90 text-slate-900";
    case 3:
      return "bg-orange-400/90 text-orange-950";
    default:
      return "bg-muted text-foreground";
  }
}

function getItemAccent(rank: number) {
  switch (rank) {
    case 1:
      return "border-amber-300/60 bg-gradient-to-r from-amber-200/30 via-amber-100/10 to-transparent";
    case 2:
      return "border-slate-300/60 bg-gradient-to-r from-slate-200/30 via-slate-100/10 to-transparent";
    case 3:
      return "border-orange-300/50 bg-gradient-to-r from-orange-200/25 via-orange-100/10 to-transparent";
    default:
      return "border-border/50 bg-background/60";
  }
}
  OverviewTabLeaderboard,
  CompaniesTabLeaderboard,
  PlayersTabLeaderboard,
  ProductsTabLeaderboard,
} from "~/components/leaderboard";

function LastUpdated({ timestamp }: { timestamp?: number }) {
  if (!timestamp) return null;

  const formatted = new Date(timestamp).toLocaleString();
  return (
    <p className="text-xs text-muted-foreground">Last updated {formatted}</p>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

export const meta: MetaFunction = () => [
  { title: "Leaderboard - QuickBuck" },
  {
    name: "description",
    content:
      "See who is leading the QuickBuck economy with top players, companies, and products.",
  },
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Sorting state per table
  const [companySort, setCompanySort] = useState<{
    key: CompanySortKey;
    dir: SortDir;
  }>({
    key: "netWorth",
    dir: "desc",
  });
  const [playerSort, setPlayerSort] = useState<{
    key: PlayerSortKey;
    dir: SortDir;
  }>({
    key: "netWorth",
    dir: "desc",
  });
  const [productSort, setProductSort] = useState<{
    key: ProductSortKey;
    dir: SortDir;
  }>({
    key: "totalSales",
    dir: "desc",
  });

  const leaderboard = useQuery(api.leaderboard.getLeaderboard, { limit: 5 }) as
    | LeaderboardData
    | undefined;

  const leaderboard = useQuery(api.leaderboard.getLeaderboard, { limit: 5 });
  const allCompanies = useQuery(api.leaderboard.getAllCompanies, {});
  const allPlayers = useQuery(api.leaderboard.getAllPlayers, {});
  const allProducts = useQuery(api.leaderboard.getAllProducts, {});

  const isLoading = leaderboard === undefined;

  // Prepare data for overview tab
  const overviewData = useMemo(() => {
    if (!leaderboard) return null;

    return {
      topCashPlayers: leaderboard.highestBalancePlayers.map((p) => ({
        _id: p.userId,
        name: p.name,
        username: p.username,
        avatarUrl: p.avatarUrl,
        cashBalance: p.balance,
        netWorth: p.balance, // For cash leaderboard, just use balance
      })),
      topNetWorthPlayers: leaderboard.highestNetWorthPlayers.map((p) => ({
        _id: p.userId,
        name: p.name,
        username: p.username,
        avatarUrl: p.avatarUrl,
        cashBalance: p.cashBalance,
        netWorth: p.netWorth,
      })),
      topCompanies: leaderboard.mostValuableCompanies.map((c) => ({
        _id: c.companyId,
        name: c.name,
        ticker: c.ticker || "",
        logoUrl: c.logoUrl,
        balance: 0, // Not included in mostValuableCompanies
        marketCap: c.marketCap,
      })),
      topCashCompanies: leaderboard.mostCashCompanies.map((c) => ({
        _id: c.companyId,
        name: c.name,
        ticker: c.ticker || "",
        logoUrl: c.logoUrl,
        balance: c.balance,
        marketCap: c.marketCap,
      })),
      topProducts: leaderboard.bestSellingProducts.map((p) => ({
        _id: p.productId,
        name: p.name,
        imageUrl: p.imageUrl,
        companyName: p.companyName,
        companyTicker: p.companyTicker,
        companyLogoUrl: p.companyLogoUrl,
        totalSales: p.totalSales || 0,
      })),
    };
  }, [leaderboard]);

  // Types and helpers for sorting
  type SortDir = "asc" | "desc";
  type CompanySortKey =
    | "name"
    | "ownerName"
    | "balance"
    | "netWorth"
    | "marketCap"
    | "ticker"
    | "isPublic";
  type PlayerSortKey =
    | "name"
    | "username"
    | "cashBalance"
    | "portfolioValue"
    | "netWorth";
  type ProductSortKey =
    | "name"
    | "companyName"
    | "price"
    | "totalSales"
    | "totalRevenue"
    | "profit";

  function toggleSort<T extends string>(
    current: { key: T; dir: SortDir },
    set: (s: { key: T; dir: SortDir }) => void,
    key: T
  ) {
    if (current.key === key) {
      set({ key, dir: current.dir === "asc" ? "desc" : "asc" });
    } else {
      set({
        key,
        dir:
          key === ("name" as T) ||
          key === ("ownerName" as T) ||
          key === ("companyName" as T)
            ? "asc"
            : "desc",
      });
    }
  }

  function compareValues(a: any, b: any, dir: SortDir) {
    const mul = dir === "asc" ? 1 : -1;
    if (typeof a === "string" && typeof b === "string") {
      return mul * a.localeCompare(b);
    }
    const an = Number(a) || 0;
    const bn = Number(b) || 0;
    return mul * (an - bn);
  }

  const sortedCompanies = useMemo(() => {
    if (!allCompanies) return undefined;
    const data = [...allCompanies];
    data.sort((a: any, b: any) =>
      compareValues(a[companySort.key], b[companySort.key], companySort.dir)
    );
    return data;
  }, [allCompanies, companySort]);

  const sortedPlayers = useMemo(() => {
    if (!allPlayers) return undefined;
    const data = [...allPlayers];
    data.sort((a: any, b: any) =>
      compareValues(a[playerSort.key], b[playerSort.key], playerSort.dir)
    );
    return data;
  }, [allPlayers, playerSort]);

  const sortedProducts = useMemo(() => {
    if (!allProducts) return undefined;
    const data = [...allProducts];
    data.sort((a: any, b: any) =>
      compareValues(a[productSort.key], b[productSort.key], productSort.dir)
    );
    return data;
  }, [allProducts, productSort]);

  function SortableHeader<T extends string>({
    label,
    active,
    onClick,
    numeric,
  }: {
    label: string;
    active?: boolean;
    onClick: () => void;
    numeric?: boolean;
  }) {
    return (
      <Button
        variant="ghost"
        onClick={onClick}
        className={cn(
          "h-8 px-2 -ml-3 text-sm font-medium",
          numeric ? "ml-auto" : "",
          active && "text-primary"
        )}
      >
        <span className={cn("mr-2", numeric && "order-2 ml-2 mr-0")}>
          {label}
        </span>
        <ArrowUpDown className={cn("h-4 w-4", numeric && "order-1")} />
      </Button>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground text-base">
            Track the top performers, biggest companies, and hottest products
            across QuickBuck.
          </p>
          {!isLoading && <LastUpdated timestamp={leaderboard?.lastUpdated} />}
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="overview">
              <Trophy className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="companies">
              <Building2 className="h-4 w-4 mr-2" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="players">
              <User className="h-4 w-4 mr-2" />
              Players
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              Products
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {isLoading || !overviewData ? (
              <LeaderboardSkeleton />
            ) : (
              <div className="grid gap-6">
                {sections.map((section) => (
                  <Card key={section.id}>
                    <CardHeader className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <section.icon className="h-5 w-5 text-primary" />
                        <CardTitle>{section.title}</CardTitle>
                      </div>
                      <CardDescription>{section.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {section.items.length > 0 ? (
                        <div className="space-y-5">
                          {(() => {
                            const top3 = section.items.slice(0, 3);
                            const rest = section.items.slice(3, 5);
                            return (
                              <>
                                {/* Podium: Top 3 */}
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                  {top3.map((item) => (
                                    <div
                                      key={item.key}
                                      className={cn(
                                        "relative rounded-2xl border p-4 sm:p-5",
                                        getItemAccent(item.rank)
                                      )}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                          <div
                                            className={cn(
                                              "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold",
                                              getRankBadgeClasses(item.rank)
                                            )}
                                          >
                                            {item.rank}
                                          </div>
                                          <Avatar className="h-14 w-14">
                                            {item.avatarUrl ? (
                                              <AvatarImage
                                                src={item.avatarUrl}
                                                alt={item.title}
                                              />
                                            ) : null}
                                            <AvatarFallback>
                                              {item.fallback}
                                            </AvatarFallback>
                                          </Avatar>
                                        </div>
                                        {item.metrics[0] && (
                                          <div className="text-right">
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                              {item.metrics[0].label}
                                            </p>
                                            <p className="text-xl font-bold leading-tight">
                                              {item.metrics[0].value}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-3">
                                        <p className="truncate font-semibold leading-tight">
                                          {item.title}
                                        </p>
                                        {item.subtitle && (
                                          <p className="truncate text-sm text-muted-foreground">
                                            {item.subtitle}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Ranks 4-5 */}
                                {rest.length > 0 && (
                                  <div className="space-y-3">
                                    {rest.map((item) => (
                                      <div
                                        key={item.key}
                                        className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 p-3"
                                      >
                                        <div className="flex min-w-0 items-center gap-3">
                                          <div
                                            className={cn(
                                              "flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-semibold",
                                              getRankBadgeClasses(item.rank)
                                            )}
                                          >
                                            {item.rank}
                                          </div>
                                          <Avatar className="h-9 w-9">
                                            {item.avatarUrl ? (
                                              <AvatarImage
                                                src={item.avatarUrl}
                                                alt={item.title}
                                              />
                                            ) : null}
                                            <AvatarFallback>
                                              {item.fallback}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-medium leading-tight">
                                              {item.title}
                                            </p>
                                            {item.subtitle && (
                                              <p className="truncate text-xs text-muted-foreground">
                                                {item.subtitle}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        {item.metrics[0] && (
                                          <div className="min-w-[7.5rem] text-right">
                                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                              {item.metrics[0].label}
                                            </p>
                                            <p className="text-sm font-semibold">
                                              {item.metrics[0].value}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {section.emptyMessage}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <OverviewTabLeaderboard
                topCashPlayers={overviewData.topCashPlayers}
                topNetWorthPlayers={overviewData.topNetWorthPlayers}
                topCompanies={overviewData.topCompanies}
                topCashCompanies={overviewData.topCashCompanies}
                topProducts={overviewData.topProducts}
              />
            )}
          </TabsContent>

          <TabsContent value="companies" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  All Companies
                </CardTitle>
                <CardDescription>
                  Complete listing of all companies with their statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!sortedCompanies ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : sortedCompanies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No companies have been created yet.
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead className="min-w-[220px]">
                            <SortableHeader
                              label="Company"
                              active={companySort.key === "name"}
                              onClick={() =>
                                toggleSort(companySort, setCompanySort, "name")
                              }
                            />
                          </TableHead>
                          <TableHead className="min-w-[160px]">
                            <SortableHeader
                              label="Owner"
                              active={companySort.key === "ownerName"}
                              onClick={() =>
                                toggleSort(
                                  companySort,
                                  setCompanySort,
                                  "ownerName"
                                )
                              }
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <SortableHeader
                              label="Cash"
                              numeric
                              active={companySort.key === "balance"}
                              onClick={() =>
                                toggleSort(
                                  companySort,
                                  setCompanySort,
                                  "balance"
                                )
                              }
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <SortableHeader
                              label="Net Worth"
                              numeric
                              active={companySort.key === "netWorth"}
                              onClick={() =>
                                toggleSort(
                                  companySort,
                                  setCompanySort,
                                  "netWorth"
                                )
                              }
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <SortableHeader
                              label="Market Cap"
                              numeric
                              active={companySort.key === "marketCap"}
                              onClick={() =>
                                toggleSort(
                                  companySort,
                                  setCompanySort,
                                  "marketCap"
                                )
                              }
                            />
                          </TableHead>
                          <TableHead>
                            <SortableHeader
                              label="Status"
                              active={companySort.key === "isPublic"}
                              onClick={() =>
                                toggleSort(
                                  companySort,
                                  setCompanySort,
                                  "isPublic"
                                )
                              }
                            />
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedCompanies.map((company: any, index: number) => (
                          <TableRow
                            key={company._id}
                            className="hover:bg-muted/40"
                          >
                            <TableCell className="font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {company.logoUrl ? (
                                  <img
                                    src={company.logoUrl}
                                    alt={company.name}
                                    className="w-8 h-8 rounded"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                    <Building2 className="h-4 w-4 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold">
                                    {company.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {company.ticker}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{company.ownerName}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(company.balance)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(company.netWorth)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(company.marketCap)}
                            </TableCell>
                            <TableCell>
                              {company.isPublic ? (
                                <Badge variant="default">Public</Badge>
                              ) : (
                                <Badge variant="secondary">Private</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="players" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  All Players
                </CardTitle>
                <CardDescription>
                  Complete listing of all players with their wealth statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!sortedPlayers ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : sortedPlayers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No players have joined yet.
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead className="min-w-[220px]">
                            <SortableHeader
                              label="Player"
                              active={playerSort.key === "name"}
                              onClick={() =>
                                toggleSort(playerSort, setPlayerSort, "name")
                              }
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <SortableHeader
                              label="Cash"
                              numeric
                              active={playerSort.key === "cashBalance"}
                              onClick={() =>
                                toggleSort(
                                  playerSort,
                                  setPlayerSort,
                                  "cashBalance"
                                )
                              }
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <SortableHeader
                              label="Portfolio"
                              numeric
                              active={playerSort.key === "portfolioValue"}
                              onClick={() =>
                                toggleSort(
                                  playerSort,
                                  setPlayerSort,
                                  "portfolioValue"
                                )
                              }
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <SortableHeader
                              label="Net Worth"
                              numeric
                              active={playerSort.key === "netWorth"}
                              onClick={() =>
                                toggleSort(
                                  playerSort,
                                  setPlayerSort,
                                  "netWorth"
                                )
                              }
                            />
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedPlayers.map((player: any, index: number) => (
                          <TableRow
                            key={player._id}
                            className="hover:bg-muted/40"
                          >
                            <TableCell className="font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  {player.avatarUrl ? (
                                    <AvatarImage
                                      src={player.avatarUrl}
                                      alt={player.name}
                                    />
                                  ) : null}
                                  <AvatarFallback>
                                    {getInitials(player.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold">{player.name}</p>
                                  {player.username && (
                                    <p className="text-xs text-muted-foreground">
                                      @{player.username}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(player.cashBalance)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(player.portfolioValue)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(player.netWorth)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  All Products
                </CardTitle>
                <CardDescription>
                  Complete listing of all products with their sales statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!sortedProducts ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : sortedProducts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No products have been created yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead className="min-w-[220px]">
                              <SortableHeader
                                label="Product"
                                active={productSort.key === "name"}
                                onClick={() =>
                                  toggleSort(
                                    productSort,
                                    setProductSort,
                                    "name"
                                  )
                                }
                              />
                            </TableHead>
                            <TableHead className="min-w-[200px] hidden md:table-cell">
                              <SortableHeader
                                label="Company"
                                active={productSort.key === "companyName"}
                                onClick={() =>
                                  toggleSort(
                                    productSort,
                                    setProductSort,
                                    "companyName"
                                  )
                                }
                              />
                            </TableHead>
                            <TableHead className="text-right">
                              <SortableHeader
                                label="Price"
                                numeric
                                active={productSort.key === "price"}
                                onClick={() =>
                                  toggleSort(
                                    productSort,
                                    setProductSort,
                                    "price"
                                  )
                                }
                              />
                            </TableHead>
                            <TableHead className="text-right">
                              <SortableHeader
                                label="Sales"
                                numeric
                                active={productSort.key === "totalSales"}
                                onClick={() =>
                                  toggleSort(
                                    productSort,
                                    setProductSort,
                                    "totalSales"
                                  )
                                }
                              />
                            </TableHead>
                            <TableHead className="text-right hidden lg:table-cell">
                              <SortableHeader
                                label="Revenue"
                                numeric
                                active={productSort.key === "totalRevenue"}
                                onClick={() =>
                                  toggleSort(
                                    productSort,
                                    setProductSort,
                                    "totalRevenue"
                                  )
                                }
                              />
                            </TableHead>
                            <TableHead className="text-right hidden lg:table-cell">
                              <SortableHeader
                                label="Profit"
                                numeric
                                active={productSort.key === "profit"}
                                onClick={() =>
                                  toggleSort(
                                    productSort,
                                    setProductSort,
                                    "profit"
                                  )
                                }
                              />
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedProducts.map((product: any, index: number) => (
                            <TableRow
                              key={product._id}
                              className="hover:bg-muted/40"
                            >
                              <TableCell className="font-medium">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="w-8 h-8 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                      <Package className="h-4 w-4 text-primary" />
                                    </div>
                                  )}
                                  <p className="font-semibold truncate max-w-[12rem]">
                                    {product.name}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                  {product.companyLogoUrl && (
                                    <img
                                      src={product.companyLogoUrl}
                                      alt={product.companyName}
                                      className="w-6 h-6 rounded"
                                    />
                                  )}
                                  <div>
                                    <p className="text-sm truncate max-w-[10rem]">
                                      {product.companyName}
                                    </p>
                                    {product.companyTicker && (
                                      <p className="text-xs text-muted-foreground">
                                        {product.companyTicker}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {formatCurrency(product.price)}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {formatNumber(product.totalSales)}
                              </TableCell>
                              <TableCell className="text-right hidden lg:table-cell whitespace-nowrap">
                                {formatCurrency(product.totalRevenue)}
                              </TableCell>
                              <TableCell className="text-right hidden lg:table-cell whitespace-nowrap">
                                <span
                                  className={
                                    product.profit >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  {formatCurrency(product.profit)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            {!allCompanies ? (
              <LeaderboardSkeleton />
            ) : (
              <CompaniesTabLeaderboard companies={allCompanies} />
            )}
          </TabsContent>

          <TabsContent value="players" className="mt-6">
            {!allPlayers ? (
              <LeaderboardSkeleton />
            ) : (
              <PlayersTabLeaderboard players={allPlayers} />
            )}
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            {!allProducts ? (
              <LeaderboardSkeleton />
            ) : (
              <ProductsTabLeaderboard products={allProducts} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
