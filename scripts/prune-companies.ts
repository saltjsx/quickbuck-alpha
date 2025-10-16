#!/usr/bin/env tsx

import { config } from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
  // Get Gemini API key
  const apiKey = await question("Enter your Gemini API key: ");
  
  if (!apiKey.trim()) {
    console.error("❌ API key is required");
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

  // Get Convex deployment URL
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    console.error("❌ VITE_CONVEX_URL environment variable is not set");
    rl.close();
    process.exit(1);
  }

  console.log("\n🔄 Fetching companies from Convex...");
  
  // Initialize Convex client
  const client = new ConvexHttpClient(convexUrl);
  
  // Fetch all companies (use high limit to get everything)
  const companies = await client.query(api.leaderboard.getAllCompanies, { limit: 10000 });
  
  if (!companies || companies.length === 0) {
    console.log("✅ No companies found in the database");
    rl.close();
    process.exit(0);
  }

  console.log(`📊 Found ${companies.length} companies`);
  
  // Simplify company data to reduce token count
  const simplifiedCompanies = companies.map((c: any) => ({
    _id: c._id,
    name: c.name,
    description: c.description?.substring(0, 100), // Truncate long descriptions
    tags: c.tags,
    ticker: c.ticker,
    ownerName: c.ownerName,
  }));

  console.log(`📦 Simplified to ${JSON.stringify(simplifiedCompanies).length} characters`);
  
  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  console.log("\n🤖 Analyzing companies with AI (Gemini 2.0 Flash Lite)...");

  // Process in batches if too many companies
  const BATCH_SIZE = 50;
  let allCompaniesToRemove: Array<{ id: string; name: string; reason: string }> = [];

  for (let i = 0; i < simplifiedCompanies.length; i += BATCH_SIZE) {
    const batch = simplifiedCompanies.slice(i, i + BATCH_SIZE);
    console.log(`\n🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(simplifiedCompanies.length / BATCH_SIZE)} (${batch.length} companies)...`);

    try {
      // Call AI to analyze companies
      const result = await model.generateContent(`You are a moderator for the game QuickBuck. Review these companies and identify ones that are spam, inappropriate, or not suitable.

Companies to review:
${JSON.stringify(batch, null, 2)}

Return ONLY valid JSON in this format (no extra text):
{"companiesToRemove": [{"id": "company_id", "name": "company_name", "reason": "brief reason"}]}

If none should be removed, return: {"companiesToRemove": []}

Flag companies that are:
- Test entries (e.g., "test", "asdf", "qwerty")
- Spam
- Inappropriate content
- Single words with no real description`);

      const response = result.response;
      const text = response.text();

      // Parse the JSON response
      try {
        let jsonText = text.trim();
        
        // Remove markdown code blocks if present
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Find the JSON object - look for the first { and last }
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        }
        
        const parsed = JSON.parse(jsonText);
        const batchResults = parsed.companiesToRemove || [];
        allCompaniesToRemove.push(...batchResults);
        
        if (batchResults.length > 0) {
          console.log(`   ⚠️  Found ${batchResults.length} problematic companies in this batch`);
        } else {
          console.log(`   ✅ No issues found in this batch`);
        }
      } catch (parseError) {
        console.warn(`   ⚠️  Warning: Couldn't parse batch ${Math.floor(i / BATCH_SIZE) + 1} response`);
        console.log("   Error:", parseError);
        console.log("   Raw response (first 500 chars):", text.substring(0, 500));
      }
      
      // Add a small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < simplifiedCompanies.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.warn(`   ⚠️  Warning: Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}, skipping...`);
      console.log("   Error:", error);
    }
  }

  const companiesToRemove = allCompaniesToRemove;

  if (companiesToRemove.length === 0) {
    console.log("\n✅ No companies need to be removed");
    rl.close();
    process.exit(0);
  }

  console.log(`\n⚠️  The AI has identified ${companiesToRemove.length} companies to remove:\n`);
  
  companiesToRemove.forEach((company, index) => {
    console.log(`${index + 1}. ${company.name} (${company.id})`);
    console.log(`   Reason: ${company.reason}\n`);
  });

  // Ask for confirmation
  const confirmation = await question("Do you want to proceed with removing these companies? (yes/no): ");

  if (confirmation.toLowerCase() !== "yes" && confirmation.toLowerCase() !== "y") {
    console.log("\n❌ Operation cancelled");
    rl.close();
    process.exit(0);
  }

  console.log("\n🗑️  Removing companies...");

  // Prepare company IDs for deletion
  const companyIds = companiesToRemove.map(c => c.id as any);

  try {
    // Remove companies using admin mutation
    const results = await client.mutation(api.companies.adminDeleteCompanies, { 
      companyIds,
      adminKey: adminKey.trim(),
    });

    // Display results
    for (const result of results) {
      const company = companiesToRemove.find(c => c.id === result.companyId);
      if (result.success) {
        console.log(`✅ Removed: ${company?.name}`);
      } else {
        console.error(`❌ Failed to remove ${company?.name}: ${result.error}`);
      }
    }
  } catch (error) {
    console.error("\n❌ Error removing companies:", error);
    rl.close();
    process.exit(1);
  }

  console.log("\n✅ Pruning complete!");
  rl.close();
}

main();
