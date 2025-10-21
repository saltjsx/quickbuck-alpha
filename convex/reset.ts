import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Reset all product and company revenue/profit data
 * Does NOT delete any products or companies
 */
export const resetRevenueAndProfits = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("\n" + "=".repeat(80));
    console.log("  RESETTING REVENUE AND PROFIT DATA");
    console.log("=".repeat(80));

    try {
      // Get all products
      console.log("\n  [1/2] Resetting all products...");
      const allProducts = await ctx.db.query("products").collect();
      console.log(`        Found ${allProducts.length} products`);

      let productsReset = 0;
      for (const product of allProducts) {
        await ctx.db.patch(product._id, {
          totalSales: 0,
          totalRevenue: 0,
          totalCosts: 0,
        });
        productsReset++;
      }
      console.log(`        ✓ Reset ${productsReset} products`);

      // Get all accounts and reset balances
      console.log("  [2/2] Resetting all company accounts...");
      const allAccounts = await ctx.db.query("accounts").collect();
      console.log(`        Found ${allAccounts.length} accounts`);

      let accountsReset = 0;
      for (const account of allAccounts) {
        // Skip system account
        if (account.name !== "System") {
          await ctx.db.patch(account._id, {
            balance: 0,
          });
          accountsReset++;
        }
      }
      console.log(`        ✓ Reset ${accountsReset} company accounts`);

      // Also reset all ledger entries (in smaller batches due to size/read limit)
      console.log("  [3/2] Clearing ledger...");
      let ledgersCleared = 0;
      let hasMore = true;
      let batchCount = 0;
      const MAX_BATCHES = 50; // More batches to clear all entries
      
      while (hasMore && batchCount < MAX_BATCHES) {
        batchCount++;
        const ledgerBatch = await ctx.db.query("ledger").take(50); // Even smaller batch
        
        if (ledgerBatch.length === 0) {
          hasMore = false;
        } else {
          for (const ledger of ledgerBatch) {
            await ctx.db.delete(ledger._id);
            ledgersCleared++;
          }
          console.log(`        Batch ${batchCount}: Cleared ${ledgerBatch.length} entries`);
        }
      }
      
      if (hasMore) {
        console.log(`        ⚠️  Hit batch limit after ${ledgersCleared} ledger entries`);
      } else {
        console.log(`        ✓ Cleared all ${ledgersCleared} ledger entries`);
      }

      console.log("\n" + "=".repeat(80));
      console.log("  ✅ RESET COMPLETE");
      console.log("=".repeat(80) + "\n");

      return {
        success: true,
        productsReset,
        accountsReset,
        ledgersCleared,
      };
    } catch (error) {
      console.error("  ❌ Error:", error);
      throw error;
    }
  },
});
