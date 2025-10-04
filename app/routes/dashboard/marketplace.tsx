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
import { ShoppingBag } from "lucide-react";

export default function MarketplacePage() {
  const products = useQuery(api.products.getActiveProducts);

  if (products === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-8 w-8" />
              Product Marketplace
            </h1>
            <p className="text-muted-foreground mt-1">
              Browse products from all companies. Products purchased
              automatically every 2 minutes!
            </p>
          </div>

          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Products</CardTitle>
                <CardDescription>
                  Automatic purchases range from $1,500-$3,000 every 2 minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No products available yet
                    </p>
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
                          <h3 className="font-semibold text-lg mb-1">
                            {product.name}
                          </h3>
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
