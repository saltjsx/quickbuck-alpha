import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { useState } from "react";
import type { Route } from "./+types/transactions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Transactions - QuickBuck" },
    {
      name: "description",
      content:
        "View your transaction history, transfer money between accounts, and track all financial activity in QuickBuck.",
    },
  ];
}
import {
  Search,
  Send,
  Building2,
  User,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

export default function TransactionsPage() {
  const userAccounts = useQuery(api.accounts.getUserAccounts);
  const transfer = useMutation(api.accounts.transfer);
  const portfolio = useQuery(api.stocks.getPortfolio);
  const companies = useQuery(api.companies.getUserCompanies);
  const transferStock = useMutation(api.stocks.transferStock);

  const [selectedAccountId, setSelectedAccountId] =
    useState<Id<"accounts"> | null>(null);
  const [recipientType, setRecipientType] = useState<"user" | "company">(
    "company"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Stock transfer states
  const [selectedStockHolding, setSelectedStockHolding] = useState<any>(null);
  const [stockRecipientType, setStockRecipientType] = useState<
    "user" | "company"
  >("user");
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [selectedStockRecipient, setSelectedStockRecipient] =
    useState<any>(null);
  const [sharesToTransfer, setSharesToTransfer] = useState("");
  const [stockError, setStockError] = useState("");
  const [stockSuccess, setStockSuccess] = useState("");

  const searchUsers = useQuery(
    api.accounts.searchUsers,
    searchTerm.length >= 2 && recipientType === "user" ? { searchTerm } : "skip"
  );
  const searchCompanies = useQuery(
    api.accounts.searchCompanies,
    searchTerm.length >= 1 && recipientType === "company"
      ? { searchTerm }
      : "skip"
  );

  const searchResults =
    recipientType === "user" ? searchUsers : searchCompanies;

  // Stock transfer search
  const stockSearchUsers = useQuery(
    api.accounts.searchUsers,
    stockSearchTerm.length >= 2 && stockRecipientType === "user"
      ? { searchTerm: stockSearchTerm }
      : "skip"
  );
  const stockSearchCompanies = useQuery(
    api.accounts.searchCompanies,
    stockSearchTerm.length >= 1 && stockRecipientType === "company"
      ? { searchTerm: stockSearchTerm }
      : "skip"
  );

  const stockSearchResults =
    stockRecipientType === "user" ? stockSearchUsers : stockSearchCompanies;

  // Set default account when accounts load
  if (userAccounts && userAccounts.length > 0 && !selectedAccountId) {
    const firstAccount = userAccounts[0];
    if (firstAccount?._id) {
      setSelectedAccountId(firstAccount._id);
    }
  }

  const selectedAccount = userAccounts?.find(
    (acc) => acc._id === selectedAccountId
  );

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedAccountId) {
      setError("Please select a source account");
      return;
    }

    if (!selectedRecipient) {
      setError("Please select a recipient");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (selectedAccount && transferAmount > selectedAccount.balance) {
      setError("Insufficient funds");
      return;
    }

    setIsSubmitting(true);

    try {
      await transfer({
        fromAccountId: selectedAccountId,
        toAccountId: selectedRecipient.accountId,
        amount: transferAmount,
        description:
          description ||
          `Transfer to ${selectedRecipient.name || selectedRecipient.ticker}`,
      });

      setSuccess(
        `Successfully transferred $${transferAmount.toLocaleString()} to ${
          selectedRecipient.name || selectedRecipient.ticker
        }`
      );
      setAmount("");
      setDescription("");
      setSelectedRecipient(null);
      setSearchTerm("");
    } catch (err: any) {
      setError(err.message || "Transfer failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockError("");
    setStockSuccess("");

    if (!selectedStockHolding) {
      setStockError("Please select a stock holding");
      return;
    }

    if (!selectedStockRecipient) {
      setStockError("Please select a recipient");
      return;
    }

    const shares = parseFloat(sharesToTransfer);
    if (isNaN(shares) || shares <= 0) {
      setStockError("Please enter a valid number of shares");
      return;
    }

    if (shares > selectedStockHolding.shares) {
      setStockError("Insufficient shares");
      return;
    }

    setIsSubmitting(true);

    try {
      await transferStock({
        companyId: selectedStockHolding.companyId,
        shares: shares,
        toId:
          stockRecipientType === "user"
            ? selectedStockRecipient._id
            : selectedStockRecipient._id,
        toType: stockRecipientType,
      });

      setStockSuccess(
        `Successfully transferred ${shares} shares of ${
          selectedStockHolding.companyName
        } to ${selectedStockRecipient.name || selectedStockRecipient.ticker}`
      );
      setSharesToTransfer("");
      setSelectedStockRecipient(null);
      setStockSearchTerm("");
      setSelectedStockHolding(null);
    } catch (err: any) {
      setStockError(err.message || "Stock transfer failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Transfers</h1>
        <p className="text-muted-foreground">
          Transfer money or stocks to companies and other players
        </p>
      </div>

      <Tabs defaultValue="money" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="money">
            <Send className="h-4 w-4 mr-2" />
            Money
          </TabsTrigger>
          <TabsTrigger value="stocks">
            <TrendingUp className="h-4 w-4 mr-2" />
            Stocks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="money" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>New Transfer</CardTitle>
              <CardDescription>
                Send money from your accounts to companies or other players
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransfer} className="space-y-6">
                {/* Source Account Selection */}
                <div className="space-y-2">
                  <Label htmlFor="source-account">From Account</Label>
                  <Select
                    value={selectedAccountId || ""}
                    onValueChange={(value) =>
                      setSelectedAccountId(value as Id<"accounts">)
                    }
                  >
                    <SelectTrigger id="source-account">
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      {userAccounts?.map((account) => {
                        if (!account._id) return null;
                        return (
                          <SelectItem key={account._id} value={account._id}>
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {account.type === "personal"
                                  ? "Personal Account"
                                  : (account as any).companyName}
                              </span>
                              <Badge variant="outline" className="ml-2">
                                ${account.balance.toLocaleString()}
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedAccount && (
                    <p className="text-sm text-muted-foreground">
                      Available balance:{" "}
                      <span className="font-semibold">
                        ${selectedAccount.balance.toLocaleString()}
                      </span>
                    </p>
                  )}
                </div>

                {/* Recipient Type Selection */}
                <div className="space-y-2">
                  <Label>Recipient Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={
                        recipientType === "company" ? "default" : "outline"
                      }
                      className="flex-1"
                      onClick={() => {
                        setRecipientType("company");
                        setSelectedRecipient(null);
                        setSearchTerm("");
                      }}
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      Company
                    </Button>
                    <Button
                      type="button"
                      variant={recipientType === "user" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => {
                        setRecipientType("user");
                        setSelectedRecipient(null);
                        setSearchTerm("");
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Player
                    </Button>
                  </div>
                </div>

                {/* Recipient Search */}
                <div className="space-y-2">
                  <Label htmlFor="recipient-search">
                    {recipientType === "company"
                      ? "Search by Company Name or Ticker"
                      : "Search by Username or Email"}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recipient-search"
                      placeholder={
                        recipientType === "company"
                          ? "e.g., AAPL or Apple Inc."
                          : "e.g., john_doe"
                      }
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSelectedRecipient(null);
                      }}
                      className="pl-10"
                    />
                  </div>

                  {/* Search Results */}
                  {searchTerm && searchResults && searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {searchResults.map((result: any) => (
                        <button
                          key={result._id}
                          type="button"
                          onClick={() => {
                            setSelectedRecipient(result);
                            setSearchTerm("");
                          }}
                          className="w-full p-3 hover:bg-accent text-left transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {recipientType === "company" ? (
                                <>
                                  {result.logoUrl ? (
                                    <img
                                      src={result.logoUrl}
                                      alt={result.name}
                                      className="w-8 h-8 rounded"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                      <Building2 className="h-4 w-4 text-primary" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium">{result.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {result.ticker}
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{result.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      @{result.username || result.email}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchTerm &&
                    searchResults &&
                    searchResults.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No {recipientType === "company" ? "companies" : "users"}{" "}
                        found
                      </p>
                    )}
                </div>

                {/* Selected Recipient Display */}
                {selectedRecipient && (
                  <div className="p-4 border rounded-lg bg-accent/50">
                    <Label className="text-xs text-muted-foreground">
                      Sending to:
                    </Label>
                    <div className="flex items-center gap-3 mt-2">
                      {recipientType === "company" ? (
                        <>
                          {selectedRecipient.logoUrl ? (
                            <img
                              src={selectedRecipient.logoUrl}
                              alt={selectedRecipient.name}
                              className="w-10 h-10 rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">
                              {selectedRecipient.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedRecipient.ticker}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {selectedRecipient.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @
                              {selectedRecipient.username ||
                                selectedRecipient.email}
                            </p>
                          </div>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRecipient(null)}
                        className="ml-auto"
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                {/* Description Input */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="What's this payment for?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm">
                    {success}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={
                    !selectedAccountId ||
                    !selectedRecipient ||
                    !amount ||
                    isSubmitting
                  }
                  className="w-full"
                  size="lg"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send Money"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Transfer Preview */}
          {selectedAccount &&
            selectedRecipient &&
            amount &&
            parseFloat(amount) > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Transfer Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">From</p>
                      <p className="font-semibold">
                        {selectedAccount.type === "personal"
                          ? "Personal"
                          : (selectedAccount as any).companyName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${selectedAccount.balance.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight className="h-6 w-6 text-primary" />
                      <p className="text-2xl font-bold text-primary">
                        ${parseFloat(amount).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">To</p>
                      <p className="font-semibold">{selectedRecipient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {recipientType === "company"
                          ? selectedRecipient.ticker
                          : `@${
                              selectedRecipient.username ||
                              selectedRecipient.email
                            }`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        <TabsContent value="stocks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Stocks</CardTitle>
              <CardDescription>
                Transfer stock shares to companies or other players
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStockTransfer} className="space-y-6">
                {/* Stock Selection */}
                <div className="space-y-2">
                  <Label htmlFor="stock-selection">
                    Select Stock to Transfer
                  </Label>
                  {!portfolio || portfolio.length === 0 ? (
                    <div className="p-4 border rounded-lg text-center text-muted-foreground">
                      <p>You don't own any stocks yet</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          (window.location.href = "/dashboard/stocks")
                        }
                      >
                        Browse Stocks
                      </Button>
                    </div>
                  ) : selectedStockHolding ? (
                    <div className="p-4 border rounded-lg bg-accent/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {selectedStockHolding.companyLogoUrl && (
                            <img
                              src={selectedStockHolding.companyLogoUrl}
                              alt={selectedStockHolding.companyName}
                              className="w-10 h-10 rounded"
                            />
                          )}
                          <div>
                            <p className="font-semibold">
                              {selectedStockHolding.companyName}
                            </p>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {selectedStockHolding.companyTicker}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            You own
                          </p>
                          <p className="font-semibold">
                            {selectedStockHolding.shares} shares
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStockHolding(null)}
                            className="mt-1"
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg divide-y">
                      {portfolio.map((holding: any) => {
                        if (!holding) return null;
                        return (
                          <button
                            key={holding._id}
                            type="button"
                            onClick={() => setSelectedStockHolding(holding)}
                            className="w-full p-3 hover:bg-accent text-left transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {holding.companyLogoUrl && (
                                  <img
                                    src={holding.companyLogoUrl}
                                    alt={holding.companyName}
                                    className="w-8 h-8 rounded"
                                  />
                                )}
                                <div>
                                  <p className="font-medium">
                                    {holding.companyName}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs"
                                  >
                                    {holding.companyTicker}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">
                                  {holding.shares} shares
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  @ ${holding.currentPrice.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Number of Shares */}
                {selectedStockHolding && (
                  <div className="space-y-2">
                    <Label htmlFor="shares">Number of Shares</Label>
                    <Input
                      id="shares"
                      type="number"
                      step="1"
                      min="1"
                      max={selectedStockHolding.shares}
                      placeholder="0"
                      value={sharesToTransfer}
                      onChange={(e) => setSharesToTransfer(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Max: {selectedStockHolding.shares} shares available
                    </p>
                  </div>
                )}

                {/* Recipient Type Selection */}
                {selectedStockHolding && (
                  <div className="space-y-2">
                    <Label>Recipient Type</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={
                          stockRecipientType === "user" ? "default" : "outline"
                        }
                        className="flex-1"
                        onClick={() => {
                          setStockRecipientType("user");
                          setSelectedStockRecipient(null);
                          setStockSearchTerm("");
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Player
                      </Button>
                      <Button
                        type="button"
                        variant={
                          stockRecipientType === "company"
                            ? "default"
                            : "outline"
                        }
                        className="flex-1"
                        onClick={() => {
                          setStockRecipientType("company");
                          setSelectedStockRecipient(null);
                          setStockSearchTerm("");
                        }}
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        Company
                      </Button>
                    </div>
                  </div>
                )}

                {/* Recipient Search */}
                {selectedStockHolding && (
                  <div className="space-y-2">
                    <Label htmlFor="stock-recipient-search">
                      {stockRecipientType === "company"
                        ? "Search by Company Name or Ticker"
                        : "Search by Username or Email"}
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="stock-recipient-search"
                        placeholder={
                          stockRecipientType === "company"
                            ? "e.g., AAPL or Apple Inc."
                            : "e.g., john_doe"
                        }
                        value={stockSearchTerm}
                        onChange={(e) => {
                          setStockSearchTerm(e.target.value);
                          setSelectedStockRecipient(null);
                        }}
                        className="pl-10"
                      />
                    </div>

                    {/* Search Results */}
                    {stockSearchTerm &&
                      stockSearchResults &&
                      stockSearchResults.length > 0 && (
                        <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                          {stockSearchResults.map((result: any) => (
                            <button
                              key={result._id}
                              type="button"
                              onClick={() => {
                                setSelectedStockRecipient(result);
                                setStockSearchTerm("");
                              }}
                              className="w-full p-3 hover:bg-accent text-left transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {stockRecipientType === "company" ? (
                                    <>
                                      {result.logoUrl ? (
                                        <img
                                          src={result.logoUrl}
                                          alt={result.name}
                                          className="w-8 h-8 rounded"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                          <Building2 className="h-4 w-4 text-primary" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-medium">
                                          {result.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {result.ticker}
                                        </p>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-4 w-4 text-primary" />
                                      </div>
                                      <div>
                                        <p className="font-medium">
                                          {result.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          @{result.username || result.email}
                                        </p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                    {stockSearchTerm &&
                      stockSearchResults &&
                      stockSearchResults.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No{" "}
                          {stockRecipientType === "company"
                            ? "companies"
                            : "users"}{" "}
                          found
                        </p>
                      )}
                  </div>
                )}

                {/* Selected Recipient Display */}
                {selectedStockRecipient && (
                  <div className="p-4 border rounded-lg bg-accent/50">
                    <Label className="text-xs text-muted-foreground">
                      Transferring to:
                    </Label>
                    <div className="flex items-center gap-3 mt-2">
                      {stockRecipientType === "company" ? (
                        <>
                          {selectedStockRecipient.logoUrl ? (
                            <img
                              src={selectedStockRecipient.logoUrl}
                              alt={selectedStockRecipient.name}
                              className="w-10 h-10 rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">
                              {selectedStockRecipient.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedStockRecipient.ticker}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {selectedStockRecipient.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @
                              {selectedStockRecipient.username ||
                                selectedStockRecipient.email}
                            </p>
                          </div>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStockRecipient(null)}
                        className="ml-auto"
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}

                {/* Error/Success Messages */}
                {stockError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {stockError}
                  </div>
                )}

                {stockSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm">
                    {stockSuccess}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={
                    !selectedStockHolding ||
                    !selectedStockRecipient ||
                    !sharesToTransfer ||
                    isSubmitting
                  }
                  className="w-full"
                  size="lg"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Transferring..." : "Transfer Shares"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Transfer Preview */}
          {selectedStockHolding &&
            selectedStockRecipient &&
            sharesToTransfer &&
            parseFloat(sharesToTransfer) > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Transfer Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">From</p>
                      <p className="font-semibold">You</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedStockHolding.shares} shares owned
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight className="h-6 w-6 text-primary" />
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {parseFloat(sharesToTransfer)} shares
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedStockHolding.companyTicker}
                        </p>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">To</p>
                      <p className="font-semibold">
                        {selectedStockRecipient.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {stockRecipientType === "company"
                          ? selectedStockRecipient.ticker
                          : `@${
                              selectedStockRecipient.username ||
                              selectedStockRecipient.email
                            }`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
