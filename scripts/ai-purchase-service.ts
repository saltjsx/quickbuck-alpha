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

  const prompt = `You are an AI representing MEGA AGGRESSIVE bulk wholesale buyers in QuickBuck marketplace.

YOUR MISSION: Allocate AT LEAST $${TARGET_SPEND_PER_BATCH.toLocaleString()} across ${batch.length} products.
THIS IS A MASSIVE SPENDING OPERATION. SPEND LIKE YOUR LIFE DEPENDS ON IT.

🔴 CRITICAL SPENDING RULES:
1. You MUST allocate AT LEAST $${TARGET_SPEND_PER_BATCH.toLocaleString()} total (this is a LOT of money)
2. Going OVER the budget by 15-20% is ENCOURAGED (we have deep pockets)
3. Allocate across ALL PRICE TIERS to maintain diverse purchasing
4. Quality is a MINOR factor - price tier is PRIMARY
5. BULK BUY MASSIVE QUANTITIES from cheaper tiers, aggressive buying from premium tiers
6. SPEND EVERY DOLLAR - maximize purchases and volumes

PRICE TIER ALLOCATION STRATEGY (Primary Factor):
- Ultra Cheap ($<10): 30-40% of total budget (MAXIMUM VOLUME - buy thousands)
- Very Cheap ($10-50): 30-35% of total budget (BULK WHOLESALE QUANTITIES)
- Cheap ($50-200): 15-20% of total budget (LARGE BULK PURCHASES)
- Budget ($200-500): 8-12% of total budget (STRATEGIC MAJOR PURCHASES)
- Premium ($500+): 5-8% of total budget (HIGH-VALUE SELECTIVE BUYING)

QUALITY MODIFIERS (Secondary Factor - Only 10-20% impact):
- Only use quality to slightly adjust allocations within a tier
- High quality within a tier: +5-10% bonus
- Low quality within a tier: -5% discount (minimum $0)
- Don't let quality override price tier allocation

CALCULATION METHOD:
1. Allocate base budget to EACH PRICE TIER per strategy above
2. Split each tier's budget among products in that tier (spread it wide)
3. Within each tier, allocate more to higher quality (small adjustments only)
4. Add 20% bonus to total allocations to ensure we MASSIVELY exceed target
5. Round UP all dollar amounts (never round down)

EXAMPLE WITH 5 PRODUCTS:
- Product A ($5, quality 80) → Ultra Cheap tier
- Product B ($25, quality 60) → Very Cheap tier
- Product C ($150, quality 95) → Cheap tier
- Product D ($300, quality 70) → Budget tier
- Product E ($600, quality 40) → Premium tier

TIER BUDGETS (for $50M):
- Ultra Cheap: $17.5M (35% of $50M) - THOUSANDS OF UNITS
- Very Cheap: $16.5M (33%) - MASSIVE BULK ORDERS
- Cheap: $9.0M (18%)
- Budget: $5.0M (10%)
- Premium: $3.5M (7%)

WITHIN TIER ALLOCATIONS:
- Product A gets: $17.5M (massive volume)
- Product B gets: $16.5M (massive bulk)
- Product C gets: $9.0M (large quantities)
- Product D gets: $5.0M (strategic major purchase)
- Product E gets: $3.5M (premium selection)
- TOTAL: $50M × 1.20 bonus = $60M ✅ (HUGE OVERSPEND - PERFECT!)

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
