import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MIN_BET = 10;
const MAX_BET = 10000;
const HOUSE_EDGE = 0.04; // 4% rake on winning payouts keeps things slightly unfair

const SLOT_SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "🍀", "7️⃣", "💎"];
const SLOT_WEIGHTS = [0.25, 0.25, 0.18, 0.12, 0.1, 0.07, 0.03];
const SLOT_PAYOUTS: Record<string, number> = {
  "🍒🍒🍒": 6,
  "🍋🍋🍋": 5,
  "🔔🔔🔔": 8,
  "⭐⭐⭐": 10,
  "🍀🍀🍀": 12,
  "7️⃣7️⃣7️⃣": 16,
  "💎💎💎": 24,
};

const DECK_RANKS = [
  { label: "A", value: 11 },
  { label: "K", value: 10 },
  { label: "Q", value: 10 },
  { label: "J", value: 10 },
  { label: "10", value: 10 },
  { label: "9", value: 9 },
  { label: "8", value: 8 },
  { label: "7", value: 7 },
  { label: "6", value: 6 },
  { label: "5", value: 5 },
  { label: "4", value: 4 },
  { label: "3", value: 3 },
  { label: "2", value: 2 },
];
const DECK_SUITS = ["♠", "♥", "♦", "♣"];

const ROULETTE_NUMBERS = Array.from({ length: 37 }, (_, i) => i); // 0-36
const ROULETTE_COLORS: Record<number, "red" | "black" | "green"> = {
  0: "green",
  1: "red",
  2: "black",
  3: "red",
  4: "black",
  5: "red",
  6: "black",
  7: "red",
  8: "black",
  9: "red",
  10: "black",
  11: "black",
  12: "red",
  13: "black",
  14: "red",
  15: "black",
  16: "red",
  17: "black",
  18: "red",
  19: "red",
  20: "black",
  21: "red",
  22: "black",
  23: "red",
  24: "black",
  25: "red",
  26: "black",
  27: "red",
  28: "black",
  29: "black",
  30: "red",
  31: "black",
  32: "red",
  33: "black",
  34: "red",
  35: "black",
  36: "red",
};

async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
    .unique();

  return user?._id || null;
}

async function getPersonalAccount(ctx: any, userId: string) {
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_owner_type", (q: any) => q.eq("ownerId", userId).eq("type", "personal"))
    .first();

  return account;
}

async function getCasinoAccount(ctx: any, userId: string) {
  let casinoAccount = await ctx.db
    .query("accounts")
    .withIndex("by_name", (q: any) => q.eq("name", "QuickBuck Casino Reserve"))
    .first();

  if (!casinoAccount) {
    const accountId = await ctx.db.insert("accounts", {
      name: "QuickBuck Casino Reserve",
      type: "personal",
      ownerId: userId,
      balance: 250000,
      createdAt: Date.now(),
    });

    casinoAccount = await ctx.db.get(accountId);
  }

  return casinoAccount!;
}

async function recordLedger(
  ctx: any,
  fromAccountId: any,
  toAccountId: any,
  amount: number,
  description: string,
  type: "gamble" | "gamble_payout"
) {
  await ctx.db.insert("ledger", {
    fromAccountId,
    toAccountId,
    amount,
    type,
    description,
    createdAt: Date.now(),
  });
}

async function recordGame(ctx: any, data: {
  userId: string;
  accountId: any;
  game: "slots" | "blackjack" | "roulette";
  bet: number;
  payout: number;
  net: number;
  outcome: string;
  details?: Record<string, any>;
}) {
  await ctx.db.insert("gambles", {
    userId: data.userId,
    accountId: data.accountId,
    game: data.game,
    bet: data.bet,
    payout: data.payout,
    net: data.net,
    outcome: data.outcome,
    details: data.details ? JSON.stringify(data.details) : undefined,
    createdAt: Date.now(),
  });
}

function ensureBet(bet: number) {
  if (!Number.isFinite(bet)) {
    throw new Error("Invalid bet amount");
  }
  const normalized = Math.round(bet * 100) / 100;
  if (normalized < MIN_BET) {
    throw new Error(`Minimum bet is $${MIN_BET}`);
  }
  if (normalized > MAX_BET) {
    throw new Error(`Maximum bet is $${MAX_BET}`);
  }
  return normalized;
}

function rollSlotSymbol() {
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
    cumulative += SLOT_WEIGHTS[i];
    if (roll <= cumulative) {
      return SLOT_SYMBOLS[i];
    }
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
}

function calculateSlotPayout(reels: string[], bet: number) {
  const key = reels.join("");
  const multiplier = SLOT_PAYOUTS[key] || (new Set(reels).size === 1 ? 5 : 0);
  const payout = multiplier > 0 ? Math.round(bet * multiplier * 100) / 100 : 0;
  return { multiplier, payout };
}

function buildDeck() {
  const deck: { label: string; value: number }[] = [];
  for (const rank of DECK_RANKS) {
    for (const suit of DECK_SUITS) {
      deck.push({ label: `${rank.label}${suit}`, value: rank.value });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawCard(deck: { label: string; value: number }[]) {
  if (deck.length === 0) throw new Error("Deck exhausted");
  const index = Math.floor(Math.random() * deck.length);
  const [card] = deck.splice(index, 1);
  return card;
}

function handValue(cards: { label: string; value: number }[]) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    total += card.value;
    if (card.label.startsWith("A")) {
      aces += 1;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function isSoft17(cards: { label: string; value: number }[]) {
  const total = handValue(cards);
  if (total !== 17) return false;
  return cards.some((card) => card.label.startsWith("A"));
}

function clampRouletteNumber(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("Invalid roulette number");
  }
  const normalized = Math.round(value);
  if (normalized < 0 || normalized > 36) {
    throw new Error("Pick a number between 0 and 36");
  }
  return normalized;
}

function applyHouseEdge(originalPayout: number, bet: number) {
  if (originalPayout <= bet) return originalPayout;
  const winnings = originalPayout - bet;
  const taxed = winnings * (1 - HOUSE_EDGE);
  return Math.round((bet + taxed) * 100) / 100;
}

export const playSlotMachine = mutation({
  args: { bet: v.number() },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bet = ensureBet(args.bet);
    const account = await getPersonalAccount(ctx, userId);
    if (!account) throw new Error("Personal account not found");

    const balance = account.balance ?? 0;
    if (balance < bet) throw new Error("Insufficient funds");

    const casinoAccount = await getCasinoAccount(ctx, userId);
    let playerBalance = balance - bet;
    let houseBalance = (casinoAccount.balance ?? 0) + bet;

    await ctx.db.patch(account._id, { balance: playerBalance });
    await ctx.db.patch(casinoAccount._id, { balance: houseBalance });

    await recordLedger(ctx, account._id, casinoAccount._id, bet, "Slot machine wager", "gamble");

    const reels = [rollSlotSymbol(), rollSlotSymbol(), rollSlotSymbol()];
    const { multiplier, payout: rawPayout } = calculateSlotPayout(reels, bet);
    const payout = multiplier > 0 ? applyHouseEdge(rawPayout, bet) : 0;

    if (payout > 0) {
      houseBalance -= payout;
      playerBalance += payout;
      await ctx.db.patch(casinoAccount._id, { balance: houseBalance });
      await ctx.db.patch(account._id, { balance: playerBalance });
      await recordLedger(ctx, casinoAccount._id, account._id, payout, "Slot machine payout", "gamble_payout");
    }

    const net = payout - bet;
    const outcome = payout === 0 ? "lose" : payout > bet ? "win" : "push";

    await recordGame(ctx, {
      userId,
      accountId: account._id,
      game: "slots",
      bet,
      payout,
      net,
      outcome,
      details: {
        reels,
        multiplier,
      },
    });

    return {
      bet,
      reels,
      multiplier,
      payout,
      net,
      outcome,
      balance: playerBalance,
      houseEdgeApplied: payout > bet,
    };
  },
});

export const playBlackjack = mutation({
  args: { bet: v.number() },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bet = ensureBet(args.bet);
    const account = await getPersonalAccount(ctx, userId);
    if (!account) throw new Error("Personal account not found");

    const balance = account.balance ?? 0;
    if (balance < bet) throw new Error("Insufficient funds");

    const casinoAccount = await getCasinoAccount(ctx, userId);
    let playerBalance = balance - bet;
    let houseBalance = (casinoAccount.balance ?? 0) + bet;

    await ctx.db.patch(account._id, { balance: playerBalance });
    await ctx.db.patch(casinoAccount._id, { balance: houseBalance });
    await recordLedger(ctx, account._id, casinoAccount._id, bet, "Blackjack wager", "gamble");

    const deck = buildDeck();
    const playerHand = [drawCard(deck), drawCard(deck)];
    const dealerHand = [drawCard(deck), drawCard(deck)];

    while (handValue(playerHand) < 16) {
      playerHand.push(drawCard(deck));
    }

    while (handValue(dealerHand) < 17 || isSoft17(dealerHand)) {
      dealerHand.push(drawCard(deck));
    }

    const playerTotal = handValue(playerHand);
    const dealerTotal = handValue(dealerHand);

    const playerBlackjack = playerHand.length === 2 && playerTotal === 21;
    const dealerBlackjack = dealerHand.length === 2 && dealerTotal === 21;

    let rawPayout = 0;
    let outcome: string;

    if (playerTotal > 21) {
      outcome = "bust";
    } else if (dealerTotal > 21) {
      rawPayout = bet * 2;
      outcome = "dealer_bust";
    } else if (playerBlackjack && !dealerBlackjack) {
      rawPayout = bet * 2.5;
      outcome = "blackjack";
    } else if (playerBlackjack && dealerBlackjack) {
      rawPayout = bet;
      outcome = "push";
    } else if (dealerBlackjack) {
      outcome = "dealer_blackjack";
    } else if (playerTotal > dealerTotal) {
      rawPayout = bet * 2;
      outcome = "win";
    } else if (playerTotal === dealerTotal) {
      rawPayout = bet;
      outcome = "push";
    } else {
      outcome = "lose";
    }

    const payout = rawPayout > 0 ? applyHouseEdge(rawPayout, bet) : 0;

    if (payout > 0) {
      houseBalance -= payout;
      playerBalance += payout;
      await ctx.db.patch(casinoAccount._id, { balance: houseBalance });
      await ctx.db.patch(account._id, { balance: playerBalance });
      await recordLedger(ctx, casinoAccount._id, account._id, payout, "Blackjack payout", "gamble_payout");
    }

    const net = payout - bet;

    await recordGame(ctx, {
      userId,
      accountId: account._id,
      game: "blackjack",
      bet,
      payout,
      net,
      outcome,
      details: {
        playerHand,
        dealerHand,
        playerTotal,
        dealerTotal,
      },
    });

    return {
      bet,
      playerHand,
      dealerHand,
      playerTotal,
      dealerTotal,
      payout,
      net,
      outcome,
      balance: playerBalance,
      houseEdgeApplied: payout > bet,
    };
  },
});

export const playRoulette = mutation({
  args: {
    bet: v.number(),
    selection: v.union(
      v.object({
        type: v.literal("color"),
        value: v.union(v.literal("red"), v.literal("black"), v.literal("green")),
      }),
      v.object({
        type: v.literal("number"),
        value: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bet = ensureBet(args.bet);
    const account = await getPersonalAccount(ctx, userId);
    if (!account) throw new Error("Personal account not found");

    const balance = account.balance ?? 0;
    if (balance < bet) throw new Error("Insufficient funds");

    const casinoAccount = await getCasinoAccount(ctx, userId);
    let playerBalance = balance - bet;
    let houseBalance = (casinoAccount.balance ?? 0) + bet;

    await ctx.db.patch(account._id, { balance: playerBalance });
    await ctx.db.patch(casinoAccount._id, { balance: houseBalance });
    await recordLedger(ctx, account._id, casinoAccount._id, bet, "Roulette wager", "gamble");

    const winningNumber = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)];
    const winningColor = ROULETTE_COLORS[winningNumber];

    let rawPayout = 0;
    let outcome: string;

    if (args.selection.type === "color") {
      if (args.selection.value === winningColor) {
        rawPayout = bet * (winningColor === "green" ? 15 : 2);
        outcome = winningColor === "green" ? "lucky_green" : "color_match";
      } else {
        outcome = "color_miss";
      }
    } else {
      const picked = clampRouletteNumber(args.selection.value);
      if (picked === winningNumber) {
        rawPayout = bet * 36;
        outcome = "number_match";
      } else {
        outcome = "number_miss";
      }
    }

    const payout = rawPayout > 0 ? applyHouseEdge(rawPayout, bet) : 0;

    if (payout > 0) {
      houseBalance -= payout;
      playerBalance += payout;
      await ctx.db.patch(casinoAccount._id, { balance: houseBalance });
      await ctx.db.patch(account._id, { balance: playerBalance });
      await recordLedger(ctx, casinoAccount._id, account._id, payout, "Roulette payout", "gamble_payout");
    }

    const net = payout - bet;

    await recordGame(ctx, {
      userId,
      accountId: account._id,
      game: "roulette",
      bet,
      payout,
      net,
      outcome,
      details: {
        winningNumber,
        winningColor,
        selection: args.selection,
      },
    });

    return {
      bet,
      winningNumber,
      winningColor,
      payout,
      net,
      outcome,
      balance: playerBalance,
      houseEdgeApplied: payout > bet,
    };
  },
});

export const getRecentGambleHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    const limit = args.limit && args.limit > 0 ? Math.min(args.limit, 30) : 15;

    const history = await ctx.db
      .query("gambles")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return history.map((entry: any) => ({
      ...entry,
      details: entry.details ? JSON.parse(entry.details) : undefined,
    }));
  },
});
