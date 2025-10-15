import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  TrendingUp,
  Building2,
  Wallet,
  ShoppingBag,
  Package,
} from "lucide-react";

type Player = {
  _id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  cashBalance?: number;
  netWorth?: number;
};

type Company = {
  _id: string;
  name: string;
  ticker: string;
  logoUrl?: string | null;
  balance?: number;
  marketCap?: number;
};

type Product = {
  _id: string;
  name: string;
  imageUrl?: string | null;
  companyName: string;
  companyTicker?: string;
  companyLogoUrl?: string | null;
  totalSales: number;
};

interface OverviewTabProps {
  topCashPlayers: Player[];
  topNetWorthPlayers: Player[];
  topCompanies: Company[];
  topCashCompanies: Company[];
  topProducts: Product[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
      .slice(0, 3) || "U"
  );
}

export function OverviewTabLeaderboard({
  topCashPlayers,
  topNetWorthPlayers,
  topCompanies,
  topCashCompanies,
  topProducts,
}: OverviewTabProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Highest Cash Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCashPlayers.map((player, index) => (
              <div key={player._id} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                  {index + 1}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={player.avatarUrl || "/placeholder.svg"}
                    alt={player.name}
                  />
                  <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{player.name}</p>
                  {player.username && (
                    <p className="text-sm text-muted-foreground">
                      @{player.username}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatCurrency(player.cashBalance ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Highest Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topNetWorthPlayers.map((player, index) => (
              <div key={player._id} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                  {index + 1}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={player.avatarUrl || "/placeholder.svg"}
                    alt={player.name}
                  />
                  <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{player.name}</p>
                  {player.username && (
                    <p className="text-sm text-muted-foreground">
                      @{player.username}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatCurrency(player.netWorth ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Most Valuable Companies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCompanies.map((company, index) => (
              <div key={company._id} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                  {index + 1}
                </div>
                <Avatar className="h-10 w-10 rounded-md">
                  <AvatarImage
                    src={company.logoUrl || "/placeholder.svg"}
                    alt={company.name}
                  />
                  <AvatarFallback>
                    <Building2 className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{company.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {company.ticker}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatCurrency(company.marketCap ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Most Cash on Hand (Company)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCashCompanies.map((company, index) => (
              <div key={company._id} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                  {index + 1}
                </div>
                <Avatar className="h-10 w-10 rounded-md">
                  <AvatarImage
                    src={company.logoUrl || "/placeholder.svg"}
                    alt={company.name}
                  />
                  <AvatarFallback>
                    <Building2 className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{company.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {company.ticker}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatCurrency(company.balance ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Best Selling Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product._id} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                  {index + 1}
                </div>
                <Avatar className="h-10 w-10 rounded-md">
                  <AvatarImage
                    src={product.imageUrl || "/placeholder.svg"}
                    alt={product.name}
                  />
                  <AvatarFallback>
                    <Package className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{product.name}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-4 w-4 rounded-sm">
                      <AvatarImage
                        src={product.companyLogoUrl || "/placeholder.svg"}
                        alt={product.companyName}
                      />
                      <AvatarFallback className="text-[8px]">
                        {product.companyTicker || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-muted-foreground">
                      {product.companyName}
                      {product.companyTicker && ` · ${product.companyTicker}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatNumber(product.totalSales)} units
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
