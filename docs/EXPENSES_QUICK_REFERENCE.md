# 🏢 Company Expenses - Quick Reference

## TL;DR

Your company now has recurring expenses! Keep your business profitable by managing:

- 💼 **Operating Costs** (2-5% of revenue monthly)
- 💰 **Taxes** (21% of profits)
- 📜 **Licenses** ($1k-$10k every 90 days)
- 🔧 **Product Maintenance** (5-15% of product price)

## Quick Facts

| Expense Type    | Frequency | Cost                    | Notes                    |
| --------------- | --------- | ----------------------- | ------------------------ |
| Operating Costs | Daily     | 2-5% of monthly revenue | Min $100/month           |
| Corporate Taxes | Daily     | 21% of profits          | Only on positive profits |
| Licenses        | One-time  | $1k-$10k                | Valid for 90 days        |
| Maintenance     | On-demand | 5-15% of product price  | Restores quality to 100% |

## License Costs

| Industry      | Cost    | Tags That Require It               |
| ------------- | ------- | ---------------------------------- |
| Tech          | $5,000  | tech, software, ai                 |
| Finance       | $10,000 | finance, bank, invest              |
| Manufacturing | $6,000  | manufacturing, factory, industrial |
| Transport     | $4,000  | transport, logistics, shipping     |
| Food          | $3,000  | food, restaurant, beverage         |
| Retail        | $2,000  | retail, store, shop                |
| Other         | $1,000  | (all others)                       |

## Product Quality

- **100%** = Perfect (new products)
- **70-99%** = Good (maintain soon)
- **40-69%** = Fair (needs maintenance)
- **0-39%** = Poor (maintain immediately)

Quality degrades **5-15 points per week** if not maintained.

## API Quick Reference

### Check License

```typescript
const hasLicense = await hasValidLicense({ companyId, licenseType: "tech" });
```

### Buy License

```typescript
const result = await purchaseLicense({ companyId, licenseType: "tech" });
```

### Maintain Product

```typescript
const result = await performMaintenance({ productId });
```

### Get Expenses

```typescript
const expenses = await getCompanyExpenses({ companyId, days: 30 });
```

### Get All Licenses

```typescript
const licenses = await getCompanyLicenses({ companyId });
```

## Cron Schedule

- **12:00 PM UTC** - Daily expense processing (operating costs + taxes)
- **6:00 AM UTC Mon** - Weekly quality degradation
- **1:00 AM UTC** - Daily license expiration check

## Example Monthly Budget

**Small Company ($50k revenue):**

- Revenue: $50,000
- Production: $30,000
- Operating: $1,750
- Taxes: $3,843
- License: $5,000 (quarterly = $1,667/month)
- **Net Profit:** ~$12,740/month

**Medium Company ($200k revenue):**

- Revenue: $200,000
- Production: $120,000
- Operating: $7,000
- Taxes: $15,330
- License: $5,000 (quarterly = $1,667/month)
- **Net Profit:** ~$54,003/month

**Large Company ($1M revenue):**

- Revenue: $1,000,000
- Production: $600,000
- Operating: $35,000
- Taxes: $76,650
- License: $5,000 (quarterly = $1,667/month)
- **Net Profit:** ~$285,683/month

## Tips

1. **Early Stage:** Buy your required license ASAP
2. **Growth Stage:** Monitor expenses as % of revenue
3. **Mature Stage:** Optimize tax efficiency
4. **Quality:** Maintain products before quality drops below 50%
5. **Cash Flow:** Keep 30 days of expenses in reserve

## Dashboard Changes

Your company dashboard now shows:

- ✅ Total expenses breakdown
- ✅ Operating costs trend
- ✅ Tax liability
- ✅ License status
- ✅ Product quality indicators
- ✅ Expense line in profit chart

## Warning Signs

⚠️ **Watch out for:**

- Unpaid taxes accumulating
- Licenses expiring soon (< 7 days)
- Multiple products below 50% quality
- Operating costs > 10% of revenue
- Negative profit after expenses

## Best Practices

✅ **Do:**

- Renew licenses before expiration
- Maintain products quarterly
- Keep emergency cash reserve
- Monitor expense trends
- Plan for tax payments

❌ **Don't:**

- Let licenses expire
- Ignore product quality
- Spend all profits
- Forget about monthly expenses
- Skip tax planning

## Need Help?

Check the full documentation: `/docs/COMPANY_EXPENSES_SYSTEM.md`
