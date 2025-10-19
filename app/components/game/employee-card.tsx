import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import type { Doc } from "convex/_generated/dataModel";

interface EmployeeCardProps {
  employee: Doc<"employees"> & {
    bonuses?: {
      salesBoost: number;
      maintenanceReduction: number;
      qualityBoost: number;
      costReduction: number;
      efficiencyBoost: number;
    };
  };
  onFire?: () => void;
  onBonus?: () => void;
}

export function EmployeeCard({ employee, onFire, onBonus }: EmployeeCardProps) {
  const getRoleBadgeVariant = (role: typeof employee.role) => {
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

  const getRoleLabel = (role: typeof employee.role) => {
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
    }
  };

  const getStatusColor = (value: number) => {
    if (value >= 80) return "text-green-600";
    if (value >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{employee.name}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant={getRoleBadgeVariant(employee.role)}>
                {getRoleLabel(employee.role)}
              </Badge>
              <Badge variant="outline">Level {employee.level}</Badge>
              {employee.type === "player" && (
                <Badge variant="secondary">Player</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Salary */}
          <div>
            <p className="text-sm text-muted-foreground">Salary per cycle</p>
            <p className="text-xl font-bold">
              ${employee.salary.toLocaleString()}
            </p>
          </div>

          {/* Morale */}
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-sm text-muted-foreground">Morale</p>
              <p
                className={`text-sm font-semibold ${getStatusColor(
                  employee.morale
                )}`}
              >
                {employee.morale}%
              </p>
            </div>
            <Progress value={employee.morale} className="h-2" />
          </div>

          {/* Satisfaction */}
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-sm text-muted-foreground">Satisfaction</p>
              <p
                className={`text-sm font-semibold ${getStatusColor(
                  employee.satisfaction
                )}`}
              >
                {employee.satisfaction}%
              </p>
            </div>
            <Progress value={employee.satisfaction} className="h-2" />
          </div>

          {/* Bonuses */}
          {employee.bonuses && (
            <div className="border-t pt-3">
              <p className="text-sm font-semibold mb-2">Current Bonuses</p>
              <div className="space-y-1 text-sm">
                {employee.bonuses.salesBoost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sales Boost</span>
                    <span className="text-green-600">
                      +{(employee.bonuses.salesBoost * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {employee.bonuses.maintenanceReduction > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Maintenance Reduction
                    </span>
                    <span className="text-green-600">
                      -
                      {(employee.bonuses.maintenanceReduction * 100).toFixed(1)}
                      %
                    </span>
                  </div>
                )}
                {employee.bonuses.qualityBoost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quality Boost</span>
                    <span className="text-green-600">
                      +{(employee.bonuses.qualityBoost * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {employee.bonuses.costReduction > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Cost Reduction
                    </span>
                    <span className="text-green-600">
                      -{(employee.bonuses.costReduction * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {employee.bonuses.efficiencyBoost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Efficiency Boost
                    </span>
                    <span className="text-green-600">
                      +{(employee.bonuses.efficiencyBoost * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {employee.isActive && (
            <div className="flex gap-2 pt-2">
              {onBonus && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBonus}
                  className="flex-1"
                >
                  Give Bonus
                </Button>
              )}
              {onFire && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onFire}
                  className="flex-1"
                >
                  Fire
                </Button>
              )}
            </div>
          )}

          {!employee.isActive && (
            <Badge variant="secondary" className="w-full justify-center">
              Inactive
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
