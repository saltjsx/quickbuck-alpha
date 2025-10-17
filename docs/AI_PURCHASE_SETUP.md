# AI Purchase System - Setup Checklist

## Quick Start Guide

Follow these steps to get the AI-powered purchase system running:

### ✅ Step 1: Get Gemini API Key

1. Go to https://aistudio.google.com/
2. Sign in with Google account
3. Click "Get API Key"
4. Create new API key
5. Copy the key

**Cost:** FREE (generous free tier)

---

### ✅ Step 2: Add Environment Variable

Add to your `.env.local` file:

```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

**Important:** Also add this to your Convex Dashboard:
1. Go to https://dashboard.convex.dev/
2. Select your project
3. Go to Settings → Environment Variables
4. Add `GEMINI_API_KEY` with your key

---

### ✅ Step 3: Verify Admin Key

Make sure `ADMIN_KEY` is set in both:
- `.env.local` (for local testing)
- Convex Dashboard (for production)

```bash
# In .env.local
ADMIN_KEY=your-secure-admin-key
```

---

### ✅ Step 4: Deploy to Convex

```bash
npx convex deploy
```

Wait for deployment to complete.

---

### ✅ Step 5: Verify Cron Job

1. Go to Convex Dashboard
2. Click "Crons" tab
3. Look for "AI automatic product purchases"
4. Should show:
   - Status: Active ✅
   - Interval: 20 minutes
   - Last run: (timestamp)

---

### ✅ Step 6: Test Manually (Optional)

Run a test to verify everything works:

```bash
npm run trigger-ai-purchase
```

Expected output:
```
🚀 Triggering AI Purchase Service
...
✅ AI Purchase Service Complete!
💰 Total spent: $8,456,234
📦 Total items: 23,456
🏷️  Products purchased: 325
```

---

## Troubleshooting

### ❌ Error: "GEMINI_API_KEY not configured"

**Fix:** Add `GEMINI_API_KEY` to Convex environment variables
1. Convex Dashboard → Settings → Environment Variables
2. Add `GEMINI_API_KEY`
3. Redeploy: `npx convex deploy`

---

### ❌ Error: "Unauthorized"

**Fix:** Verify `ADMIN_KEY` matches in:
- `.env.local`
- Convex Dashboard environment variables

---

### ❌ Cron not running

**Fix:**
1. Check Convex Dashboard → Crons tab
2. Verify "AI automatic product purchases" is Active
3. Redeploy: `npx convex deploy`
4. Wait 20 minutes for next run

---

### ❌ Test command fails

**Fix:**
```bash
# Make sure you have all dependencies
npm install

# Run the test again
npm run trigger-ai-purchase
```

---

## System Status

Once running, the system will:

- ⏰ Run **every 20 minutes**
- 💰 Spend **$6M-$10M per run**
- 📦 Purchase **300-500+ products**
- 🏢 Affect **50-100+ companies**
- ⚡ Complete in **30-60 seconds**

---

## Monitoring

### Watch it in action:

1. **Convex Dashboard → Logs**
   - Look for "🤖 AI Purchase cron triggered"
   - HTTP action execution
   - Purchase completions

2. **Convex Dashboard → Crons**
   - Last run timestamp
   - Success/failure status

3. **Company Balances**
   - Companies should see regular income
   - Check company accounts for ledger entries

---

## Next Steps

✅ System is running automatically!

**Optional:**
- Review [full documentation](./AI_PURCHASE_SYSTEM.md)
- Customize batch size (currently 50)
- Adjust minimum spend (currently $1M/batch)
- Monitor Gemini API usage in Google AI Studio

---

## Support

Need help?

1. Check [AI_PURCHASE_SYSTEM.md](./AI_PURCHASE_SYSTEM.md) for detailed docs
2. Review Convex Dashboard logs
3. Test manually: `npm run trigger-ai-purchase`
4. Check Gemini API status: https://aistudio.google.com/

---

**Setup Time:** ~10 minutes  
**Cost:** FREE (Gemini free tier)  
**Maintenance:** None (fully automated)

✨ Enjoy your AI-powered marketplace!
