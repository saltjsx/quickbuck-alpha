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
import { TrendingDown } from "lucide-react";

interface UseStockPriceLowerDialogProps {
  userUpgradeId: Id<"userUpgrades">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UseStockPriceLowerDialog({
  userUpgradeId,
  open,
  onOpenChange,
}: UseStockPriceLowerDialogProps) {
  const companies = useQuery(api.companies.getPublicCompanies);
  const useStockPriceLower = useMutation(api.upgrades.useStockPriceLower);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (!selectedCompanyId) {
      toast({
        title: "No Stock Selected",
        description: "Please select a company's stock to lower.",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);
    try {
      const result = await useStockPriceLower({
        userUpgradeId,
        companyId: selectedCompanyId as Id<"companies">,
      });

      toast({
        title: "Stock Price Lowered!",
        description: result.message,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to Apply Effect",
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
            <TrendingDown className="h-5 w-5 text-red-500" />
            Use Stock Price Lower
          </DialogTitle>
          <DialogDescription>
            Select any public company to lower its stock price. This upgrade can
            only be used once.
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
                No public companies available.
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
                  {companies.map((company: any) => (
                    <SelectItem key={company._id} value={company._id}>
                      {company.name} ({company.ticker}) - $
                      {company.sharePrice.toFixed(2)}
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
              variant="destructive"
            >
              {isApplying && <Spinner size="sm" className="mr-2" />}
              Apply Effect
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
