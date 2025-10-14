"use client";

import { useState } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ArrowUpDown, Package, Building2 } from "lucide-react";
import { Button } from "~/components/ui/button";

type Product = {
  _id: string;
  name: string;
  imageUrl?: string | null;
  companyName: string;
  companyTicker?: string;
  companyLogoUrl?: string | null;
  price: number;
  totalSales: number;
  totalRevenue: number;
  profit: number;
};

type SortKey = "position" | "price" | "totalSales" | "totalRevenue" | "profit";

interface ProductsTabProps {
  products: Product[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

export function ProductsTabLeaderboard({ products }: ProductsTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalSales");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    let aValue: number = 0;
    let bValue: number = 0;

    switch (sortKey) {
      case "price":
        aValue = a.price;
        bValue = b.price;
        break;
      case "totalSales":
        aValue = a.totalSales;
        bValue = b.totalSales;
        break;
      case "totalRevenue":
        aValue = a.totalRevenue;
        bValue = b.totalRevenue;
        break;
      case "profit":
        aValue = a.profit;
        bValue = b.profit;
        break;
      default:
        aValue = products.indexOf(a);
        bValue = products.indexOf(b);
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("position")}
                    className="h-8 px-2"
                  >
                    Rank
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("price")}
                    className="h-8 px-2 ml-auto"
                  >
                    Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("totalSales")}
                    className="h-8 px-2 ml-auto"
                  >
                    Sales
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("totalRevenue")}
                    className="h-8 px-2 ml-auto"
                  >
                    Revenue
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("profit")}
                    className="h-8 px-2 ml-auto"
                  >
                    Profit
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.map((product, index) => (
                <TableRow key={product._id}>
                  <TableCell>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-md">
                        <AvatarImage
                          src={product.imageUrl || "/placeholder.svg"}
                          alt={product.name}
                        />
                        <AvatarFallback>
                          <Package className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 rounded-md">
                        <AvatarImage
                          src={product.companyLogoUrl || "/placeholder.svg"}
                          alt={product.companyName}
                        />
                        <AvatarFallback>
                          <Building2 className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {product.companyName}
                        </p>
                        {product.companyTicker && (
                          <p className="text-xs text-muted-foreground">
                            {product.companyTicker}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(product.price)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatNumber(product.totalSales)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(product.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(product.profit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
