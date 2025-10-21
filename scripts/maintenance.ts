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

  // Get Admin key for Convex mutations
  const adminKey = await question("Enter your Convex admin key: ");
  
  if (!adminKey.trim()) {
    console.error("❌ Admin key is required");
    rl.close();
    process.exit(1);
  }

  // Get custom maintenance message
  const customMessage = await question(
    "Enter maintenance message (leave blank for default): "
  );

  console.log("\n🔧 Enabling maintenance mode...");

  try {
    // Initialize Convex client
    const client = new ConvexHttpClient(convexUrl);
    
    // Enable maintenance mode
    await client.mutation(api.maintenance.setMaintenanceMode, {
      isActive: true,
      message: customMessage.trim() || "System maintenance in progress",
    });

    console.log("✅ Maintenance mode enabled!");
    console.log("🛑 Users are now seeing the maintenance screen");
    
    console.log("\n📝 Press Enter to disable maintenance mode and restore service...");
    await question("");

    console.log("\n🔄 Disabling maintenance mode...");

    // Disable maintenance mode
    await client.mutation(api.maintenance.setMaintenanceMode, {
      isActive: false,
    });

    console.log("✅ Maintenance mode disabled!");
    console.log("✨ Service is now restored");

  } catch (error) {
    console.error("\n❌ Error during maintenance:", error);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

main();
