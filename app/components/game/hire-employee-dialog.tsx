import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

interface HireEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: Id<"companies">;
  companyBalance: number;
}

export function HireEmployeeDialog({
  open,
  onOpenChange,
  companyId,
  companyBalance,
}: HireEmployeeDialogProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const npcEmployees = useQuery(api.employees.getAvailableNPCEmployees);
  const hireEmployee = useMutation(api.employees.hireEmployee);

  const handleHire = async () => {
    if (!selectedEmployee) return;

    if (companyBalance < selectedEmployee.salary * 2) {
      toast.error("Insufficient funds", {
        description: `You need at least $${(
          selectedEmployee.salary * 2
        ).toLocaleString()} to hire (2 payroll cycles as buffer).`,
      });
      return;
    }

    try {
      await hireEmployee({
        companyId,
        name: selectedEmployee.name,
        type: "npc",
        role: selectedEmployee.role,
        level: selectedEmployee.level,
        salary: selectedEmployee.salary,
        bonusMultiplier: selectedEmployee.bonusMultiplier,
      });

      toast.success("Employee hired!", {
        description: `${selectedEmployee.name} has been hired as ${getRoleLabel(
          selectedEmployee.role
        )}.`,
      });

      setSelectedEmployee(null);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to hire employee", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "marketer":
        return "Marketer";
      case "engineer":
        return "Engineer";
      case "quality_control":
        return "Quality Control";
      case "cost_optimizer":
        return "Cost Optimizer";
      case "manager":
        return "Manager";
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "marketer":
        return "default" as const;
      case "engineer":
        return "secondary" as const;
      case "quality_control":
        return "outline" as const;
      case "cost_optimizer":
        return "destructive" as const;
      case "manager":
        return "default" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hire Employee</DialogTitle>
          <DialogDescription>
            Hire NPCs to boost your company's performance. Each employee
            provides specific bonuses based on their role and level.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="npc" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="npc">NPC Employees</TabsTrigger>
            <TabsTrigger value="player" disabled>
              Player Employees (Coming Soon)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="npc" className="space-y-4">
            {!npcEmployees ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading available employees...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {npcEmployees.map((employee, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all ${
                      selectedEmployee?.name === employee.name
                        ? "ring-2 ring-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {employee.name}
                          </h3>
                          <div className="flex gap-2 mt-2">
                            <Badge variant={getRoleBadgeVariant(employee.role)}>
                              {getRoleLabel(employee.role)}
                            </Badge>
                            <Badge variant="outline">
                              Level {employee.level}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {employee.description}
                        </p>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Salary:
                            </span>
                            <span className="font-semibold">
                              ${employee.salary.toLocaleString()}/cycle
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Effectiveness:
                            </span>
                            <span className="font-semibold">
                              {(employee.bonusMultiplier * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Bonus per level:
                            </span>
                            <span className="text-green-600">
                              {(
                                employee.level *
                                2 *
                                employee.bonusMultiplier
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="player">
            <div className="text-center py-8 text-muted-foreground">
              Player employee invitations coming soon!
            </div>
          </TabsContent>
        </Tabs>

        {selectedEmployee && (
          <div className="border-t pt-4 space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Hiring Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee:</span>
                  <span>{selectedEmployee.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role:</span>
                  <span>{getRoleLabel(selectedEmployee.role)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payroll Cycle:</span>
                  <span>${selectedEmployee.salary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Company Balance:
                  </span>
                  <span
                    className={
                      companyBalance < selectedEmployee.salary * 2
                        ? "text-red-600"
                        : ""
                    }
                  >
                    ${companyBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedEmployee(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleHire} className="flex-1">
                Hire for ${selectedEmployee.salary.toLocaleString()}/cycle
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
