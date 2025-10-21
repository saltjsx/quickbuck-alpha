import { action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Action wrapper to restore balances one-by-one
 * Each call has fresh read/write limits
 */
export const restoreBalancesMultiCall = action({
  args: {},
  handler: async (ctx) => {
    console.log("\n" + "=".repeat(80));
    console.log("  RESTORING BALANCES - ONE ACCOUNT AT A TIME");
    console.log("=".repeat(80));

    try {
      // Get all non-system accounts
      const nonSystemAccounts = await ctx.runMutation(
        internal.restore_balances.getAllNonSystemAccounts,
        {}
      );
      console.log(`\n  Found ${nonSystemAccounts.length} company accounts`);
      console.log(`  Processing each account individually...\n`);

      let totalRestored = 0;

      // Process each account one at a time
      for (let i = 0; i < nonSystemAccounts.length; i++) {
        const account = nonSystemAccounts[i];
        try {
          const result = await ctx.runMutation(
            internal.restore_balances.restoreOneAccount,
            { accountId: account._id }
          );
          totalRestored++;

          if ((i + 1) % 10 === 0) {
            console.log(`  ✓ Restored ${i + 1} accounts...`);
          }
        } catch (e) {
          console.log(
            `  ✗ Error restoring ${account.name}: ${(e as any).message}`
          );
        }
      }

      console.log(`\n  ✅ Total restored: ${totalRestored} accounts`);
      console.log("=".repeat(80) + "\n");

      return {
        success: true,
        totalRestored,
      };
    } catch (error) {
      console.error("  ❌ Error:", error);
      throw error;
    }
  },
});
