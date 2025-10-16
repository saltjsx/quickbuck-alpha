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

  console.log("\n🔍 Checking system accounts configuration...");
  
  // Initialize Convex client
  const client = new ConvexHttpClient(convexUrl);
  
  try {
    const result = await client.mutation(api.debug.fixSystemAccount, { 
      adminKey: adminKey.trim(),
    });

    // Display System Account results
    console.log("\n📦 SYSTEM ACCOUNT (for AI purchases, loans, etc.)");
    if (result.system.created) {
      console.log("   ✅ Created new System account with dedicated system user");
      console.log(`   System User ID: ${result.system.userId}`);
      console.log(`   System Account ID: ${result.system.accountId}`);
    } else if (result.system.fixed) {
      console.log("   ✅ Fixed existing System account");
      console.log(`   Old owner was a player: ${result.system.oldOwnerName || "Unknown"}`);
      console.log(`   New owner: System (dedicated user)`);
      console.log(`   System User ID: ${result.system.userId}`);
      console.log(`   System Account ID: ${result.system.accountId}`);
    } else {
      console.log("   ✅ Already correctly configured");
      console.log(`   System User ID: ${result.system.userId}`);
      console.log(`   System Account ID: ${result.system.accountId}`);
    }

    // Display Casino Account results
    console.log("\n� CASINO RESERVE ACCOUNT (for gambling operations)");
    if (result.casino.created) {
      console.log("   ✅ Created new Casino Reserve account with dedicated casino user");
      console.log(`   Casino User ID: ${result.casino.userId}`);
      console.log(`   Casino Account ID: ${result.casino.accountId}`);
    } else if (result.casino.fixed) {
      console.log("   ✅ Fixed existing Casino Reserve account");
      console.log(`   Old owner was a player: ${result.casino.oldOwnerName || "Unknown"}`);
      console.log(`   New owner: QuickBuck Casino (dedicated user)`);
      console.log(`   Casino User ID: ${result.casino.userId}`);
      console.log(`   Casino Account ID: ${result.casino.accountId}`);
    } else {
      console.log("   ✅ Already correctly configured");
      console.log(`   Casino User ID: ${result.casino.userId}`);
      console.log(`   Casino Account ID: ${result.casino.accountId}`);
    }

    console.log("\n🎉 All system accounts are ready!");
    console.log("   • System account: AI purchases, loans, initial deposits");
    console.log("   • Casino account: Gambling operations (slots, blackjack, roulette, dice)");
  } catch (error) {
    console.error("\n❌ Error fixing system accounts:", error);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

main();
