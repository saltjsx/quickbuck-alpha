import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Package, TrendingUp, TrendingDown } from "lucide-react";

export function CollectionsTab() {
  const collection = useQuery(api.collections.getMyCollection);
  const stats = useQuery(api.collections.getCollectionStats);

  if (collection === undefined || stats === undefined) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-sm text-muted-foreground">
          Loading collection...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Collection Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            My Collection
          </CardTitle>
          <CardDescription>
            Items you've purchased from the marketplace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold text-red-600">
                ${stats.totalSpent.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Value</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.totalValue.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Value Change</p>
              <div
                className={`flex items-center gap-1 ${
                  (stats.priceChange ?? 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {(stats.priceChange ?? 0) >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                <p className="text-2xl font-bold">
                  {(stats.priceChange ?? 0) >= 0 ? "+" : ""}
                  {(stats.priceChangePercent ?? 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collection Items */}
      <Card>
        <CardHeader>
          <CardTitle>Your Items</CardTitle>
          <CardDescription>
            {collection.length === 0
              ? "No items yet"
              : `${collection.length} item${
                  collection.length !== 1 ? "s" : ""
                }`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {collection.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Your collection is empty</p>
              <p className="text-sm text-muted-foreground mt-2">
                Purchase items from the Marketplace to start your collection!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collection.map((item: any) => {
                const priceChange = item.currentPrice - item.purchasePrice;
                const priceChangePercent =
                  (priceChange / item.purchasePrice) * 100;
                const isPositive = priceChange >= 0;

                return (
                  <div
                    key={item._id}
                    className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {item.productImageUrl && (
                      <img
                        src={item.productImageUrl}
                        alt={item.productName}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1">
                        {item.productName}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        by {item.companyName}
                      </p>
                      <p className="text-sm mb-3 line-clamp-2">
                        {item.productDescription}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Purchased for:
                          </span>
                          <span className="font-semibold">
                            ${item.purchasePrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Current price:
                          </span>
                          <span className="font-semibold">
                            ${item.currentPrice.toFixed(2)}
                          </span>
                        </div>
                        <div
                          className={`flex items-center justify-between text-sm ${
                            isPositive ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            {isPositive ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            Value change:
                          </span>
                          <span className="font-semibold">
                            {priceChange >= 0 ? "+" : ""}$
                            {Math.abs(priceChange).toFixed(2)} (
                            {priceChangePercent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {item.productTags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {item.productTags.map((tag: string, i: number) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-3">
                        Purchased{" "}
                        {new Date(item.purchasedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
