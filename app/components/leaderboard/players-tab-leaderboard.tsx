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
import { ArrowUpDown } from "lucide-react";
import { Button } from "~/components/ui/button";

type Player = {
  _id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  cashBalance: number;
  portfolioValue: number;
  netWorth: number;
};

type SortKey = "position" | "cashBalance" | "portfolioValue" | "netWorth";

interface PlayersTabProps {
  players: Player[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3) || "U"
  );
}

export function PlayersTabLeaderboard({ players }: PlayersTabProps) {
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

  const sortedPlayers = [...players].sort((a, b) => {
    let aValue: number = 0;
    let bValue: number = 0;

    switch (sortKey) {
      case "cashBalance":
        aValue = a.cashBalance;
        bValue = b.cashBalance;
        break;
      case "portfolioValue":
        aValue = a.portfolioValue;
        bValue = b.portfolioValue;
        break;
      case "netWorth":
        aValue = a.netWorth;
        bValue = b.netWorth;
        break;
      default:
        aValue = players.indexOf(a);
        bValue = players.indexOf(b);
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
                <TableHead>Player</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("cashBalance")}
                    className="h-8 px-2 ml-auto"
                  >
                    Balance
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("portfolioValue")}
                    className="h-8 px-2 ml-auto"
                  >
                    Portfolio
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => (
                <TableRow key={player._id}>
                  <TableCell>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={player.avatarUrl || "/placeholder.svg"}
                          alt={player.name}
                        />
                        <AvatarFallback>
                          {getInitials(player.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{player.name}</p>
                        {player.username && (
                          <p className="text-sm text-muted-foreground">
                            @{player.username}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(player.cashBalance)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(player.portfolioValue)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(player.netWorth)}
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
