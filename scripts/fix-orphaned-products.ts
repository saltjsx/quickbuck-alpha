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
  // Get Convex deployment URL
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    console.error("❌ VITE_CONVEX_URL environment variable is not set");
    rl.close();
    process.exit(1);
  }

  console.log("\n🔍 Checking for orphaned products...");
  
  // Initialize Convex client
  const client = new ConvexHttpClient(convexUrl);
  
  try {
    // Find orphaned products
    const result = await client.query(api.debug.findOrphanedProducts, {});
    
    console.log(`\n📊 Scan Results:`);
    console.log(`   Total active products: ${result.total}`);
    console.log(`   Orphaned products: ${result.orphaned}`);
    
    if (result.orphaned === 0) {
      console.log("\n✅ No orphaned products found! Marketplace should be working correctly.");
      rl.close();
      process.exit(0);
    }
    
    console.log(`\n⚠️  Found ${result.orphaned} orphaned products:\n`);
    
    result.orphanedProducts.forEach((product: any, index: number) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Product ID: ${product._id}`);
      console.log(`   Missing Company ID: ${product.companyId}`);
      console.log(`   Price: $${product.price.toLocaleString()}`);
      console.log(`   Created: ${new Date(product.createdAt).toLocaleString()}\n`);
    });
    
    // Ask for confirmation
    const confirmation = await question("Do you want to deactivate these orphaned products? (yes/no): ");
    
    if (confirmation.toLowerCase() !== "yes" && confirmation.toLowerCase() !== "y") {
      console.log("\n❌ Operation cancelled");
      rl.close();
      process.exit(0);
    }
    
    // Get Admin key for Convex mutations
    const adminKey = await question("Enter your Convex admin key: ");
    
    if (!adminKey.trim()) {
      console.error("❌ Admin key is required");
      rl.close();
      process.exit(1);
    }
    
    console.log("\n🔧 Fixing orphaned products...");
    
    // Fix orphaned products
    const fixResult = await client.mutation(api.debug.fixOrphanedProducts, {
      adminKey: adminKey.trim(),
    });
    
    console.log(`\n✅ Fixed ${fixResult.fixed} orphaned products:`);
    fixResult.fixedProducts.forEach((product: any) => {
      console.log(`   ✓ Deactivated: ${product.name} (${product._id})`);
    });
    
    console.log("\n✅ Orphaned products have been deactivated!");
    console.log("   The marketplace should now display correctly.");
    
  } catch (error) {
    console.error("\n❌ Error:", error);
    rl.close();
    process.exit(1);
  }
  
  rl.close();
}

main();
