# Dice Game Feature

**Date**: October 15, 2025  
**Feature**: Animated dice minigame added to gambling section

---

## Overview

Added a new dice rolling game to the gambling section with smooth animations similar to the slots game. Players can bet on various outcomes with different payout multipliers.

---

## Game Mechanics

### Bet Types & Payouts:

1. **Over 7** (2x payout)
   - Win if dice total > 7
   - Probability: ~41.67% (15/36 rolls)

2. **Under 7** (2x payout)
   - Win if dice total < 7
   - Probability: ~41.67% (15/36 rolls)

3. **Lucky 7** (5x payout)
   - Win if dice total = 7 exactly
   - Probability: ~16.67% (6/36 rolls)

4. **Snake Eyes** (30x payout)
   - Win if both dice show 1
   - Probability: ~2.78% (1/36 rolls)

5. **Boxcars** (30x payout)
   - Win if both dice show 6
   - Probability: ~2.78% (1/36 rolls)

### House Edge:
- 4% rake applied to all winning payouts (consistent with other games)
- Minimum bet: $10

---

## Features

### Animation:
- **Dice rolling animation**: Dice faces rapidly change during the roll
- **Bounce effect**: Visual feedback with bouncing animation
- **2-second roll duration**: Similar timing to slots for consistency
- **Smooth reveal**: Dice settle on final values after animation completes

### Visual Elements:
- **Unicode dice faces**: ⚀ ⚁ ⚂ ⚃ ⚄ ⚅
- **Large dice display**: 6xl text size for clear visibility
- **Animated rolling**: Uses interval to show random dice faces
- **Result display**: Shows individual dice values and total

### UI/UX:
- **5 betting options**: Easy button selection for bet types
- **Selected state**: Active button highlighted
- **Payout multipliers**: Clearly labeled on each button
- **Responsive layout**: Works on mobile and desktop
- **Toast notifications**: Success/failure feedback
- **History tracking**: Rolls recorded in gambling history

---

## Technical Implementation

### Backend (`convex/gamble.ts`):

```typescript
export const playDice = mutation({
  args: {
    bet: v.number(),
    prediction: v.union(
      v.literal("over"),
      v.literal("under"),
      v.literal("lucky7"),
      v.literal("snake_eyes"),
      v.literal("boxcars")
    ),
  },
  handler: async (ctx, args) => {
    // Validate bet and check balance
    // Roll two dice (1-6)
    // Check win condition based on prediction
    // Apply house edge to winnings
    // Update balances and record transaction
  }
});
```

**Key functions:**
- Bet validation with minimum $10
- Random dice rolling using Math.random()
- Win condition checking based on prediction type
- House edge application (4% rake)
- Ledger recording for all transactions
- Game history tracking

### Frontend (`app/components/game/gamble-tab.tsx`):

**State management:**
```typescript
const [diceBet, setDiceBet] = useState(100);
const [dicePrediction, setDicePrediction] = useState<"over" | "under" | ...>("over");
const [isDiceLoading, setIsDiceLoading] = useState(false);
const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
const [diceDisplay, setDiceDisplay] = useState<[number, number]>([1, 1]);
```

**Animation system:**
```typescript
// Start rolling animation
const startDiceAnimation = () => {
  diceRollIntervalRef.current = setInterval(() => {
    const randomDie1 = Math.floor(Math.random() * 6) + 1;
    const randomDie2 = Math.floor(Math.random() * 6) + 1;
    setDiceDisplay([randomDie1, randomDie2]);
  }, 100); // Update every 100ms
};

// Stop animation and reveal result
const stopDiceAnimation = () => {
  clearInterval(diceRollIntervalRef.current);
  clearTimeout(diceRevealTimeoutRef.current);
};
```

**Roll handler:**
```typescript
const handleDiceRoll = async () => {
  // Validate bet
  // Start animation
  // Call backend API
  // Wait for 2-second animation
  // Stop animation and show result
  // Display toast notification
};
```

### Schema Updates:

**Modified `convex/schema.ts`:**
```typescript
game: v.union(
  v.literal("slots"),
  v.literal("blackjack"),
  v.literal("roulette"),
  v.literal("dice")  // Added
),
```

---

## UI Layout

The dice game card includes:

1. **Header**: Title with dice icon
2. **Bet input**: Number field for bet amount
3. **Prediction buttons**: 5 buttons in grid layout
   - 2x2 grid for first 4 options
   - Full-width button for last option
4. **Roll button**: Large primary button
5. **Result display**:
   - Animated dice faces (large)
   - Dice values and total
   - Win/lose badge
   - Net result and balance

---

## Files Modified

### Backend:
1. `convex/schema.ts` - Added "dice" to game union type
2. `convex/gamble.ts`:
   - Updated `recordGame` type
   - Added `playDice` mutation

### Frontend:
3. `app/components/game/gamble-tab.tsx`:
   - Added dice state management
   - Added dice animation refs
   - Added dice roll handler
   - Added dice UI card
   - Updated history description

---

## Testing Checklist

- [x] Backend validation (minimum bet, balance check)
- [x] Dice roll randomness
- [x] Win condition logic for all 5 bet types
- [x] House edge calculation
- [x] Balance updates (deduction and payout)
- [x] Ledger transaction recording
- [x] Animation timing (2 seconds)
- [x] Animation cleanup on unmount
- [x] Toast notifications
- [x] History tracking
- [x] Responsive layout
- [x] Error handling

---

## User Experience

### Flow:
1. User enters bet amount
2. User selects prediction type
3. User clicks "Roll the dice"
4. Dice animate for 2 seconds
5. Dice settle on result
6. Win/loss displayed with net profit
7. Balance updated
8. Result added to history

### Feedback:
- **Visual**: Animated dice, color-coded badges
- **Text**: Clear result messages
- **Toast**: Success/failure notifications
- **History**: Detailed roll information

---

## Payout Examples

**$100 bet:**
- Over 7 (win): ~$192 (2x with 4% rake)
- Lucky 7 (win): ~$480 (5x with 4% rake)
- Snake Eyes (win): ~$2,880 (30x with 4% rake)

**Risk vs Reward:**
- Lower risk: Over/Under (41.67% chance, 2x payout)
- Medium risk: Lucky 7 (16.67% chance, 5x payout)
- High risk: Snake Eyes/Boxcars (2.78% chance, 30x payout)

---

## Future Enhancements

Potential improvements:
1. Add "doubles" bet option (any matching pair)
2. Add "evens/odds" bet option
3. Add sound effects for dice roll
4. Add 3D dice animation with CSS transforms
5. Add multiplayer dice battles
6. Add dice streak bonuses

---

## Conclusion

The dice game adds variety to the gambling section with:
- ✅ Simple, intuitive interface
- ✅ Engaging animations
- ✅ Multiple risk levels
- ✅ Fair odds with house edge
- ✅ Consistent with existing games
- ✅ Mobile-friendly design

The game is production-ready and integrates seamlessly with the existing gambling infrastructure.
