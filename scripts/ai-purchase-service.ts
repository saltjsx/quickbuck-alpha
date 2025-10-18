#!/usr/bin/env tsx

/**
 * AI-Powered Product Purchase Service
 * 
 * This service uses Google's Gemini 2.5 Flash Lite to make intelligent purchasing
 * decisions for products in the QuickBuck marketplace. It runs every 20 minutes
 * via a cron job and processes products in batches of 50 to avoid context window overload.
 * 
 * AI Instructions:
 * - Act like the general public making purchasing decisions
 * - Minimum spend: $1M per batch
 * - Give every product a chance
 * - Avoid spam and low-quality products
 * - Buy based on needs of the general public and other companies
 * - Consider product quality, price, and usefulness
 */

import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
config({ path: ".env.local" });

const BATCH_SIZE = 50;
const MIN_SPEND_PER_BATCH = 1000000; // $1M minimum per batch
const ADMIN_KEY = process.env.ADMIN_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CONVEX_URL = process.env.VITE_CONVEX_URL;

// Initialize clients
if (!CONVEX_URL) {
  console.error("❌ VITE_CONVEX_URL not set in environment");
  process.exit(1);
}

if (!ADMIN_KEY) {
  console.error("❌ ADMIN_KEY not set in environment");
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY not set in environment");
  process.exit(1);
}

const convexClient = new ConvexHttpClient(CONVEX_URL);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  companyName: string;
  companyTicker?: string;
  quality: number | undefined;
  totalSales: number;
  tags: string[];
}

interface AIPurchaseDecision {
  productId: string;
  quantity: number;
  reasoning: string;
}

interface BatchResult {
  batchNumber: number;
  productsProcessed: number;
  totalSpent: number;
  totalItems: number;
  productsPurchased: number;
  companiesAffected: number;
  errors?: string[];
}

/**
 * Fetch all active products from the marketplace
 */
async function fetchProducts(): Promise<Product[]> {
  try {
    console.log("📦 Fetching active products from marketplace...");
    const products = await convexClient.query(api.products.getActiveProducts, {});
    console.log(`✅ Found ${products.length} active products`);
    return products;
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    throw error;
  }
}

/**
 * Split products into batches
 */
function createBatches(products: Product[], batchSize: number): Product[][] {
  const batches: Product[][] = [];
  for (let i = 0; i < products.length; i += batchSize) {
    batches.push(products.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Get AI purchasing decisions for a batch of products
 */
async function getAIPurchaseDecisions(
  batch: Product[],
  batchNumber: number,
  totalBatches: number
): Promise<AIPurchaseDecision[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const prompt = `You are an AI representing the general public's purchasing decisions in a marketplace simulation called QuickBuck.

Your role is to make realistic purchasing decisions for ${batch.length} products based on what the general public and businesses would actually buy.

CRITICAL REQUIREMENTS:
1. You MUST spend a MINIMUM of $${MIN_SPEND_PER_BATCH.toLocaleString()} on this batch
2. Give EVERY product a chance - buy at least a small quantity of most products
3. Act like the general public - prioritize useful, quality products that meet real needs
4. Avoid spam, low-quality products, or items that seem suspicious
5. Consider what real consumers and businesses would need

PURCHASING GUIDELINES:
- High-quality products (90-100 quality): Buy more generously
- Medium-quality products (70-89 quality): Buy moderately
- Low-quality products (50-69 quality): Buy sparingly
- Very low quality (<50): Buy minimal amounts or skip if spam

REALISTIC BEHAVIOR:
- Essential products (food, software, services): Higher demand
- Luxury items: Lower but steady demand
- Business-to-business products: Moderate professional demand
- Consumer goods: Mix based on usefulness and price
- Cheap items ($1-$100): Can buy in larger quantities
- Mid-range items ($100-$1000): Moderate quantities
- Expensive items ($1000+): Smaller quantities, must be justified

BATCH INFO:
- This is batch ${batchNumber} of ${totalBatches}
- ${batch.length} products to evaluate
- Your minimum budget: $${MIN_SPEND_PER_BATCH.toLocaleString()}

PRODUCTS TO EVALUATE:
${batch.map((p, i) => `
${i + 1}. "${p.name}" by ${p.companyName}
   - ID: ${p._id}
   - Price: $${p.price.toFixed(2)}
   - Quality: ${p.quality ?? 100}/100
   - Description: ${p.description.substring(0, 150)}${p.description.length > 150 ? "..." : ""}
   - Tags: ${p.tags.join(", ")}
   - Total Sales History: ${p.totalSales} units
`).join("\n")}

RESPONSE FORMAT (JSON only, no markdown):
Return a JSON array of purchase decisions. Each decision must have:
{
  "productId": "product ID",
  "quantity": number (1-100 for most items, can be higher for very cheap items),
  "reasoning": "brief explanation (1-2 sentences)"
}

IMPORTANT:
- Return valid JSON array only (no markdown code blocks)
- Ensure total spending reaches at least $${MIN_SPEND_PER_BATCH.toLocaleString()}
- Give most products at least 1-5 units to be fair
- Prioritize quality and usefulness in your decisions
- Be realistic - don't buy 100 units of a $10,000 item unless it makes sense`;

  try {
    console.log(`\n🤖 Asking AI to evaluate batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Clean up response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.substring(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.substring(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    cleanedText = cleanedText.trim();
    
    const decisions: AIPurchaseDecision[] = JSON.parse(cleanedText);
    
    // Calculate total spend
    const totalSpend = decisions.reduce((sum, decision) => {
      const product = batch.find(p => p._id === decision.productId);
      return sum + (product ? product.price * decision.quantity : 0);
    }, 0);
    
    console.log(`✅ AI recommended ${decisions.length} purchases`);
    console.log(`💰 Estimated spend: $${totalSpend.toLocaleString()}`);
    
    // Warn if under minimum
    if (totalSpend < MIN_SPEND_PER_BATCH) {
      console.log(`⚠️  Warning: Spending $${totalSpend.toLocaleString()} is below minimum of $${MIN_SPEND_PER_BATCH.toLocaleString()}`);
    }
    
    return decisions;
  } catch (error) {
    console.error("❌ Error getting AI decisions:", error);
    throw error;
  }
}

/**
 * Execute purchases via Convex mutation
 */
async function executePurchases(
  decisions: AIPurchaseDecision[],
  batchNumber: number
): Promise<BatchResult> {
  try {
    console.log(`\n💳 Executing ${decisions.length} purchases for batch ${batchNumber}...`);
    
    const purchases = decisions.map(d => ({
      productId: d.productId as any,
      quantity: d.quantity,
    }));
    
    const result = await convexClient.mutation(api.products.adminAIPurchase, {
      purchases,
      adminKey: ADMIN_KEY!,
    });
    
    console.log(`✅ Batch ${batchNumber} complete!`);
    console.log(`   - Total spent: $${result.totalSpent.toLocaleString()}`);
    console.log(`   - Products purchased: ${result.productsPurchased}`);
    console.log(`   - Total items: ${result.totalItems}`);
    console.log(`   - Companies affected: ${result.companiesAffected}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`   ⚠️  ${result.errors.length} errors occurred`);
      result.errors.forEach((error: string, i: number) => {
        console.log(`      ${i + 1}. ${error}`);
      });
    }
    
    return {
      batchNumber,
      productsProcessed: decisions.length,
      totalSpent: result.totalSpent,
      totalItems: result.totalItems,
      productsPurchased: result.productsPurchased,
      companiesAffected: result.companiesAffected,
      errors: result.errors,
    };
  } catch (error) {
    console.error(`❌ Error executing batch ${batchNumber}:`, error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function runAIPurchaseService() {
  const startTime = Date.now();
  console.log("\n🚀 AI Purchase Service Starting");
  console.log("═".repeat(60));
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log(`🤖 Model: Gemini 2.5 Flash Lite`);
  console.log(`📦 Batch size: ${BATCH_SIZE} products`);
  console.log(`💰 Min spend per batch: $${MIN_SPEND_PER_BATCH.toLocaleString()}`);
  console.log("═".repeat(60));
  
  try {
    // Fetch all products
    const products = await fetchProducts();
    
    if (products.length === 0) {
      console.log("\n⚠️  No products found. Exiting.");
      return;
    }
    
    // Split into batches
    const batches = createBatches(products, BATCH_SIZE);
    console.log(`\n📊 Split ${products.length} products into ${batches.length} batches`);
    
    // Process each batch
    const results: BatchResult[] = [];
    
    for (let i = 0; i < batches.length; i++) {
      const batchNumber = i + 1;
      const batch = batches[i];
      
      console.log(`\n${"=".repeat(60)}`);
      console.log(`📦 Processing Batch ${batchNumber}/${batches.length}`);
      console.log(`${"=".repeat(60)}`);
      
      try {
        // Get AI decisions
        const decisions = await getAIPurchaseDecisions(batch, batchNumber, batches.length);
        
        // Execute purchases
        const result = await executePurchases(decisions, batchNumber);
        results.push(result);
        
        // Brief delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          console.log("\n⏳ Waiting 2 seconds before next batch...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`\n❌ Failed to process batch ${batchNumber}:`, error);
        results.push({
          batchNumber,
          productsProcessed: 0,
          totalSpent: 0,
          totalItems: 0,
          productsPurchased: 0,
          companiesAffected: 0,
          errors: [`Batch failed: ${error instanceof Error ? error.message : "Unknown error"}`],
        });
      }
    }
    
    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n" + "═".repeat(60));
    console.log("📊 FINAL SUMMARY");
    console.log("═".repeat(60));
    
    const totalSpent = results.reduce((sum, r) => sum + r.totalSpent, 0);
    const totalItems = results.reduce((sum, r) => sum + r.totalItems, 0);
    const totalProductsPurchased = results.reduce((sum, r) => sum + r.productsPurchased, 0);
    const uniqueCompanies = new Set(results.flatMap(r => [r.companiesAffected])).size;
    const totalErrors = results.reduce((sum, r) => sum + (r.errors?.length || 0), 0);
    
    console.log(`✅ Successfully processed ${batches.length} batches`);
    console.log(`💰 Total spent: $${totalSpent.toLocaleString()}`);
    console.log(`📦 Total items purchased: ${totalItems.toLocaleString()}`);
    console.log(`🏷️  Unique products purchased: ${totalProductsPurchased}`);
    console.log(`🏢 Companies affected: ${uniqueCompanies}`);
    console.log(`⏱️  Total time: ${duration}s`);
    
    if (totalErrors > 0) {
      console.log(`⚠️  Total errors: ${totalErrors}`);
    }
    
    console.log("═".repeat(60));
    console.log("✨ AI Purchase Service Complete\n");
    
  } catch (error) {
    console.error("\n❌ Fatal error in AI purchase service:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAIPurchaseService()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { runAIPurchaseService };
