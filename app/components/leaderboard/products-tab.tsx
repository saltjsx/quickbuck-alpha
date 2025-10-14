"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const products = [
  {
    position: 1,
    name: "SmartPhone X1",
    image: "/modern-smartphone.png",
    company: "TechVision Inc",
    ticker: "TECH",
    logo: "/tech-company-logo.jpg",
    price: "$899",
    sales: 45230,
    revenue: "$40.7M",
    profit: "$18.2M",
  },
  {
    position: 2,
    name: "Solar Panel Pro",
    image: "/solar-panel-installation.png",
    company: "GreenEnergy Corp",
    ticker: "GREN",
    logo: "/energy-company-logo.jpg",
    price: "$1,299",
    sales: 38920,
    revenue: "$50.5M",
    profit: "$22.8M",
  },
  {
    position: 3,
    name: "Premium Laptop",
    image: "/modern-laptop-workspace.png",
    company: "TechVision Inc",
    ticker: "TECH",
    logo: "/tech-company-logo.jpg",
    price: "$1,499",
    sales: 32150,
    revenue: "$48.2M",
    profit: "$19.3M",
  },
  {
    position: 4,
    name: "Health Monitor",
    image: "/modern-health-device.png",
    company: "MediCare Plus",
    ticker: "MEDI",
    logo: "/medical-company-logo.png",
    price: "$249",
    sales: 28640,
    revenue: "$7.1M",
    profit: "$3.2M",
  },
  {
    position: 5,
    name: "Electric Charger",
    image: "/electric-vehicle-charger.png",
    company: "AutoDrive Systems",
    ticker: "AUTO",
    logo: "/auto-company-logo.jpg",
    price: "$599",
    sales: 25890,
    revenue: "$15.5M",
    profit: "$6.8M",
  },
  {
    position: 6,
    name: "Smart Watch",
    image: "/modern-smartwatch.png",
    company: "TechVision Inc",
    ticker: "TECH",
    logo: "/tech-company-logo.jpg",
    price: "$399",
    sales: 22450,
    revenue: "$9.0M",
    profit: "$3.6M",
  },
  {
    position: 7,
    name: "Organic Meal Kit",
    image: "/meal-kit.jpg",
    company: "FoodChain Co",
    ticker: "FOOD",
    logo: "/food-company-logo.png",
    price: "$89",
    sales: 19870,
    revenue: "$1.8M",
    profit: "$0.5M",
  },
  {
    position: 8,
    name: "Cloud Storage Pro",
    image: "/cloud-storage-concept.png",
    company: "CloudNet Services",
    ticker: "CLND",
    logo: "/cloud-company-logo.png",
    price: "$19/mo",
    sales: 18320,
    revenue: "$4.2M",
    profit: "$2.1M",
  },
  {
    position: 9,
    name: "Power Tools Set",
    image: "/assorted-power-tools.png",
    company: "BuildPro Construction",
    ticker: "BPRO",
    logo: "/construction-company-logo.png",
    price: "$449",
    sales: 15680,
    revenue: "$7.0M",
    profit: "$2.8M",
  },
  {
    position: 10,
    name: "Online Course Bundle",
    image: "/online-course-concept.png",
    company: "EduTech Solutions",
    ticker: "EDUT",
    logo: "/education-company-logo.png",
    price: "$199",
    sales: 14230,
    revenue: "$2.8M",
    profit: "$1.7M",
  },
];

type SortKey = "position" | "price" | "sales" | "revenue" | "profit";

export function ProductsTab() {
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    let aValue: number | string = a[sortKey];
    let bValue: number | string = b[sortKey];

    if (sortKey !== "position") {
      if (sortKey === "sales") {
        aValue = a.sales;
        bValue = b.sales;
      } else {
        aValue = Number.parseFloat(aValue.toString().replace(/[$M,/mo]/g, ""));
        bValue = Number.parseFloat(bValue.toString().replace(/[$M,/mo]/g, ""));
      }
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
                    onClick={() => handleSort("sales")}
                    className="h-8 px-2 ml-auto"
                  >
                    Sales
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("revenue")}
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
              {sortedProducts.map((product) => (
                <TableRow key={`${product.ticker}-${product.name}`}>
                  <TableCell>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                      {product.position}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-md">
                        <AvatarImage
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                        />
                        <AvatarFallback>P</AvatarFallback>
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
                          src={product.logo || "/placeholder.svg"}
                          alt={product.company}
                        />
                        <AvatarFallback>{product.ticker}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{product.company}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.ticker}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {product.price}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {product.sales.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {product.revenue}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {product.profit}
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
