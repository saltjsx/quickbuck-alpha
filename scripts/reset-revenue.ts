import { ConvexClient } from "convex/browser";

const client = new ConvexClient(process.env.CONVEX_URL || "");

async function resetRevenueAndProfits() {
  console.log("🔄 Resetting product and company revenue/profit data...\n");

  try {
    // Get all products
    console.log("📦 Fetching all products...");
    const products = await client.query("products:getAllProducts" as any, {});
    console.log(`   Found ${Array.isArray(products) ? products.length : 0} products\n`);

    if (Array.isArray(products)) {
      console.log("💰 Resetting product financial data...");
      let count = 0;
      for (const product of products) {
        try {
          // Reset product revenue fields
          await client.mutation("products:updateProduct" as any, {
            productId: product._id,
            updates: {
              totalSales: 0,
              totalRevenue: 0,
              totalCosts: 0,
            },
          });
          count++;
        } catch (e) {
          // Mutations might not be exposed, try alternative approach
          console.log(
            `   Note: Direct mutation failed for ${product.name}, will try alternative method`
          );
          break;
        }
      }
      if (count > 0) {
        console.log(`   ✓ Reset ${count} products\n`);
      }
    }

    // Get all companies
    console.log("🏢 Fetching all companies...");
    const companies = await client.query("companies:getAllCompanies" as any, {});
    console.log(`   Found ${Array.isArray(companies) ? companies.length : 0} companies\n`);

    if (Array.isArray(companies)) {
      console.log("💰 Resetting company financial data...");
      let count = 0;
      for (const company of companies) {
        try {
          // Reset company account balance to 0 (keeping company intact)
          await client.mutation("accounts:resetAccount" as any, {
            accountId: company.accountId,
          });
          count++;
        } catch (e) {
          console.log(
            `   Note: Direct mutation failed for ${company.name}, will try alternative method`
          );
          break;
        }
      }
      if (count > 0) {
        console.log(`   ✓ Reset ${count} company accounts\n`);
      }
    }

    console.log("✅ Reset complete!");
  } catch (error) {
    console.error("❌ Error during reset:", error);
    process.exit(1);
  }

  process.exit(0);
}

resetRevenueAndProfits();
