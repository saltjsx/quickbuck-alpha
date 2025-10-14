"use client";

import { useState } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ArrowUpDown, Building2 } from "lucide-react";
import { Button } from "~/components/ui/button";

type Company = {
  _id: string;
  name: string;
  ticker: string;
  logoUrl?: string | null;
  ownerName: string;
  balance: number;
  netWorth: number;
  marketCap: number;
  isPublic: boolean;
};

type SortKey = "position" | "balance" | "netWorth" | "marketCap";

interface CompaniesTabProps {
  companies: Company[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function CompaniesTabLeaderboard({ companies }: CompaniesTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>("netWorth");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const sortedCompanies = [...companies].sort((a, b) => {
    let aValue: number = 0;
    let bValue: number = 0;

    switch (sortKey) {
      case "balance":
        aValue = a.balance;
        bValue = b.balance;
        break;
      case "netWorth":
        aValue = a.netWorth;
        bValue = b.netWorth;
        break;
      case "marketCap":
        aValue = a.marketCap;
        bValue = b.marketCap;
        break;
      default:
        aValue = companies.indexOf(a);
        bValue = companies.indexOf(b);
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
                <TableHead>Company</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("balance")}
                    className="h-8 px-2 ml-auto"
                  >
                    Cash
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("netWorth")}
                    className="h-8 px-2 ml-auto"
                  >
                    Net Worth
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("marketCap")}
                    className="h-8 px-2 ml-auto"
                  >
                    Market Cap
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCompanies.map((company, index) => (
                <TableRow key={company._id}>
                  <TableCell>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-md">
                        <AvatarImage
                          src={company.logoUrl || "/placeholder.svg"}
                          alt={company.name}
                        />
                        <AvatarFallback>
                          <Building2 className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{company.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {company.ticker}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{company.ownerName}</p>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(company.balance)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(company.netWorth)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(company.marketCap)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={company.isPublic ? "default" : "secondary"}>
                      {company.isPublic ? "Public" : "Private"}
                    </Badge>
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
