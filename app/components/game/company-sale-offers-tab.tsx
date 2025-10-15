import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { useToast } from "~/hooks/use-toast";
import {
  Building2,
  DollarSign,
  TrendingUp,
  Loader2,
  ShoppingCart,
  User,
} from "lucide-react";

export function CompanySaleOffersTab() {
  const saleOffers = useQuery(api.companies.getActiveSaleOffers, {
    forBuyer: true,
  });
  const userAccounts = useQuery(api.accounts.getUserAccounts);
  const acceptSaleOffer = useMutation(api.companies.acceptSaleOffer);

  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  const handlePurchase = async () => {
    if (!selectedOffer || !selectedAccountId) return;

    setIsLoading(true);
    try {
      await acceptSaleOffer({
        offerId: selectedOffer._id,
        fromAccountId: selectedAccountId as Id<"accounts">,
      });

      toast({
        title: "Company purchased!",
        description: `You are now the owner of ${selectedOffer.company.name}`,
      });

      setSelectedOffer(null);
      setSelectedAccountId("");
    } catch (error) {
      console.error("Failed to purchase company:", error);
      toast({
        title: "Purchase failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to complete purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!saleOffers) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (saleOffers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Companies for Sale</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          There are currently no companies listed for sale. Check back later!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {saleOffers.map((offer) => {
          const company = offer.company;
          const marketCap = company.isPublic
            ? company.sharePrice * company.totalShares
            : null;

          return (
            <Card key={offer._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={company.name}
                          className="w-8 h-8 rounded"
                        />
                      ) : (
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          {company.name}
                        </CardTitle>
                        {company.isPublic && (
                          <Badge variant="secondary" className="text-xs">
                            {company.ticker}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {company.description && (
                      <CardDescription className="line-clamp-2">
                        {company.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Asking Price</span>
                    </div>
                    <span className="text-xl font-bold text-primary">
                      ${offer.price.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Company Balance
                      </span>
                      <span className="font-medium">
                        ${company.balance.toLocaleString()}
                      </span>
                    </div>

                    {company.isPublic && marketCap && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Market Cap
                        </span>
                        <span className="font-medium">
                          ${marketCap.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {company.isPublic && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Share Price
                        </span>
                        <span className="font-medium">
                          ${company.sharePrice.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seller</span>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium">
                          {offer.seller.name || offer.seller.username}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {company.tags?.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => setSelectedOffer(offer)}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Purchase Company
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Purchase Dialog */}
      <Dialog
        open={!!selectedOffer}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOffer(null);
            setSelectedAccountId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Purchase Company</DialogTitle>
            <DialogDescription>
              {selectedOffer &&
                `You are about to purchase ${
                  selectedOffer.company.name
                } for $${selectedOffer.price.toLocaleString()}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedOffer && (
              <>
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-medium">
                      {selectedOffer.company.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Purchase Price
                    </span>
                    <span className="font-bold text-lg">
                      ${selectedOffer.price.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Company Balance
                    </span>
                    <span className="font-medium text-green-600">
                      ${selectedOffer.company.balance.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account">Pay from Account</Label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                  >
                    <SelectTrigger id="account">
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {userAccounts?.map((account) => {
                        const canAfford =
                          (account.balance || 0) >= selectedOffer.price;
                        return (
                          <SelectItem
                            key={account._id}
                            value={account._id}
                            disabled={!canAfford}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span>
                                {"companyName" in account
                                  ? account.companyName
                                  : account.name}
                              </span>
                              <span
                                className={
                                  canAfford ? "text-green-600" : "text-red-600"
                                }
                              >
                                ${(account.balance || 0).toLocaleString()}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    <strong>Note:</strong> You will gain ownership of all
                    company assets, products, stock holdings, and the company
                    account balance.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedOffer(null);
                setSelectedAccountId("");
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={!selectedAccountId || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Confirm Purchase
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
