#!/usr/bin/env tsx

/**
 * AI-Powered Product Purchase Service (v2 - Aggressive Spending)
 * 
 * This service uses Google's Gemini 2.5 Flash Lite to make intelligent purchasing
 * decisions for products in the QuickBuck marketplace. It runs every 20 minutes
 * via a cron job and processes products in batches of 50.
 * 
 * KEY CHANGES IN V2:
 * - Ensures FULL $10M is spent per batch (can go slightly over)
 * - Uses Math.ceil() instead of Math.floor() to round up quantities
 * - Removes minimum quantity restrictions that waste budget
 * - More aggressive spending strategy with higher allocations
 * - Better handling of budget distribution across products
 */

import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
config({ path: ".env.local" });

const BATCH_SIZE = 50;
const TARGET_SPEND_PER_BATCH = 10000000; // $10M target per batch
const MAX_OVERSPEND = 1000000; // Allow up to $1M overspend (10% buffer)
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
 * Returns aggressive allocations that ensure full budget spend
 */
async function getAIPurchaseDecisions(
  batch: Product[],
  batchNumber: number,
  totalBatches: number
): Promise<AIPurchaseDecision[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const prompt = `You are an AI representing aggressive bulk wholesale buyers in QuickBuck marketplace.

YOUR MISSION: Allocate AT LEAST $${TARGET_SPEND_PER_BATCH.toLocaleString()} across ${batch.length} products.

🔴 CRITICAL SPENDING RULES:
1. You MUST allocate AT LEAST $${TARGET_SPEND_PER_BATCH.toLocaleString()} total
2. Going OVER the budget by up to 10% is ENCOURAGED (better to overspend than underspend)
3. Allocate aggressively - these are wholesale bulk purchases
4. Quality-weighted distribution - higher quality gets exponentially more budget
5. Even low-quality products should get some allocation (diversity is good)

ALLOCATION STRATEGY:
- Quality 90-100 (EXCELLENT): 50-70% of total budget (buy in BULK)
- Quality 70-89 (GOOD): 25-40% of total budget (substantial purchases)
- Quality 50-69 (FAIR): 10-20% of total budget (moderate purchases)
- Quality <50 (POOR): 5-10% of total budget (small trial purchases)

CALCULATION METHOD:
1. Calculate quality weight for each product: weight = quality² (square for exponential scaling)
2. Sum all weights: totalWeight = Σ(quality²)
3. Base allocation: baseAllocation = (quality² / totalWeight) × $${TARGET_SPEND_PER_BATCH.toLocaleString()}
4. Add 15% bonus to all allocations to ensure we hit/exceed target
5. Round UP dollar amounts to avoid losing pennies

EXAMPLE:
- Product A (quality 100): weight = 10,000
- Product B (quality 80): weight = 6,400  
- Product C (quality 50): weight = 2,500
- Total weight = 18,900
- Product A gets: (10,000/18,900) × $10M × 1.15 = $6.08M
- Product B gets: (6,400/18,900) × $10M × 1.15 = $3.89M
- Product C gets: (2,500/18,900) × $10M × 1.15 = $1.52M
- TOTAL = $11.49M (15% over target - PERFECT!)

BATCH INFO:
- Batch ${batchNumber} of ${totalBatches}
- ${batch.length} products to evaluate
- Minimum target spend: $${TARGET_SPEND_PER_BATCH.toLocaleString()}
- Maximum spend: $${(TARGET_SPEND_PER_BATCH + MAX_OVERSPEND).toLocaleString()}

PRODUCTS TO EVALUATE:
${batch.map((p, i) => {
  const quality = p.quality ?? 100;
  const weight = quality * quality;
  const priceCategory = p.price < 20 ? '💰 VERY CHEAP' : p.price < 100 ? '💵 CHEAP' : p.price < 500 ? '💳 BUDGET' : '💎 PREMIUM';
  const qualityLevel = quality >= 90 ? '⭐⭐⭐ EXCELLENT' : quality >= 70 ? '⭐⭐ GOOD' : quality >= 50 ? '⭐ FAIR' : '💩 POOR';
  return `${i + 1}. "${p.name}" by ${p.companyName}
   ID: ${p._id}
   Price: $${p.price.toFixed(2)}/unit [${priceCategory}]
   Quality: ${quality}/100 [${qualityLevel}] → Weight: ${weight.toLocaleString()}
   Description: ${p.description.substring(0, 100)}${p.description.length > 100 ? "..." : ""}
   Tags: ${p.tags.join(", ")}`;
}).join("\n\n")}

RESPONSE FORMAT (JSON ARRAY ONLY):
[
  {
    "productId": "exact_id_from_list",
    "spendAmount": 500000.00,
    "reasoning": "One sentence max"
  }
]

VALIDATION CHECKLIST:
✅ Every productId matches the list exactly
✅ All spendAmount values are positive numbers
✅ Total spending is AT LEAST $${TARGET_SPEND_PER_BATCH.toLocaleString()}
✅ Total spending is LESS THAN $${(TARGET_SPEND_PER_BATCH + MAX_OVERSPEND).toLocaleString()}
✅ Higher quality products get exponentially more budget
✅ Every product gets SOME allocation (even if small)
✅ Response is valid JSON array (no markdown, no commentary)

REMEMBER: It's better to OVERSPEND than UNDERSPEND. Be AGGRESSIVE!`;

  try {
    console.log(`\n🤖 Asking AI for aggressive budget allocation for batch ${batchNumber}/${totalBatches}...`);
    console.log(`💰 Target spend: $${TARGET_SPEND_PER_BATCH.toLocaleString()} (up to $${(TARGET_SPEND_PER_BATCH + MAX_OVERSPEND).toLocaleString()} allowed)`);
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();
    
    // Clean markdown code blocks
    if (text.startsWith("```json")) text = text.substring(7);
    else if (text.startsWith("```")) text = text.substring(3);
    if (text.endsWith("```")) text = text.substring(0, text.length - 3);
    text = text.trim();
    
    const decisions: AIPurchaseDecision[] = JSON.parse(text);
    
    // Calculate total spend
    const totalSpend = decisions.reduce((sum, d) => sum + d.spendAmount, 0);
    
    console.log(`✅ AI allocated $${totalSpend.toLocaleString()} across ${decisions.length} products`);
    
    // If AI is conservative, force aggressive scaling
    if (totalSpend < TARGET_SPEND_PER_BATCH) {
      const shortfall = TARGET_SPEND_PER_BATCH - totalSpend;
      const scaleFactor = (TARGET_SPEND_PER_BATCH * 1.05) / totalSpend; // Scale to 105% of target
      
      console.log(`📈 AI was too conservative! Scaling by ${scaleFactor.toFixed(2)}x to meet target...`);
      
      for (const decision of decisions) {
        decision.spendAmount = Math.ceil(decision.spendAmount * scaleFactor);
      }
      
      const newTotal = decisions.reduce((sum, d) => sum + d.spendAmount, 0);
      console.log(`✅ Scaled total: $${newTotal.toLocaleString()} (was $${totalSpend.toLocaleString()})`);
    }
    
    // Log allocations
    console.log(`\n📋 Budget allocations:`);
    const sortedDecisions = [...decisions].sort((a, b) => b.spendAmount - a.spendAmount);
    sortedDecisions.slice(0, 10).forEach((d, idx) => {
      const product = batch.find(p => p._id === d.productId);
      if (product) {
        const units = Math.ceil(d.spendAmount / product.price);
        const percentage = ((d.spendAmount / TARGET_SPEND_PER_BATCH) * 100).toFixed(1);
        console.log(`   ${idx + 1}. ${product.name.substring(0, 30)}: $${d.spendAmount.toLocaleString()} (${percentage}%) → ${units} units`);
      }
    });
    if (decisions.length > 10) {
      console.log(`   ... and ${decisions.length - 10} more products`);
    }
    
    const finalTotal = decisions.reduce((sum, d) => sum + d.spendAmount, 0);
    console.log(`\n💰 Final allocated budget: $${finalTotal.toLocaleString()}`);
    
    return decisions;
  } catch (error) {
    console.error("❌ Error getting AI decisions:", error);
    throw error;
  }
}

/**
 * Execute purchases via Convex mutation
 * Uses Math.ceil() to round UP quantities, ensuring we spend the full budget
 */
async function executePurchases(
  decisions: AIPurchaseDecision[],
  batch: Product[],
  batchNumber: number
): Promise<BatchResult> {
  try {
    console.log(`\n💳 Executing ${decisions.length} purchases for batch ${batchNumber}...`);
    
    const purchases = decisions.map(d => {
      const product = batch.find(p => p._id === d.productId);
      if (!product) {
        console.warn(`⚠️ Product ${d.productId} not found in batch`);
        return null;
      }
      
      // Calculate quantity by rounding UP to ensure we spend at least the allocated amount
      // This allows us to slightly exceed the budget, which is acceptable
      const exactQuantity = d.spendAmount / product.price;
      const quantity = Math.ceil(exactQuantity); // Round UP to spend more if needed
      const actualSpend = quantity * product.price;
      
      // Log if we're spending significantly more than allocated
      if (actualSpend > d.spendAmount * 1.1) {
        console.log(`   📈 ${product.name}: Buying ${quantity} units ($${actualSpend.toLocaleString()}) - exceeded allocation by $${(actualSpend - d.spendAmount).toLocaleString()}`);
      }
      
      return {
        productId: d.productId as any,
        quantity: quantity,
      };
    }).filter(p => p !== null);
    
    // Calculate expected total spend before execution
    const expectedSpend = purchases.reduce((sum, p) => {
      if (!p) return sum;
      const product = batch.find(prod => prod._id === p.productId);
      return sum + (product ? product.price * p.quantity : 0);
    }, 0);
    
    console.log(`💰 Expected spend: $${expectedSpend.toLocaleString()}`);
    
    const result = await convexClient.mutation(api.products.adminAIPurchase, {
      purchases: purchases as any,
      adminKey: ADMIN_KEY!,
    });
    
    console.log(`✅ Batch ${batchNumber} complete!`);
    console.log(`   - Actual spent: $${result.totalSpent.toLocaleString()}`);
    console.log(`   - Products purchased: ${result.productsPurchased}`);
    console.log(`   - Total items: ${result.totalItems.toLocaleString()}`);
    console.log(`   - Companies affected: ${result.companiesAffected}`);
    
    // Check if we hit our target
    const percentOfTarget = (result.totalSpent / TARGET_SPEND_PER_BATCH) * 100;
    if (percentOfTarget < 95) {
      console.log(`   ⚠️ WARNING: Only spent ${percentOfTarget.toFixed(1)}% of target!`);
    } else if (percentOfTarget > 110) {
      console.log(`   💰 Exceeded target by ${(percentOfTarget - 100).toFixed(1)}% (acceptable overspend)`);
    } else {
      console.log(`   ✅ Spent ${percentOfTarget.toFixed(1)}% of target - excellent!`);
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log(`   ⚠️ ${result.errors.length} errors occurred`);
      result.errors.slice(0, 5).forEach((error: string, i: number) => {
        console.log(`      ${i + 1}. ${error}`);
      });
      if (result.errors.length > 5) {
        console.log(`      ... and ${result.errors.length - 5} more errors`);
      }
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
  console.log("\n🚀 AI Purchase Service Starting (v2 - Aggressive Spending)");
  console.log("═".repeat(60));
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log(`🤖 Model: Gemini 2.0 Flash Lite`);
  console.log(`📦 Batch size: ${BATCH_SIZE} products`);
  console.log(`💰 Target spend per batch: $${TARGET_SPEND_PER_BATCH.toLocaleString()}`);
  console.log(`📈 Max overspend allowed: $${MAX_OVERSPEND.toLocaleString()} (${(MAX_OVERSPEND/TARGET_SPEND_PER_BATCH*100).toFixed(0)}%)`);
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
    
    const targetTotal = TARGET_SPEND_PER_BATCH * batches.length;
    const percentOfTarget = (totalSpent / targetTotal) * 100;
    
    console.log(`✅ Successfully processed ${batches.length} batches`);
    console.log(`💰 Total spent: $${totalSpent.toLocaleString()}`);
    console.log(`🎯 Target budget: $${targetTotal.toLocaleString()}`);
    console.log(`� Spend efficiency: ${percentOfTarget.toFixed(1)}%`);
    console.log(`�📦 Total items purchased: ${totalItems.toLocaleString()}`);
    console.log(`🏷️  Unique products purchased: ${totalProductsPurchased}`);
    console.log(`🏢 Companies affected: ${uniqueCompanies}`);
    console.log(`⏱️  Total time: ${duration}s`);
    console.log(`💵 Average per batch: $${(totalSpent / batches.length).toLocaleString()}`);
    
    if (percentOfTarget < 95) {
      console.log(`\n⚠️ WARNING: Only ${percentOfTarget.toFixed(1)}% of target budget was spent!`);
      console.log(`   Missing: $${(targetTotal - totalSpent).toLocaleString()}`);
    } else if (percentOfTarget > 105) {
      console.log(`\n✅ EXCELLENT: Exceeded target by ${(percentOfTarget - 100).toFixed(1)}%`);
      console.log(`   Overspend: $${(totalSpent - targetTotal).toLocaleString()} (within acceptable limits)`);
    } else {
      console.log(`\n✅ PERFECT: Hit target budget within acceptable range!`);
    }
    
    if (totalErrors > 0) {
      console.log(`\n⚠️ Total errors: ${totalErrors}`);
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
