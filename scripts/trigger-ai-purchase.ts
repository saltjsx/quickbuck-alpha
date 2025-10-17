#!/usr/bin/env tsx

/**
 * Trigger AI Purchase Service
 * 
 * This script triggers the AI purchase service by calling the HTTP action endpoint.
 * Useful for manual testing and debugging.
 */

import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const CONVEX_URL = process.env.VITE_CONVEX_URL;
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!CONVEX_URL) {
  console.error("❌ VITE_CONVEX_URL not set in environment");
  process.exit(1);
}

if (!ADMIN_KEY) {
  console.error("❌ ADMIN_KEY not set in environment");
  process.exit(1);
}

// Extract the site URL from the Convex URL
// VITE_CONVEX_URL format: https://[deployment].convex.cloud
const siteUrl = CONVEX_URL.replace(/^https:\/\//, "https://");
const httpEndpoint = `${siteUrl}/api/ai-purchase`;

async function triggerAIPurchase() {
  console.log("\n🚀 Triggering AI Purchase Service");
  console.log("═".repeat(60));
  console.log(`🌐 Endpoint: ${httpEndpoint}`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log("═".repeat(60));

  try {
    const startTime = Date.now();
    
    const response = await fetch(httpEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": ADMIN_KEY!,
      },
      body: JSON.stringify({ adminKey: ADMIN_KEY }),
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ HTTP Error ${response.status}: ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      process.exit(1);
    }

    const result = await response.json();

    console.log("\n✅ AI Purchase Service Complete!");
    console.log("═".repeat(60));
    console.log(`💰 Total spent: $${result.totalSpent?.toLocaleString() || 0}`);
    console.log(`📦 Total items: ${result.totalItems?.toLocaleString() || 0}`);
    console.log(`🏷️  Products purchased: ${result.totalProductsPurchased || 0}`);
    console.log(`📊 Batches processed: ${result.batchesProcessed || 0}`);
    console.log(`🔍 Products evaluated: ${result.productsEvaluated || 0}`);
    console.log(`⏱️  Duration: ${duration}s`);

    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠️  Errors (${result.errors.length}):`);
      result.errors.forEach((error: string, i: number) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    console.log("═".repeat(60));
    console.log("✨ Complete\n");
  } catch (error) {
    console.error("\n❌ Error triggering AI purchase service:", error);
    process.exit(1);
  }
}

triggerAIPurchase();
