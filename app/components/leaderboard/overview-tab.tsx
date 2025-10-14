import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Building2, Wallet, ShoppingBag } from "lucide-react";

const topPlayers = [
  {
    position: 1,
    name: "Sarah Chen",
    username: "@sarahc",
    avatar: "/diverse-woman-avatar.png",
    balance: "$2,450,000",
  },
  {
    position: 2,
    name: "Marcus Johnson",
    username: "@marcusj",
    avatar: "/man-avatar.png",
    balance: "$2,100,000",
  },
  {
    position: 3,
    name: "Elena Rodriguez",
    username: "@elenar",
    avatar: "/woman-avatar-2.png",
    balance: "$1,890,000",
  },
  {
    position: 4,
    name: "David Kim",
    username: "@davidk",
    avatar: "/man-avatar-2.png",
    balance: "$1,750,000",
  },
  {
    position: 5,
    name: "Aisha Patel",
    username: "@aishaP",
    avatar: "/woman-avatar-3.png",
    balance: "$1,620,000",
  },
];

const topNetWorth = [
  {
    position: 1,
    name: "Marcus Johnson",
    username: "@marcusj",
    avatar: "/man-avatar.png",
    netWorth: "$8,950,000",
  },
  {
    position: 2,
    name: "Sarah Chen",
    username: "@sarahc",
    avatar: "/diverse-woman-avatar.png",
    netWorth: "$7,200,000",
  },
  {
    position: 3,
    name: "James Wilson",
    username: "@jamesw",
    avatar: "/man-avatar-3.png",
    netWorth: "$6,800,000",
  },
  {
    position: 4,
    name: "Elena Rodriguez",
    username: "@elenar",
    avatar: "/woman-avatar-2.png",
    netWorth: "$5,950,000",
  },
  {
    position: 5,
    name: "David Kim",
    username: "@davidk",
    avatar: "/man-avatar-2.png",
    netWorth: "$5,100,000",
  },
];

const topCompanies = [
  {
    position: 1,
    name: "TechVision Inc",
    ticker: "TECH",
    logo: "/tech-company-logo.jpg",
    marketCap: "$45.2M",
  },
  {
    position: 2,
    name: "GreenEnergy Corp",
    ticker: "GREN",
    logo: "/energy-company-logo.jpg",
    marketCap: "$38.7M",
  },
  {
    position: 3,
    name: "FinanceHub",
    ticker: "FHUB",
    logo: "/finance-company-logo.png",
    marketCap: "$32.1M",
  },
  {
    position: 4,
    name: "MediCare Plus",
    ticker: "MEDI",
    logo: "/medical-company-logo.png",
    marketCap: "$28.9M",
  },
  {
    position: 5,
    name: "AutoDrive Systems",
    ticker: "AUTO",
    logo: "/auto-company-logo.jpg",
    marketCap: "$25.4M",
  },
];

const topCompanyCash = [
  {
    position: 1,
    name: "TechVision Inc",
    ticker: "TECH",
    logo: "/tech-company-logo.jpg",
    cash: "$12.5M",
  },
  {
    position: 2,
    name: "FinanceHub",
    ticker: "FHUB",
    logo: "/finance-company-logo.png",
    cash: "$9.8M",
  },
  {
    position: 3,
    name: "GreenEnergy Corp",
    ticker: "GREN",
    logo: "/energy-company-logo.jpg",
    cash: "$8.2M",
  },
  {
    position: 4,
    name: "RetailMax",
    ticker: "RMAX",
    logo: "/abstract-retail-logo.png",
    cash: "$7.1M",
  },
  {
    position: 5,
    name: "MediCare Plus",
    ticker: "MEDI",
    logo: "/medical-company-logo.png",
    cash: "$6.9M",
  },
];

const topProducts = [
  {
    position: 1,
    name: "SmartPhone X1",
    company: "TechVision Inc",
    ticker: "TECH",
    logo: "/tech-company-logo.jpg",
    image: "/modern-smartphone.png",
    sales: "45,230 units",
  },
  {
    position: 2,
    name: "Solar Panel Pro",
    company: "GreenEnergy Corp",
    ticker: "GREN",
    logo: "/energy-company-logo.jpg",
    image: "/solar-panel-installation.png",
    sales: "38,920 units",
  },
  {
    position: 3,
    name: "Premium Laptop",
    company: "TechVision Inc",
    ticker: "TECH",
    logo: "/tech-company-logo.jpg",
    image: "/modern-laptop-workspace.png",
    sales: "32,150 units",
  },
  {
    position: 4,
    name: "Health Monitor",
    company: "MediCare Plus",
    ticker: "MEDI",
    logo: "/medical-company-logo.png",
    image: "/modern-health-device.png",
    sales: "28,640 units",
  },
  {
    position: 5,
    name: "Electric Charger",
    company: "AutoDrive Systems",
    ticker: "AUTO",
    logo: "/auto-company-logo.jpg",
    image: "/electric-vehicle-charger.png",
    sales: "25,890 units",
  },
];

export function OverviewTab() {
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
            {topPlayers.map((player) => (
              <div key={player.position} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                  {player.position}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={player.avatar || "/placeholder.svg"}
                    alt={player.name}
                  />
                  <AvatarFallback>
                    {player.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{player.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {player.username}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{player.balance}</p>
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
            {topNetWorth.map((player) => (
              <div key={player.position} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                  {player.position}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={player.avatar || "/placeholder.svg"}
                    alt={player.name}
                  />
                  <AvatarFallback>
                    {player.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{player.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {player.username}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{player.netWorth}</p>
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
            {topCompanies.map((company) => (
              <div key={company.position} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                  {company.position}
                </div>
                <Avatar className="h-10 w-10 rounded-md">
                  <AvatarImage
                    src={company.logo || "/placeholder.svg"}
                    alt={company.name}
                  />
                  <AvatarFallback>{company.ticker}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{company.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {company.ticker}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{company.marketCap}</p>
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
            {topCompanyCash.map((company) => (
              <div key={company.position} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                  {company.position}
                </div>
                <Avatar className="h-10 w-10 rounded-md">
                  <AvatarImage
                    src={company.logo || "/placeholder.svg"}
                    alt={company.name}
                  />
                  <AvatarFallback>{company.ticker}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{company.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {company.ticker}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{company.cash}</p>
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
            {topProducts.map((product) => (
              <div key={product.position} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                  {product.position}
                </div>
                <Avatar className="h-10 w-10 rounded-md">
                  <AvatarImage
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                  />
                  <AvatarFallback>P</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{product.name}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-4 w-4 rounded-sm">
                      <AvatarImage
                        src={product.logo || "/placeholder.svg"}
                        alt={product.company}
                      />
                      <AvatarFallback>{product.ticker}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-muted-foreground">
                      {product.company} · {product.ticker}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{product.sales}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
