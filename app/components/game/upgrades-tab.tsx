import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Spinner } from "~/components/ui/spinner";
import { toast } from "~/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Package,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { UseRevenueBoostDialog } from "./use-revenue-boost-dialog";
import { UseStockPriceBoostDialog } from "./use-stock-price-boost-dialog";
import { UseStockPriceLowerDialog } from "./use-stock-price-lower-dialog";

export function UpgradesTab() {
  const activeUpgrades = useQuery(api.upgrades.getActiveUpgrades);
  const userUpgrades = useQuery(api.upgrades.getUserUpgrades);
  const unusedUpgrades = useQuery(api.upgrades.getUnusedUpgrades);
  const purchaseUpgrade = useMutation(api.upgrades.purchaseUpgrade);

  const [purchasingUpgradeId, setPurchasingUpgradeId] = useState<string | null>(
    null
  );
  const [selectedUpgradeForUse, setSelectedUpgradeForUse] = useState<{
    userUpgradeId: Id<"userUpgrades">;
    type: string;
  } | null>(null);

  const handlePurchaseUpgrade = async (upgradeId: Id<"upgrades">) => {
    setPurchasingUpgradeId(upgradeId);
    try {
      const result = await purchaseUpgrade({ upgradeId });
      toast({
        title: "Upgrade Purchased!",
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPurchasingUpgradeId(null);
    }
  };

  const getUpgradeIcon = (type: string) => {
    switch (type) {
      case "revenue_boost":
        return <DollarSign className="h-5 w-5" />;
      case "stock_price_boost":
        return <TrendingUp className="h-5 w-5" />;
      case "stock_price_lower":
        return <TrendingDown className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "low":
        return "bg-gray-500";
      case "medium":
        return "bg-blue-500";
      case "high":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case "low":
        return "Low Tier";
      case "medium":
        return "Medium Tier";
      case "high":
        return "High Tier";
      default:
        return tier;
    }
  };

  if (
    activeUpgrades === undefined ||
    userUpgrades === undefined ||
    unusedUpgrades === undefined
  ) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-yellow-500" />
        <h2 className="text-2xl font-bold">Power Upgrades</h2>
      </div>

      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shop">Upgrade Shop</TabsTrigger>
          <TabsTrigger value="inventory">
            My Upgrades
            {unusedUpgrades.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unusedUpgrades.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Power Upgrades</strong> give you strategic advantages in
              the game. Use them wisely to boost your companies or manipulate
              the market!
            </p>
          </div>

          {/* Revenue Boost Upgrades */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Revenue Boost
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Instantly increase your company's product revenue
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeUpgrades
                ?.filter((u) => u.type === "revenue_boost")
                .map((upgrade) => (
                  <Card
                    key={upgrade._id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge className={getTierColor(upgrade.tier)}>
                          {getTierLabel(upgrade.tier)}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {getUpgradeIcon(upgrade.type)}
                          <span className="text-lg font-bold">
                            +{upgrade.effectPercentage}%
                          </span>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{upgrade.name}</CardTitle>
                      <CardDescription>{upgrade.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Price:</span>
                          <span className="text-lg font-bold text-green-600">
                            ${upgrade.price.toLocaleString()}
                          </span>
                        </div>
                        <Button
                          onClick={() => handlePurchaseUpgrade(upgrade._id)}
                          disabled={purchasingUpgradeId === upgrade._id}
                          className="w-full"
                        >
                          {purchasingUpgradeId === upgrade._id ? (
                            <Spinner size="sm" className="mr-2" />
                          ) : null}
                          Purchase Upgrade
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* Stock Price Boost Upgrades */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Stock Price Boost
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Increase any stock's price on the market
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeUpgrades
                ?.filter((u) => u.type === "stock_price_boost")
                .map((upgrade) => (
                  <Card
                    key={upgrade._id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge className={getTierColor(upgrade.tier)}>
                          {getTierLabel(upgrade.tier)}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {getUpgradeIcon(upgrade.type)}
                          <span className="text-lg font-bold">
                            +{upgrade.effectPercentage}%
                          </span>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{upgrade.name}</CardTitle>
                      <CardDescription>{upgrade.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Price:</span>
                          <span className="text-lg font-bold text-green-600">
                            ${upgrade.price.toLocaleString()}
                          </span>
                        </div>
                        <Button
                          onClick={() => handlePurchaseUpgrade(upgrade._id)}
                          disabled={purchasingUpgradeId === upgrade._id}
                          className="w-full"
                        >
                          {purchasingUpgradeId === upgrade._id ? (
                            <Spinner size="sm" className="mr-2" />
                          ) : null}
                          Purchase Upgrade
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* Stock Price Lower Upgrades */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Stock Price Lower
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Decrease any stock's price on the market
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeUpgrades
                ?.filter((u) => u.type === "stock_price_lower")
                .map((upgrade) => (
                  <Card
                    key={upgrade._id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge className={getTierColor(upgrade.tier)}>
                          {getTierLabel(upgrade.tier)}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {getUpgradeIcon(upgrade.type)}
                          <span className="text-lg font-bold">
                            -{upgrade.effectPercentage}%
                          </span>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{upgrade.name}</CardTitle>
                      <CardDescription>{upgrade.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Price:</span>
                          <span className="text-lg font-bold text-green-600">
                            ${upgrade.price.toLocaleString()}
                          </span>
                        </div>
                        <Button
                          onClick={() => handlePurchaseUpgrade(upgrade._id)}
                          disabled={purchasingUpgradeId === upgrade._id}
                          className="w-full"
                          variant="destructive"
                        >
                          {purchasingUpgradeId === upgrade._id ? (
                            <Spinner size="sm" className="mr-2" />
                          ) : null}
                          Purchase Upgrade
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          {userUpgrades.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  You haven't purchased any upgrades yet.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Visit the Upgrade Shop to purchase power-ups!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userUpgrades.map((userUpgrade) => (
                <Card
                  key={userUpgrade._id}
                  className={userUpgrade.isUsed ? "opacity-60" : ""}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge
                        className={getTierColor(
                          userUpgrade.upgrade?.tier || "low"
                        )}
                      >
                        {getTierLabel(userUpgrade.upgrade?.tier || "low")}
                      </Badge>
                      {userUpgrade.isUsed ? (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Used
                        </Badge>
                      ) : (
                        <Badge
                          variant="default"
                          className="flex items-center gap-1 bg-green-500"
                        >
                          <Clock className="h-3 w-3" />
                          Ready
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getUpgradeIcon(userUpgrade.upgrade?.type || "")}
                      {userUpgrade.upgrade?.name}
                    </CardTitle>
                    <CardDescription>
                      {userUpgrade.upgrade?.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        <div className="flex justify-between mb-1">
                          <span>Effect:</span>
                          <span className="font-semibold">
                            {userUpgrade.upgrade?.type === "stock_price_lower"
                              ? "-"
                              : "+"}
                            {userUpgrade.upgrade?.effectPercentage}%
                          </span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>Purchased for:</span>
                          <span>
                            ${userUpgrade.purchasePrice.toLocaleString()}
                          </span>
                        </div>
                        {userUpgrade.isUsed && userUpgrade.targetName && (
                          <div className="flex justify-between mb-1">
                            <span>Used on:</span>
                            <span className="font-semibold">
                              {userUpgrade.targetName}
                            </span>
                          </div>
                        )}
                        {userUpgrade.isUsed && userUpgrade.usedAt && (
                          <div className="flex justify-between">
                            <span>Used at:</span>
                            <span>
                              {new Date(
                                userUpgrade.usedAt
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      {!userUpgrade.isUsed && (
                        <Button
                          onClick={() =>
                            setSelectedUpgradeForUse({
                              userUpgradeId: userUpgrade._id,
                              type: userUpgrade.upgrade?.type || "",
                            })
                          }
                          className="w-full"
                          variant="default"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Use Upgrade
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs for using upgrades */}
      {selectedUpgradeForUse?.type === "revenue_boost" && (
        <UseRevenueBoostDialog
          userUpgradeId={selectedUpgradeForUse.userUpgradeId}
          open={true}
          onOpenChange={(open) => !open && setSelectedUpgradeForUse(null)}
        />
      )}
      {selectedUpgradeForUse?.type === "stock_price_boost" && (
        <UseStockPriceBoostDialog
          userUpgradeId={selectedUpgradeForUse.userUpgradeId}
          open={true}
          onOpenChange={(open) => !open && setSelectedUpgradeForUse(null)}
        />
      )}
      {selectedUpgradeForUse?.type === "stock_price_lower" && (
        <UseStockPriceLowerDialog
          userUpgradeId={selectedUpgradeForUse.userUpgradeId}
          open={true}
          onOpenChange={(open) => !open && setSelectedUpgradeForUse(null)}
        />
      )}
    </div>
  );
}
