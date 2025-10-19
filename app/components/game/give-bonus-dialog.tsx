import { useState } from "react";
import { useMutation } from "convex/react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

interface GiveBonusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: Id<"employees">;
  employeeName: string;
  currentMorale: number;
  currentSatisfaction: number;
  companyBalance: number;
}

export function GiveBonusDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  currentMorale,
  currentSatisfaction,
  companyBalance,
}: GiveBonusDialogProps) {
  const [bonusAmount, setBonusAmount] = useState("");
  const giveBonus = useMutation(api.employees.giveEmployeeBonus);

  const handleGiveBonus = async () => {
    const amount = parseFloat(bonusAmount);

    if (!amount || amount <= 0) {
      toast.error("Invalid amount", {
        description: "Please enter a valid bonus amount.",
      });
      return;
    }

    if (amount > companyBalance) {
      toast.error("Insufficient funds", {
        description: `Company only has $${companyBalance.toLocaleString()} available.`,
      });
      return;
    }

    try {
      const result = await giveBonus({
        employeeId,
        bonusAmount: amount,
      });

      toast.success("Bonus paid!", {
        description: result.message,
      });

      setBonusAmount("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to give bonus", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const previewMorale = Math.min(100, currentMorale + 10);
  const previewSatisfaction = Math.min(100, currentSatisfaction + 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Give Bonus to {employeeName}</DialogTitle>
          <DialogDescription>
            Reward your employee with a bonus to boost their morale and
            satisfaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bonus-amount">Bonus Amount ($)</Label>
            <Input
              id="bonus-amount"
              type="number"
              placeholder="Enter bonus amount"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              min="0"
              step="100"
            />
            <p className="text-sm text-muted-foreground">
              Company balance: ${companyBalance.toLocaleString()}
            </p>
          </div>

          {bonusAmount && parseFloat(bonusAmount) > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">Preview Impact</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Morale:</span>
                  <span>
                    {currentMorale}% →{" "}
                    <span className="text-green-600">{previewMorale}%</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Satisfaction:</span>
                  <span>
                    {currentSatisfaction}% →{" "}
                    <span className="text-green-600">
                      {previewSatisfaction}%
                    </span>
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Total Cost:</span>
                  <span className="font-semibold">
                    ${parseFloat(bonusAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGiveBonus}
              className="flex-1"
              disabled={!bonusAmount || parseFloat(bonusAmount) <= 0}
            >
              Give Bonus
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
