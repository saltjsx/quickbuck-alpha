import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { FunctionReturnType } from "convex/server";

type Portfolio = FunctionReturnType<typeof api.stocks.getPortfolio>;

interface StockMarketTabProps {
  portfolio: Portfolio | undefined;
}

export function StockMarketTab({ portfolio }: StockMarketTabProps) {
  const publicCompanies = useQuery(api.companies.getPublicCompanies);

  return (
    <Tabs defaultValue="market" className="space-y-4">
      <TabsList>
        <TabsTrigger value="market">Market</TabsTrigger>
        <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>
      </TabsList>

      <TabsContent value="market">
        <Card>
          <CardHeader>
            <CardTitle>Stock Market</CardTitle>
            <CardDescription>
              Companies with balance over $50,000 are publicly traded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {publicCompanies === undefined ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Loading companies...
                </p>
              </div>
            ) : publicCompanies.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No public companies yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Companies become public when they reach $50,000 in balance
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {publicCompanies.map((company: any) => (
                  <div
                    key={company._id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {company.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Founded by {company.ownerName}
                        </p>
                        {company.description && (
                          <p className="text-sm mt-1">{company.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Company Value
                            </p>
                            <p className="font-semibold">
                              $
                              {company.balance?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Share Price
                            </p>
                            <p className="font-semibold text-green-600">
                              ${company.sharePrice?.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="portfolio">
        <Card>
          <CardHeader>
            <CardTitle>My Portfolio</CardTitle>
            <CardDescription>
              Your stock holdings and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {portfolio === undefined ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Loading portfolio...
                </p>
              </div>
            ) : portfolio.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No holdings yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start investing in public companies!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {portfolio.map((holding: any) => (
                  <div key={holding._id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{holding.companyName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {holding.shares} shares @ $
                          {holding.averagePurchasePrice.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          $
                          {holding.currentValue.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <div
                          className={`flex items-center gap-1 text-sm ${
                            holding.gainLoss >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {holding.gainLoss >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span>
                            ${Math.abs(holding.gainLoss).toFixed(2)} (
                            {holding.gainLossPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
