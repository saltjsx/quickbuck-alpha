#!/usr/bin/env tsx

import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as readline from "readline";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify question function
function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  // Get Admin key for Convex mutations
  const adminKey = await question("Enter your Convex admin key: ");
  
  if (!adminKey.trim()) {
    console.error("❌ Admin key is required");
    rl.close();
    process.exit(1);
  }

  // Get Convex deployment URL
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    console.error("❌ VITE_CONVEX_URL environment variable is not set");
    rl.close();
    process.exit(1);
  }

  // Initialize Convex client
  const client = new ConvexHttpClient(convexUrl);

  console.log("\n🤖 QuickBuck Bot Purchase Tool");
  console.log("═".repeat(50));

  // Main loop for continuous purchases
  while (true) {
    console.log("\n");

    // Get product ID
    const productIdInput = await question("Enter product ID (or 'list' to see products, 'exit' to quit): ");
    
    if (productIdInput.toLowerCase() === "exit") {
      console.log("\n👋 Goodbye!");
      rl.close();
      process.exit(0);
    }

    if (productIdInput.toLowerCase() === "list") {
      console.log("\n📦 Fetching active products...");
      try {
        const products = await client.query(api.leaderboard.getAllProducts, { limit: 100 });
        
        if (!products || products.length === 0) {
          console.log("No products found.");
          continue;
        }

        console.log(`\nFound ${products.length} products:\n`);
        products.forEach((p: any, index: number) => {
          const price = typeof p.price === 'number' ? p.price.toFixed(2) : '0.00';
          const sales = p.totalSales || 0;
          console.log(`${index + 1}. ${p.name}`);
          console.log(`   ID: ${p._id}`);
          console.log(`   Company: ${p.companyName || 'Unknown'}`);
          console.log(`   Price: $${price}`);
          console.log(`   Total Sales: ${sales}`);
          console.log();
        });
      } catch (error) {
        console.error("❌ Error fetching products:", error);
      }
      continue;
    }

    if (!productIdInput.trim()) {
      console.log("❌ Product ID is required");
      continue;
    }

    const productId = productIdInput.trim();

    // Get quantity
    const quantityInput = await question("Enter quantity to purchase (1-100,000): ");
    const quantity = parseInt(quantityInput.trim());

    if (isNaN(quantity) || quantity < 1 || quantity > 100000) {
      console.log("❌ Invalid quantity. Must be between 1 and 100,000");
      continue;
    }

    // Confirm purchase
    const confirm = await question(`\n⚠️  Purchase ${quantity} units of product ${productId}? (yes/no): `);
    
    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("❌ Purchase cancelled");
      continue;
    }

    console.log("\n💳 Processing purchase...");

    try {
      // Call the admin purchase mutation
      const result = await client.mutation(api.products.adminAIPurchase, { 
        purchases: [{ productId: productId as any, quantity }],
        adminKey: adminKey.trim(),
      });

      console.log("\n✅ Purchase complete!");
      console.log(`   Total spent: $${result.totalSpent.toLocaleString()}`);
      console.log(`   Products purchased: ${result.productsPurchased}`);
      console.log(`   Total items: ${result.totalItems}`);
      console.log(`   Companies affected: ${result.companiesAffected}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log("\n⚠️  Errors:");
        result.errors.forEach((error: string) => {
          console.log(`   - ${error}`);
        });
      }
    } catch (error) {
      console.error("\n❌ Error processing purchase:", error);
    }

    // Ask if user wants to make another purchase
    const another = await question("\n🔄 Make another purchase? (yes/no): ");
    if (another.toLowerCase() !== "yes" && another.toLowerCase() !== "y") {
      console.log("\n👋 Goodbye!");
      rl.close();
      process.exit(0);
    }
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  rl.close();
  process.exit(1);
});
