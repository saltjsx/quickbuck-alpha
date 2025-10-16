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

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  tags?: string[];
  companyName?: string;
  quality?: number;
  totalSales?: number;
}

interface PurchaseDecision {
  productId: string;
  productName: string;
  quantity: number;
  reasoning: string;
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
  
  // Fetch all products
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
    description: p.description?.substring(0, 150) || "No description",
    price: p.price,
    tags: p.tags || [],
    companyName: p.companyName || "Unknown",
    quality: p.quality || 100,
    totalSales: p.totalSales || 0,
  }));

  console.log(`📦 Prepared ${simplifiedProducts.length} products for AI analysis`);
  
  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  console.log("\n🤖 Analyzing products with AI (Gemini 2.0 Flash Lite)...");
  console.log("💰 The AI has unlimited budget and will purchase every product");
  console.log("📊 Quantities will vary based on market demand...\n");

  // Process in batches if too many products
  const BATCH_SIZE = 50;
  let allPurchaseDecisions: PurchaseDecision[] = [];

  for (let i = 0; i < simplifiedProducts.length; i += BATCH_SIZE) {
    const batch = simplifiedProducts.slice(i, i + BATCH_SIZE);
    console.log(`\n🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(simplifiedProducts.length / BATCH_SIZE)} (${batch.length} products)...`);

    try {
      const prompt = `You are simulating the general consumer market for the game QuickBuck. You have an unlimited budget and MUST purchase EVERY product in the list below, but you should vary the quantities (100-100,000) based on market demand factors:

Consider these factors when determining quantity:
- Product quality (0-100 scale): Higher quality = higher demand
- Price point: Very expensive items (>$1000) might have lower quantities, cheap items (<$100) might have higher quantities
- Product name and description: Creative, useful, or appealing products get more purchases
- Tags: Products with popular or relevant tags get more attention
- Total sales history: Already popular products continue to be popular

Products to purchase:
${JSON.stringify(batch, null, 2)}

Return ONLY valid JSON in this exact format (no extra text, no markdown):
{"purchases": [{"productId": "id", "productName": "name", "quantity": 50, "reasoning": "brief reason"}]}

IMPORTANT:
- You MUST include ALL ${batch.length} products in your response
- Quantity must be between 100 and 100,000
- Consider realistic market demand
- Vary quantities meaningfully - not all products should have the same quantity`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse the JSON response
      try {
        let jsonText = text.trim();
        
        // Remove markdown code blocks if present
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Find the JSON object
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        }
        
        const parsed = JSON.parse(jsonText);
        const batchDecisions = parsed.purchases || [];
        
        // Validate and filter decisions
        const validDecisions = batchDecisions.filter((d: any) => {
          if (!d.productId || !d.quantity) return false;
          if (d.quantity < 1 || d.quantity > 100) return false;
          return batch.some(p => p._id === d.productId);
        });

        allPurchaseDecisions.push(...validDecisions);
        
        console.log(`   ✅ AI decided on quantities for ${validDecisions.length}/${batch.length} products`);
        
        // Show a sample
        if (validDecisions.length > 0) {
          const sample = validDecisions[0];
          console.log(`   📦 Sample: "${sample.productName}" - Quantity: ${sample.quantity}`);
          console.log(`   💭 Reasoning: ${sample.reasoning.substring(0, 80)}...`);
        }
      } catch (parseError) {
        console.warn(`   ⚠️  Warning: Couldn't parse batch ${Math.floor(i / BATCH_SIZE) + 1} response`);
        console.log("   Error:", parseError);
        console.log("   Raw response (first 500 chars):", text.substring(0, 500));
        
        // Fallback: create default purchases for this batch
        console.log("   📦 Using fallback: purchasing 1 of each product in batch");
        const fallbackDecisions = batch.map(p => ({
          productId: p._id,
          productName: p.name,
          quantity: Math.max(1, Math.floor(Math.random() * 20) + 1),
          reasoning: "Fallback purchase due to AI response parsing error"
        }));
        allPurchaseDecisions.push(...fallbackDecisions);
      }
      
      // Add a delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < simplifiedProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.warn(`   ⚠️  Warning: Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}`);
      console.log("   Error:", error);
      
      // Fallback for error
      console.log("   📦 Using fallback: purchasing 1 of each product in batch");
      const fallbackDecisions = batch.map(p => ({
        productId: p._id,
        productName: p.name,
        quantity: Math.max(1, Math.floor(Math.random() * 20) + 1),
        reasoning: "Fallback purchase due to API error"
      }));
      allPurchaseDecisions.push(...fallbackDecisions);
    }
  }

  if (allPurchaseDecisions.length === 0) {
    console.log("\n❌ No purchase decisions were made");
    rl.close();
    process.exit(0);
  }

  console.log(`\n📊 AI Market Analysis Complete!`);
  console.log(`   Total products analyzed: ${products.length}`);
  console.log(`   Purchase decisions made: ${allPurchaseDecisions.length}`);
  
  // Calculate statistics
  const totalQuantity = allPurchaseDecisions.reduce((sum, d) => sum + d.quantity, 0);
  const avgQuantity = (totalQuantity / allPurchaseDecisions.length).toFixed(1);
  const maxQuantity = Math.max(...allPurchaseDecisions.map(d => d.quantity));
  const minQuantity = Math.min(...allPurchaseDecisions.map(d => d.quantity));
  
  console.log(`   Total items to purchase: ${totalQuantity}`);
  console.log(`   Average quantity per product: ${avgQuantity}`);
  console.log(`   Quantity range: ${minQuantity} - ${maxQuantity}`);

  // Show top 10 most demanded products
  const topProducts = [...allPurchaseDecisions]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
  
  console.log(`\n🔥 Top 10 Most Demanded Products:`);
  topProducts.forEach((product, index) => {
    console.log(`${index + 1}. ${product.productName} - Quantity: ${product.quantity}`);
    console.log(`   💭 ${product.reasoning}\n`);
  });

  // Ask for confirmation
  const confirmation = await question("\nDo you want to proceed with these AI-driven purchases? (yes/no): ");

  if (confirmation.toLowerCase() !== "yes" && confirmation.toLowerCase() !== "y") {
    console.log("\n❌ Operation cancelled");
    rl.close();
    process.exit(0);
  }

  console.log("\n💳 Processing AI-driven purchases...");

  try {
    // Call the admin purchase mutation
    const purchaseData = allPurchaseDecisions.map(d => ({
      productId: d.productId,
      quantity: d.quantity,
    }));

    const result = await client.mutation(api.products.adminAIPurchase, { 
      purchases: purchaseData as any,
      adminKey: adminKey.trim(),
    });

    console.log(`\n✅ Purchase complete!`);
    console.log(`   Total spent: $${result.totalSpent.toLocaleString()}`);
    console.log(`   Products purchased: ${result.productsPurchased}`);
    console.log(`   Total items: ${result.totalItems}`);
    console.log(`   Companies benefited: ${result.companiesAffected}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠️  Some purchases had errors:`);
      result.errors.forEach((error: string) => {
        console.log(`   - ${error}`);
      });
    }
  } catch (error) {
    console.error("\n❌ Error processing purchases:", error);
    rl.close();
    process.exit(1);
  }

  console.log("\n✅ AI market simulation complete!");
  rl.close();
}

main();
