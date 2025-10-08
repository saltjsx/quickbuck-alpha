import type { Route } from "./+types/gamble";
import { GambleTab } from "~/components/game/gamble-tab";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Gamble - QuickBuck Casino" },
    {
      name: "description",
      content:
        "Risk your personal bankroll on QuickBuck's slot machine, blackjack table, and roulette wheel.",
    },
  ];
}

export default function GamblePage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <h1 className="text-3xl font-bold">Gamble</h1>
            <p className="text-muted-foreground mt-1">
              Spin the reels, beat the dealer, or take a shot at the wheel. Wins
              and losses hit your balance instantly.
            </p>
          </div>
          <div className="px-4 lg:px-6">
            <GambleTab />
          </div>
        </div>
      </div>
    </div>
  );
}
