#!/usr/bin/env tsx

import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import * as readline from "readline";

// Load environment variables
config({ path: ".env.local" });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function warnUserCLI(client: ConvexHttpClient, adminKey: string) {
  console.log("\n📋 WARN USER");
  console.log("================\n");

  const playerId = await question("Enter player ID: ");
  if (!playerId.trim()) {
    console.log("❌ Player ID is required");
    return;
  }

  const reason = await question("Enter warning reason: ");
  if (!reason.trim()) {
    console.log("❌ Reason is required");
    return;
  }

  try {
    const result = await (client as any).mutation("moderation:warnUser", {
      userId: playerId as any,
      reason: reason.trim(),
      adminKey,
    });

    console.log("\n✅ Warning issued successfully!");
    console.log(`   User: ${result.userName}`);
    console.log(`   Reason: ${result.reason}`);
    console.log(`   Warning ID: ${result.warningId}`);
    console.log("\n   Next time they log in, they'll see a popup with this warning.");
  } catch (error: any) {
    console.error("\n❌ Error issuing warning:", error.message);
  }
}

async function banUserCLI(client: ConvexHttpClient, adminKey: string) {
  console.log("\n🚫 BAN USER");
  console.log("=============\n");

  const playerId = await question("Enter player ID: ");
  if (!playerId.trim()) {
    console.log("❌ Player ID is required");
    return;
  }

  const reason = await question("Enter ban reason: ");
  if (!reason.trim()) {
    console.log("❌ Reason is required");
    return;
  }

  const confirmation = await question(
    "\n⚠️  This will DELETE all companies, products, and data for this user.\nType 'yes' to confirm: "
  );

  if (confirmation !== "yes") {
    console.log("❌ Ban cancelled");
    return;
  }

  try {
    const result = await (client as any).mutation("moderation:banUser", {
      userId: playerId as any,
      reason: reason.trim(),
      adminKey,
    });

    console.log("\n✅ User banned successfully!");
    console.log(`   User: ${result.userName}`);
    console.log(`   Email: ${result.email}`);
    console.log(`   Reason: ${result.reason}`);
    console.log(`   Ban ID: ${result.banId}`);
    console.log(`\n   Cleaned up:`);
    console.log(`   • Companies deleted: ${result.companiesDeleted}`);
    console.log(`   • Products deleted: ${result.productsDeleted}`);
    console.log(`   • Accounts deleted: ${result.accountsDeleted}`);
    console.log(
      `\n   When they try to access the platform, they'll see a ban screen.`
    );
  } catch (error: any) {
    console.error("\n❌ Error banning user:", error.message);
  }
}

async function checkBanStatus(client: ConvexHttpClient, adminKey: string) {
  console.log("\n🔍 CHECK BAN STATUS");
  console.log("====================\n");

  const email = await question("Enter user email: ");
  if (!email.trim()) {
    console.log("❌ Email is required");
    return;
  }

  try {
    const result = await (client as any).query("moderation:getBanRecord", {
      email: email.trim(),
      adminKey,
    });

    if (result) {
      console.log("\n⛔ USER IS BANNED");
      console.log(`   Email: ${result.email}`);
      console.log(`   Reason: ${result.reason}`);
      console.log(`   Banned at: ${new Date(result.bannedAt).toISOString()}`);
    } else {
      console.log("\n✅ User is NOT banned");
    }
  } catch (error: any) {
    console.error("\n❌ Error checking ban status:", error.message);
  }
}

async function unbanUserCLI(client: ConvexHttpClient, adminKey: string) {
  console.log("\n🔓 UNBAN USER");
  console.log("===============\n");

  const email = await question("Enter user email to unban: ");
  if (!email.trim()) {
    console.log("❌ Email is required");
    return;
  }

  const confirmation = await question(
    `Are you sure you want to unban ${email}? Type 'yes' to confirm: `
  );

  if (confirmation !== "yes") {
    console.log("❌ Unban cancelled");
    return;
  }

  try {
    const result = await (client as any).mutation("moderation:unbanUser", {
      email: email.trim(),
      adminKey,
    });

    console.log("\n✅ User unbanned successfully!");
    console.log(`   Email: ${result.email}`);
    console.log(`   Unbanned at: ${new Date(result.unbannedAt).toISOString()}`);
  } catch (error: any) {
    console.error("\n❌ Error unbanning user:", error.message);
  }
}

async function viewWarnings(client: ConvexHttpClient, adminKey: string) {
  console.log("\n📜 VIEW USER WARNINGS");
  console.log("======================\n");

  const playerId = await question("Enter player ID: ");
  if (!playerId.trim()) {
    console.log("❌ Player ID is required");
    return;
  }

  try {
    const result = await (client as any).query("moderation:getUserWarnings", {
      userId: playerId as any,
      adminKey,
    });

    if (result.length === 0) {
      console.log("\n✅ No warnings on record");
      return;
    }

    console.log(`\n📋 ${result.length} warning(s) on record:\n`);
    result.forEach((warning: any, index: number) => {
      const status = warning.isAcknowledged ? "✓ Acknowledged" : "⚠ Unacknowledged";
      console.log(`${index + 1}. [${status}] ${warning.reason}`);
      console.log(`   Severity: ${warning.severity}`);
      console.log(`   Issued: ${new Date(warning.createdAt).toISOString()}`);
      if (warning.acknowledgedAt) {
        console.log(`   Acknowledged: ${new Date(warning.acknowledgedAt).toISOString()}`);
      }
      console.log();
    });
  } catch (error: any) {
    console.error("\n❌ Error retrieving warnings:", error.message);
  }
}

async function main() {
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    console.error("❌ VITE_CONVEX_URL environment variable is not set");
    rl.close();
    process.exit(1);
  }

  const adminKey = await question(
    "Enter your Convex admin key (or press Enter to use ADMIN_KEY env var): "
  );
  const finalAdminKey = adminKey.trim() || process.env.ADMIN_KEY;

  if (!finalAdminKey) {
    console.error(
      "❌ Admin key is required. Set ADMIN_KEY env var or provide it when prompted."
    );
    rl.close();
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);

  let running = true;
  while (running) {
    console.log("\n🎛️  QUICKBUCK MODERATION CLI");
    console.log("==============================");
    console.log("1. Warn user");
    console.log("2. Ban user");
    console.log("3. Check ban status");
    console.log("4. Unban user");
    console.log("5. View user warnings");
    console.log("6. Exit\n");

    const choice = await question("Select an option (1-6): ");

    switch (choice) {
      case "1":
        await warnUserCLI(client, finalAdminKey);
        break;
      case "2":
        await banUserCLI(client, finalAdminKey);
        break;
      case "3":
        await checkBanStatus(client, finalAdminKey);
        break;
      case "4":
        await unbanUserCLI(client, finalAdminKey);
        break;
      case "5":
        await viewWarnings(client, finalAdminKey);
        break;
      case "6":
        running = false;
        break;
      default:
        console.log("❌ Invalid option");
    }
  }

  console.log("\n✅ Goodbye!");
  rl.close();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  rl.close();
  process.exit(1);
});
