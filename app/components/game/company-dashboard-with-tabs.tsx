import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { Id } from "convex/_generated/dataModel";
import { CompanyDashboard } from "./company-dashboard";
import { EmployeesTab } from "./employees-tab";

interface CompanyDashboardWithTabsProps {
  companyId: Id<"companies">;
  companyBalance: number;
}

export function CompanyDashboardWithTabs({
  companyId,
  companyBalance,
}: CompanyDashboardWithTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="employees">Employees</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <CompanyDashboard companyId={companyId} />
      </TabsContent>

      <TabsContent value="employees" className="mt-6">
        <EmployeesTab companyId={companyId} companyBalance={companyBalance} />
      </TabsContent>
    </Tabs>
  );
}
