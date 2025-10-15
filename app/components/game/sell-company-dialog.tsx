import { useState } from "react";
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
import { useToast } from "~/hooks/use-toast";
import { Loader2, DollarSign } from "lucide-react";

interface SellCompanyDialogProps {
  companyId: Id<"companies">;
  companyName: string;
  companyBalance: number;
  trigger?: React.ReactNode;
}

export function SellCompanyDialog({
  companyId,
  companyName,
  companyBalance,
  trigger,
}: SellCompanyDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createSaleOffer = useMutation(api.companies.createSaleOffer);
  const existingOffer = useQuery(api.companies.getCompanySaleOffer, {
    companyId,
  });
  const cancelSaleOffer = useMutation(api.companies.cancelSaleOffer);

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        throw new Error("Please enter a valid price");
      }

      await createSaleOffer({
        companyId,
        price: priceNum,
      });

      toast({
        title: "Sale offer created",
        description: `${companyName} is now listed for sale at $${priceNum.toLocaleString()}`,
      });

      setIsOpen(false);
      setPrice("");
    } catch (error) {
      console.error("Failed to create sale offer:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create sale offer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOffer = async () => {
    if (!existingOffer) return;

    setIsLoading(true);
    try {
      await cancelSaleOffer({ offerId: existingOffer._id });

      toast({
        title: "Sale offer cancelled",
        description: `${companyName} is no longer listed for sale`,
      });

      setIsOpen(false);
    } catch (error) {
      console.error("Failed to cancel sale offer:", error);
      toast({
        title: "Error",
        description: "Failed to cancel sale offer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedPrice = Math.floor(companyBalance * 1.5);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <DollarSign className="mr-2 h-4 w-4" />
            Sell Company
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {existingOffer ? "Manage Sale Offer" : "Sell Company"}
          </DialogTitle>
          <DialogDescription>
            {existingOffer
              ? `${companyName} is currently listed for sale at $${existingOffer.price.toLocaleString()}`
              : `Set a price to list ${companyName} for sale to other players`}
          </DialogDescription>
        </DialogHeader>

        {existingOffer ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Current asking price</p>
                  <p className="text-2xl font-bold">
                    ${existingOffer.price.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              You can cancel this offer at any time if you change your mind.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="price">Asking Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter sale price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Suggested: ${suggestedPrice.toLocaleString()} (1.5x company
                  balance)
                </p>
              </div>

              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Company balance</span>
                  <span className="font-medium">
                    ${companyBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  <strong>Warning:</strong> Once sold, all company assets,
                  products, and ownership will transfer to the buyer. This
                  action cannot be undone.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "List for Sale"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {existingOffer && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelOffer}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Sale Offer"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
