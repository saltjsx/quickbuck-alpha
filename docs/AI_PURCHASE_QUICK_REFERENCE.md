# 🤖 AI Purchase System - Quick Reference Card

## 📋 Your To-Do List

### 1. Get Gemini API Key (FREE!)
```
🌐 Visit: https://aistudio.google.com/
👤 Sign in with Google
🔑 Click "Get API Key"
📋 Copy the key
```

### 2. Add to .env.local
```bash
GEMINI_API_KEY=your-key-here
```

### 3. Add to Convex Dashboard
```
🌐 https://dashboard.convex.dev/
⚙️  Settings → Environment Variables
➕ Add: GEMINI_API_KEY
💾 Save
```

### 4. Deploy
```bash
npx convex deploy
```

### 5. Verify (Optional)
```bash
npm run trigger-ai-purchase
```

---

## ✨ That's It! System Will Now:

```
⏰ Run every 20 minutes
💰 Spend $6M-$10M per run  
📦 Buy 300-500+ products
🤖 Use AI to make decisions
🏢 Give income to all companies
💸 Cost: $0 (free tier)
```

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| Frequency | Every 20 minutes |
| Products/Run | 300-500+ |
| Spend/Run | $6M-$10M |
| Batch Size | 50 products |
| Daily Runs | 72 times |
| Daily Spend | ~$500M-$720M |
| Monthly Cost | $0 (FREE!) |

---

## 🎯 AI Behavior

The AI acts like **real people** buying products:

✅ High quality products → Buy more  
✅ Useful products → Higher demand  
✅ Fair prices → Better sales  
✅ Every product → Gets a chance  
❌ Spam products → Avoided  
❌ Low quality → Minimal purchases  

---

## 🔍 Monitor It

**Convex Dashboard → Crons**
```
Name: "AI automatic product purchases"
Status: ✅ Active
Interval: 20 minutes
Last Run: [timestamp]
```

**Convex Dashboard → Logs**
```
Search: "AI Purchase"
Look for: Cron triggers, AI decisions, purchases
```

---

## 🧪 Test Commands

```bash
# Trigger manually (tests HTTP action)
npm run trigger-ai-purchase

# Run standalone version
npm run ai-purchase
```

---

## 📁 New Files Created

```
scripts/
  ├── ai-purchase-service.ts      (standalone script)
  └── trigger-ai-purchase.ts      (HTTP trigger)

docs/
  ├── AI_PURCHASE_SYSTEM.md       (full docs)
  ├── AI_PURCHASE_SETUP.md        (setup guide)
  └── AI_PURCHASE_IMPLEMENTATION_SUMMARY.md
```

---

## 🔧 Modified Files

```
convex/
  ├── crons.ts                    (20min interval, AI version)
  ├── products.ts                 (+ automaticPurchaseAI)
  ├── http.ts                     (+ /api/ai-purchase)
  └── schema.ts                   (already had ai_purchase type)

package.json                      (+ npm scripts)
scripts/README.md                 (+ AI section)
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Key error | Add GEMINI_API_KEY to Convex |
| Unauthorized | Check ADMIN_KEY |
| Not running | Redeploy: npx convex deploy |
| Test fails | Run: npm install |

---

## 📚 Documentation

1. **Setup Guide**: `docs/AI_PURCHASE_SETUP.md`
2. **Full Docs**: `docs/AI_PURCHASE_SYSTEM.md`
3. **Summary**: `docs/AI_PURCHASE_IMPLEMENTATION_SUMMARY.md`
4. **This Card**: `docs/AI_PURCHASE_QUICK_REFERENCE.md`

---

## 🚀 What Changed?

### Before
- ⚙️  Fixed algorithm
- ⏰ Every 10 minutes
- 💰 Exactly $5M/run
- 🎲 Random distribution

### After
- 🤖 AI-powered decisions
- ⏰ Every 20 minutes
- 💰 $6M-$10M/run
- 🎯 Smart, realistic behavior

---

## 💰 Cost Breakdown

```
Gemini API Free Tier:
  ✅ 15 requests/minute
  ✅ 1M tokens/minute
  ✅ FREE forever

This System Uses:
  📊 7-10 requests/run
  ⏰ 3 runs/hour
  💯 Well under limits

Your Cost: $0/month 🎉
```

---

## ✅ Success Checklist

- [ ] Got Gemini API key
- [ ] Added to .env.local
- [ ] Added to Convex Dashboard
- [ ] Ran: npx convex deploy
- [ ] Checked Crons tab (Active)
- [ ] (Optional) Tested: npm run trigger-ai-purchase
- [ ] Verified logs show AI purchases
- [ ] Watched company balances increase

---

## 🎓 Key Features

```
🤖 Uses Gemini 2.5 Flash Lite
📦 Batches of 50 products
💰 $1M minimum per batch
🎯 Every product evaluated
🧠 Acts like real people
🚫 Avoids spam/low quality
⏰ Runs automatically
💸 $0 cost (free tier)
📊 Detailed logging
🔄 Easy rollback
```

---

## 🎉 You're Done!

The system is now:
- ✅ Configured
- ✅ Deployed
- ✅ Running automatically
- ✅ Making smart decisions
- ✅ Generating revenue
- ✅ Costing you nothing

**Enjoy your AI-powered marketplace!** 🚀

---

Need help? Check the full docs:
📖 `docs/AI_PURCHASE_SYSTEM.md`
