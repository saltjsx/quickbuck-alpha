import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { toast } from "~/hooks/use-toast";
import {
  AlertTriangle,
  Coins,
  Dice3,
  BadgeDollarSign,
  CircleDot,
  PiggyBank,
  History,
} from "lucide-react";
import { Spinner } from "~/components/ui/spinner";
import { Separator } from "~/components/ui/separator";

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

type SlotResult = {
  bet: number;
  reels: string[];
  multiplier: number;
  payout: number;
  net: number;
  outcome: string;
  balance: number;
  houseEdgeApplied: boolean;
};

type BlackjackClientCard = { label: string; value: number; hidden?: boolean };
type BlackjackAction = "deal" | "hit" | "stand" | "auto_stand" | "bust";

type BlackjackActiveState = {
  status: "player_turn";
  gameId: Id<"gambles">;
  bet: number;
  playerHand: BlackjackClientCard[];
  dealerHand: BlackjackClientCard[];
  playerTotal: number;
  dealerTotal: null;
  canHit: boolean;
  canStand: boolean;
  balance: number;
  actions: BlackjackAction[];
};

type BlackjackFinishedState = {
  status: "finished";
  gameId: Id<"gambles">;
  bet: number;
  playerHand: BlackjackClientCard[];
  dealerHand: BlackjackClientCard[];
  playerTotal: number;
  dealerTotal: number;
  payout: number;
  net: number;
  outcome: string;
  balance: number;
  houseEdgeApplied: boolean;
  actions: BlackjackAction[];
};

type BlackjackState = BlackjackActiveState | BlackjackFinishedState;

type RouletteResult = {
  bet: number;
  winningNumber: number;
  winningColor: "red" | "black" | "green";
  payout: number;
  net: number;
  outcome: string;
  balance: number;
  houseEdgeApplied: boolean;
};

type GambleHistoryEntry = {
  _id: Id<"gambles">;
  _creationTime: number;
  accountId: Id<"accounts">;
  game: "slots" | "blackjack" | "roulette";
  bet: number;
  payout: number;
  net: number;
  outcome: string;
  details?: any;
};

type RouletteMode = "color" | "number";
type RouletteColor = "red" | "black" | "green";

const rouletteColorLabels: Record<
  RouletteColor,
  { label: string; swatch: string }
> = {
  red: { label: "Red", swatch: "bg-red-500" },
  black: { label: "Black", swatch: "bg-gray-900" },
  green: { label: "Zero", swatch: "bg-emerald-500" },
};

export function GambleTab() {
  const personalAccount = useQuery(api.accounts.getPersonalAccount);
  const history = useQuery(api.gamble.getRecentGambleHistory, { limit: 10 });

  const playSlots = useMutation(api.gamble.playSlotMachine);
  const playBlackjack = useMutation(api.gamble.playBlackjack);
  const hitBlackjack = useMutation(api.gamble.blackjackHit);
  const standBlackjack = useMutation(api.gamble.blackjackStand);
  const playRoulette = useMutation(api.gamble.playRoulette);

  const [slotBet, setSlotBet] = useState(100);
  const [blackjackBet, setBlackjackBet] = useState(150);
  const [rouletteBet, setRouletteBet] = useState(100);
  const [rouletteMode, setRouletteMode] = useState<RouletteMode>("color");
  const [rouletteColor, setRouletteColor] = useState<RouletteColor>("red");
  const [rouletteNumber, setRouletteNumber] = useState(7);

  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [isBlackjackLoading, setIsBlackjackLoading] = useState(false);
  const [isRouletteLoading, setIsRouletteLoading] = useState(false);

  const [slotResult, setSlotResult] = useState<SlotResult | null>(null);
  const [blackjackState, setBlackjackState] = useState<BlackjackState | null>(
    null
  );
  const [rouletteResult, setRouletteResult] = useState<RouletteResult | null>(
    null
  );
  const [isHitLoading, setIsHitLoading] = useState(false);
  const [isStandLoading, setIsStandLoading] = useState(false);

  const minBet = 10;
  const maxBet = 10000;

  const balance = personalAccount?.balance ?? 0;

  const historyWithOutcome = (history ?? []) as GambleHistoryEntry[];

  const describeHistory = (entry: GambleHistoryEntry) => {
    const details = entry.details;
    if (!details) return null;
    switch (entry.game) {
      case "slots":
        return Array.isArray(details.reels)
          ? `Reels: ${details.reels.join(" ")}`
          : null;
      case "blackjack":
        if (
          typeof details.playerTotal === "number" &&
          typeof details.dealerTotal === "number"
        ) {
          const actions =
            Array.isArray(details.actions) && details.actions.length > 0
              ? ` · Moves: ${details.actions.join(" → ")}`
              : "";
          return `You ${details.playerTotal} · Dealer ${details.dealerTotal}${actions}`;
        }
        return null;
      case "roulette":
        if (
          typeof details.winningNumber === "number" &&
          typeof details.winningColor === "string"
        ) {
          return `Wheel: ${details.winningNumber} (${details.winningColor})`;
        }
        return null;
      default:
        return null;
    }
  };

  const ensureValidBet = (bet: number) => {
    if (!Number.isFinite(bet)) {
      throw new Error("Enter a valid bet amount");
    }
    if (bet < minBet) {
      throw new Error(`Minimum bet is $${minBet}`);
    }
    if (bet > maxBet) {
      throw new Error(`Maximum bet is $${maxBet}`);
    }
    return Math.round(bet * 100) / 100;
  };

  const handleSlotSpin = async () => {
    try {
      const bet = ensureValidBet(slotBet);
      setIsSlotsLoading(true);
      const result = await playSlots({ bet });
      setSlotResult(result as SlotResult);
      toast({
        title:
          result.outcome === "lose" ? "No luck this time" : "Spin complete!",
        description:
          result.outcome === "lose"
            ? `You lost ${formatCurrency(
                result.bet
              )}. Keep an eye on that bankroll.`
            : `You earned ${formatCurrency(result.net)} on that spin.`,
      });
    } catch (error: any) {
      toast({
        title: "Slot spin failed",
        description: error.message || "Unable to spin right now",
        variant: "destructive",
      });
    } finally {
      setIsSlotsLoading(false);
    }
  };

  const describeBlackjackOutcome = (state: BlackjackFinishedState) => {
    switch (state.outcome) {
      case "lose":
      case "bust":
      case "dealer_blackjack":
        return `Dealer takes your ${formatCurrency(state.bet)}.`;
      case "push":
        return "Push. Your stake returns to you.";
      case "blackjack":
        return `Blackjack! Net profit: ${formatCurrency(state.net)}.`;
      case "dealer_bust":
        return `Dealer busts. Net profit: ${formatCurrency(state.net)}.`;
      case "win":
        return `You win ${formatCurrency(state.net)} this hand.`;
      default:
        return `Result: ${state.outcome.replace(
          /_/g,
          " "
        )}. Net ${formatCurrency(state.net)}.`;
    }
  };

  const handleBlackjackDeal = async () => {
    if (blackjackState?.status === "player_turn") {
      toast({
        title: "Finish your hand",
        description: "Hit or stand before dealing a new one.",
      });
      return;
    }
    try {
      const bet = ensureValidBet(blackjackBet);
      setIsBlackjackLoading(true);
      const result = (await playBlackjack({ bet })) as BlackjackState;
      setBlackjackState(result);
      if (result.status === "player_turn") {
        const dealerUpCard = result.dealerHand[0];
        toast({
          title: "Cards dealt",
          description: `You: ${result.playerHand
            .map((card) => card.label)
            .join(" ")} (${result.playerTotal}). Dealer shows ${
            dealerUpCard?.hidden ? "??" : dealerUpCard?.label ?? "?"
          }.`,
        });
      } else {
        toast({
          title: "Blackjack resolved",
          description: describeBlackjackOutcome(result),
        });
      }
    } catch (error: any) {
      toast({
        title: "Could not deal",
        description: error.message || "Something went wrong with the shoe",
        variant: "destructive",
      });
    } finally {
      setIsBlackjackLoading(false);
    }
  };

  const handleBlackjackHit = async () => {
    if (!blackjackState || blackjackState.status !== "player_turn") return;
    try {
      setIsHitLoading(true);
      const result = (await hitBlackjack({
        gameId: blackjackState.gameId,
      })) as BlackjackState;
      setBlackjackState(result);
      if (result.status === "player_turn") {
        const drawn = result.playerHand[result.playerHand.length - 1];
        toast({
          title: "Hit",
          description: `You drew ${drawn.label}. Total now ${result.playerTotal}.`,
        });
      } else {
        toast({
          title: "Blackjack resolved",
          description: describeBlackjackOutcome(result),
        });
      }
    } catch (error: any) {
      toast({
        title: "Could not hit",
        description: error.message || "Something went wrong with the shoe",
        variant: "destructive",
      });
    } finally {
      setIsHitLoading(false);
    }
  };

  const handleBlackjackStand = async () => {
    if (!blackjackState || blackjackState.status !== "player_turn") return;
    try {
      setIsStandLoading(true);
      const result = (await standBlackjack({
        gameId: blackjackState.gameId,
      })) as BlackjackState;
      setBlackjackState(result);
      if (result.status === "finished") {
        toast({
          title: "Stand resolved",
          description: describeBlackjackOutcome(result),
        });
      }
    } catch (error: any) {
      toast({
        title: "Could not stand",
        description: error.message || "Something went wrong with the shoe",
        variant: "destructive",
      });
    } finally {
      setIsStandLoading(false);
    }
  };

  const handleRouletteSpin = async () => {
    try {
      const bet = ensureValidBet(rouletteBet);
      setIsRouletteLoading(true);
      const selection =
        rouletteMode === "color"
          ? {
              type: "color" as const,
              value: rouletteColor,
            }
          : {
              type: "number" as const,
              value: rouletteNumber,
            };
      const result = await playRoulette({ bet, selection });
      setRouletteResult(result as RouletteResult);
      if (result.payout > 0) {
        toast({
          title: "Winner!",
          description: `The wheel landed on ${result.winningNumber} (${
            result.winningColor
          }). Net profit: ${formatCurrency(result.net)}.`,
        });
      } else {
        toast({
          title: "House wins",
          description: `The wheel hit ${result.winningNumber} (${
            result.winningColor
          }). You lost ${formatCurrency(result.bet)}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Roulette spin failed",
        description: error.message || "The croupier dropped the ball",
        variant: "destructive",
      });
    } finally {
      setIsRouletteLoading(false);
    }
  };

  if (personalAccount === undefined || history === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Spinner className="mx-auto text-gray-800" size="xl" />
          <p className="mt-4 text-muted-foreground">
            Loading your bankroll and game stats...
          </p>
        </div>
      </div>
    );
  }

  if (!personalAccount) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <PiggyBank className="h-5 w-5" />
            Create a personal account first
          </CardTitle>
          <CardDescription>
            Head to the Accounts page to initialize your bankroll with $10,000
            before you gamble.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-300/60 bg-amber-50">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>Tip: Keep personal funds loaded</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-amber-200 text-amber-900">
            House rake: 4% on every winning payout
          </Badge>
        </CardHeader>
        <CardContent className="text-amber-900/80 space-y-2">
          <p>
            Transfer profits out of your company accounts into your personal
            account before playing. Only personal funds can be wagered here, and
            the house skim means you need every dollar working for you.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <CardTitle>Your bankroll</CardTitle>
          </div>
          <Badge variant="outline" className="text-lg font-semibold">
            {formatCurrency(balance)}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Available balance in your personal account. Wins and losses apply
            instantly.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dice3 className="h-5 w-5 text-primary" />
              Slot Machine
            </CardTitle>
            <CardDescription>
              Three reels, premium symbols, and a stingy house rake.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Bet amount
              </label>
              <Input
                type="number"
                min={minBet}
                max={maxBet}
                step="10"
                value={slotBet}
                onChange={(event) => setSlotBet(Number(event.target.value))}
                className="mt-2"
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={isSlotsLoading}
              onClick={handleSlotSpin}
            >
              {isSlotsLoading ? "Spinning..." : "Spin the reels"}
            </Button>
            {slotResult && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-center">
                <div className="text-3xl tracking-[0.35em] font-semibold">
                  {slotResult.reels.join(" ")}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Badge
                    variant={
                      slotResult.outcome === "win" ? "default" : "secondary"
                    }
                  >
                    {slotResult.outcome === "win"
                      ? `Multiplier x${slotResult.multiplier}`
                      : slotResult.outcome === "push"
                      ? "Break-even"
                      : "House wins"}
                  </Badge>
                  {slotResult.houseEdgeApplied &&
                    slotResult.payout > slotResult.bet && (
                      <span className="text-muted-foreground text-xs">
                        Rake skimmed{" "}
                        {formatCurrency(
                          Math.max(
                            0,
                            slotResult.multiplier * slotResult.bet -
                              slotResult.payout
                          )
                        )}
                      </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Net result: {formatCurrency(slotResult.net)} · New balance:{" "}
                  {formatCurrency(slotResult.balance)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-primary" />
              Blackjack
            </CardTitle>
            <CardDescription>
              Make the calls yourself—hit or stand against classic house rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Bet amount
              </label>
              <Input
                type="number"
                min={minBet}
                max={maxBet}
                step="25"
                value={blackjackBet}
                onChange={(event) =>
                  setBlackjackBet(Number(event.target.value))
                }
                className="mt-2"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="flex-1 min-w-[140px]"
                size="lg"
                disabled={
                  isBlackjackLoading || blackjackState?.status === "player_turn"
                }
                onClick={handleBlackjackDeal}
              >
                {isBlackjackLoading
                  ? "Dealing..."
                  : blackjackState?.status === "player_turn"
                  ? "Hand in progress"
                  : "Deal a hand"}
              </Button>
              {blackjackState?.status === "player_turn" && (
                <>
                  <Button
                    className="flex-1 min-w-[100px]"
                    variant="secondary"
                    size="lg"
                    disabled={isHitLoading || !blackjackState.canHit}
                    onClick={handleBlackjackHit}
                  >
                    {isHitLoading ? "Hitting..." : "Hit"}
                  </Button>
                  <Button
                    className="flex-1 min-w-[100px]"
                    size="lg"
                    disabled={isStandLoading || !blackjackState.canStand}
                    onClick={handleBlackjackStand}
                  >
                    {isStandLoading ? "Standing..." : "Stand"}
                  </Button>
                </>
              )}
            </div>

            {blackjackState?.status === "player_turn" && (
              <div className="space-y-4 rounded-md border bg-muted/30 p-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">You</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {blackjackState.playerHand.map((card, index) => (
                      <Badge
                        key={`${card.label}-${index}`}
                        variant="outline"
                        className="text-base"
                      >
                        {card.label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total: {blackjackState.playerTotal}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Dealer
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {blackjackState.dealerHand.map((card, index) => (
                      <Badge
                        key={`${card.label}-${index}`}
                        variant="secondary"
                        className={`text-base ${
                          card.hidden ? "opacity-60" : ""
                        }`}
                      >
                        {card.hidden ? "??" : card.label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total: ??
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Moves: {blackjackState.actions.join(" → ")}
                </div>
                <div className="text-xs text-muted-foreground">
                  Bet: {formatCurrency(blackjackState.bet)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Balance after bet: {formatCurrency(blackjackState.balance)}
                </div>
              </div>
            )}

            {blackjackState?.status === "finished" && (
              <div className="space-y-4 rounded-md border bg-muted/30 p-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">You</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {blackjackState.playerHand.map((card, index) => (
                      <Badge
                        key={`${card.label}-${index}`}
                        variant="outline"
                        className="text-base"
                      >
                        {card.label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total: {blackjackState.playerTotal}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Dealer
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {blackjackState.dealerHand.map((card, index) => (
                      <Badge
                        key={`${card.label}-${index}`}
                        variant="secondary"
                        className="text-base"
                      >
                        {card.label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total: {blackjackState.dealerTotal}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Result: {blackjackState.outcome.replace(/_/g, " ")} · Net{" "}
                  {formatCurrency(blackjackState.net)}
                </div>
                <div className="text-sm text-muted-foreground">
                  New balance: {formatCurrency(blackjackState.balance)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Moves: {blackjackState.actions.join(" → ")}
                </div>
                {blackjackState.houseEdgeApplied && (
                  <div className="text-xs text-muted-foreground">
                    House rake applied to your winnings.
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Bet: {formatCurrency(blackjackState.bet)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Payout: {formatCurrency(blackjackState.payout)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDot className="h-5 w-5 text-primary" />
              Roulette Wheel
            </CardTitle>
            <CardDescription>
              Choose a color or a straight number and hope zero stays away.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Bet amount
              </label>
              <Input
                type="number"
                min={minBet}
                max={maxBet}
                step="10"
                value={rouletteBet}
                onChange={(event) => setRouletteBet(Number(event.target.value))}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={rouletteMode === "color" ? "default" : "outline"}
                onClick={() => setRouletteMode("color")}
              >
                Bet on color
              </Button>
              <Button
                variant={rouletteMode === "number" ? "default" : "outline"}
                onClick={() => setRouletteMode("number")}
              >
                Bet on number
              </Button>
            </div>

            {rouletteMode === "color" ? (
              <div className="flex gap-3">
                {(Object.keys(rouletteColorLabels) as RouletteColor[]).map(
                  (color) => (
                    <button
                      key={color}
                      onClick={() => setRouletteColor(color)}
                      className={`flex-1 rounded-md border p-3 text-center transition ${
                        rouletteColor === color
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div
                        className={`mx-auto mb-2 h-3 w-3 rounded-full ${rouletteColorLabels[color].swatch}`}
                      />
                      <span className="text-sm font-medium">
                        {rouletteColorLabels[color].label}
                      </span>
                    </button>
                  )
                )}
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Pick a number (0-36)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={36}
                  step="1"
                  value={rouletteNumber}
                  onChange={(event) =>
                    setRouletteNumber(Number(event.target.value))
                  }
                  className="mt-2"
                />
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={isRouletteLoading}
              onClick={handleRouletteSpin}
            >
              {isRouletteLoading ? "Spinning..." : "Spin the wheel"}
            </Button>

            {rouletteResult && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p>
                  Landed on <strong>{rouletteResult.winningNumber}</strong> ·{" "}
                  {rouletteResult.winningColor.toUpperCase()}
                </p>
                <p className="text-muted-foreground">
                  Net {formatCurrency(rouletteResult.net)} · New balance{" "}
                  {formatCurrency(rouletteResult.balance)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Recent action
          </CardTitle>
          <CardDescription>
            Your last {historyWithOutcome.length} bets, newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyWithOutcome.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No gambling history yet. Take a spin above to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {historyWithOutcome.map((entry: GambleHistoryEntry) => {
                const detailText = describeHistory(entry);
                return (
                  <div
                    key={entry._id}
                    className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="capitalize font-medium">{entry.game}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry._creationTime).toLocaleString()}
                      </p>
                      {detailText && (
                        <p className="text-xs text-muted-foreground">
                          {detailText}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-sm md:text-right">
                      <span>Bet: {formatCurrency(entry.bet)}</span>
                      <span>Payout: {formatCurrency(entry.payout)}</span>
                      <span
                        className={
                          entry.net >= 0 ? "text-green-600" : "text-destructive"
                        }
                      >
                        Net: {formatCurrency(entry.net)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
