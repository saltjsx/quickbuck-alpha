import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { UpgradesTab } from "~/components/game/upgrades-tab";
import type { Route } from "./+types/upgrades";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Power Upgrades - QuickBuck" },
    {
      name: "description",
      content:
        "Purchase and use powerful upgrades to boost your companies and manipulate the stock market in QuickBuck.",
    },
  ];
}

export default function UpgradesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Power Upgrades</h1>
          <p className="text-gray-600 mt-2">
            Strategic advantages to boost your empire
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upgrade Shop & Inventory</CardTitle>
          <CardDescription>
            Purchase powerful upgrades to gain strategic advantages in the game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpgradesTab />
        </CardContent>
      </Card>
    </div>
  );
}
