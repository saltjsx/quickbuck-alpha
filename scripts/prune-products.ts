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

  console.log("\n🔄 Fetching products from Convex...");
  
  // Initialize Convex client
  const client = new ConvexHttpClient(convexUrl);
  
  // Fetch all products (use high limit to get everything)
  const products = await client.query(api.leaderboard.getAllProducts, { limit: 10000 });
  
  if (!products || products.length === 0) {
    console.log("✅ No products found in the database");
    rl.close();
    process.exit(0);
  }

  console.log(`📊 Found ${products.length} products`);
  
  // Simplify product data to reduce token count
  const simplifiedProducts = products.map((p: any) => ({
    _id: p._id,
    name: p.name,
    description: p.description?.substring(0, 100), // Truncate long descriptions
    tags: p.tags,
    price: p.price,
    companyName: p.companyName,
  }));

  console.log(`📦 Simplified to ${JSON.stringify(simplifiedProducts).length} characters`);
  
  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  console.log("\n🤖 Analyzing products with AI (Gemini 2.0 Flash Lite)...");

  // Process in batches if too many products
  const BATCH_SIZE = 50;
  let allProductsToRemove: Array<{ id: string; name: string; reason: string }> = [];

  for (let i = 0; i < simplifiedProducts.length; i += BATCH_SIZE) {
    const batch = simplifiedProducts.slice(i, i + BATCH_SIZE);
    console.log(`\n🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(simplifiedProducts.length / BATCH_SIZE)} (${batch.length} products)...`);

    try {
      // Call AI to analyze products
      const result = await model.generateContent(`You are a moderator for the game QuickBuck. Review these products and identify ones that are low effort, spam, inappropriate, or not suitable.

Products to review:
${JSON.stringify(batch, null, 2)}

Return ONLY valid JSON in this format (no extra text):
{"productsToRemove": [{"id": "product_id", "name": "product_name", "reason": "brief reason"}]}

If none should be removed, return: {"productsToRemove": []}

Flag products that are:
- Test entries (e.g., "test", "asdf", "qwerty")
- Spam or nonsense names
- Inappropriate content
- Single words with no description

Do not flag products just because they are low quality or have a bad description. Only flag if they are clearly inappropriate or spam.`);

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
        const batchResults = parsed.productsToRemove || [];
        allProductsToRemove.push(...batchResults);
        
        if (batchResults.length > 0) {
          console.log(`   ⚠️  Found ${batchResults.length} problematic products in this batch`);
        } else {
          console.log(`   ✅ No issues found in this batch`);
        }
      } catch (parseError) {
        console.warn(`   ⚠️  Warning: Couldn't parse batch ${Math.floor(i / BATCH_SIZE) + 1} response`);
        console.log("   Error:", parseError);
        console.log("   Raw response (first 500 chars):", text.substring(0, 500));
      }
      
      // Add a small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < simplifiedProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.warn(`   ⚠️  Warning: Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}, skipping...`);
      console.log("   Error:", error);
    }
  }

  const productsToRemove = allProductsToRemove;

    if (productsToRemove.length === 0) {
      console.log("\n✅ No products need to be removed");
      rl.close();
      process.exit(0);
    }

    console.log(`\n⚠️  The AI has identified ${productsToRemove.length} products to remove:\n`);
    
    productsToRemove.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.id})`);
      console.log(`   Reason: ${product.reason}\n`);
    });

    // Ask for confirmation
    const confirmation = await question("Do you want to proceed with removing these products? (yes/no): ");

    if (confirmation.toLowerCase() !== "yes" && confirmation.toLowerCase() !== "y") {
      console.log("\n❌ Operation cancelled");
      rl.close();
      process.exit(0);
    }

    console.log("\n🗑️  Removing products...");

    // Prepare product IDs for deletion
    const productIds = productsToRemove.map(p => p.id as any);

    try {
      // Remove products using admin mutation
      const results = await client.mutation(api.products.adminDeleteProducts, { 
        productIds,
        adminKey: adminKey.trim(),
      });

      // Display results
      for (const result of results) {
        const product = productsToRemove.find(p => p.id === result.productId);
        if (result.success) {
          console.log(`✅ Removed: ${product?.name}`);
        } else {
          console.error(`❌ Failed to remove ${product?.name}: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("\n❌ Error removing products:", error);
      rl.close();
      process.exit(1);
    }

    console.log("\n✅ Pruning complete!");
  rl.close();
}

main();
