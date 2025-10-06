# 🏢 Company Expenses System

## Overview

The Company Expenses System introduces realistic business costs that companies must manage to stay profitable. This system creates more strategic gameplay by requiring players to balance revenue generation with expense management.

## Features

### 1. 💼 Operating Costs

**Description:** Companies pay recurring expenses for rent, staff wages, and logistics.

**How it works:**

- Calculated as 2-5% of monthly revenue (30-day rolling)
- Minimum cost: $100/month
- Scales with company size and revenue
- Charged daily at 12 PM UTC

**Example:**

- Company with $50,000 monthly revenue
- Operating cost rate: 3.5%
- Monthly operating costs: $1,750

### 2. 💰 Corporate Taxes

**Description:** Companies pay taxes on their profits, requiring strategic tax planning.

**How it works:**

- Default corporate tax rate: 21%
- Applied to monthly profits (revenue - costs - expenses)
- Only charged on positive profits
- If company can't afford taxes, they accumulate as unpaid taxes
- Charged daily at 12 PM UTC

**Tax Calculation:**

```
Monthly Revenue: $100,000
Monthly Costs: $60,000
Monthly Expenses: $5,000
Profit: $35,000
Tax (21%): $7,350
```

**Fields added to companies table:**

- `taxRate` - Corporate tax rate (default 0.21)
- `unpaidTaxes` - Accumulated taxes if company can't afford them
- `lastTaxPayment` - Timestamp of last tax payment

### 3. 📜 Licensing Fees

**Description:** Players must purchase permits to operate in certain industries.

**License Types and Costs:**

- **Tech:** $5,000 (Software, AI, Technology)
- **Finance:** $10,000 (Banking, Investment, Insurance)
- **Manufacturing:** $6,000 (Industrial, Factory)
- **Transport:** $4,000 (Logistics, Shipping, Delivery)
- **Food:** $3,000 (Restaurant, Beverage, Catering)
- **Retail:** $2,000 (Store, Shop, E-commerce)
- **Other:** $1,000 (General business)

**License Duration:**

- 90 days (3 months)
- Expires automatically after duration
- Must be renewed to continue operations legally

**How to Purchase:**

```typescript
// Frontend code
await purchaseLicense({
  companyId: "j12345...",
  licenseType: "tech",
});
```

**Automatic License Detection:**
The system automatically suggests required licenses based on company tags:

- Tags containing "tech", "software", "ai" → Tech license
- Tags containing "food", "restaurant", "beverage" → Food license
- Tags containing "transport", "logistics", "shipping" → Transport license
- Tags containing "finance", "bank", "invest" → Finance license
- Tags containing "manufacturing", "factory", "industrial" → Manufacturing license
- Tags containing "retail", "store", "shop" → Retail license

### 4. 🔧 Product Maintenance & Quality

**Description:** Products lose quality over time unless maintained with R&D spending.

**Quality System:**

- All products start at 100% quality
- Quality degrades by 5-15 points per week (checked weekly on Mondays at 6 AM UTC)
- Low quality products may have reduced appeal (future feature)
- Products never degrade below 0% quality

**Maintenance:**

- Cost: 5-15% of product price
- Restores quality to 100%
- Can be performed anytime by company managers

**Example:**

```
Product: "Premium Coffee Beans"
Price: $25
Quality: 65% (degraded)

Maintenance Cost: ~$3.12 (12.5% of price)
After Maintenance: Quality = 100%
```

**How to Perform Maintenance:**

```typescript
// Frontend code
await performMaintenance({
  productId: "k67890...",
});
```

## Database Schema Changes

### Companies Table

```typescript
companies: defineTable({
  // ... existing fields ...

  // Expense tracking
  lastExpenseDate: v.optional(v.number()),
  monthlyRevenue: v.optional(v.number()),

  // Tax settings
  taxRate: v.optional(v.number()),
  lastTaxPayment: v.optional(v.number()),
  unpaidTaxes: v.optional(v.number()),
});
```

### Products Table

```typescript
products: defineTable({
  // ... existing fields ...

  // Quality & Maintenance
  quality: v.optional(v.number()),
  lastMaintenanceDate: v.optional(v.number()),
  maintenanceCost: v.optional(v.number()),
});
```

### New Tables

#### Licenses Table

```typescript
licenses: defineTable({
  companyId: v.id("companies"),
  licenseType: v.string(),
  cost: v.number(),
  expiresAt: v.number(),
  purchasedAt: v.number(),
  isActive: v.boolean(),
});
```

#### Expenses Table

```typescript
expenses: defineTable({
  companyId: v.id("companies"),
  type: v.union(
    v.literal("operating_costs"),
    v.literal("taxes"),
    v.literal("license_fee"),
    v.literal("maintenance")
  ),
  amount: v.number(),
  description: v.string(),
  productId: v.optional(v.id("products")),
  licenseId: v.optional(v.id("licenses")),
  createdAt: v.number(),
});
```

#### Ledger Type Update

```typescript
// Added "expense" type to ledger
type: v.union(
  // ... existing types ...
  v.literal("expense")
);
```

## API Functions

### Queries

#### `getCompanyLicenses`

Get all licenses for a company.

```typescript
const licenses = await getCompanyLicenses({ companyId });
// Returns: Array of licenses with expiration info
```

#### `hasValidLicense`

Check if company has a valid license for a specific type.

```typescript
const hasLicense = await hasValidLicense({
  companyId,
  licenseType: "tech",
});
// Returns: boolean
```

#### `getCompanyExpenses`

Get expense history for a company.

```typescript
const expenses = await getCompanyExpenses({
  companyId,
  days: 30, // optional, default 30
});
// Returns: { expenses: [], totals: { operating_costs, taxes, license_fee, maintenance, total } }
```

#### `getExpenseSummary`

Get expense summary for all user's companies.

```typescript
const summary = await getExpenseSummary();
// Returns: Array of company expense summaries
```

#### `getLicenseTypes`

Get all available license types and their costs.

```typescript
const types = await getLicenseTypes();
// Returns: Array of { type, cost, duration }
```

### Mutations

#### `purchaseLicense`

Purchase a license for a company.

```typescript
const result = await purchaseLicense({
  companyId,
  licenseType: "tech",
});
// Returns: { success, licenseId, cost, expiresAt }
```

#### `performMaintenance`

Perform maintenance on a product to restore quality.

```typescript
const result = await performMaintenance({
  productId,
});
// Returns: { success, cost, newQuality }
```

### Internal Mutations (Cron Jobs)

#### `processCompanyExpenses`

Processes operating costs and taxes for all companies.

- Runs: Daily at 12 PM UTC
- Charges operating costs (2-5% of monthly revenue)
- Charges corporate taxes (21% of monthly profit)
- Only charges if company can afford it

#### `degradeProductQuality`

Degrades product quality over time.

- Runs: Weekly on Mondays at 6 AM UTC
- Degrades quality by 5-15 points per week
- Skips products maintained in last 7 days

#### `expireLicenses`

Expires old licenses.

- Runs: Daily at 1 AM UTC
- Sets `isActive = false` for expired licenses

## Cron Schedule

| Job              | Frequency    | Time (UTC) | Function                 |
| ---------------- | ------------ | ---------- | ------------------------ |
| Process Expenses | Daily        | 12:00 PM   | `processCompanyExpenses` |
| Degrade Quality  | Weekly (Mon) | 6:00 AM    | `degradeProductQuality`  |
| Expire Licenses  | Daily        | 1:00 AM    | `expireLicenses`         |

## Performance & Bandwidth Optimization

The expense system is designed to minimize database bandwidth:

### Batching

- Expenses are processed once daily, not per transaction
- One expense record created per type per day (not per product)
- Single ledger entry for each expense type

### Caching

- Monthly revenue is cached on company record
- Balance is cached on account record
- No need to recalculate from ledger every time

### Limits

- Processes max 100 companies per run to avoid timeouts
- Processes max 200 products per quality degradation run
- Uses indexed queries for fast lookups

### Expected Database Operations

**Daily expense processing for 100 companies:**

- 100 reads (companies)
- 100 reads (accounts)
- ~200 reads (ledger transactions for revenue/cost calculation)
- 200-400 writes (expenses table: 2-4 per company)
- 200-400 writes (ledger: 2-4 per company)
- 100 writes (company updates)
- Total: ~1,000 operations per day

**Weekly quality degradation for 200 products:**

- 200 reads (products)
- 200 writes (product updates)
- Total: ~400 operations per week

**Impact:** ~150 database operations per hour from expense system.

## Dashboard Updates

The company dashboard now includes expense tracking:

```typescript
const dashboard = await getCompanyDashboard({ companyId });
// Returns:
{
  company: { ...company, balance },
  totals: {
    revenue,
    costs,
    expenses, // NEW: Total expenses
    profit    // UPDATED: Now = revenue - costs - expenses
  },
  products: [...],
  chartData: [
    {
      date,
      revenue,
      costs,
      expenses, // NEW: Daily expenses
      profit    // UPDATED: Includes expenses
    }
  ]
}
```

## Strategic Gameplay

### Early Game (Low Revenue)

- Minimal operating costs ($100 minimum)
- Focus on getting first license
- Maintain products when quality drops below 70%

### Mid Game (Growing Revenue)

- Operating costs scale with revenue
- Tax planning becomes important
- Renew licenses every 90 days
- Regular product maintenance

### Late Game (High Revenue)

- Operating costs can be significant (5% of $500k = $25k/month)
- Taxes are major expense (21% of profits)
- Multiple licenses across industries
- Large product portfolio requiring maintenance

## Example Scenario

**TechCorp Company:**

- Monthly Revenue: $200,000
- Production Costs: $120,000
- 10 Products requiring maintenance

**Monthly Expenses:**

1. Operating Costs: $200,000 × 3.5% = $7,000
2. Taxes: ($200,000 - $120,000 - $7,000) × 21% = $15,330
3. License Renewal: $5,000 (quarterly)
4. Product Maintenance: 10 × $500 avg = $5,000

**Total Monthly Expenses:** ~$27,330 (not including maintenance)
**Net Profit:** $200,000 - $120,000 - $27,330 = $52,670

## Future Enhancements

Possible future additions:

1. **Quality Impact on Sales** - Low quality products sell less
2. **Tax Optimization** - Deductions for R&D and maintenance
3. **License Benefits** - Special perks for licensed companies
4. **Insurance** - Optional expense for risk mitigation
5. **Salaries** - Hire employees with specific skills
6. **Office Upgrades** - Reduce operating costs with investments

## Testing Checklist

- [ ] Companies are created with default expense fields
- [ ] Operating costs are charged daily
- [ ] Taxes are calculated correctly on profits
- [ ] Licenses can be purchased and expire correctly
- [ ] Product quality degrades weekly
- [ ] Maintenance restores product quality
- [ ] Dashboard shows expense breakdown
- [ ] Chart includes expense line
- [ ] System account receives all expense payments
- [ ] Companies can't go negative balance (expenses skip if broke)
- [ ] Unpaid taxes accumulate correctly

## Migration Notes

For existing data:

1. Run Convex dev/deploy to update schema
2. Existing companies will get default values:
   - `taxRate: 0.21`
   - `unpaidTaxes: 0`
   - `lastExpenseDate: now`
   - `monthlyRevenue: 0`
3. Existing products will get:
   - `quality: 100`
   - `lastMaintenanceDate: now`
   - `maintenanceCost: 0`

No data migration script needed - schema handles defaults gracefully.

## Conclusion

The Company Expenses System adds strategic depth to the game while maintaining excellent performance through careful optimization. Players must now balance growth with sustainability, creating more engaging and realistic business simulation gameplay.
