import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { toast } from "~/hooks/use-toast";
import { DollarSign } from "lucide-react";

interface UseRevenueBoostDialogProps {
  userUpgradeId: Id<"userUpgrades">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UseRevenueBoostDialog({
  userUpgradeId,
  open,
  onOpenChange,
}: UseRevenueBoostDialogProps) {
  const companies = useQuery(api.companies.getUserCompanies);
  const useRevenueBoost = useMutation(api.upgrades.useRevenueBoost);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (!selectedCompanyId) {
      toast({
        title: "No Company Selected",
        description: "Please select a company to apply the revenue boost.",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);
    try {
      const result = await useRevenueBoost({
        userUpgradeId,
        companyId: selectedCompanyId as Id<"companies">,
      });

      toast({
        title: "Revenue Boost Applied!",
        description: result.message,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to Apply Boost",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Use Revenue Boost
          </DialogTitle>
          <DialogDescription>
            Select one of your companies to boost its product revenue. This
            upgrade can only be used once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="company">Select Company</Label>
            {companies === undefined ? (
              <div className="flex items-center justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : companies.length === 0 ? (
              <p className="text-sm text-gray-600">
                You don't own any companies yet.
              </p>
            ) : (
              <Select
                value={selectedCompanyId}
                onValueChange={setSelectedCompanyId}
              >
                <SelectTrigger id="company">
                  <SelectValue placeholder="Choose a company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company._id} value={company._id}>
                      {company.name} ({company.ticker})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={
                !selectedCompanyId ||
                isApplying ||
                !companies ||
                companies.length === 0
              }
            >
              {isApplying && <Spinner size="sm" className="mr-2" />}
              Apply Boost
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
