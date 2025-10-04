import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

/**
 * Migration component to recalculate all account balances
 * This is a ONE-TIME operation to migrate from ledger-calculated to cached balances
 *
 * To use:
 * 1. Import this component in any page (e.g., dashboard/accounts.tsx)
 * 2. Add <MigrationButton /> to the page
 * 3. Click "Run Migration" button
 * 4. Wait for completion
 * 5. Remove this component from your code
 */
export function MigrationButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const recalculateAllBalances = useMutation(
    api.accounts.recalculateAllBalances
  );

  const runMigration = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      // Recalculate all balances from ledger
      console.log("Recalculating balances from ledger...");
      const migrationResults = await recalculateAllBalances({});

      setResults(migrationResults);
      console.log("Migration completed:", migrationResults);
    } catch (err: any) {
      setError(err.message || "Migration failed");
      console.error("Migration error:", err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <CardHeader>
        <CardTitle className="text-yellow-900 dark:text-yellow-100">
          ⚠️ Balance Migration Required
        </CardTitle>
        <CardDescription className="text-yellow-800 dark:text-yellow-200">
          Run this once to migrate account balances to the new cached system.
          This fixes the "too many documents" error.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runMigration}
          disabled={isRunning}
          variant="default"
          className="w-full"
        >
          {isRunning ? "Running Migration..." : "Run Migration"}
        </Button>

        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 rounded-md">
            <p className="text-red-900 dark:text-red-100 font-semibold">
              Error:
            </p>
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {results && (
          <div className="p-4 bg-green-100 dark:bg-green-900 border border-green-400 rounded-md">
            <p className="text-green-900 dark:text-green-100 font-semibold mb-2">
              ✅ Migration Complete!
            </p>
            <div className="text-sm text-green-800 dark:text-green-200">
              <p>Accounts processed: {results.length}</p>
              <p>Successful: {results.filter((r: any) => r.success).length}</p>
              <p>Failed: {results.filter((r: any) => !r.success).length}</p>
              {results.some((r: any) => !r.success) && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold">
                    View Errors
                  </summary>
                  <pre className="mt-2 p-2 bg-white dark:bg-black rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(
                      results.filter((r: any) => !r.success),
                      null,
                      2
                    )}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> After running this successfully, you can remove
          this component from your code. The migration only needs to be run
          once.
        </p>
      </CardContent>
    </Card>
  );
}
