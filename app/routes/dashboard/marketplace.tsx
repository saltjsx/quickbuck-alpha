import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { MultiSelect } from "~/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "~/hooks/use-toast";
import { useState, useMemo } from "react";
import type { Route } from "./+types/marketplace";
import { Spinner } from "~/components/ui/spinner";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Marketplace - QuickBuck" },
    {
      name: "description",
      content:
        "Browse and purchase products from other companies in the QuickBuck marketplace.",
    },
  ];
}

export default function MarketplacePage() {
  const products = useQuery(api.products.getActiveProducts);
  const personalAccount = useQuery(api.accounts.getPersonalAccount);
  const purchaseItem = useMutation(api.collections.purchaseItem);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<
    "name" | "price-low" | "price-high" | "sales"
  >("name");

  const handlePurchase = async (
    productId: string,
    productName: string,
    price: number
  ) => {
    try {
      await purchaseItem({ productId: productId as any });
      toast({
        title: "Purchase Successful!",
        description: `You purchased ${productName} for $${price.toFixed(2)}`,
      });
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase item",
        variant: "destructive",
      });
    }
  };

  // Get unique companies and tags
  const { companies, allTags } = useMemo(() => {
    if (!products) return { companies: [], allTags: [] };

    const companyMap = new Map<string, { name: string; logo?: string }>();
    const tagSet = new Set<string>();

    products.forEach((product: any) => {
      if (product.companyName) {
        companyMap.set(product.companyName, {
          name: product.companyName,
          logo: product.companyLogoUrl,
        });
      }
      product.tags?.forEach((tag: string) => tagSet.add(tag));
    });

    return {
      companies: Array.from(companyMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      allTags: Array.from(tagSet).sort(),
    };
  }, [products]);

  // Filter and sort products (price range removed, replaced by simpler filters)
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products.filter((product: any) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.companyName.toLowerCase().includes(searchLower);

      // Company filter
      const matchesCompany =
        !selectedCompany || product.companyName === selectedCompany;

      // Tag filter
      const matchesTags =
        selectedTags.size === 0 ||
        product.tags?.some((tag: string) => selectedTags.has(tag));

      return matchesSearch && matchesCompany && matchesTags;
    });

    // Sort products
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "sales":
          return b.totalSales - a.totalSales;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [
    products,
    searchQuery,
    selectedCompany,
    selectedTags,
    sortBy,
  ]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCompany(null);
    setSelectedTags(new Set());
    setSortBy("name");
  };

  const hasActiveFilters =
    searchQuery || selectedCompany || selectedTags.size > 0 || sortBy !== "name";

  if (products === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="xl" className="text-gray-900 mx-auto" />
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
              Browse and purchase products from all companies
            </p>
          </div>

          <div className="px-4 lg:px-6 space-y-4">
            {/* Search Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products, companies, or descriptions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Filters - redesigned toolbar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SlidersHorizontal className="h-5 w-5" />
                  Filters & Sorting
                </CardTitle>
                <CardDescription>Refine the catalog with dropdown filters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  {/* Company Dropdown */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Company</label>
                    <Select
                      value={selectedCompany ?? "__all"}
                      onValueChange={(v) => setSelectedCompany(v === "__all" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Companies" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="__all">All Companies</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.name} value={company.name}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tags Multi-select (dropdown) */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tags</label>
                    <MultiSelect
                      options={allTags}
                      selected={selectedTags}
                      onChange={setSelectedTags}
                      placeholder="Select tags..."
                    />
                  </div>

                  {/* Sort By Dropdown */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Sort By</label>
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name A-Z</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="sales">Most Popular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex justify-end pt-3">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Products Grid */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {filteredProducts.length} Product
                  {filteredProducts.length !== 1 ? "s" : ""} Available
                </CardTitle>
                <CardDescription>
                  {hasActiveFilters
                    ? "Filtered results"
                    : "All available products"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {products && products.length > 0
                        ? "No products match your filters"
                        : "No products available yet"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {products && products.length > 0
                        ? "Try adjusting your search or filters"
                        : "Create a company and add products to get started!"}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product: any) => (
                      <Card key={product._id} className="overflow-hidden">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-44 object-cover"
                          />
                        )}
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base leading-tight">
                            {product.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {product.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2">
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
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-semibold text-green-600">
                              ${product.price.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {product.totalSales} sales
                            </span>
                          </div>
                          {!!product.tags?.length && (
                            <div className="flex flex-wrap gap-1">
                              {product.tags.map((tag: string, i: number) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-secondary/80"
                                  onClick={() => toggleTag(tag)}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <Button
                            className="w-full"
                            onClick={() =>
                              handlePurchase(
                                product._id,
                                product.name,
                                product.price
                              )
                            }
                            disabled={
                              !personalAccount ||
                              (personalAccount.balance ?? 0) < product.price
                            }
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {!personalAccount
                              ? "No Account"
                              : (personalAccount.balance ?? 0) < product.price
                              ? "Insufficient Funds"
                              : "Purchase"}
                          </Button>
                        </CardContent>
                      </Card>
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
