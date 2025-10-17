# AI-Powered Automatic Purchase System

## Overview

The automatic product purchasing system has been upgraded to use **Google's Gemini 2.5 Flash Lite** AI model to make intelligent purchasing decisions. The AI acts like the general public, making realistic purchasing decisions based on product quality, price, usefulness, and market demand.

## Key Features

- **🤖 AI-Powered**: Uses Gemini 2.5 Flash Lite to evaluate and purchase products
- **📦 Batch Processing**: Processes products in batches of 50 to avoid context window overload
- **💰 Guaranteed Spending**: Minimum $1M spend per batch
- **⏰ Automatic Scheduling**: Runs every 20 minutes via cron job
- **🎯 Fair Distribution**: Every product gets evaluated and a chance to be purchased
- **🧠 Realistic Behavior**: AI simulates general public purchasing patterns
- **🚫 Spam Protection**: Avoids low-quality and spam products

## System Architecture

### Components

1. **Cron Job** (`convex/crons.ts`)
   - Triggers AI purchase every 20 minutes
   - Calls `automaticPurchaseAI` internal mutation

2. **HTTP Action** (`convex/http.ts`)
   - Endpoint: `/api/ai-purchase`
   - Fetches all active products
   - Splits products into batches of 50
   - Calls Gemini AI for each batch
   - Executes purchases via `adminAIPurchase` mutation

3. **Purchase Mutation** (`convex/products.ts`)
   - `adminAIPurchase`: Executes purchases with admin privileges
   - `automaticPurchaseAI`: Placeholder mutation triggered by cron

4. **Standalone Script** (`scripts/ai-purchase-service.ts`)
   - Can be run manually for testing
   - Same logic as HTTP action
   - Useful for debugging

5. **Trigger Script** (`scripts/trigger-ai-purchase.ts`)
   - Manually trigger the HTTP action
   - Useful for testing without waiting for cron

## AI Purchasing Strategy

### Decision Criteria

The AI evaluates products based on:

1. **Quality Score** (0-100)
   - High quality (90-100): Buy more generously
   - Medium quality (70-89): Buy moderately
   - Low quality (50-69): Buy sparingly
   - Very low (<50): Minimal or skip if spam

2. **Price Point**
   - Cheap items ($1-$100): Can buy in larger quantities
   - Mid-range ($100-$1000): Moderate quantities
   - Expensive ($1000+): Smaller quantities, must be justified

3. **Product Type**
   - Essential products: Higher demand
   - Luxury items: Lower but steady demand
   - B2B products: Moderate professional demand
   - Consumer goods: Mix based on usefulness

4. **Market Needs**
   - Acts like the general public
   - Considers what real consumers and businesses need
   - Avoids spam and low-quality products

### Purchasing Guidelines

- **Minimum Spend**: $1M per batch (enforced by AI prompt)
- **Fair Distribution**: Most products get 1-5 units minimum
- **Realistic Quantities**: 
  - Cheap items: Up to 100+ units
  - Mid-range: 10-50 units
  - Expensive: 1-20 units
- **Spam Protection**: AI identifies and minimizes purchases of spam products

## Setup Instructions

### Prerequisites

1. **Node.js**: Version 18+ required
2. **Convex Account**: Active Convex deployment
3. **Google AI Studio Account**: For Gemini API access

### Environment Variables

Add the following to your `.env.local` file:

```bash
# Existing variables
VITE_CONVEX_URL=https://your-deployment.convex.cloud
ADMIN_KEY=your-secure-admin-key

# New variable - REQUIRED
GEMINI_API_KEY=your-gemini-api-key
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" in the top right
4. Create a new API key or use an existing one
5. Copy the key and add it to `.env.local`

**Important Notes:**
- Gemini 2.5 Flash Lite has a **free tier** with generous limits
- Free tier: 15 requests per minute, 1 million tokens per minute
- Each batch uses ~1-2 requests
- With batches of 50, you can process ~750 products per minute (well within limits)

### Installation

No additional packages needed! The `@google/generative-ai` package is already in `package.json`.

### Deployment

1. **Set Environment Variables**
   ```bash
   # In Convex Dashboard -> Settings -> Environment Variables
   GEMINI_API_KEY=your-gemini-api-key
   ADMIN_KEY=your-secure-admin-key
   ```

2. **Deploy Convex Functions**
   ```bash
   npx convex dev  # For development
   # or
   npx convex deploy  # For production
   ```

3. **Verify Cron Job**
   - Go to Convex Dashboard
   - Navigate to Crons tab
   - Look for "AI automatic product purchases"
   - Should run every 20 minutes

## Testing

### Manual Test (HTTP Trigger)

```bash
npm run trigger-ai-purchase
```

This will:
- Call the HTTP action endpoint
- Process all products in batches
- Show detailed output
- Return summary statistics

### Standalone Script Test

```bash
npm run ai-purchase
```

This runs the standalone script with the same logic.

### Monitor in Convex Dashboard

1. Go to Convex Dashboard
2. Click "Logs" tab
3. Watch for:
   - "🤖 AI Purchase cron triggered"
   - HTTP action logs
   - Purchase execution logs

## Expected Behavior

### Successful Run

```
🤖 AI Purchase Service Starting
═══════════════════════════════════════════════════════════
⏰ Time: 2025-10-17T...
🤖 Model: Gemini 2.5 Flash Lite
📦 Batch size: 50 products
💰 Min spend per batch: $1,000,000
═══════════════════════════════════════════════════════════

📦 Fetching active products from marketplace...
✅ Found 350 active products

📊 Split 350 products into 7 batches

═══════════════════════════════════════════════════════════
📦 Processing Batch 1/7
═══════════════════════════════════════════════════════════

🤖 Asking AI to evaluate batch 1/7 (50 products)...
✅ AI recommended 47 purchases
💰 Estimated spend: $1,245,890

💳 Executing 47 purchases for batch 1...
✅ Batch 1 complete!
   - Total spent: $1,245,890
   - Products purchased: 47
   - Total items: 3,421
   - Companies affected: 32

[... continues for all batches ...]

═══════════════════════════════════════════════════════════
📊 FINAL SUMMARY
═══════════════════════════════════════════════════════════
✅ Successfully processed 7 batches
💰 Total spent: $8,456,234
📦 Total items purchased: 23,456
🏷️  Unique products purchased: 325
🏢 Companies affected: 7
⏱️  Total time: 45.3s
═══════════════════════════════════════════════════════════
✨ AI Purchase Service Complete
```

### Performance Metrics

- **Products**: 300-500 active products
- **Batches**: 6-10 batches (50 products each)
- **Spend**: $6M-$10M per run (average $8M)
- **Duration**: 30-60 seconds per run
- **Frequency**: Every 20 minutes = 72 runs/day
- **Daily Volume**: ~$500M-$720M in automated purchases

## Cost Analysis

### Gemini API Costs

**Free Tier:**
- 15 requests per minute
- 1 million tokens per minute
- Free forever for reasonable use

**Each Run:**
- ~7-10 batches (AI requests)
- ~2-3 minutes total time
- Well within free tier limits

**Monthly Cost:**
- Free tier is sufficient for this use case
- Even with 72 runs/day = ~5,000 requests/month
- Far below the free tier limit

**If you exceed free tier:**
- Pay-as-you-go: $0.075 per 1M input tokens
- Estimated: <$1/month for this use case

### ROI

- **Automated Revenue**: ~$500M/day for companies
- **API Cost**: $0-$1/month
- **ROI**: Essentially infinite 🚀

## Monitoring & Troubleshooting

### Check if System is Running

1. **Convex Dashboard**
   - Crons tab → "AI automatic product purchases"
   - Should show "Active" status
   - Last run timestamp should be within 20 minutes

2. **Logs**
   - Watch for cron trigger logs
   - HTTP action execution logs
   - Purchase completion logs

### Common Issues

#### 1. "GEMINI_API_KEY not configured"
**Solution:** Add `GEMINI_API_KEY` to Convex environment variables

#### 2. "Unauthorized" error
**Solution:** Verify `ADMIN_KEY` is set correctly in environment

#### 3. AI returns malformed JSON
**Solution:** The code includes JSON cleaning logic, but if persistent:
- Check Gemini API status
- Verify prompt is not truncated
- Try reducing batch size temporarily

#### 4. Spending less than $1M per batch
**Solution:** 
- AI is instructed to spend minimum $1M
- If products are very cheap, it may buy huge quantities
- If products are very expensive, batch might not reach $1M (rare)

#### 5. Cron not triggering
**Solution:**
- Verify cron is active in Convex Dashboard
- Check deployment is up-to-date: `npx convex deploy`
- Look for error logs in Convex Dashboard

### Debug Mode

Enable detailed logging:

```typescript
// In convex/http.ts, add console.logs at key points
console.log("Products fetched:", products.length);
console.log("AI Response:", text);
console.log("Purchase result:", purchaseResult);
```

## Migration from Old System

### What Changed

**Before:**
- Fixed algorithm with revenue weighting
- Ran every 10 minutes
- Spent exactly $5M per run
- Deterministic behavior

**After:**
- AI-powered intelligent decisions
- Runs every 20 minutes
- Spends $1M+ per batch (typically $6M-$10M total)
- Realistic, varied behavior

### Rollback Plan

If you need to revert to the old system:

1. **Update cron** (`convex/crons.ts`):
   ```typescript
   crons.interval(
     "automatic product purchases",
     { minutes: 10 },
     internal.products.automaticPurchase
   );
   ```

2. **Deploy**: `npx convex deploy`

The old `automaticPurchase` function is still in the codebase.

## Future Improvements

### Potential Enhancements

1. **Dynamic Batch Sizing**
   - Adjust batch size based on total product count
   - Smaller batches for better AI context

2. **Multi-Model Support**
   - Try different AI models (GPT-4, Claude, etc.)
   - A/B test which makes better decisions

3. **Learning from History**
   - Feed purchase history into AI prompt
   - Learn which products are popular

4. **Market Trends**
   - Time-based purchasing (higher on weekends, etc.)
   - Seasonal adjustments

5. **Company Health Scoring**
   - Prioritize struggling companies
   - Boost products from companies near bankruptcy

6. **Sentiment Analysis**
   - Analyze product descriptions for sentiment
   - Factor into purchasing decisions

## API Reference

### HTTP Endpoint

**URL:** `https://your-deployment.convex.cloud/api/ai-purchase`

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
X-Admin-Key: your-admin-key
```

**Body:**
```json
{
  "adminKey": "your-admin-key"
}
```

**Response:**
```json
{
  "success": true,
  "totalSpent": 8456234,
  "totalItems": 23456,
  "totalProductsPurchased": 325,
  "batchesProcessed": 7,
  "productsEvaluated": 350,
  "errors": []
}
```

### Convex Mutations

#### `automaticPurchaseAI`
- **Type:** Internal Mutation
- **Triggered by:** Cron job
- **Purpose:** Placeholder, logs trigger

#### `adminAIPurchase`
- **Type:** Public Mutation
- **Args:** 
  - `purchases`: Array of `{ productId, quantity }`
  - `adminKey`: Admin authentication key
- **Returns:** Purchase statistics

## Support

### Questions?

- Check Convex Dashboard logs first
- Review this documentation
- Test with `npm run trigger-ai-purchase`
- Check Gemini API status

### Known Limitations

1. **Context Window**: Batch size limited to 50 to avoid overload
2. **Rate Limits**: Gemini free tier has request limits (rarely hit)
3. **JSON Parsing**: AI occasionally returns malformed JSON (auto-cleaned)
4. **Network Issues**: HTTP action might timeout on slow networks

---

**Version:** 1.0  
**Last Updated:** October 17, 2025  
**Author:** QuickBuck Development Team
