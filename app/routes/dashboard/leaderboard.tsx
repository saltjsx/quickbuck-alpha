import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Trophy, Building2, User, Package } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Skeleton } from "~/components/ui/skeleton";
import type { MetaFunction } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
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
