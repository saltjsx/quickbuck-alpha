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
const MIN_SPEND_PER_BATCH = 10000000; // $10M minimum per batch (increased for larger purchases)
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
  spendAmount: number; // Amount to spend in dollars instead of quantity
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

  const prompt = `You are an AI representing bulk wholesale buyers in a marketplace simulation called QuickBuck.

Your role is to allocate a $${MIN_SPEND_PER_BATCH.toLocaleString()} budget across ${batch.length} products to maximize value for general public consumers and businesses.

🔴 CRITICAL REQUIREMENT:
YOU MUST ALLOCATE EXACTLY $${MIN_SPEND_PER_BATCH.toLocaleString()} TO THE PRODUCTS BELOW.
Your total spending must equal (not exceed or fall short of) this exact budget.
IF YOUR TOTAL DOESN'T EQUAL $${MIN_SPEND_PER_BATCH.toLocaleString()}, YOUR RESPONSE WILL BE REJECTED.

YOUR MISSION:
- Allocate budget based on product quality and value
- High-quality products get larger budget allocations
- Low-quality products get smaller allocations or are skipped
- Spread across most/all products but weighted by quality
- Buy whatever quantity makes sense at each product's price point
- ENSURE EVERY DOLLAR OF THE BUDGET IS SPENT - NO EXCEPTIONS

BUDGET ALLOCATION BY QUALITY:
Quality 90-100: Allocate 40-50% of your budget to these excellent products
Quality 70-89:  Allocate 25-35% of your budget to these good products
Quality 50-69:  Allocate 10-20% of your budget to these fair products
Quality <50:    Allocate 0-5% of your budget (minimize or skip)

ALLOCATION STRATEGY:
1. Calculate total quality-weighted score for all products
2. Allocate budget proportionally to quality scores
3. High quality items get more of the budget
4. Low quality items get minimal budget
5. Leave no money unspent - allocate the FULL $${MIN_SPEND_PER_BATCH.toLocaleString()}
6. CALCULATION STEPS:
   a. Sum all quality scores: totalScore = sum of all product qualities
   b. For each product: allocation = (quality / totalScore) * $${MIN_SPEND_PER_BATCH.toLocaleString()}
   c. Add all allocations together - verify they equal EXACTLY $${MIN_SPEND_PER_BATCH.toLocaleString()}
   d. If there's rounding error, adjust the largest allocation to make total exact

EXAMPLE LOGIC:
- If there are 5 products total with quality scores [100, 90, 70, 50, 30]
- Total weighted score = 100+90+70+50+30 = 340 points
- Product 1 (100 pts): Gets (100/340 * $${MIN_SPEND_PER_BATCH.toLocaleString()}) = allocate to this
- Product 2 (90 pts): Gets (90/340 * $${MIN_SPEND_PER_BATCH.toLocaleString()}) = allocate to this
- And so on, buying as many units as that budget allows at each product's price

BATCH INFO:
- Batch ${batchNumber} of ${totalBatches}
- ${batch.length} products to evaluate
- Total budget to allocate: $${MIN_SPEND_PER_BATCH.toLocaleString()}

PRODUCTS TO EVALUATE:
${batch.map((p, i) => {
  const priceCategory = p.price < 20 ? '💰 VERY CHEAP' : p.price < 100 ? '💵 CHEAP' : p.price < 500 ? '💳 BUDGET' : '💎 PREMIUM';
  const qualityLevel = (p.quality ?? 100) >= 90 ? '⭐⭐⭐ EXCELLENT' : (p.quality ?? 100) >= 70 ? '⭐⭐ GOOD' : '⭐ FAIR';
  return `${i + 1}. "${p.name}" by ${p.companyName}
   ID: ${p._id}
   Price: $${p.price.toFixed(2)} per unit [${priceCategory}]
   Quality: ${p.quality ?? 100}/100 [${qualityLevel}]
   Description: ${p.description.substring(0, 120)}${p.description.length > 120 ? "..." : ""}
   Tags: ${p.tags.join(", ")}`;
}).join("\n\n")}

RESPONSE FORMAT - MUST BE VALID JSON ARRAY:
[
  {
    "productId": "string (exact ID from list)",
    "spendAmount": number (in dollars, total budget to spend on this product),
    "reasoning": "brief (1 sentence)"
  }
]

CRITICAL REQUIREMENTS FOR YOUR RESPONSE:
1. Return ONLY valid JSON array (no markdown, no text)
2. Every productId must match exactly from the list
3. All spendAmount values must be positive numbers (can be decimals)
4. Calculate: SUM(spendAmount) for all products
5. TOTAL SPENDING MUST EQUAL $${MIN_SPEND_PER_BATCH.toLocaleString()} (not more, not less)
6. Allocate higher budget to higher quality items
7. Allocate minimal or zero budget to low quality items (use 0 if quality too low)
8. Quality should be the primary factor in allocation decisions
9. Do the math carefully - ensure your total equals exactly the target budget
10. Return spendAmount as a number representing dollars, we'll convert to units based on price`;

  try {
    console.log(`\n🤖 Asking AI to evaluate batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);
    console.log(`💰 Target budget allocation: $${MIN_SPEND_PER_BATCH.toLocaleString()}`);
    
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
    let totalSpend = decisions.reduce((sum, decision) => {
      return sum + decision.spendAmount;
    }, 0);
    
    console.log(`✅ AI recommended ${decisions.length} purchases`);
    console.log(`💰 Total allocated: $${totalSpend.toLocaleString()}`);
    
    // Log individual allocations for debugging
    console.log(`\n📋 Individual allocations:`);
    decisions.forEach((d, idx) => {
      const product = batch.find((p: Product) => p._id === d.productId);
      if (product) {
        const units = Math.floor(d.spendAmount / product.price);
        console.log(`   ${idx + 1}. ${product.name}: $${d.spendAmount.toLocaleString()} (≈${units} units @ $${product.price}/ea)`);
      }
    });
    
    // If under minimum, scale up all spend amounts proportionally
    if (totalSpend < MIN_SPEND_PER_BATCH) {
      const scale = MIN_SPEND_PER_BATCH / totalSpend;
      console.log(`📈 Scaling budget allocations by ${scale.toFixed(2)}x to meet budget...`);
      
      // Scale all amounts first
      for (const decision of decisions) {
        decision.spendAmount = Math.ceil(decision.spendAmount * scale);
      }
      
      // Recalculate total spend
      totalSpend = decisions.reduce((sum, decision) => {
        return sum + decision.spendAmount;
      }, 0);
      
      console.log(`📊 Scaled total: $${totalSpend.toLocaleString()}`);
      
      // If still under due to rounding, add remainder to the largest allocation
      if (totalSpend < MIN_SPEND_PER_BATCH) {
        const remainder = MIN_SPEND_PER_BATCH - totalSpend;
        const maxDecision = decisions.reduce((max, current) => 
          current.spendAmount > max.spendAmount ? current : max
        );
        maxDecision.spendAmount += remainder;
        totalSpend = MIN_SPEND_PER_BATCH;
        console.log(`✅ Added remainder $${remainder.toLocaleString()} to reach exact target`);
      }
      
      console.log(`✅ Final total: $${totalSpend.toLocaleString()}`);
    }
    
    // Ensure we never exceed the target
    if (totalSpend > MIN_SPEND_PER_BATCH) {
      console.log(`⚠️  Total exceeds budget by $${(totalSpend - MIN_SPEND_PER_BATCH).toLocaleString()}`);
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
  batch: Product[],
  batchNumber: number
): Promise<BatchResult> {
  try {
    console.log(`\n💳 Executing ${decisions.length} purchases for batch ${batchNumber}...`);
    
    const purchases = decisions.map(d => {
      const product = batch.find((p: Product) => p._id === d.productId);
      const quantity = product ? Math.floor(d.spendAmount / product.price) : 0;
      return {
        productId: d.productId as any,
        quantity: Math.max(1, quantity), // Ensure at least 1 unit
      };
    });
    
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
        const result = await executePurchases(decisions, batch, batchNumber);
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
