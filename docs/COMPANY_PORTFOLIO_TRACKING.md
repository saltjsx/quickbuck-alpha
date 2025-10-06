# Company Portfolio Tracking Feature

**Date:** October 6, 2025  
**Status:** ✅ Active

## Overview

Added a new "Company Portfolios" tab to the Portfolio page that allows users to view and track the stock investments made by their companies.

---

## Feature Description

Users can now view the stock portfolios of all their companies in one convenient location, making it easy to track how their companies are investing and performing in the stock market.

### Key Features

1. **Unified View**: All company portfolios in one place
2. **Per-Company Breakdown**: Each company's investments shown separately
3. **Performance Metrics**: Gain/loss tracking for each holding
4. **Click-Through**: Navigate to stock details by clicking on holdings
5. **Visual Design**: Company logos, badges, and color-coded gains/losses

---

## User Interface

### Portfolio Page Structure

The portfolio page now has 3 tabs:

1. **My Stocks** - User's personal stock investments
2. **Company Portfolios** - Stock investments made by user's companies
3. **Collections** - Product collections (existing feature)

### Company Portfolios Tab

Each company is displayed in its own section showing:

- **Company Header**

  - Company name and logo
  - Ticker symbol badge
  - Total portfolio value
  - Total gain/loss with color indicator

- **Holdings List**
  - Each stock investment shown as a card
  - Company being invested in (name, logo, ticker)
  - Number of shares and average purchase price
  - Current value
  - Gain/loss with percentage

---

## Technical Implementation

### Frontend Changes

**File:** `app/routes/dashboard/portfolio.tsx`

#### 1. Added Imports

```tsx
import { Building2 } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
```

#### 2. Updated Data Fetching

```tsx
export default function PortfolioPage() {
  const navigate = useNavigate();
  const portfolio = useQuery(api.stocks.getPortfolio);
  const companies = useQuery(api.companies.getUserCompanies); // NEW

  // Loading state checks both queries
  if (portfolio === undefined || companies === undefined) {
    return <LoadingSpinner />;
  }
  // ...
}
```

#### 3. Updated Tab Structure

```tsx
<TabsList className="grid w-full grid-cols-3 max-w-2xl">
  <TabsTrigger value="stocks">
    <TrendingUp className="h-4 w-4 mr-2" />
    My Stocks
  </TabsTrigger>
  <TabsTrigger value="companies">
    <Building2 className="h-4 w-4 mr-2" />
    Company Portfolios
  </TabsTrigger>
  <TabsTrigger value="collections">
    <Package className="h-4 w-4 mr-2" />
    Collections
  </TabsTrigger>
</TabsList>
```

#### 4. New Company Portfolios Tab Content

```tsx
<TabsContent value="companies" className="space-y-4 mt-4">
  <Card>
    <CardHeader>
      <CardTitle>Company Portfolios</CardTitle>
      <CardDescription>
        Track stock investments made by your companies
      </CardDescription>
    </CardHeader>
    <CardContent>
      {companies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {companies.map((company: any) => (
            <CompanyPortfolioSection
              key={company._id}
              company={company}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>
```

#### 5. New CompanyPortfolioSection Component

A dedicated component for each company's portfolio:

```tsx
function CompanyPortfolioSection({
  company,
  navigate,
}: {
  company: any;
  navigate: (path: string) => void;
}) {
  // Fetch portfolio for this specific company
  const companyPortfolio = useQuery(
    api.stocks.getHolderPortfolio,
    company._id
      ? {
          holderId: company._id as Id<"companies">,
          holderType: "company" as const,
        }
      : "skip"
  );

  // Calculate totals
  const totalPortfolioValue = companyPortfolio.reduce(
    (sum, holding) => sum + (holding?.currentValue || 0),
    0
  );
  const totalGainLoss = companyPortfolio.reduce(
    (sum, holding) => sum + (holding?.gainLoss || 0),
    0
  );

  // Render company header + holdings
  return (
    <div className="p-6 border rounded-lg">
      {/* Company Header with totals */}
      {/* Holdings list */}
    </div>
  );
}
```

### Backend Integration

**Uses Existing Convex Query:**

```typescript
// convex/stocks.ts
export const getHolderPortfolio = query({
  args: {
    holderId: v.union(v.id("users"), v.id("companies")),
    holderType: v.union(v.literal("user"), v.literal("company")),
  },
  handler: async (ctx, args) => {
    // Fetch holdings for the specified holder
    // Return portfolio with calculated metrics
  },
});
```

This query was already implemented and supports both user and company portfolios!

---

## User Experience

### Empty States

**No Companies:**

```
No companies yet
Create a company to start investing!
[Create Company] button
```

**Company with No Investments:**

```
No investments yet
This company hasn't invested in any stocks
[Browse Stocks] button
```

### Interaction Flow

1. **User navigates to Portfolio page**
2. **Clicks "Company Portfolios" tab**
3. **Views all their companies' portfolios**
4. **Clicks on any holding to see stock details**
5. **Can make trades from the stock detail page**

---

## Example UI

```
┌─────────────────────────────────────────────────────────┐
│  My Portfolio                                           │
│  Track your investments and performance                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [My Stocks] [Company Portfolios] [Collections]        │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Company Portfolios                                │ │
│  │ Track stock investments made by your companies    │ │
│  ├───────────────────────────────────────────────────┤ │
│  │                                                   │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ 🏢 TechCorp (TECH)    Portfolio: $12,450.00 │ │
│  │  │                       +$450.00 ↗            │ │
│  │  ├─────────────────────────────────────────────┤ │
│  │  │                                             │ │
│  │  │  🏢 InnovateCo (INNO)                      │ │
│  │  │  500 shares @ $10.50                       │ │
│  │  │                        $5,500.00 +$250 ↗   │ │
│  │  │                                             │ │
│  │  │  🏢 BuildCo (BUILD)                        │ │
│  │  │  300 shares @ $22.00                       │ │
│  │  │                        $6,950.00 +$200 ↗   │ │
│  │  └─────────────────────────────────────────────┘ │
│  │                                                   │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ 🏢 RetailCo (RETL)    Portfolio: $8,200.00  │ │
│  │  │                       -$150.00 ↘            │ │
│  │  ├─────────────────────────────────────────────┤ │
│  │  │                                             │ │
│  │  │  🏢 ShopMart (SHOP)                        │ │
│  │  │  400 shares @ $20.50                       │ │
│  │  │                        $8,200.00 -$150 ↘   │ │
│  │  └─────────────────────────────────────────────┘ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Benefits

### For Users

1. **Centralized Tracking**: View all company investments in one place
2. **Performance Monitoring**: See which companies are making profitable investments
3. **Investment Strategy**: Understand how companies are diversifying
4. **Quick Access**: Click-through to manage investments

### For Gameplay

1. **Transparency**: Clear view of company investment activities
2. **Strategy**: Players can optimize their companies' investment portfolios
3. **Competition**: Compare investment performance across companies
4. **Engagement**: More reasons to check the portfolio page

---

## Data Flow

```
User → Portfolio Page
  ↓
  Fetches: api.stocks.getPortfolio (user's stocks)
  Fetches: api.companies.getUserCompanies
  ↓
  For each company:
    Fetches: api.stocks.getHolderPortfolio(companyId, "company")
    ↓
    Displays: Company header + holdings list
    ↓
    User clicks holding → Navigate to stock detail page
```

---

## Performance Considerations

### Optimization

- **Parallel Queries**: Each company's portfolio fetched independently
- **Conditional Fetching**: Uses "skip" when company.\_id is undefined
- **Existing Backend**: Leverages already-optimized `getHolderPortfolio` query
- **No Additional Indexes**: Uses existing stock indexes

### Loading States

- **Page Level**: Shows spinner until companies are loaded
- **Per Company**: Shows spinner for each company's portfolio during fetch
- **Progressive**: Companies render as their portfolios load

---

## Future Enhancements

### Potential Features

1. **Aggregate Dashboard**

   - Total portfolio value across all companies
   - Best/worst performing companies
   - Diversification metrics

2. **Filtering & Sorting**

   - Sort companies by portfolio value
   - Filter by profitability
   - Search for specific stocks

3. **Investment Actions**

   - Quick trade buttons without leaving page
   - Bulk rebalancing tools
   - Portfolio recommendations

4. **Analytics**

   - Portfolio allocation charts
   - Historical performance graphs
   - Sector diversification analysis

5. **Alerts**
   - Notify when company portfolios gain/lose significant value
   - Alert on underperforming investments
   - Dividend notifications

---

## Testing Checklist

- [x] Portfolio page loads with 3 tabs
- [x] Company Portfolios tab displays correctly
- [x] Empty state shows when no companies exist
- [x] Empty state shows when company has no investments
- [x] Company portfolios fetch and display correctly
- [x] Portfolio metrics calculate correctly (value, gain/loss)
- [x] Holdings are clickable and navigate to stock details
- [x] Loading states display appropriately
- [x] No TypeScript errors
- [x] No runtime errors
- [x] Responsive design works on mobile

---

## Summary

The Company Portfolios feature provides users with a comprehensive view of their companies' stock investments, making it easy to track performance and manage portfolios across multiple companies.

**Key Achievements:**

- ✅ Unified portfolio tracking interface
- ✅ Per-company breakdown with metrics
- ✅ Leverages existing backend infrastructure
- ✅ Clean, intuitive UI design
- ✅ Seamless navigation to stock details

**Result:** Users can now effectively monitor and manage their companies' investment strategies! 📈

---

**Implementation Date:** October 6, 2025  
**Version:** 1.0  
**Status:** ✅ Active  
**File Modified:** `app/routes/dashboard/portfolio.tsx`
