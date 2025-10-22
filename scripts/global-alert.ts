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

  try {
    // Get title from user
    const title = await question("\n📢 Alert Title: ");
    
    if (!title.trim()) {
      console.error("❌ Title is required");
      rl.close();
      process.exit(1);
    }

    // Get description from user
    console.log("\n📝 Description (supports markdown: **bold**, *italic*, __underline__):");
    console.log("   (Press Enter twice to finish)");
    
    let description = "";
    let emptyLineCount = 0;
    
    while (true) {
      const line = await question("   ");
      
      if (line === "") {
        emptyLineCount++;
        if (emptyLineCount >= 2) {
          break;
        }
        description += "\n";
      } else {
        emptyLineCount = 0;
        description += line + "\n";
      }
    }

    description = description.trim();

    if (!description) {
      console.error("❌ Description is required");
      rl.close();
      process.exit(1);
    }

    // Show preview
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("ℹ️  PREVIEW");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Title: ${title}`);
    console.log(`Description:\n${description}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Confirm before sending
    const confirm = await question("Send this alert to all users? (yes/no): ");

    if (confirm.toLowerCase() !== "yes") {
      console.log("❌ Alert cancelled");
      rl.close();
      process.exit(0);
    }

    console.log("\n🚀 Sending global alert...");

    // Initialize Convex client
    const client = new ConvexHttpClient(convexUrl);
    
    // Send alert
    const result = await client.mutation(api.globalAlerts.sendAlert, {
      title: title.trim(),
      description: description,
    });

    console.log("✅ Alert sent successfully!");
    console.log(`   Alert ID: ${result.alertId}`);
    console.log("   All users will see this alert once");

  } catch (error) {
    console.error("\n❌ Error sending alert:", error);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

main();
