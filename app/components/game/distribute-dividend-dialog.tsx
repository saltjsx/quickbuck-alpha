import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { DollarSign, TrendingUp, Users } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { Badge } from "~/components/ui/badge";

interface DistributeDividendDialogProps {
  companyId: Id<"companies">;
  companyName: string;
  companyBalance: number;
  companyOwnerId: Id<"users">;
  trigger?: React.ReactNode;
  hiddenTrigger?: boolean;
}

export interface DistributeDividendDialogRef {
  triggerRef: HTMLButtonElement | null;
}

export const DistributeDividendDialog = forwardRef<
  DistributeDividendDialogRef,
  DistributeDividendDialogProps
>(
  (
    {
      companyId,
      companyName,
      companyBalance,
      companyOwnerId,
      trigger,
      hiddenTrigger = false,
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const triggerRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({
      triggerRef: triggerRef.current,
    }));

    const distributeDividends = useMutation(api.companies.distributeDividends);
    const shareholders = useQuery(api.stocks.getCompanyShareholders, {
      companyId,
    });

    // Calculate investor count (excluding founder)
    const investorCount = shareholders
      ? shareholders.shareholders.filter(
          (s) => !(s.holderType === "user" && s.holderId === companyOwnerId)
        ).length
      : 0;

    // Calculate total investor shares (excluding founder)
    const totalInvestorShares = shareholders
      ? shareholders.shareholders
          .filter(
            (s) => !(s.holderType === "user" && s.holderId === companyOwnerId)
          )
          .reduce((sum, s) => sum + s.shares, 0)
      : 0;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      const dividendAmount = parseFloat(amount);

      if (isNaN(dividendAmount) || dividendAmount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid positive amount",
          variant: "destructive",
        });
        return;
      }

      if (dividendAmount > companyBalance) {
        toast({
          title: "Insufficient Funds",
          description: `Company only has $${companyBalance.toFixed(
            2
          )} available`,
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      try {
        const result = await distributeDividends({
          companyId,
          totalAmount: dividendAmount,
        });

        toast({
          title: "Dividends Distributed! 💰",
          description: `Successfully distributed $${result.totalDistributed.toFixed(
            2
          )} to ${result.recipientCount} investors`,
        });

        setAmount("");
        setOpen(false);
      } catch (error: any) {
        toast({
          title: "Distribution Failed",
          description: error.message || "Failed to distribute dividends",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    const dividendAmount = parseFloat(amount) || 0;
    const dividendPerShare =
      totalInvestorShares > 0 ? dividendAmount / totalInvestorShares : 0;

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {hiddenTrigger ? (
            <button
              ref={triggerRef}
              type="button"
              className="sr-only"
              aria-label="Open distribute dividends dialog"
            />
          ) : (
            trigger || (
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Distribute Dividends
              </Button>
            )
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Distribute Dividends</DialogTitle>
            <DialogDescription>
              Distribute profits to your investors based on their ownership
              percentage. The founder is excluded from dividend payments.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Company Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Company</span>
                  <span className="font-semibold">{companyName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Available Balance
                  </span>
                  <span className="font-semibold">
                    $
                    {companyBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    External Investors
                  </span>
                  <Badge variant="secondary">{investorCount}</Badge>
                </div>
              </div>

              {/* Amount Input */}
              <div className="grid gap-2">
                <Label htmlFor="amount">Total Dividend Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={companyBalance}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This amount will be distributed proportionally to all
                  investors
                </p>
              </div>

              {/* Preview */}
              {dividendAmount > 0 && totalInvestorShares > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-blue-600">
                    Distribution Preview
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Per Share Dividend:
                      </span>
                      <span className="font-medium">
                        ${dividendPerShare.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Shares (Investors):
                      </span>
                      <span className="font-medium">
                        {totalInvestorShares.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recipients:</span>
                      <span className="font-medium">{investorCount}</span>
                    </div>
                  </div>
                </div>
              )}

              {investorCount === 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-600">
                    ⚠️ No external investors found. You need investors to
                    distribute dividends.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  investorCount === 0 ||
                  dividendAmount <= 0 ||
                  dividendAmount > companyBalance
                }
              >
                {isSubmitting ? "Distributing..." : "Distribute Dividends"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
);

DistributeDividendDialog.displayName = "DistributeDividendDialog";
