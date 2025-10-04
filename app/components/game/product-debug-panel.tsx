import { useQuery } from "convex/react";
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
import { useState } from "react";

interface ProductDebugProps {
  companyId: Id<"companies">;
  productId: Id<"products">;
}

export function ProductDebugPanel({
  companyId,
}: {
  companyId: Id<"companies">;
}) {
  const [showDebug, setShowDebug] = useState(false);
  const debugData = useQuery(
    api.debug.inspectCompanyProducts,
    showDebug ? { companyId } : "skip"
  );

  if (!showDebug) {
    return (
      <div className="mb-4">
        <Button onClick={() => setShowDebug(true)} variant="outline" size="sm">
          🐛 Show Debug Info
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-4 border-yellow-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">🐛 Debug Information</CardTitle>
            <CardDescription className="text-xs">
              Product sales analysis for troubleshooting
            </CardDescription>
          </div>
          <Button onClick={() => setShowDebug(false)} variant="ghost" size="sm">
            Hide
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {debugData ? (
          <div className="space-y-4">
            <div className="text-xs">
              <p className="font-semibold mb-2">
                Company: {debugData.companyName}
              </p>
              <p className="text-muted-foreground">
                Total Products: {debugData.summary.totalProducts} | Mismatches:{" "}
                {debugData.summary.productsWithMismatch}
              </p>
            </div>

            <div className="space-y-2">
              {debugData.products.map((product) => (
                <div
                  key={product.productId}
                  className={`p-3 rounded border text-xs ${
                    product.mismatch
                      ? "border-red-500 bg-red-50"
                      : "border-green-500 bg-green-50"
                  }`}
                >
                  <div className="font-semibold mb-1">{product.name}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">
                        Current Price:
                      </span>{" "}
                      ${product.currentPrice.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Avg Sale Price:
                      </span>{" "}
                      ${product.avgSalePrice.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        totalSales field:
                      </span>{" "}
                      {product.totalSalesField}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Actual purchases:
                      </span>{" "}
                      {product.actualPurchaseCount}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Revenue:</span> $
                      {product.revenue.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Costs:</span> $
                      {product.costs.toFixed(2)}
                    </div>
                  </div>
                  {product.mismatch && (
                    <div className="mt-2 text-red-700 font-semibold">
                      ⚠️ Mismatch detected! totalSales field (
                      {product.totalSalesField}) ≠ actual purchases (
                      {product.actualPurchaseCount})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Loading debug info...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
