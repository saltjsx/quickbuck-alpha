# QuickBuck Scripts

Collection of utility scripts for managing and automating the QuickBuck marketplace.

## 📊 Public Purchase System

**Stochastic public purchase algorithm for fair, realistic market simulation**

The public purchase system has been completely redesigned and moved to `convex/publicPurchases.ts`. It uses a sophisticated probabilistic algorithm to simulate realistic market demand without relying on AI/LLM services.

### Key Features

- Stochastic (non-deterministic) purchase decisions
- Quality and price-based scoring system
- Anti-exploit mechanisms (price spam, new product holds)
- Per-company budget caps
- Atomic transactions with retry logic
- Comprehensive telemetry and logging

### Configuration

All parameters are configurable in `convex/publicPurchases.ts`:
- Global budget per wave: $10,000 (tunable)
- Scoring weights: Quality 40%, Price 25%, Demand 20%, Recency 5%, Company 10%
- Purchase caps and limits
- Anti-exploit thresholds

### Documentation

See `STOCHASTIC_PURCHASE_MIGRATION.md` in the root directory for:
- Complete implementation details
- Algorithm specifications
- Configuration options
- Testing recommendations

---

## 📋 Moderation Scripts

These scripts help moderate content in the QuickBuck game by using AI to identify and remove low-quality, spam, or inappropriate content.

## Prerequisites

1. **OpenRouter API Key**: Get one from [OpenRouter](https://openrouter.ai/)
2. **Convex Admin Key**: Set the `ADMIN_KEY` environment variable in your Convex deployment
3. **Convex URL**: Make sure `VITE_CONVEX_URL` is set in your environment

## Setting up the Admin Key

Add an `ADMIN_KEY` to your Convex deployment:

```bash
npx convex env set ADMIN_KEY "your-secure-random-key-here"
```

Generate a secure random key:
```bash
# On macOS/Linux:
openssl rand -base64 32

# Or use a password generator
```

## Usage

### Prune Companies

This script fetches all companies, uses AI to identify problematic ones, and removes them after confirmation:

```bash
npm run prune-companies
```

You'll be prompted for:
1. Your Gemini API key (get one from [Google AI Studio](https://aistudio.google.com/app/apikey))
2. Your Convex admin key

The script will:
1. Fetch all companies from Convex
2. Send the data to AI (Gemini 2.0 Flash Lite)
3. Show you which companies the AI recommends removing
4. Ask for confirmation before deleting

### Prune Products

Same as above, but for products:

```bash
npm run prune-products
```

## How It Works

1. **Data Fetching**: Uses Convex HTTP client to fetch all companies/products
2. **AI Analysis**: Sends data to Google's Gemini 2.0 Flash Lite model
3. **JSON Parsing**: Parses AI's JSON response with fallback error handling
4. **Confirmation**: Shows the AI's recommendations and asks for user confirmation
5. **Batch Deletion**: Uses admin mutations to delete the approved items

## AI Moderation Criteria

The AI filters out content that is:
- Low effort (e.g., "test", "asdf", single words)
- Spam (repetitive, nonsense, promotional)
- Inappropriate (offensive, hateful, NSFW)
- Not suitable for a business simulation game

## Safety Features

- ✅ Requires admin key to perform deletions
- ✅ Shows what will be deleted before proceeding
- ✅ Asks for explicit confirmation (yes/no)
- ✅ Can be cancelled at any time
- ✅ Uses "soft delete" for products (sets `isActive: false`)
- ✅ Companies are fully deleted with all related data cleaned up

## Cost

- **Gemini 2.0 Flash Lite**: Free tier available (15 RPM, 1500 RPD)
- **Convex**: Queries and mutations count toward your usage limits

## Troubleshooting

### "VITE_CONVEX_URL environment variable is not set"
Make sure you have a `.env` file or have exported the variable:
```bash
export VITE_CONVEX_URL="https://your-deployment.convex.cloud"
```

### "Invalid admin key"
Make sure you set the `ADMIN_KEY` in your Convex deployment and are entering it correctly when prompted.

### AI returns empty list
This means no problematic content was found. The AI is conservative and only flags clear violations.

## Model Information

- **Model**: `gemini-2.0-flash-lite`
- **Provider**: Google AI
- **Cost**: Free tier available
- **Rate Limits**: 15 RPM (requests per minute), 1500 RPD (requests per day)

## Fix Orphaned Products

If companies are deleted but their products remain active, those products become "orphaned" and won't show up properly in the marketplace. This script finds and deactivates them:

```bash
npm run fix-orphaned-products
```

You'll be prompted for:
1. Your Convex admin key (only if orphaned products are found)

The script will:
1. Scan all active products
2. Check if their parent company still exists
3. Show you which products are orphaned
4. Ask for confirmation before deactivating them

**When to use this:**
- After running prune-companies
- When users report products/companies not showing up in marketplace
- When you see products with "Unknown" company names

## Troubleshooting Marketplace Issues

### Problem: Products/Companies Not Showing Up

**Symptoms:**
- Products marked as `isActive: true` in database but not visible in marketplace
- Company names showing as "Unknown" in marketplace
- Some products from a company show up, but not all

**Cause:**
When the pruning scripts delete companies, sometimes their products remain active but orphaned (referencing a deleted company). The `getActiveProducts` query filters these out.

**Solution:**
1. Run the fix script:
   ```bash
   npm run fix-orphaned-products
   ```

2. Check the database after:
   - Orphaned products should now be `isActive: false`
   - Only products with valid companies should be active
   - Marketplace should display correctly

**Prevention:**
The company deletion process now automatically deactivates all products when a company is deleted. But older deletions may have left orphaned products behind.

## Fix System Accounts

**IMPORTANT: Run this if you notice account issues with automated systems!**

This script ensures both the "System" and "QuickBuck Casino Reserve" accounts are not owned by players:

```bash
npm run fix-system-account
```

You'll be prompted for:
1. Your Convex admin key

The script will fix **TWO** critical accounts:

### 1. System Account (for public purchases, loans, initial deposits)
- Checks if a "System" user exists (creates one if not)
- Checks if a "System" account exists and who owns it
- If owned by a player (like "saltjsx"), transfers ownership to the system user
- If it doesn't exist, creates it with the system user as owner
- Sets unlimited balance for market operations

### 2. Casino Reserve Account (for gambling operations)
- Checks if a "QuickBuck Casino" user exists (creates one if not)
- Checks if a "QuickBuck Casino Reserve" account exists and who owns it
- If owned by a player (like "saltjsx"), transfers ownership to the casino user
- If it doesn't exist, creates it with the casino user as owner
- Sets unlimited balance for casino operations

**Why this is needed:**
The original code had a bug where the first user to trigger account creation would become the owner of these special accounts. This meant:
- Public purchases were crediting/debiting a real player's account (System account issue)
- Casino winnings/losses were affecting a real player's balance (Casino Reserve issue)

**When to run:**
- If you notice a player's account balance changing during public purchases
- If you notice a player's account balance changing during casino games
- After any economy reset
- After migrating to the stochastic purchase system

## Force Company to Go Public

If a company went public but was recreated and lost its public status, or if you need to manually list a company on the stock market:

```bash
npx tsx scripts/force-company-public.ts
```

You'll be prompted for:
1. Company ticker or ID
2. Your Convex admin key

The script will:
1. Find the company by ticker or ID
2. Show current company details (name, ticker, balance, public status)
3. Force the company to go public with IPO pricing based on balance
4. Create initial stock price history entry

**When to use this:**
- After a company was deleted and recreated (lost its public status)
- When a company should be public but the automatic check failed
- To manually list a company on the stock market

**Pricing:**
- IPO Price = (Company Balance × 10) / 1,000,000 shares
- Creates initial price history for stock market tracking

**Note:** Company owners can also use the "Force" button on the company dashboard page to make their company public without using this script.

## Manual Bot Purchase (CLI Tool)

Interactive CLI tool to manually purchase products as the QuickBuck bot:

```bash
npm run bot-buy
```

You'll be prompted for:
1. Your Convex admin key

The script provides an interactive menu:
- **List products**: Type `list` to see all available products with IDs, prices, and sales
- **Purchase**: Enter product ID and quantity (1-100,000)
- **Confirmation**: Reviews purchase before executing
- **Multiple purchases**: Can make multiple purchases in one session
- **Exit**: Type `exit` or answer 'no' to quit

**Features:**
- 🔍 Browse products with details (ID, name, company, price, sales)
- 💰 Manually purchase any quantity from 1 to 100,000
- ✅ Confirmation before each purchase
- 📊 Shows results (total spent, items purchased, companies affected)
- 🔄 Continuous loop for multiple purchases
- ⚡ Uses the System account (unlimited funds)

**Use Cases:**
- Testing specific product purchases
- Manually boosting specific products
- Debugging purchase logic
- Simulating targeted market activity

## Automated Public Purchases

Public purchases are now handled automatically by the stochastic purchase system running every 20 minutes via Convex cron jobs.

**System Details:**
- Location: `convex/publicPurchases.ts`
- Trigger: Automated cron job every 20 minutes
- Budget: $10,000 per wave (configurable)
- Algorithm: Probabilistic scoring with anti-exploit measures

**Features:**
- Quality-based product scoring
- Price normalization (logarithmic scaling)
- Anti-spam and anti-exploit detection
- Per-company budget caps
- Atomic transactions with retries
- Comprehensive logging and metrics

**Configuration:**
All parameters can be adjusted in `convex/publicPurchases.ts`:
- Budget per wave
- Scoring weights
- Purchase caps
- Anti-exploit thresholds

For full documentation, see `STOCHASTIC_PURCHASE_MIGRATION.md` in the root directory.

## Initialize Upgrades

**IMPORTANT: Run this ONCE after deploying the upgrades feature!**

This script populates the upgrades table with the default upgrade packs:

```bash
npx tsx scripts/init-upgrades.ts
```

The script will:
1. Check if upgrades already exist (to prevent duplicates)
2. Create 7 upgrade packs:
   - Revenue Boost (Low, Medium, High) - $500K, $1.5M, $3M
   - Stock Price Boost (Low, High) - $750K, $2M
   - Stock Price Lower (Low, High) - $1M, $2.5M

**When to run:**
- ⚠️ **Once** after deploying the schema changes
- Only needs to be run once per deployment
- Will return an error if upgrades already exist (this is normal!)

**What it creates:**
All upgrades are created in the `upgrades` table with:
- Name and description
- Type (revenue_boost, stock_price_boost, stock_price_lower)
- Tier (low, medium, high)
- Effect percentage (5%, 10%, 20%, 30%)
- Price (very expensive by design)
- Active status (true)

## Future Improvements

- [ ] Add dry-run mode (show what would be deleted without actually deleting)
- [ ] Add filtering by date (e.g., only check items created in the last week)
- [ ] Add option to export flagged items to CSV before deleting
- [ ] Support for custom moderation rules/criteria
- [ ] Auto-fix orphaned products after company deletion
- [ ] Enhanced anomaly detection in public purchases (self-sell, collusion)
- [ ] A/B testing framework for purchase algorithm tuning


````
