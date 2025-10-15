import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Spinner } from "~/components/ui/spinner";
import { track } from "@databuddy/sdk";
import { toast } from "~/hooks/use-toast";

export function MarketplaceTab() {
  const products = useQuery(api.products.getActiveProducts);
  const purchaseItem = useMutation(api.collections.purchaseItem);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("All Companies");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("popular");
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(
    null
  );

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

  // Extract unique companies and tags from products
  const { companies, allTags } = useMemo(() => {
    if (!products) return { companies: ["All Companies"], allTags: [] };

    const companySet = new Set<string>();
    const tagSet = new Set<string>();

    products.forEach((product: any) => {
      if (product.companyName) companySet.add(product.companyName);
      if (product.tags) {
        product.tags.forEach((tag: string) => tagSet.add(tag));
      }
    });

    return {
      companies: ["All Companies", ...Array.from(companySet).sort()],
      allTags: Array.from(tagSet).sort(),
    };
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products
      .filter((product: any) => {
        // Search filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          searchQuery === "" ||
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.companyName.toLowerCase().includes(searchLower) ||
          (product.tags &&
            product.tags.some((tag: string) =>
              tag.toLowerCase().includes(searchLower)
            ));

        // Company filter
        const matchesCompany =
          selectedCompany === "All Companies" ||
          product.companyName === selectedCompany;

        // Tags filter
        const matchesTags =
          selectedTags.length === 0 ||
          (product.tags &&
            selectedTags.every((tag) => product.tags.includes(tag)));

        return matchesSearch && matchesCompany && matchesTags;
      })
      .sort((a: any, b: any) => {
        switch (sortBy) {
          case "name-asc":
            return a.name.localeCompare(b.name);
          case "price-asc":
            return a.price - b.price;
          case "price-desc":
            return b.price - a.price;
          case "popular":
            return (b.totalSales || 0) - (a.totalSales || 0);
          default:
            return 0;
        }
      });
  }, [products, searchQuery, selectedCompany, selectedTags, sortBy]);

  const handleProductClick = (product: any) => {
    track("product_viewed", {
      product_id: product._id,
      product_name: product.name,
      company_name: product.companyName,
      price: product.price,
      currency: "USD",
      total_sales: product.totalSales,
      tags: product.tags?.join(", ") || "",
      has_image: !!product.imageUrl,
      timestamp: new Date().toISOString(),
    });
  };

  const handleBuyNow = async (product: any, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      setPurchasingProductId(product._id);
      await purchaseItem({ productId: product._id });

      toast({
        title: "Purchase Successful!",
        description: `You bought ${product.name} for $${product.price.toFixed(
          2
        )}`,
      });

      track("product_purchased", {
        product_id: product._id,
        product_name: product.name,
        company_name: product.companyName,
        price: product.price,
        currency: "USD",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message || "Unable to complete purchase",
        variant: "destructive",
      });
    } finally {
      setPurchasingProductId(null);
    }
  };

  if (products === undefined) {
    return (
      <div className="text-center py-12">
        <Spinner size="lg" className="text-gray-900 mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">
          Loading marketplace...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-7xl">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1 text-balance">
          QuickBuck Marketplace
        </h1>
        <p className="text-muted-foreground text-sm">
          Discover and purchase products from top companies
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="mb-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for products and companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Company Filter */}
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
              <SelectValue placeholder="Filter by company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company} value={company}>
                  {company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-2" />
                  Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuLabel className="text-xs">Filter by tags</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allTags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTags([...selectedTags, tag]);
                      } else {
                        setSelectedTags(selectedTags.filter((t) => t !== tag));
                      }
                    }}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px] sm:ml-auto h-9 text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name: A-Z</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Display */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">
              Active filters:
            </span>
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer"
                onClick={() =>
                  setSelectedTags(selectedTags.filter((t) => t !== tag))
                }
              >
                {tag} ×
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTags([])}
              className="h-6 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-8">
          {products.length === 0 ? (
            <>
              <p className="text-base text-muted-foreground">
                No products available yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a company and add products to get started
              </p>
            </>
          ) : (
            <>
              <p className="text-base text-muted-foreground">
                No products found matching your search criteria
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCompany("All Companies");
                  setSelectedTags([]);
                }}
                className="mt-2"
              >
                Clear all filters
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product: any) => (
            <Card
              key={product._id}
              className="overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              {/* Product Image */}
              <div className="relative h-40 bg-muted overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span className="text-3xl font-semibold">{product.name[0]}</span>
                  </div>
                )}
              </div>

              {/* Product Content */}
              <div className="p-4 flex flex-col flex-1">
                {/* Company Info */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {product.companyLogoUrl ? (
                      <img
                        src={product.companyLogoUrl}
                        alt={product.companyName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold">
                        {product.companyName?.[0] || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {product.companyName}
                    </p>
                    {product.companyTicker && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {product.companyTicker}
                      </p>
                    )}
                  </div>
                </div>

                {/* Product Name */}
                <h3 className="text-base font-semibold mb-1.5 text-balance leading-tight">
                  {product.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                  {product.description}
                </p>

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {product.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Footer - Price and Stats */}
                <div className="mt-auto pt-3 border-t">
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <p className="text-xl font-bold">
                        ${product.price.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(product.totalSales || 0).toLocaleString()} sold
                      </p>
                    </div>
                  </div>

                  {/* Buy Button */}
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={(e) => handleBuyNow(product, e)}
                    disabled={purchasingProductId === product._id}
                  >
                    {purchasingProductId === product._id ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Purchasing...
                      </>
                    ) : (
                      "Buy Now"
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
