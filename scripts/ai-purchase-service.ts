#!/usr/bin/env tsx

/**
 * AI-Powered Product Purchase Service (v4 - Mega Spending Edition)
 * 
 * This service uses Google's Gemini 2.0 Flash Lite to make MASSIVE purchasing
 * decisions for products in the QuickBuck marketplace. It runs every 20 minutes
 * via a cron job and processes products in batches of 50.
 * 
 * KEY CHANGES IN V4:
 * - MASSIVE budget increase: $10M → $50M per batch (5x increase)
 * - Targets $50M-$60M spending per batch (allows 20% overspend)
 * - Companies will make millions per batch
 * - More aggressive tier allocations
 * - Increased scaling multiplier: 1.05x → 1.20x (much more aggressive)
 * - Ultra Cheap tier allocation doubled: 25% → 35%
 */

import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
config({ path: ".env.local" });

const BATCH_SIZE = 50;
const TARGET_SPEND_PER_BATCH = 50000000; // $50M target per batch (increased from $10M)
const MAX_OVERSPEND = 10000000; // Allow up to $10M overspend (20% buffer)
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

  // Categorize products by price tier
  const priceTiers = {
    ultraCheap: batch.filter(p => p.price < 10),      // < $10
    veryCheap: batch.filter(p => p.price >= 10 && p.price < 50),    // $10-50
    cheap: batch.filter(p => p.price >= 50 && p.price < 200),       // $50-200
    budget: batch.filter(p => p.price >= 200 && p.price < 500),     // $200-500
    premium: batch.filter(p => p.price >= 500),       // $500+
  };

  const prompt = `CRITICAL INSTRUCTION: You MUST allocate EXACTLY $${TARGET_SPEND_PER_BATCH.toLocaleString()} per batch - NOT $10M, NOT $100M - exactly $${TARGET_SPEND_PER_BATCH.toLocaleString()}.

You are an AI representing MEGA AGGRESSIVE bulk wholesale buyers in QuickBuck marketplace.

YOUR MISSION: Allocate exactly $${TARGET_SPEND_PER_BATCH.toLocaleString()} across ${batch.length} products.
THIS IS A MASSIVE SPENDING OPERATION - $${TARGET_SPEND_PER_BATCH.toLocaleString()} IS THE BUDGET.

MANDATORY RULE - NON-NEGOTIABLE:
✅ MINIMUM TOTAL SPENDING: $${TARGET_SPEND_PER_BATCH.toLocaleString()}
✅ MAXIMUM TOTAL SPENDING: $${(TARGET_SPEND_PER_BATCH + MAX_OVERSPEND).toLocaleString()}
✅ YOU MUST HIT THIS RANGE OR YOUR RESPONSE WILL BE REJECTED
✅ DO NOT ALLOCATE $10M - THAT WAS THE OLD VERSION
✅ DO NOT ALLOCATE $100M - THAT IS TOO MUCH
✅ ALLOCATE EXACTLY $${(TARGET_SPEND_PER_BATCH * 1.1).toLocaleString()} (110% of ${TARGET_SPEND_PER_BATCH.toLocaleString()})

SIMPLE ALLOCATION METHOD (Not complicated):
If there are ${batch.length} products, allocate approximately $${Math.round(TARGET_SPEND_PER_BATCH * 1.1 / batch.length).toLocaleString()} per product
This ensures total = $${(TARGET_SPEND_PER_BATCH * 1.1).toLocaleString()} exactly

PRICE TIER ALLOCATION STRATEGY (Primary Factor):
- Ultra Cheap ($<10): 35% of total budget = $${Math.round((TARGET_SPEND_PER_BATCH * 1.1) * 0.35).toLocaleString()} (MAXIMUM VOLUME)
- Very Cheap ($10-50): 33% of total budget = $${Math.round((TARGET_SPEND_PER_BATCH * 1.1) * 0.33).toLocaleString()} (BULK QUANTITIES)
- Cheap ($50-200): 18% of total budget = $${Math.round((TARGET_SPEND_PER_BATCH * 1.1) * 0.18).toLocaleString()} (LARGE PURCHASES)
- Budget ($200-500): 10% of total budget = $${Math.round((TARGET_SPEND_PER_BATCH * 1.1) * 0.10).toLocaleString()} (STRATEGIC)
- Premium ($500+): 7% of total budget = $${Math.round((TARGET_SPEND_PER_BATCH * 1.1) * 0.07).toLocaleString()} (SELECTIVE)

QUALITY MODIFIERS (Secondary Factor - Only 10-20% impact):
- High quality: +5-10% bonus
- Low quality: -5% discount
- But ALWAYS allocate something to every product

CALCULATION METHOD:
1. Divide $${TARGET_SPEND_PER_BATCH.toLocaleString()} across tier tiers per percentages above
2. Split each tier's budget among products evenly
3. Quality only adjusts by ±10% within tier
4. MULTIPLY EVERYTHING BY 1.1 to ensure 110% spending
5. Round UP all dollar amounts

SIMPLE EXAMPLE WITH 50 PRODUCTS (for this batch):
- Total budget: $${TARGET_SPEND_PER_BATCH.toLocaleString()}
- With 1.1x bonus: $${(TARGET_SPEND_PER_BATCH * 1.1).toLocaleString()}
- Per product average: $${Math.round((TARGET_SPEND_PER_BATCH * 1.1) / batch.length).toLocaleString()}
- ACTUAL RANGE: $${TARGET_SPEND_PER_BATCH.toLocaleString()} to $${(TARGET_SPEND_PER_BATCH + MAX_OVERSPEND).toLocaleString()}

YOUR RESPONSE WILL BE MATHEMATICALLY VERIFIED:
- Sum of all spendAmount values will be calculated
- If sum < $${TARGET_SPEND_PER_BATCH.toLocaleString()}: REJECTED
- If sum > $${(TARGET_SPEND_PER_BATCH + MAX_OVERSPEND).toLocaleString()}: REJECTED
- If sum is in range: ACCEPTED

DO NOT BE CONSERVATIVE. THIS IS NOT A TEST. ALLOCATE THE FULL AMOUNT.

SIMPLE NUMERICAL EXAMPLE:
Products: ${batch.length}
Total budget: $${(TARGET_SPEND_PER_BATCH * 1.1).toLocaleString()}
Per product: $${Math.round((TARGET_SPEND_PER_BATCH * 1.1) / batch.length).toLocaleString()}

So if spreading evenly:
- Product 1: $${Math.round((TARGET_SPEND_PER_BATCH * 1.1) / batch.length).toLocaleString()}
- Product 2: $${Math.round((TARGET_SPEND_PER_BATCH * 1.1) / batch.length).toLocaleString()}
- ...
- Product ${batch.length}: $${Math.round((TARGET_SPEND_PER_BATCH * 1.1) / batch.length).toLocaleString()}
Total: $${(TARGET_SPEND_PER_BATCH * 1.1).toLocaleString()} ✅

BATCH SUMMARY:
- Batch ${batchNumber} of ${totalBatches}
- ${batch.length} products total
- Ultra Cheap ($<10): ${priceTiers.ultraCheap.length} products
- Very Cheap ($10-50): ${priceTiers.veryCheap.length} products
- Cheap ($50-200): ${priceTiers.cheap.length} products
- Budget ($200-500): ${priceTiers.budget.length} products
- Premium ($500+): ${priceTiers.premium.length} products

PRODUCTS TO EVALUATE:
${batch.map((p, i) => {
  const quality = p.quality ?? 100;
  let tier = "Premium";
  if (p.price < 10) tier = "Ultra Cheap";
  else if (p.price < 50) tier = "Very Cheap";
  else if (p.price < 200) tier = "Cheap";
  else if (p.price < 500) tier = "Budget";
  
  const qualityLevel = quality >= 90 ? '⭐⭐⭐ EXCELLENT' : quality >= 70 ? '⭐⭐ GOOD' : quality >= 50 ? '⭐ FAIR' : '💩 POOR';
  return `${i + 1}. "${p.name}" by ${p.companyName}
   ID: ${p._id}
   Price: $${p.price.toFixed(2)}/unit [${tier}]
   Quality: ${quality}/100 [${qualityLevel}]
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
✅ Ultra Cheap tier gets 30-40% of budget (most products, maximum volume)
✅ Very Cheap tier gets 30-35% of budget (bulk volume)
✅ Cheap tier gets 15-20% of budget
✅ Budget tier gets 8-12% of budget
✅ Premium tier gets 5-8% of budget (least, but still significant)
✅ Quality only modifies allocations by ±10% within tiers
✅ Response is valid JSON array (no markdown, no commentary)
✅ TOTAL SHOULD BE $50M-$60M (going over by 20% is GOOD)`;

  try {
    console.log(`\n🤖 Asking AI for MEGA AGGRESSIVE budget allocation for batch ${batchNumber}/${totalBatches}...`);
    console.log(`💰 Target spend: $${TARGET_SPEND_PER_BATCH.toLocaleString()} (up to $${(TARGET_SPEND_PER_BATCH + MAX_OVERSPEND).toLocaleString()} allowed)`);
    console.log(`🔥 THIS IS A MASSIVE SPENDING OPERATION - EXPECT $50M-$60M PER BATCH`);
    
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
    
    // DEBUG: Show AI response breakdown
    console.log(`\n🔍 DEBUG - AI RESPONSE ANALYSIS:`);
    console.log(`   Target: $${TARGET_SPEND_PER_BATCH.toLocaleString()}`);
    console.log(`   AI Allocated: $${totalSpend.toLocaleString()}`);
    console.log(`   Percentage of target: ${((totalSpend / TARGET_SPEND_PER_BATCH) * 100).toFixed(1)}%`);
    
    if (totalSpend < TARGET_SPEND_PER_BATCH * 0.5) {
      console.log(`   ⚠️ CRITICAL: AI only allocated ${((totalSpend / TARGET_SPEND_PER_BATCH) * 100).toFixed(1)}% of target!`);
      console.log(`   This is likely why we're only spending ~$10M!`);
    }
    
    // If AI is conservative, force aggressive scaling
    if (totalSpend < TARGET_SPEND_PER_BATCH) {
      const shortfall = TARGET_SPEND_PER_BATCH - totalSpend;
      const scaleFactor = (TARGET_SPEND_PER_BATCH * 1.20) / totalSpend; // Scale to 120% of target (was 105%)
      
      console.log(`📈 AI was too conservative! Scaling by ${scaleFactor.toFixed(2)}x to meet target...`);
      
      for (const decision of decisions) {
        decision.spendAmount = Math.ceil(decision.spendAmount * scaleFactor);
      }
      
      const newTotal = decisions.reduce((sum, d) => sum + d.spendAmount, 0);
      console.log(`✅ Scaled total: $${newTotal.toLocaleString()} (was $${totalSpend.toLocaleString()})`);
    }
    
    // Log allocations by price tier
    console.log(`\n📋 Budget allocations by price tier:`);
    
    const getTierName = (price: number) => {
      if (price < 10) return "Ultra Cheap";
      if (price < 50) return "Very Cheap";
      if (price < 200) return "Cheap";
      if (price < 500) return "Budget";
      return "Premium";
    };
    
    // Group decisions by tier
    const tierAllocations: { [key: string]: number } = {
      "Ultra Cheap": 0,
      "Very Cheap": 0,
      "Cheap": 0,
      "Budget": 0,
      "Premium": 0,
    };
    
    decisions.forEach(d => {
      const product = batch.find(p => p._id === d.productId);
      if (product) {
        const tier = getTierName(product.price);
        tierAllocations[tier] += d.spendAmount;
      }
    });
    
    const finalTotal = decisions.reduce((sum, d) => sum + d.spendAmount, 0);
    
    console.log(`\n   Tier Breakdown:`);
    Object.entries(tierAllocations).forEach(([tier, amount]) => {
      const percent = ((amount / finalTotal) * 100).toFixed(1);
      console.log(`   • ${tier}: $${amount.toLocaleString()} (${percent}%)`);
    });
    
    const sortedDecisions = [...decisions].sort((a, b) => b.spendAmount - a.spendAmount);
    console.log(`\n   Top 10 Products:`);
    sortedDecisions.slice(0, 10).forEach((d, idx) => {
      const product = batch.find(p => p._id === d.productId);
      if (product) {
        const units = Math.ceil(d.spendAmount / product.price);
        const tier = getTierName(product.price);
        const percentage = ((d.spendAmount / TARGET_SPEND_PER_BATCH) * 100).toFixed(1);
        console.log(`   ${idx + 1}. ${product.name.substring(0, 25)}: $${d.spendAmount.toLocaleString()} (${percentage}%) [${tier}] → ${units} units`);
      }
    });
    if (decisions.length > 10) {
      console.log(`   ... and ${decisions.length - 10} more products`);
    }
    
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
    
    // CRITICAL DEBUG: Show what we're actually sending
    const totalAllocatedByAI = decisions.reduce((sum, d) => sum + d.spendAmount, 0);
    console.log(`🔍 DEBUG: Total allocated by AI before purchases: $${totalAllocatedByAI.toLocaleString()}`);
    
    let cumulativeSpend = 0;
    const purchases = decisions.map((d, index) => {
      const product = batch.find(p => p._id === d.productId);
      if (!product) {
        console.warn(`⚠️ Product ${d.productId} not found in batch`);
        return null;
      }
      
      // Calculate quantity by rounding UP to ensure we spend at least the allocated amount
      const exactQuantity = d.spendAmount / product.price;
      const quantity = Math.ceil(exactQuantity); // Round UP to spend more if needed
      const actualSpend = quantity * product.price;
      cumulativeSpend += actualSpend;
      
      // Log every purchase detail
      if (index < 5 || index >= decisions.length - 2) {
        console.log(`   Purchase ${index + 1}: ${product.name.substring(0, 20)} - Allocated: $${d.spendAmount.toLocaleString()}, Quantity: ${quantity}, Actual: $${actualSpend.toLocaleString()}`);
      } else if (index === 5) {
        console.log(`   ... (${decisions.length - 7} more purchases) ...`);
      }
      
      return {
        productId: d.productId as any,
        quantity: quantity,
      };
    }).filter(p => p !== null);
    
    console.log(`\n📊 DEBUG SUMMARY BEFORE EXECUTION:`);
    console.log(`   Total purchases: ${purchases.length}`);
    console.log(`   Expected cumulative spend: $${cumulativeSpend.toLocaleString()}`);
    console.log(`   Average per product: $${(cumulativeSpend / purchases.length).toLocaleString()}`);
    
    const result = await convexClient.mutation(api.products.adminAIPurchase, {
      purchases: purchases as any,
      adminKey: ADMIN_KEY!,
    });
    
    console.log(`\n✅ Batch ${batchNumber} complete!`);
    console.log(`   📊 ACTUAL RESULTS:`);
    console.log(`   - Actual spent: $${result.totalSpent.toLocaleString()}`);
    console.log(`   - Products purchased: ${result.productsPurchased}`);
    console.log(`   - Total items: ${result.totalItems.toLocaleString()}`);
    console.log(`   - Companies affected: ${result.companiesAffected}`);
    
    // CRITICAL DEBUGGING
    const discrepancy = cumulativeSpend - result.totalSpent;
    if (Math.abs(discrepancy) > 100000) {
      console.log(`\n⚠️ DISCREPANCY DETECTED:`);
      console.log(`   Expected: $${cumulativeSpend.toLocaleString()}`);
      console.log(`   Actual: $${result.totalSpent.toLocaleString()}`);
      console.log(`   Difference: $${discrepancy.toLocaleString()}`);
      console.log(`   This suggests backend constraints are limiting purchases!`);
    }
    
    // Check if we hit our target
    const percentOfTarget = (result.totalSpent / TARGET_SPEND_PER_BATCH) * 100;
    if (percentOfTarget < 90) {
      console.log(`   ⚠️ WARNING: Only spent ${percentOfTarget.toFixed(1)}% of target!`);
    } else if (percentOfTarget > 120) {
      console.log(`   💰 MEGA OVERSPEND: Exceeded target by ${(percentOfTarget - 100).toFixed(1)}% - EXCELLENT!`);
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
  console.log("\n🚀 AI Purchase Service Starting (v4 - MEGA Spending)");
  console.log("═".repeat(60));
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log(`🤖 Model: Gemini 2.0 Flash Lite`);
  console.log(`📦 Batch size: ${BATCH_SIZE} products`);
  console.log(`💰 Target spend per batch: $${TARGET_SPEND_PER_BATCH.toLocaleString()}`);
  console.log(`📈 Max overspend allowed: $${MAX_OVERSPEND.toLocaleString()} (${(MAX_OVERSPEND/TARGET_SPEND_PER_BATCH*100).toFixed(0)}%)`);
  console.log(`🤑 COMPANIES WILL MAKE SERIOUS MONEY - Expected: $${TARGET_SPEND_PER_BATCH.toLocaleString()}-$${(TARGET_SPEND_PER_BATCH + MAX_OVERSPEND).toLocaleString()} per batch`);
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
    
    if (percentOfTarget < 90) {
      console.log(`\n⚠️ WARNING: Only ${percentOfTarget.toFixed(1)}% of target budget was spent!`);
      console.log(`   Missing: $${(targetTotal - totalSpent).toLocaleString()}`);
    } else if (percentOfTarget > 120) {
      console.log(`\n🤑 MEGA SUCCESS: Exceeded target by ${(percentOfTarget - 100).toFixed(1)}%`);
      console.log(`   Overspend: $${(totalSpent - targetTotal).toLocaleString()} - COMPANIES MAKING SERIOUS MONEY!`);
    } else {
      console.log(`\n✅ EXCELLENT: Hit target budget within acceptable range!`);
      console.log(`   Companies are generating significant revenue per batch.`);
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
