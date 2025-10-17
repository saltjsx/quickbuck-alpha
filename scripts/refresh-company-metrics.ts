// Script to manually refresh company metrics cache
// Usage: tsx scripts/refresh-company-metrics.ts <companyId>

import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const DEPLOYMENT_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;

if (!DEPLOYMENT_URL) {
  console.error("❌ Error: CONVEX_URL or VITE_CONVEX_URL environment variable not set");
  console.log("\nPlease set it in your .env.local file:");
  console.log('CONVEX_URL="https://your-deployment.convex.cloud"');
  process.exit(1);
}

const companyIdArg = process.argv[2];

if (!companyIdArg) {
  console.error("❌ Error: Missing company ID argument");
  console.log("\nUsage: tsx scripts/refresh-company-metrics.ts <companyId>");
  console.log("Example: tsx scripts/refresh-company-metrics.ts jh74k5q3r5m8t9n2p0w6x1y2z3a4b5c6");
  process.exit(1);
}

const client = new ConvexHttpClient(DEPLOYMENT_URL);

async function refreshMetrics() {
  console.log(`🔄 Refreshing metrics for company: ${companyIdArg}`);
  console.log(`📡 Connected to: ${DEPLOYMENT_URL}\n`);

  try {
    // Use the internal mutation to update company metrics
    // Note: This will only work if the deployment allows unauthenticated internal mutations
    // or if you have admin access configured
    
    console.log("⚠️  Note: This script needs to be run through the Convex dashboard or with admin access.");
    console.log("\nAlternative methods:");
    console.log("1. Wait for the next cron job (runs every 30 minutes)");
    console.log("2. Run this in the Convex dashboard Functions tab:");
    console.log(`   internal.companies.updateCompanyMetrics({ companyId: "${companyIdArg}" })`);
    console.log("\n3. Or manually trigger the cron from the Convex dashboard.");
    
  } catch (error) {
    console.error("❌ Error refreshing metrics:", error);
    process.exit(1);
  }
}

refreshMetrics();
