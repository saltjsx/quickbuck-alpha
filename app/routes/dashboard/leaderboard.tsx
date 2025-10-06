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
  TrendingUp,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
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

type LeaderboardPlayer = {
  accountId: string;
  userId: string;
  name: string;
  username?: string | null;
  balance?: number;
  cashBalance?: number;
  portfolioValue?: number;
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

function LastUpdated({ timestamp }: { timestamp?: number }) {
  if (!timestamp) return null;

  const formatted = new Date(timestamp).toLocaleString();
  return (
    <p className="text-xs text-muted-foreground">Last updated {formatted}</p>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="grid gap-6">
      {[...Array(5)].map((_, index) => (
        <Card key={index} className="border-border/50 bg-muted/10">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((__, rowIndex) => (
              <div
                key={rowIndex}
                className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="space-y-2 text-right">
                    <Skeleton className="ml-auto h-3 w-24" />
                    <Skeleton className="ml-auto h-4 w-20" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="ml-auto h-3 w-20" />
                    <Skeleton className="ml-auto h-4 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
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

  const leaderboard = useQuery(api.leaderboard.getLeaderboard, { limit: 5 }) as
    | LeaderboardData
    | undefined;

  const allCompanies = useQuery(api.leaderboard.getAllCompanies, {});
  const allPlayers = useQuery(api.leaderboard.getAllPlayers, {});
  const allProducts = useQuery(api.leaderboard.getAllProducts, {});

  const isLoading = leaderboard === undefined;

  const sections = useMemo<LeaderboardSection[] | null>(() => {
    if (!leaderboard) {
      return null;
    }

    return [
      {
        id: "highest-balance-players",
        title: "Top Cash Players",
        description: "Players with the largest personal account balances.",
        icon: PiggyBank,
        items: leaderboard.highestBalancePlayers.map((player, index) => ({
          key: String(player.accountId ?? index),
          rank: index + 1,
          title: player.name,
          subtitle: player.username ? `@${player.username}` : undefined,
          avatarUrl: player.avatarUrl,
          fallback: getInitials(player.name),
          metrics: [
            {
              label: "Cash",
              value: formatCurrency(player.balance ?? 0),
              highlight: true,
            },
          ],
        })),
        emptyMessage: "Nobody has earned cash yet. Be the first!",
      },
      {
        id: "highest-net-worth",
        title: "Highest Net Worth",
        description: "Combined cash and portfolio value across the game.",
        icon: Trophy,
        items: leaderboard.highestNetWorthPlayers.map((player, index) => ({
          key: String(player.accountId ?? index),
          rank: index + 1,
          title: player.name,
          subtitle: player.username ? `@${player.username}` : undefined,
          avatarUrl: player.avatarUrl,
          fallback: getInitials(player.name),
          metrics: [
            {
              label: "Net Worth",
              value: formatCurrency(player.netWorth ?? 0),
              highlight: true,
            },
            {
              label: "Cash",
              value: formatCurrency(player.cashBalance ?? 0),
            },
            {
              label: "Portfolio",
              value: formatCurrency(player.portfolioValue ?? 0),
            },
          ],
        })),
        emptyMessage: "Start investing to climb this chart.",
      },
      {
        id: "most-valuable-companies",
        title: "Most Valuable Companies",
        description: "Highest market capitalization among all companies.",
        icon: Building2,
        items: leaderboard.mostValuableCompanies.map((company, index) => ({
          key: String(company.companyId ?? index),
          rank: index + 1,
          title: company.name,
          subtitle: company.ticker,
          avatarUrl: company.logoUrl,
          fallback: getInitials(company.name),
          metrics: [
            {
              label: "Market Cap",
              value: formatCurrency(company.marketCap ?? 0),
              highlight: true,
            },
            {
              label: "Share Price",
              value: formatCurrency(company.sharePrice ?? 0),
            },
          ],
        })),
        emptyMessage: "No companies valued yet. Build something great!",
      },
      {
        id: "most-cash-companies",
        title: "Most Cash on Hand",
        description:
          "Companies with the largest bank balances ready to deploy.",
        icon: DollarSign,
        items: leaderboard.mostCashCompanies.map((company, index) => ({
          key: String(company.companyId ?? index),
          rank: index + 1,
          title: company.name,
          subtitle: company.ticker,
          avatarUrl: company.logoUrl,
          fallback: getInitials(company.name),
          metrics: [
            {
              label: "Cash",
              value: formatCurrency(company.balance ?? 0),
              highlight: true,
            },
            {
              label: "Market Cap",
              value: formatCurrency(company.marketCap ?? 0),
            },
          ],
        })),
        emptyMessage: "Grow your company to top the cash leaderboard.",
      },
      {
        id: "best-selling-products",
        title: "Best Selling Products",
        description: "Products with the highest lifetime unit sales.",
        icon: ShoppingCart,
        items: leaderboard.bestSellingProducts.map((product, index) => ({
          key: String(product.productId ?? index),
          rank: index + 1,
          title: product.name,
          subtitle: product.companyTicker
            ? `${product.companyName} • ${product.companyTicker}`
            : product.companyName,
          avatarUrl: product.imageUrl || product.companyLogoUrl,
          fallback: getInitials(product.name),
          metrics: [
            {
              label: "Units Sold",
              value: formatNumber(product.totalSales ?? 0),
              highlight: true,
            },
            {
              label: "Price",
              value: formatCurrency(product.price ?? 0),
            },
          ],
        })),
        emptyMessage:
          "No products have sold yet. Launch something in the marketplace!",
      },
    ];
  }, [leaderboard]);

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
            {isLoading || !sections ? (
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
                        <div className="space-y-4">
                          {section.items.map((item) => (
                            <div
                              key={item.key}
                              className={cn(
                                "flex flex-col gap-4 rounded-2xl border p-4 transition-colors md:flex-row md:items-center md:justify-between",
                                getItemAccent(item.rank)
                              )}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-4">
                                <div
                                  className={cn(
                                    "flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-semibold",
                                    getRankBadgeClasses(item.rank)
                                  )}
                                >
                                  {item.rank}
                                </div>
                                <Avatar className="h-12 w-12">
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
                              <div className="flex flex-wrap items-end justify-end gap-4 md:flex-row">
                                {item.metrics.map((metric) => (
                                  <div
                                    key={`${item.key}-${metric.label}`}
                                    className="min-w-[6rem] text-right"
                                  >
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                      {metric.label}
                                    </p>
                                    <p
                                      className={cn(
                                        "font-semibold",
                                        metric.highlight
                                          ? "text-lg md:text-xl"
                                          : "text-sm md:text-base"
                                      )}
                                    >
                                      {metric.value}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
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
                {!allCompanies ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : allCompanies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No companies have been created yet.
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead className="text-right">Cash</TableHead>
                          <TableHead className="text-right">
                            Stock Holdings
                          </TableHead>
                          <TableHead className="text-right">
                            Net Worth
                          </TableHead>
                          <TableHead className="text-right">
                            Share Price
                          </TableHead>
                          <TableHead className="text-right">
                            Market Cap
                          </TableHead>
                          <TableHead className="text-right">
                            Monthly Rev
                          </TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allCompanies
                          .sort((a, b) => b.netWorth - a.netWorth)
                          .map((company, index) => (
                            <TableRow key={company._id}>
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
                              <TableCell className="text-right">
                                {formatCurrency(company.portfolioValue)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(company.netWorth)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(company.sharePrice)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(company.marketCap)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(company.monthlyRevenue)}
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
                {!allPlayers ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : allPlayers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No players have joined yet.
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead className="text-right">Cash</TableHead>
                          <TableHead className="text-right">
                            Portfolio
                          </TableHead>
                          <TableHead className="text-right">
                            Net Worth
                          </TableHead>
                          <TableHead className="text-right">Holdings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allPlayers
                          .sort((a, b) => b.netWorth - a.netWorth)
                          .map((player, index) => (
                            <TableRow key={player._id}>
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
                                    <p className="font-semibold">
                                      {player.name}
                                    </p>
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
                              <TableCell className="text-right">
                                {player.totalHoldings}
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
                {!allProducts ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : allProducts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No products have been created yet.
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Sales</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                          <TableHead className="text-right">Quality</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allProducts
                          .sort((a, b) => b.totalSales - a.totalSales)
                          .map((product, index) => (
                            <TableRow key={product._id}>
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
                                  <p className="font-semibold">
                                    {product.name}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {product.companyLogoUrl && (
                                    <img
                                      src={product.companyLogoUrl}
                                      alt={product.companyName}
                                      className="w-6 h-6 rounded"
                                    />
                                  )}
                                  <div>
                                    <p className="text-sm">
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
                              <TableCell className="text-right">
                                {formatCurrency(product.price)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(product.totalSales)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(product.totalRevenue)}
                              </TableCell>
                              <TableCell className="text-right">
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
                              <TableCell className="text-right">
                                {product.quality.toFixed(0)}%
                              </TableCell>
                              <TableCell>
                                {product.isActive ? (
                                  <Badge variant="default">Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Inactive</Badge>
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
        </Tabs>
      </div>
    </div>
  );
}
