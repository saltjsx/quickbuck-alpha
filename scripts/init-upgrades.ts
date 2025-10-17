/**
 * Initialize Upgrades
 * 
 * This script initializes the upgrades table with the default upgrade packs.
 * Run this once after deploying the schema changes.
 * 
 * Usage: npx convex run scripts/init-upgrades.ts
 */

import { api } from "../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("CONVEX_URL environment variable not found");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  try {
    console.log("Initializing upgrades...");
    
    const result = await client.mutation(api.upgrades.initializeUpgrades, {});
    
    console.log("Result:", result);
    console.log("✅ Upgrades initialization complete!");
  } catch (error) {
    console.error("❌ Error initializing upgrades:", error);
    process.exit(1);
  }
}

main();
