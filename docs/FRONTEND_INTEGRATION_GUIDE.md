# 🎨 Frontend Integration Guide - Company Expenses

## Overview

This guide shows how to integrate the Company Expenses System into your React frontend.

## Quick Setup

### 1. Import Convex API Functions

```typescript
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
```

## Component Examples

### License Purchase Component

```tsx
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LicensePurchaseProps {
  companyId: string;
}

export function LicensePurchase({ companyId }: LicensePurchaseProps) {
  const [isLoading, setIsLoading] = useState(false);
  const purchaseLicense = useMutation(api.expenses.purchaseLicense);
  const licenseTypes = useQuery(api.expenses.getLicenseTypes);
  const companyLicenses = useQuery(api.expenses.getCompanyLicenses, {
    companyId,
  });

  const handlePurchase = async (licenseType: string) => {
    setIsLoading(true);
    try {
      await purchaseLicense({ companyId, licenseType });
      alert("License purchased successfully!");
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!licenseTypes || !companyLicenses) return <div>Loading...</div>;

  // Check which licenses company already has
  const activeLicenses = new Set(
    companyLicenses
      .filter((l) => l.isActive && !l.isExpired)
      .map((l) => l.licenseType)
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Purchase License</h3>
      <div className="grid grid-cols-2 gap-4">
        {licenseTypes.map(({ type, cost, duration }) => {
          const hasLicense = activeLicenses.has(type);
          return (
            <Card key={type} className="p-4">
              <h4 className="font-medium capitalize">{type}</h4>
              <p className="text-sm text-muted-foreground">
                ${cost.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Valid for {duration} days
              </p>
              {hasLicense ? (
                <Button disabled variant="secondary" className="w-full">
                  Already Owned
                </Button>
              ) : (
                <Button
                  onClick={() => handlePurchase(type)}
                  disabled={isLoading}
                  className="w-full"
                >
                  Buy License
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

### License Status Component

```tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface LicenseStatusProps {
  companyId: string;
}

export function LicenseStatus({ companyId }: LicenseStatusProps) {
  const licenses = useQuery(api.expenses.getCompanyLicenses, { companyId });

  if (!licenses) return <div>Loading...</div>;

  const activeLicenses = licenses.filter((l) => l.isActive && !l.isExpired);
  const expiredLicenses = licenses.filter((l) => l.isExpired);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Licenses</h3>

      {activeLicenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active licenses</p>
      ) : (
        <div className="space-y-2">
          {activeLicenses.map((license) => {
            const isExpiringSoon = license.daysRemaining < 7;
            return (
              <div
                key={license._id}
                className="flex items-center justify-between"
              >
                <div>
                  <span className="font-medium capitalize">
                    {license.licenseType}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Expires in {license.daysRemaining} days
                  </p>
                </div>
                {isExpiringSoon ? (
                  <Badge variant="destructive">Expiring Soon</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      {expiredLicenses.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Expired</h4>
          {expiredLicenses.map((license) => (
            <div key={license._id} className="text-sm text-muted-foreground">
              {license.licenseType} (expired)
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

### Product Quality & Maintenance Component

```tsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ProductQualityProps {
  product: {
    _id: string;
    name: string;
    price: number;
    quality?: number;
    lastMaintenanceDate?: number;
    maintenanceCost?: number;
  };
}

export function ProductQuality({ product }: ProductQualityProps) {
  const [isLoading, setIsLoading] = useState(false);
  const performMaintenance = useMutation(api.expenses.performMaintenance);

  const quality = product.quality ?? 100;
  const estimatedCost = product.price * 0.1; // Rough estimate

  const getQualityColor = (q: number) => {
    if (q >= 80) return "bg-green-500";
    if (q >= 60) return "bg-yellow-500";
    if (q >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getQualityBadge = (q: number) => {
    if (q >= 80) return <Badge variant="success">Excellent</Badge>;
    if (q >= 60) return <Badge variant="default">Good</Badge>;
    if (q >= 40) return <Badge variant="warning">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const handleMaintenance = async () => {
    setIsLoading(true);
    try {
      const result = await performMaintenance({ productId: product._id });
      alert(`Maintenance complete! Cost: $${result.cost.toFixed(2)}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Quality</span>
        {getQualityBadge(quality)}
      </div>

      <div className="flex items-center gap-2">
        <Progress
          value={quality}
          className="flex-1"
          indicatorClassName={getQualityColor(quality)}
        />
        <span className="text-sm font-medium">{quality}%</span>
      </div>

      {quality < 100 && (
        <Button
          size="sm"
          variant={quality < 50 ? "destructive" : "outline"}
          onClick={handleMaintenance}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading
            ? "Maintaining..."
            : `Maintain (~$${estimatedCost.toFixed(0)})`}
        </Button>
      )}

      {product.lastMaintenanceDate && (
        <p className="text-xs text-muted-foreground">
          Last maintained:{" "}
          {new Date(product.lastMaintenanceDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
```

### Expense Dashboard Widget

```tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { DollarSign, TrendingDown } from "lucide-react";

interface ExpenseDashboardProps {
  companyId: string;
  days?: number;
}

export function ExpenseDashboard({
  companyId,
  days = 30,
}: ExpenseDashboardProps) {
  const expenses = useQuery(api.expenses.getCompanyExpenses, {
    companyId,
    days,
  });

  if (!expenses) return <div>Loading...</div>;

  const { totals } = expenses;

  const expenseItems = [
    {
      label: "Operating Costs",
      amount: totals.operating_costs,
      icon: DollarSign,
    },
    { label: "Taxes", amount: totals.taxes, icon: TrendingDown },
    { label: "Licenses", amount: totals.license_fee, icon: DollarSign },
    { label: "Maintenance", amount: totals.maintenance, icon: DollarSign },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Expenses (Last {days} Days)</h3>
        <div className="text-right">
          <p className="text-2xl font-bold">${totals.total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      <div className="space-y-3">
        {expenseItems.map(({ label, amount, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{label}</span>
            </div>
            <span className="font-medium">${amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Average per day</span>
          <span className="font-medium">
            $
            {(totals.total / days).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      </div>
    </Card>
  );
}
```

### Enhanced Company Dashboard

```tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { ExpenseDashboard } from "./ExpenseDashboard";
import { LicenseStatus } from "./LicenseStatus";

interface CompanyDashboardProps {
  companyId: string;
}

export function CompanyDashboard({ companyId }: CompanyDashboardProps) {
  const dashboard = useQuery(api.companies.getCompanyDashboard, { companyId });

  if (!dashboard) return <div>Loading...</div>;

  const { company, totals, products, chartData } = dashboard;

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <Card className="p-6">
        <h1 className="text-2xl font-bold">{company.name}</h1>
        <p className="text-sm text-muted-foreground">{company.ticker}</p>
        <div className="mt-4 flex items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-2xl font-bold">
              ${company.balance.toLocaleString()}
            </p>
          </div>
          {company.unpaidTaxes > 0 && (
            <div>
              <p className="text-xs text-red-500">Unpaid Taxes</p>
              <p className="text-xl font-bold text-red-500">
                ${company.unpaidTaxes.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            ${totals.revenue.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Costs</p>
          <p className="text-2xl font-bold text-orange-600">
            ${totals.costs.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Expenses</p>
          <p className="text-2xl font-bold text-red-600">
            ${totals.expenses.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Profit</p>
          <p
            className={`text-2xl font-bold ${
              totals.profit >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            ${totals.profit.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Expense Dashboard & License Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExpenseDashboard companyId={companyId} />
        <LicenseStatus companyId={companyId} />
      </div>

      {/* Products with Quality */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Products</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product._id} className="p-4">
              <h4 className="font-medium">{product.name}</h4>
              <p className="text-sm text-muted-foreground mb-4">
                ${product.price.toLocaleString()}
              </p>
              <ProductQuality product={product} />
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

## Router Setup

Add routes for expense management:

```typescript
// app/routes.ts
import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  // ... existing routes ...

  // Company expense routes
  route(
    "dashboard/company/:companyId/expenses",
    "./routes/company-expenses.tsx"
  ),
  route(
    "dashboard/company/:companyId/licenses",
    "./routes/company-licenses.tsx"
  ),
  route(
    "dashboard/company/:companyId/maintenance",
    "./routes/company-maintenance.tsx"
  ),
] satisfies RouteConfig;
```

## Utility Functions

```typescript
// lib/expense-utils.ts

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getQualityStatus(quality: number): {
  label: string;
  color: string;
  variant: "success" | "warning" | "destructive";
} {
  if (quality >= 80) {
    return { label: "Excellent", color: "text-green-600", variant: "success" };
  }
  if (quality >= 60) {
    return { label: "Good", color: "text-blue-600", variant: "success" };
  }
  if (quality >= 40) {
    return { label: "Fair", color: "text-yellow-600", variant: "warning" };
  }
  return { label: "Poor", color: "text-red-600", variant: "destructive" };
}

export function getLicenseWarning(daysRemaining: number): string | null {
  if (daysRemaining <= 0) return "Expired";
  if (daysRemaining <= 7) return "Expires in " + daysRemaining + " days";
  if (daysRemaining <= 30)
    return "Expires in " + Math.floor(daysRemaining / 7) + " weeks";
  return null;
}

export function estimateMaintenanceCost(productPrice: number): number {
  // 5-15% of product price, use 10% as estimate
  return productPrice * 0.1;
}
```

## Toast Notifications

```typescript
// hooks/use-expense-toast.ts
import { useToast } from "@/hooks/use-toast";

export function useExpenseToast() {
  const { toast } = useToast();

  return {
    licensePurchased: (licenseType: string, cost: number) => {
      toast({
        title: "License Purchased",
        description: `${licenseType} license purchased for $${cost.toLocaleString()}`,
        duration: 5000,
      });
    },

    maintenanceComplete: (productName: string, cost: number) => {
      toast({
        title: "Maintenance Complete",
        description: `${productName} restored to 100% quality for $${cost.toFixed(
          2
        )}`,
        duration: 5000,
      });
    },

    licenseExpiring: (licenseType: string, days: number) => {
      toast({
        title: "License Expiring Soon",
        description: `Your ${licenseType} license expires in ${days} days`,
        variant: "destructive",
        duration: 10000,
      });
    },

    lowQuality: (productName: string, quality: number) => {
      toast({
        title: "Product Quality Low",
        description: `${productName} quality is at ${quality}%. Consider maintenance.`,
        variant: "warning",
        duration: 7000,
      });
    },
  };
}
```

## Integration Checklist

- [ ] Install necessary UI components (Card, Badge, Progress, Button)
- [ ] Add expense dashboard to company page
- [ ] Add license management page
- [ ] Show product quality on product cards
- [ ] Add maintenance buttons to products
- [ ] Display expense breakdown in charts
- [ ] Show unpaid taxes warning
- [ ] Add license expiration reminders
- [ ] Implement toast notifications
- [ ] Add expense filtering/sorting
- [ ] Create mobile-responsive views

## Tips

1. **Real-time Updates:** Use Convex's reactive queries for automatic updates
2. **Optimistic Updates:** Show immediate feedback before mutations complete
3. **Error Handling:** Always wrap mutations in try-catch
4. **Loading States:** Show skeletons or spinners during data loading
5. **Accessibility:** Use proper ARIA labels and keyboard navigation
6. **Mobile First:** Design for mobile, enhance for desktop

## Testing

```typescript
// Example test
describe("License Purchase", () => {
  it("should purchase a license", async () => {
    const result = await purchaseLicense({
      companyId: "test-company-id",
      licenseType: "tech",
    });

    expect(result.success).toBe(true);
    expect(result.cost).toBe(5000);
  });

  it("should show error if insufficient funds", async () => {
    await expect(
      purchaseLicense({
        companyId: "broke-company-id",
        licenseType: "finance",
      })
    ).rejects.toThrow("Insufficient funds");
  });
});
```

## Support

For questions or issues:

1. Check `/docs/COMPANY_EXPENSES_SYSTEM.md` for technical details
2. Check `/docs/EXPENSES_QUICK_REFERENCE.md` for quick answers
3. Review API function signatures in `convex/expenses.ts`
