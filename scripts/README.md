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
1. Your OpenRouter API key
2. Your Convex admin key

The script will:
1. Fetch all companies from Convex
2. Send the data to AI (GPT-4o-mini via OpenRouter)
3. Show you which companies the AI recommends removing
4. Ask for confirmation before deleting

### Prune Products

Same as above, but for products:

```bash
npm run prune-products
```

## How It Works

1. **Data Fetching**: Uses Convex HTTP client to fetch all companies/products
2. **AI Analysis**: Sends data to OpenAI's GPT-4o-mini (free tier) via OpenRouter
3. **Structured Output**: Uses Vercel AI SDK's `generateObject` for reliable JSON responses
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

- **OpenRouter (GPT-4o-mini)**: Free tier available
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

- **Model**: `openai/gpt-4o-mini-2024-07-18`
- **Provider**: OpenRouter
- **Cost**: Free tier available
- **Rate Limits**: Check OpenRouter dashboard

## Future Improvements

- [ ] Add dry-run mode (show what would be deleted without actually deleting)
- [ ] Add filtering by date (e.g., only check items created in the last week)
- [ ] Add option to export flagged items to CSV before deleting
- [ ] Support for custom moderation rules/criteria
