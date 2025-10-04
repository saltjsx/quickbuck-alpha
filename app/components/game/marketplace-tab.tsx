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

export function MarketplaceTab() {
  const products = useQuery(api.products.getActiveProducts);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Marketplace</CardTitle>
        <CardDescription>
          Browse products from all companies. Products are automatically
          purchased every 2 minutes!
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products === undefined ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">
              Loading products...
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No products available yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a company and add products to get started!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product: any) => (
              <div
                key={product._id}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    by {product.companyName}
                  </p>
                  <p className="text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-green-600">
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {product.totalSales} sales
                    </span>
                  </div>
                  {product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {product.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
