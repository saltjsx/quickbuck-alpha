/**
 * Initialize Resources Script
 * 
 * Creates the default resources in the database.
 * Run this once after deploying the resource schema.
 * 
 * Usage: npm run init-resources
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || "";

if (!CONVEX_URL) {
  console.error("Error: VITE_CONVEX_URL not found in environment");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function initResources() {
  console.log("Initializing resources...");
  console.log(`Convex URL: ${CONVEX_URL}`);
  
  try {
    const result = await client.mutation(api.resources.initializeResources, {});
    
    console.log("\n✓ Resources initialized successfully!");
    console.log(`  Created ${result.resourceIds.length} resources`);
    console.log("\nResource Categories:");
    console.log("  - Raw Materials: Steel, Plastic, Silicon, Copper, Aluminum, Wheat, Cotton, Rubber, Lithium, Glass");
    console.log("  - Components: Microchip, Battery, Display Panel, Circuit Board, Motor");
    console.log("  - Energy: Electricity, Natural Gas, Oil");
    console.log("\nResources are ready for use in production!");
    
  } catch (error: any) {
    console.error("\n✗ Failed to initialize resources");
    console.error(`  Error: ${error.message || error}`);
    
    if (error.message?.includes("already initialized")) {
      console.log("\n  Resources have already been initialized.");
      console.log("  No action needed.");
    } else {
      process.exit(1);
    }
  }
}

initResources();
