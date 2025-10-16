# Moderation Scripts

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

**IMPORTANT: Run this BEFORE using ai-buy or gambling features for the first time!**

This script ensures both the "System" and "QuickBuck Casino Reserve" accounts are not owned by players:

```bash
npm run fix-system-account
```

You'll be prompted for:
1. Your Convex admin key

The script will fix **TWO** critical accounts:

### 1. System Account (for AI purchases, loans, initial deposits)
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
- AI purchases were crediting/debiting a real player's account (System account issue)
- Casino winnings/losses were affecting a real player's balance (Casino Reserve issue)

**When to run:**
- ⚠️ **RIGHT NOW** - Before using `ai-buy` or gambling features
- If you notice a player's account balance changing during AI purchases
- If you notice a player's account balance changing during casino games
- After any economy reset

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

## AI Market Simulation

Simulate realistic market demand by having an AI agent purchase products based on their appeal, quality, and pricing:

```bash
npm run ai-buy
```

You'll be prompted for:
1. Your Gemini API key (get one from [Google AI Studio](https://aistudio.google.com/app/apikey))
2. Your Convex admin key

The script will:
1. Fetch all products from the database
2. Send them to Google's Gemini 2.0 Flash Lite model in batches
3. AI analyzes each product and determines purchase quantity (1-100) based on:
   - Product quality (0-100 scale)
   - Price point (affordable items get more purchases)
   - Name and description appeal
   - Tags and relevance
   - Historical sales data
4. Show you the top 10 most demanded products
5. Display total statistics (total spend, average quantity, etc.)
6. Ask for confirmation
7. Process all purchases in batches:
   - Updates product sales statistics
   - Credits company accounts
   - Creates ledger entries
   - Makes companies public if balance > $50,000

**Features:**
- 🤖 Uses Gemini 2.0 Flash Lite (fast and efficient)
- 💰 Unlimited budget - AI must purchase every product
- 📊 Quantities vary realistically (1-100 per product)
- 🔄 Batch processing for efficiency
- 📝 Full transaction logging
- 🚨 Fallback mechanism if AI fails to respond
- 💼 Automatic company status updates

**Model Information:**
- **Model**: `gemini-2.0-flash-lite`
- **Provider**: Google AI
- **Cost**: Free tier available (15 RPM, 1500 RPD)
- **Context Window**: 1M tokens

**Use Cases:**
- Seed the marketplace with realistic purchase data
- Test product pricing and demand
- Bootstrap new deployments
- Simulate market activity for demos

## Future Improvements

- [ ] Add dry-run mode (show what would be deleted without actually deleting)
- [ ] Add filtering by date (e.g., only check items created in the last week)
- [ ] Add option to export flagged items to CSV before deleting
- [ ] Support for custom moderation rules/criteria
- [ ] Auto-fix orphaned products after company deletion
- [ ] Add configurable budget limits for AI purchases
- [ ] Support for multiple AI models (OpenAI, Anthropic, etc.)

````
