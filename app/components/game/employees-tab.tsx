import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { toast } from "sonner";
import { EmployeeCard } from "./employee-card";
import { HireEmployeeDialog } from "./hire-employee-dialog";
import { GiveBonusDialog } from "./give-bonus-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

interface EmployeesTabProps {
  companyId: Id<"companies">;
  companyBalance: number;
}

export function EmployeesTab({ companyId, companyBalance }: EmployeesTabProps) {
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
  const [fireDialogOpen, setFireDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const employees = useQuery(api.employees.getCompanyEmployees, { companyId });
  const employeeBonuses = useQuery(api.employees.getCompanyEmployeeBonuses, {
    companyId,
  });
  const fireEmployee = useMutation(api.employees.fireEmployee);

  const activeEmployees = employees?.filter((e) => e.isActive) || [];
  const inactiveEmployees = employees?.filter((e) => !e.isActive) || [];

  const totalPayroll = activeEmployees.reduce(
    (sum, emp) => sum + emp.salary,
    0
  );

  const handleFireClick = (employee: any) => {
    setSelectedEmployee(employee);
    setFireDialogOpen(true);
  };

  const handleBonusClick = (employee: any) => {
    setSelectedEmployee(employee);
    setBonusDialogOpen(true);
  };

  const handleFireConfirm = async () => {
    if (!selectedEmployee) return;

    try {
      await fireEmployee({
        employeeId: selectedEmployee._id,
        severancePay: 0,
      });

      toast.success("Employee terminated", {
        description: `${selectedEmployee.name} has been fired.`,
      });

      setFireDialogOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      toast.error("Failed to fire employee", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Active Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeEmployees.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <CardDescription>Per cycle (10 minutes)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${totalPayroll.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Company Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${
                companyBalance < totalPayroll * 2 ? "text-red-600" : ""
              }`}
            >
              ${companyBalance.toLocaleString()}
            </p>
            {companyBalance < totalPayroll * 2 && (
              <p className="text-sm text-red-600 mt-1">Low balance warning!</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Total Bonuses */}
      {employeeBonuses && (
        <Card>
          <CardHeader>
            <CardTitle>Total Employee Bonuses</CardTitle>
            <CardDescription>
              Combined bonuses from all active employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {employeeBonuses.salesBoost > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Sales Boost</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{(employeeBonuses.salesBoost * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {employeeBonuses.maintenanceReduction > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Maintenance Reduction
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    -{(employeeBonuses.maintenanceReduction * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {employeeBonuses.qualityBoost > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Quality Boost</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{(employeeBonuses.qualityBoost * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {employeeBonuses.costReduction > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Cost Reduction
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    -{(employeeBonuses.costReduction * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {employeeBonuses.efficiencyBoost > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Efficiency</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{(employeeBonuses.efficiencyBoost * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {!employeeBonuses.salesBoost &&
                !employeeBonuses.maintenanceReduction &&
                !employeeBonuses.qualityBoost &&
                !employeeBonuses.costReduction &&
                !employeeBonuses.efficiencyBoost && (
                  <div className="col-span-full text-center text-muted-foreground">
                    No active bonuses - hire employees to boost your company!
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hire Button */}
      <div className="flex justify-end">
        <Button onClick={() => setHireDialogOpen(true)}>Hire Employee</Button>
      </div>

      {/* Employees List */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeEmployees.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({inactiveEmployees.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeEmployees.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No employees hired yet. Hire employees to boost your company's
                  performance!
                </p>
                <Button onClick={() => setHireDialogOpen(true)}>
                  Hire Your First Employee
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEmployees.map((employee) => (
                <EmployeeCard
                  key={employee._id}
                  employee={employee}
                  onFire={() => handleFireClick(employee)}
                  onBonus={() => handleBonusClick(employee)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {inactiveEmployees.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No inactive employees.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveEmployees.map((employee) => (
                <EmployeeCard key={employee._id} employee={employee} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <HireEmployeeDialog
        open={hireDialogOpen}
        onOpenChange={setHireDialogOpen}
        companyId={companyId}
        companyBalance={companyBalance}
      />

      {selectedEmployee && (
        <>
          <GiveBonusDialog
            open={bonusDialogOpen}
            onOpenChange={setBonusDialogOpen}
            employeeId={selectedEmployee._id}
            employeeName={selectedEmployee.name}
            currentMorale={selectedEmployee.morale}
            currentSatisfaction={selectedEmployee.satisfaction}
            companyBalance={companyBalance}
          />

          <AlertDialog open={fireDialogOpen} onOpenChange={setFireDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Fire {selectedEmployee.name}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action will terminate {selectedEmployee.name} from your
                  company. They will no longer provide any bonuses.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleFireConfirm}>
                  Fire Employee
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
