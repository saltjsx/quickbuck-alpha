import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { track } from "@databuddy/sdk";
import { useEffect } from "react";

type Accounts = FunctionReturnType<typeof api.accounts.getUserAccounts>;

interface AccountsTabProps {
  accounts: Accounts | undefined;
  initializeAccount: any;
}

export function AccountsTab({ accounts, initializeAccount }: AccountsTabProps) {
  // Track account view with total balance
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      const totalBalance = accounts.reduce(
        (sum: number, acc: any) => sum + (acc.balance || 0),
        0
      );
      track("accounts_viewed", {
        accounts_count: accounts.length,
        total_balance: totalBalance,
        currency: "USD",
        has_company_accounts: accounts.some(
          (acc: any) => acc.type === "company"
        ),
        timestamp: new Date().toISOString(),
      });
    }
  }, [accounts?.length]);

  const handleInitializeAccount = async () => {
    await initializeAccount({});
    track("account_initialized", {
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Accounts</CardTitle>
        <CardDescription>
          Manage your personal and company accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {accounts?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No accounts yet</p>
            <Button onClick={handleInitializeAccount}>
              Initialize Account
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts?.map((account: any) => (
              <div
                key={account._id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {account.type === "company" && account.companyName
                      ? account.companyName
                      : account.name}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {account.type} Account
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    $
                    {account.balance?.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
