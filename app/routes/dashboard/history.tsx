import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { Route } from "./+types/history";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  User,
  Package,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Transaction History - QuickBuck" },
    {
      name: "description",
      content:
        "View detailed transaction history and financial activity logs in QuickBuck.",
    },
  ];
}

export default function TransactionHistoryPage() {
  const userAccounts = useQuery(api.accounts.getUserAccounts);
  const [selectedAccountId, setSelectedAccountId] =
    useState<Id<"accounts"> | null>(null);

  const transactions = useQuery(
    api.accounts.getTransactions,
    selectedAccountId ? { accountId: selectedAccountId, limit: 100 } : "skip"
  );

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

  const getTransactionIcon = (type: string, isIncoming: boolean) => {
    if (type === "product_purchase")
      return <Package className="h-4 w-4 text-blue-500" />;
    if (type === "product_cost")
      return <Package className="h-4 w-4 text-orange-500" />;
    if (type === "stock_purchase")
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (type === "stock_sale")
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (type === "initial_deposit")
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    return isIncoming ? (
      <ArrowDownLeft className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowUpRight className="h-4 w-4 text-red-500" />
    );
  };

  const getTransactionTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      transfer: "Transfer",
      product_purchase: "Product Sale",
      product_cost: "Production Cost",
      initial_deposit: "Initial Deposit",
      stock_purchase: "Stock Purchase",
      stock_sale: "Stock Sale",
    };
    return typeMap[type] || type;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Group product transactions by productId and timestamp (within 1 second)
  const groupedTransactions = (() => {
    if (!transactions) return [];

    const groups: any[] = [];
    const processedIds = new Set<string>();

    transactions.forEach((tx) => {
      if (processedIds.has(tx._id)) return;

      // Check if this is a product purchase or cost
      if (tx.type === "product_purchase" || tx.type === "product_cost") {
        const isIncoming = tx.toAccountId === selectedAccountId;

        // Find matching transactions with same productId within 1 second
        const relatedTxs = transactions.filter(
          (t) =>
            t.productId === tx.productId &&
            Math.abs(t.createdAt - tx.createdAt) < 1000 &&
            !processedIds.has(t._id)
        );

        if (relatedTxs.length > 1) {
          // Group them together
          const purchaseTx = relatedTxs.find(
            (t) => t.type === "product_purchase"
          );
          const costTx = relatedTxs.find((t) => t.type === "product_cost");

          if (purchaseTx && costTx) {
            // Calculate net amount (revenue - cost)
            const revenue =
              purchaseTx.toAccountId === selectedAccountId
                ? purchaseTx.amount
                : 0;
            const cost =
              costTx.fromAccountId === selectedAccountId ? costTx.amount : 0;
            const netAmount = revenue - cost;
            const netIsIncoming = netAmount > 0;

            groups.push({
              _id: `group-${purchaseTx._id}`,
              type: "product_transaction",
              isGrouped: true,
              revenue,
              cost,
              netAmount: Math.abs(netAmount),
              netIsIncoming,
              description: purchaseTx.description || "Product transaction",
              otherAccount: netIsIncoming
                ? purchaseTx.fromAccountName
                : costTx.toAccountName,
              createdAt: purchaseTx.createdAt,
              productId: purchaseTx.productId,
            });

            relatedTxs.forEach((t) => processedIds.add(t._id));
            return;
          }
        }
      }

      // Not grouped, add as single transaction
      processedIds.add(tx._id);
      const isIncoming = tx.toAccountId === selectedAccountId;
      groups.push({
        ...tx,
        isGrouped: false,
        isIncoming,
        otherAccount: isIncoming ? tx.fromAccountName : tx.toAccountName,
      });
    });

    return groups;
  })();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">
          View your recent transactions and account activity
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                All transactions for the selected account
              </CardDescription>
            </div>
            <div className="w-full sm:w-[300px]">
              <Select
                value={selectedAccountId || ""}
                onValueChange={(value) =>
                  setSelectedAccountId(value as Id<"accounts">)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedAccount && (
            <div className="mb-6 p-4 bg-accent/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Current Balance
                  </p>
                  <p className="text-3xl font-bold">
                    ${selectedAccount.balance.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <Badge variant="secondary">
                    {selectedAccount.type === "personal"
                      ? "Personal"
                      : "Company"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No transactions found for this account
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>From/To</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedTransactions.map((item) => {
                    if (item.isGrouped) {
                      // Grouped product transaction
                      return (
                        <TableRow key={item._id}>
                          <TableCell>
                            <Package className="h-4 w-4 text-blue-500" />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Product Sale</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[300px]">
                              <p className="truncate">
                                {item.description || "No description"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Revenue: ${item.revenue.toLocaleString()} -
                                Cost: ${item.cost.toLocaleString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.netIsIncoming ? (
                                <>
                                  <ArrowDownLeft className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">
                                    From {item.otherAccount}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">
                                    To {item.otherAccount}
                                  </span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(item.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span
                                className={`font-semibold ${
                                  item.netIsIncoming
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {item.netIsIncoming ? "+" : "-"}$
                                {item.netAmount.toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Net
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    } else {
                      // Individual transaction
                      return (
                        <TableRow key={item._id}>
                          <TableCell>
                            {getTransactionIcon(item.type, item.isIncoming)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getTransactionTypeName(item.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[300px]">
                              <p className="truncate">
                                {item.description || "No description"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.isIncoming ? (
                                <>
                                  <ArrowDownLeft className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">
                                    From {item.otherAccount}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">
                                    To {item.otherAccount}
                                  </span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(item.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-semibold ${
                                item.isIncoming
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {item.isIncoming ? "+" : "-"}$
                              {item.amount.toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    }
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
