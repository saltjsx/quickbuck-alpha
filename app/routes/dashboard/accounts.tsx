import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Wallet } from "lucide-react";
import type { Route } from "./+types/accounts";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Accounts - QuickBuck" },
    {
      name: "description",
      content:
        "View and manage your bank accounts and transaction history in QuickBuck.",
    },
  ];
}

export default function AccountsPage() {
  const accounts = useQuery(api.accounts.getUserAccounts);
  const initializeAccount = useMutation(api.accounts.initializeAccount);

  const handleInitialize = async () => {
    try {
      await initializeAccount({});
      console.log("Account initialized successfully");
    } catch (error) {
      console.error("Failed to initialize account:", error);
    }
  };

  if (accounts === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8" />
              Your Accounts
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your personal and company bank accounts
            </p>
          </div>

          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Bank Accounts</CardTitle>
                <CardDescription>
                  All transactions tracked in real-time ledger
                </CardDescription>
              </CardHeader>
              <CardContent>
                {accounts?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      No accounts found
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click below to create your personal account with $10,000
                      starting balance
                    </p>
                    <Button onClick={handleInitialize}>
                      Initialize Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts?.map((account: any) => (
                      <div
                        key={account._id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
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
          </div>
        </div>
      </div>
    </div>
  );
}
