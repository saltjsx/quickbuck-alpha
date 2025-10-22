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

  console.log("\n🏢 Force Company to Go Public\n");
  
  // Initialize Convex client
  const client = new ConvexHttpClient(convexUrl);
  
  // Get company ticker or ID
  const companyInput = await question("Enter company ticker or ID: ");
  
  if (!companyInput.trim()) {
    console.error("❌ Company ticker or ID is required");
    rl.close();
    process.exit(1);
  }

  // Fetch companies to find the right one
  const companies = await client.query(api.companies.getCompanies);
  
  let targetCompany;
  
  // Try to find by ticker first
  targetCompany = companies.find(
    (c: any) => c.ticker.toUpperCase() === companyInput.trim().toUpperCase()
  );
  
  // If not found, try to find by ID
  if (!targetCompany) {
    targetCompany = companies.find((c: any) => c._id === companyInput.trim());
  }
  
  if (!targetCompany) {
    console.error(`❌ Company not found with ticker or ID: ${companyInput}`);
    rl.close();
    process.exit(1);
  }

  console.log(`\n📋 Company Found:`);
  console.log(`   Name: ${targetCompany.name}`);
  console.log(`   Ticker: ${targetCompany.ticker}`);
  console.log(`   Balance: $${targetCompany.balance.toLocaleString()}`);
  console.log(`   Currently Public: ${targetCompany.isPublic ? "Yes" : "No"}`);
  
  if (targetCompany.isPublic) {
    console.log(`   Current Share Price: $${targetCompany.sharePrice.toFixed(4)}`);
    console.log(`\n⚠️  This company is already public!`);
    const proceed = await question("Do you want to re-initialize it? (yes/no): ");
    
    if (proceed.toLowerCase() !== "yes" && proceed.toLowerCase() !== "y") {
      console.log("\n❌ Operation cancelled");
      rl.close();
      process.exit(0);
    }
  }

  // Get Admin key
  const adminKey = await question("\nEnter your Convex admin key: ");
  
  if (!adminKey.trim()) {
    console.error("❌ Admin key is required");
    rl.close();
    process.exit(1);
  }

  console.log("\n🔄 Making company public...");

  try {
    const result = await client.mutation(api.companies.forceCompanyPublic, {
      companyId: targetCompany._id,
      adminKey: adminKey.trim(),
    });

    if (result.alreadyPublic) {
      console.log(`\nℹ️  ${result.message}`);
      console.log(`   Share Price: $${result.sharePrice.toFixed(4)}`);
      console.log(`   Balance: $${result.balance.toLocaleString()}`);
    } else if (result.success) {
      console.log(`\n✅ ${result.message}`);
      console.log(`   Company: ${result.name} (${result.ticker})`);
      console.log(`   IPO Price: $${result.ipoPrice.toFixed(4)}`);
      console.log(`   Balance: $${result.balance.toLocaleString()}`);
      console.log(`\n🎉 The company is now listed on the stock market!`);
    }
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

main();
