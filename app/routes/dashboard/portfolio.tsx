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
import { Badge } from "~/components/ui/badge";
import { TrendingUp, TrendingDown, Package, Building2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CollectionsTab } from "~/components/game";
import type { Route } from "./+types/portfolio";
import type { Id } from "../../../convex/_generated/dataModel";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Portfolio - QuickBuck" },
    {
      name: "description",
      content:
        "Track your stock investments, view gains/losses, and manage your investment portfolio in QuickBuck.",
    },
  ];
}

export default function PortfolioPage() {
  const navigate = useNavigate();
  const portfolio = useQuery(api.stocks.getPortfolio);
  const companies = useQuery(api.companies.getUserCompanies);

  if (portfolio === undefined || companies === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  // Calculate total portfolio value
  const totalPortfolioValue = portfolio.reduce(
    (sum, holding) => sum + (holding?.currentValue || 0),
    0
  );
  const totalGainLoss = portfolio.reduce(
    (sum, holding) => sum + (holding?.gainLoss || 0),
    0
  );
  const totalGainLossPercent =
    portfolio.length > 0
      ? (totalGainLoss /
          portfolio.reduce(
            (sum, holding) => sum + (holding?.costBasis || 0),
            0
          )) *
        100
      : 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8" />
              My Portfolio
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your investments and performance
            </p>
          </div>

          <div className="px-4 lg:px-6 space-y-4">
            {/* Tabs for Stocks and Collections */}
            <Tabs defaultValue="stocks" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-2xl">
                <TabsTrigger value="stocks">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  My Stocks
                </TabsTrigger>
                <TabsTrigger value="companies">
                  <Building2 className="h-4 w-4 mr-2" />
                  Company Portfolios
                </TabsTrigger>
                <TabsTrigger value="collections">
                  <Package className="h-4 w-4 mr-2" />
                  Collections
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stocks" className="space-y-4 mt-4">
                {/* Portfolio Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio Value</CardTitle>
                    <CardDescription>Your total investment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-4">
                      <p className="text-4xl font-bold">
                        ${totalPortfolioValue.toFixed(2)}
                      </p>
                      {totalGainLoss !== 0 && (
                        <div
                          className={`flex items-center gap-1 ${
                            totalGainLoss >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {totalGainLoss >= 0 ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : (
                            <TrendingDown className="h-5 w-5" />
                          )}
                          <span className="text-lg font-semibold">
                            ${Math.abs(totalGainLoss).toFixed(2)} (
                            {totalGainLossPercent > 0 ? "+" : ""}
                            {totalGainLossPercent.toFixed(2)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Holdings */}
                <Card>
                  <CardHeader>
                    <CardTitle>My Holdings</CardTitle>
                    <CardDescription>Your stock positions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {portfolio.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No holdings yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Start investing in public companies!
                        </p>
                        <Button
                          className="mt-4"
                          onClick={() => navigate("/dashboard/stocks")}
                        >
                          Browse Market
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {portfolio.map((holding: any) => {
                          if (!holding) return null;
                          const isPositive = holding.gainLoss >= 0;
                          return (
                            <Card
                              key={holding._id}
                              className="cursor-pointer hover:bg-accent/50 transition-colors"
                              onClick={() =>
                                navigate(
                                  `/dashboard/stocks/${holding.companyId}`
                                )
                              }
                            >
                              <CardContent className="pt-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {holding.companyLogoUrl && (
                                        <img
                                          src={holding.companyLogoUrl}
                                          alt={holding.companyName}
                                          className="h-8 w-8 object-contain rounded border"
                                        />
                                      )}
                                      <div>
                                        <h3 className="font-semibold">
                                          {holding.companyName}
                                        </h3>
                                        <Badge
                                          variant="outline"
                                          className="font-mono text-xs"
                                        >
                                          {holding.companyTicker}
                                        </Badge>
                                      </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {holding.shares} shares @ $
                                      {holding.averagePurchasePrice.toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-lg">
                                      $
                                      {holding.currentValue.toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 2,
                                        }
                                      )}
                                    </p>
                                    <div
                                      className={`flex items-center gap-1 text-sm justify-end ${
                                        isPositive
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {isPositive ? (
                                        <TrendingUp className="h-4 w-4" />
                                      ) : (
                                        <TrendingDown className="h-4 w-4" />
                                      )}
                                      <span>
                                        ${Math.abs(holding.gainLoss).toFixed(2)}{" "}
                                        ({holding.gainLossPercent.toFixed(2)}
                                        %)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="companies" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Portfolios</CardTitle>
                    <CardDescription>
                      Track stock investments made by your companies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {companies.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          No companies yet
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Create a company to start investing!
                        </p>
                        <Button
                          className="mt-4"
                          onClick={() => navigate("/dashboard/companies")}
                        >
                          Create Company
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {companies.map((company: any) => (
                          <CompanyPortfolioSection
                            key={company._id}
                            company={company}
                            navigate={navigate}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="collections" className="mt-4">
                <CollectionsTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component to show a single company's portfolio
function CompanyPortfolioSection({
  company,
  navigate,
}: {
  company: any;
  navigate: (path: string) => void;
}) {
  const companyPortfolio = useQuery(
    api.stocks.getHolderPortfolio,
    company._id
      ? {
          holderId: company._id as Id<"companies">,
          holderType: "company" as const,
        }
      : "skip"
  );

  if (companyPortfolio === undefined) {
    return (
      <div className="p-6 border rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          {company.logoUrl && (
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-10 w-10 object-contain rounded border"
            />
          )}
          <div>
            <h3 className="font-semibold text-lg">{company.name}</h3>
            {company.ticker && (
              <Badge variant="outline" className="font-mono text-xs mt-1">
                {company.ticker}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">
            Loading portfolio...
          </p>
        </div>
      </div>
    );
  }

  const totalPortfolioValue = companyPortfolio.reduce(
    (sum, holding) => sum + (holding?.currentValue || 0),
    0
  );
  const totalGainLoss = companyPortfolio.reduce(
    (sum, holding) => sum + (holding?.gainLoss || 0),
    0
  );

  return (
    <div className="p-6 border rounded-lg">
      {/* Company Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {company.logoUrl && (
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-10 w-10 object-contain rounded border"
            />
          )}
          <div>
            <h3 className="font-semibold text-lg">{company.name}</h3>
            {company.ticker && (
              <Badge variant="outline" className="font-mono text-xs mt-1">
                {company.ticker}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Portfolio Value</p>
          <p className="text-2xl font-bold">
            $
            {totalPortfolioValue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          {totalGainLoss !== 0 && (
            <div
              className={`flex items-center gap-1 text-sm justify-end mt-1 ${
                totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {totalGainLoss >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>${Math.abs(totalGainLoss).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Holdings */}
      {companyPortfolio.length === 0 ? (
        <div className="text-center py-6 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">No investments yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            This company hasn't invested in any stocks
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => navigate("/dashboard/stocks")}
          >
            Browse Stocks
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {companyPortfolio.map((holding: any) => {
            if (!holding) return null;
            const isPositive = holding.gainLoss >= 0;
            return (
              <div
                key={holding._id}
                className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() =>
                  navigate(`/dashboard/stocks/${holding.companyId}`)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {holding.companyLogoUrl && (
                        <img
                          src={holding.companyLogoUrl}
                          alt={holding.companyName}
                          className="h-6 w-6 object-contain rounded border"
                        />
                      )}
                      <div>
                        <h4 className="font-medium text-sm">
                          {holding.companyName}
                        </h4>
                        <Badge variant="outline" className="font-mono text-xs">
                          {holding.companyTicker}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
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
                      className={`flex items-center gap-1 text-xs justify-end ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>
                        ${Math.abs(holding.gainLoss).toFixed(2)} (
                        {holding.gainLossPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
