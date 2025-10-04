# Company Dashboard Feature

## Overview

A comprehensive dashboard for company owners and managers to track their business performance with detailed analytics, revenue/profit tracking, and product-level insights.

## Features Implemented

### 1. Backend Query (`convex/companies.ts`)

Added new query `getCompanyDashboard` that provides:

- **Company Information**: Basic company details and current balance
- **Financial Totals**:
  - Total Revenue (all-time product sales)
  - Total Costs (production costs)
  - Total Profit (revenue - costs)
- **Product Statistics**: For each product:
  - Revenue generated
  - Production costs
  - Profit margin
  - Units sold
- **Time Series Data**: Daily revenue, costs, and profit for the last 30 days

### 2. Dashboard Component (`app/components/game/company-dashboard.tsx`)

A comprehensive React component featuring:

#### Key Metrics Cards

- **Current Balance**: Company account balance with wallet icon
- **Total Revenue**: All-time product sales with dollar icon
- **Total Profit**: Net profit with profit margin percentage
- **Active Products**: Count of active products and total units sold

#### Revenue & Profit Trends Chart

- **Area Chart**: Shows daily revenue and profit over last 30 days
- **Interactive**: Hover to see exact values for each day
- **Visual Gradients**: Beautiful gradient fills for better data visualization
- **Time Formatting**: Dates formatted as "MMM DD"

#### Product Performance Table

Detailed table showing for each product:

- Product name and thumbnail image
- Price per unit
- Units sold
- Total revenue
- Total costs
- Total profit (color-coded: green for positive, red for negative)
- Profit margin percentage (color-coded: green ≥30%, yellow ≥15%, red <15%)
- Active/Inactive status badge

#### Product Revenue Comparison Chart

- **Bar Chart**: Side-by-side comparison of revenue vs profit for each product
- **Sorted**: Products ordered by revenue (highest to lowest)
- **Interactive**: Hover to see exact values
- **Smart Filtering**: Only shows products with revenue > 0

### 3. Companies Page Updates (`app/routes/dashboard/companies.tsx`)

Enhanced the companies list page:

- **Quick Preview**: Collapsible dashboard preview within the companies list
- **Full Dashboard Link**: Button to navigate to dedicated dashboard page
- **Expandable Cards**: Click to expand/collapse dashboard preview
- **Better Organization**: Clean layout with all actions visible

### 4. Dedicated Dashboard Page (`app/routes/dashboard/companies.$companyId.tsx`)

Full-page view for a single company:

- **Company Header**: Logo, name, ticker, description, tags, and status badges
- **Back Navigation**: Easy return to companies list
- **Full Dashboard**: Complete dashboard component without space constraints
- **Access Control**: Only shows dashboard if user has access to the company

## Data Flow

```
User → Companies Page
  ↓
  Click "Quick Preview" → Inline Dashboard Preview
  OR
  Click "Full Dashboard" → Dedicated Dashboard Page
  ↓
  CompanyDashboard Component
  ↓
  Query: getCompanyDashboard (companyId)
  ↓
  Returns:
  - company: { ...company data, balance }
  - totals: { revenue, costs, profit }
  - products: [{ ...product, revenue, costs, profit, unitsSold }]
  - chartData: [{ date, revenue, costs, profit }]
```

## Revenue & Profit Calculation

### Revenue

- Sum of all ledger transactions of type `"product_purchase"` to company account
- Represents gross sales from product purchases

### Costs

- Sum of all ledger transactions of type `"product_cost"` from company account
- Production costs are 23%-67% of selling price (randomized per sale)

### Profit

- `Profit = Revenue - Costs`
- Calculated at both company and product levels

### Profit Margin

- `Profit Margin % = (Profit / Revenue) × 100`
- Used to assess profitability and efficiency

## Usage

### Viewing Dashboard

1. **Navigate to Companies**:

   ```
   /dashboard/companies
   ```

2. **Quick Preview**:

   - Click "Quick Preview" button on any company card
   - Dashboard expands inline below the company info
   - Click "Hide Preview" to collapse

3. **Full Dashboard**:
   - Click "Full Dashboard" button on any company card
   - Navigates to `/dashboard/companies/{companyId}`
   - Shows full-page dashboard with all features

### Dashboard Features

- **Real-time Data**: All data updates automatically via Convex queries
- **Visual Analytics**: Charts and graphs for easy pattern recognition
- **Product Insights**: Understand which products are most profitable
- **Historical Trends**: Track performance over the last 30 days
- **Color-Coded Metrics**: Quick visual indicators of performance

## Technical Details

### Technologies Used

- **Charts**: Recharts library for data visualization
- **UI Components**: shadcn/ui components (Card, Table, Badge, Button)
- **Icons**: Lucide React icons
- **Data**: Convex real-time database queries
- **Routing**: React Router for navigation

### Performance Considerations

- Dashboard only loads when expanded/viewed
- Efficient queries with proper indexing
- Data aggregation done on backend
- Memoized calculations where possible

## Future Enhancements

Potential additions:

1. **Comparison Period Selection**: Choose custom date ranges (7d, 30d, 90d, 1y)
2. **Export to CSV**: Download financial reports
3. **Advanced Filters**: Filter products by status, profitability, etc.
4. **Forecasting**: Predict future revenue based on trends
5. **Alerts**: Notify when products fall below profit thresholds
6. **Competitor Analysis**: Compare performance with other public companies
7. **Market Share**: Show company's position in different product categories
8. **Employee Management**: Track team members and their contributions

## Testing

To test the dashboard:

1. Create a company if you don't have one
2. Add products to the company
3. Wait for automatic purchases (cron job runs periodically)
4. View the dashboard to see revenue, costs, and profit data
5. Check that charts update with new sales
6. Verify product-level statistics are accurate

## Notes

- Access control ensures only company owners/managers can view dashboards
- Empty states guide users to create products if none exist
- All monetary values formatted with 2 decimal places
- Charts gracefully handle no-data scenarios
- Mobile-responsive design for all dashboard components
