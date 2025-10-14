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

const players = [
  {
    position: 1,
    name: "Marcus Johnson",
    username: "@marcusj",
    avatar: "/man-avatar.png",
    balance: "$2,100,000",
    portfolio: "$6,850,000",
    netWorth: "$8,950,000",
  },
  {
    position: 2,
    name: "Sarah Chen",
    username: "@sarahc",
    avatar: "/diverse-woman-avatar.png",
    balance: "$2,450,000",
    portfolio: "$4,750,000",
    netWorth: "$7,200,000",
  },
  {
    position: 3,
    name: "James Wilson",
    username: "@jamesw",
    avatar: "/man-avatar-3.png",
    balance: "$1,950,000",
    portfolio: "$4,850,000",
    netWorth: "$6,800,000",
  },
  {
    position: 4,
    name: "Elena Rodriguez",
    username: "@elenar",
    avatar: "/woman-avatar-2.png",
    balance: "$1,890,000",
    portfolio: "$4,060,000",
    netWorth: "$5,950,000",
  },
  {
    position: 5,
    name: "David Kim",
    username: "@davidk",
    avatar: "/man-avatar-2.png",
    balance: "$1,750,000",
    portfolio: "$3,350,000",
    netWorth: "$5,100,000",
  },
  {
    position: 6,
    name: "Aisha Patel",
    username: "@aishaP",
    avatar: "/woman-avatar-3.png",
    balance: "$1,620,000",
    portfolio: "$3,180,000",
    netWorth: "$4,800,000",
  },
  {
    position: 7,
    name: "Carlos Martinez",
    username: "@carlosm",
    avatar: "/man-avatar-4.png",
    balance: "$1,480,000",
    portfolio: "$2,920,000",
    netWorth: "$4,400,000",
  },
  {
    position: 8,
    name: "Lisa Anderson",
    username: "@lisaa",
    avatar: "/woman-avatar-4.png",
    balance: "$1,350,000",
    portfolio: "$2,750,000",
    netWorth: "$4,100,000",
  },
  {
    position: 9,
    name: "Robert Taylor",
    username: "@robertt",
    avatar: "/man-avatar-5.jpg",
    balance: "$1,220,000",
    portfolio: "$2,480,000",
    netWorth: "$3,700,000",
  },
  {
    position: 10,
    name: "Jennifer Lee",
    username: "@jenniferl",
    avatar: "/woman-avatar-5.png",
    balance: "$1,100,000",
    portfolio: "$2,250,000",
    netWorth: "$3,350,000",
  },
];

type SortKey = "position" | "balance" | "portfolio" | "netWorth";

export function PlayersTab() {
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

  const sortedPlayers = [...players].sort((a, b) => {
    let aValue: number | string = a[sortKey];
    let bValue: number | string = b[sortKey];

    if (sortKey !== "position") {
      aValue = Number.parseFloat(aValue.toString().replace(/[$,]/g, ""));
      bValue = Number.parseFloat(bValue.toString().replace(/[$,]/g, ""));
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
                    onClick={() => handleSort("balance")}
                    className="h-8 px-2 ml-auto"
                  >
                    Balance
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("portfolio")}
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
              {sortedPlayers.map((player) => (
                <TableRow key={player.username}>
                  <TableCell>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                      {player.position}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={player.avatar || "/placeholder.svg"}
                          alt={player.name}
                        />
                        <AvatarFallback>
                          {player.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{player.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.username}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {player.balance}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {player.portfolio}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {player.netWorth}
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
