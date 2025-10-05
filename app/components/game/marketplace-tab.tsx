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
import { track } from "@databuddy/sdk";
import { useEffect } from "react";

export function MarketplaceTab() {
  const products = useQuery(api.products.getActiveProducts);

  // Track marketplace view
  useEffect(() => {
    if (products && products.length > 0) {
      track("marketplace_viewed", {
        products_count: products.length,
        total_products_value: products.reduce(
          (sum: number, p: any) => sum + p.price,
          0
        ),
        currency: "USD",
        timestamp: new Date().toISOString(),
      });
    }
  }, [products?.length]);

  const handleProductClick = (product: any) => {
    track("product_viewed", {
      product_id: product._id,
      product_name: product.name,
      company_name: product.companyName,
      price: product.price,
      currency: "USD",
      total_sales: product.totalSales,
      tags: product.tags.join(", "),
      has_image: !!product.imageUrl,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Marketplace</CardTitle>
        <CardDescription>
          Browse products from all companies. Products are automatically
          purchased every 20 minutes!
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
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleProductClick(product)}
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
                  <div className="flex items-center gap-2 mb-2">
                    {product.companyLogoUrl && (
                      <img
                        src={product.companyLogoUrl}
                        alt={product.companyName}
                        className="h-5 w-5 object-contain rounded border"
                      />
                    )}
                    <p className="text-sm text-muted-foreground">
                      by {product.companyName}
                    </p>
                    {product.companyTicker && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {product.companyTicker}
                      </Badge>
                    )}
                  </div>
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
