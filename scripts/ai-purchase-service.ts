/**
 * AI-Powered Automatic Purchasing Service
 * 
 * This service runs every 20 minutes via Convex cron and uses Google's Gemini 2.0 Flash Lite
 * to make intelligent purchasing decisions across all active products in the marketplace.
 * 
 * Features:
 * - $25M budget allocated across price categories
 * - Batches of 50 products per AI call
 * - Fair distribution ensuring every product gets purchased
 * - Price-tier based budget allocation
 * - Comprehensive logging for tracking
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Budget allocation constants
const TOTAL_BUDGET = 25_000_000; // $25M total budget
const BATCH_SIZE = 50; // Process products in batches of 50

// Price category definitions and budget allocation
const PRICE_CATEGORIES = {
  micro: {
    name: "Micro ($0-$50)",
    min: 0,
    max: 50,
    budgetPercent: 15, // 15% of total budget
    quantityMultiplier: 2.0, // Buy more units of cheap items
  },
  low: {
    name: "Low ($50-$250)",
    min: 50,
    max: 250,
    budgetPercent: 25, // 25% of total budget
    quantityMultiplier: 1.5,
  },
  medium: {
    name: "Medium ($250-$1,000)",
    min: 250,
    max: 1000,
    budgetPercent: 30, // 30% of total budget
    quantityMultiplier: 1.2,
  },
  high: {
    name: "High ($1,000-$5,000)",
    min: 1000,
    max: 5000,
    budgetPercent: 20, // 20% of total budget
    quantityMultiplier: 1.0,
  },
  premium: {
    name: "Premium ($5,000+)",
    min: 5000,
    max: Infinity,
    budgetPercent: 10, // 10% of total budget
    quantityMultiplier: 0.8,
  },
};

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  quality: number;
  totalSales: number;
  companyName: string;
  tags: string[];
  isActive: boolean;
}

interface PurchaseDecision {
  productId: string;
  quantity: number;
  reasoning: string;
}

interface CategoryAllocation {
  category: string;
  budget: number;
  products: Product[];
  batches: Product[][];
}

/**
 * Categorizes products by price tier
 */
function categorizeProducts(products: Product[]): Map<string, Product[]> {
  const categorized = new Map<string, Product[]>();
  
  // Initialize categories
  for (const key of Object.keys(PRICE_CATEGORIES)) {
    categorized.set(key, []);
  }
  
  // Sort products into categories (only active products)
  for (const product of products) {
    // Skip inactive products
    if (!product.isActive) {
      continue;
    }
    
    let assigned = false;
    for (const [key, config] of Object.entries(PRICE_CATEGORIES)) {
      if (product.price >= config.min && product.price < config.max) {
        categorized.get(key)!.push(product);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      console.warn(`⚠️  Product "${product.name}" (${product.price}) not assigned to any category`);
    }
  }
  
  return categorized;
}

/**
 * Allocates budget across price categories based on product distribution
 */
function allocateBudget(categorizedProducts: Map<string, Product[]>): CategoryAllocation[] {
  const allocations: CategoryAllocation[] = [];
  
  console.log("\n💰 Budget Allocation:");
  console.log("─".repeat(80));
  
  for (const [key, config] of Object.entries(PRICE_CATEGORIES)) {
    const products = categorizedProducts.get(key) || [];
    const budget = (TOTAL_BUDGET * config.budgetPercent) / 100;
    
    // Split into batches
    const batches: Product[][] = [];
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      batches.push(products.slice(i, i + BATCH_SIZE));
    }
    
    allocations.push({
      category: key,
      budget,
      products,
      batches,
    });
    
    console.log(
      `${config.name.padEnd(25)} | ` +
      `${products.length.toString().padStart(4)} products | ` +
      `${batches.length.toString().padStart(3)} batches | ` +
      `$${budget.toLocaleString().padStart(12)} (${config.budgetPercent}%)`
    );
  }
  
  console.log("─".repeat(80));
  console.log(
    `${"TOTAL".padEnd(25)} | ` +
    `${allocations.reduce((sum, a) => sum + a.products.length, 0).toString().padStart(4)} products | ` +
    `${allocations.reduce((sum, a) => sum + a.batches.length, 0).toString().padStart(3)} batches | ` +
    `$${TOTAL_BUDGET.toLocaleString().padStart(12)}`
  );
  console.log("");
  
  return allocations;
}

/**
 * Generates AI prompt for a batch of products
 */
function generatePrompt(
  batch: Product[],
  categoryKey: string,
  batchBudget: number,
  batchIndex: number,
  totalBatches: number
): string {
  const config = PRICE_CATEGORIES[categoryKey as keyof typeof PRICE_CATEGORIES];
  
  return `You are an AI representing the general public's purchasing decisions in a marketplace simulation called QuickBuck.

Your role is to make realistic purchasing decisions for ${batch.length} products in the ${config.name} price tier.

CRITICAL REQUIREMENTS:
1. You MUST spend close to $${batchBudget.toLocaleString()} on this batch
2. Give EVERY product a fair chance - buy at least some quantity of most products
3. Act like the general public - prioritize useful, quality products that meet real needs
4. Consider what real consumers and businesses would actually buy
5. Balance spending to use most of your allocated budget

PURCHASING GUIDELINES:
- High-quality products (90-100 quality): Buy more generously (1.5-2x base amount)
- Medium-quality products (70-89 quality): Buy moderately (1x base amount)
- Low-quality products (50-69 quality): Buy sparingly (0.5x base amount)
- Very low quality (<50): Buy minimal amounts or skip if clearly spam

QUANTITY RECOMMENDATIONS FOR ${config.name}:
- Base quantity multiplier: ${config.quantityMultiplier}x
- Adjust based on quality, usefulness, and realistic demand
- Cheap items in this tier: Can buy ${Math.round(10 * config.quantityMultiplier)}-${Math.round(100 * config.quantityMultiplier)} units
- Expensive items in this tier: Buy ${Math.round(1 * config.quantityMultiplier)}-${Math.round(20 * config.quantityMultiplier)} units

REALISTIC BEHAVIOR:
- Essential products (food, software, services): Higher demand
- Luxury items: Lower but steady demand
- Business-to-business products: Moderate professional demand
- Consumer goods: Mix based on usefulness and price

BATCH INFO:
- Price Category: ${config.name}
- This is batch ${batchIndex + 1} of ${totalBatches} in this category
- ${batch.length} products to evaluate
- Your budget: $${batchBudget.toLocaleString()}

PRODUCTS TO EVALUATE:
${batch
  .map(
    (p, i) => `
${i + 1}. "${p.name}" by ${p.companyName}
   - ID: ${p._id}
   - Price: $${p.price.toFixed(2)}
   - Quality: ${p.quality}/100
   - Description: ${p.description.substring(0, 150)}${p.description.length > 150 ? "..." : ""}
   - Tags: ${p.tags.join(", ")}
   - Historical Sales: ${p.totalSales} units`
  )
  .join("\n")}

RESPONSE FORMAT (JSON only, no markdown):
Return a JSON array of purchase decisions. Each decision must have:
{
  "productId": "product ID",
  "quantity": number (realistic quantity based on price and guidelines above),
  "reasoning": "brief explanation (1-2 sentences max)"
}

IMPORTANT:
- Return valid JSON array only (no markdown code blocks, no backticks)
- Ensure total spending is close to $${batchBudget.toLocaleString()}
- Give most products at least 1-5 units to be fair (unless clearly spam/low quality)
- Be realistic with quantities - don't buy 1000 units of expensive items
- Prioritize quality and usefulness in your decisions`;
}

/**
 * Calls Gemini API to get purchase decisions for a batch
 */
async function getAIPurchaseDecisions(
  batch: Product[],
  categoryKey: string,
  batchBudget: number,
  batchIndex: number,
  totalBatches: number,
  geminiApiKey: string
): Promise<PurchaseDecision[]> {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
    }
  });

  const prompt = generatePrompt(batch, categoryKey, batchBudget, batchIndex, totalBatches);
  
  console.log(`   🤖 Calling Gemini API for batch ${batchIndex + 1}/${totalBatches}...`);
  
  const result = await model.generateContent(prompt);
  const response = result.response;
  let text = response.text();

  // Clean up response - remove markdown code blocks if present
  text = text.trim();
  if (text.startsWith("```json")) {
    text = text.substring(7);
  } else if (text.startsWith("```")) {
    text = text.substring(3);
  }
  if (text.endsWith("```")) {
    text = text.substring(0, text.length - 3);
  }
  text = text.trim();

  const decisions: PurchaseDecision[] = JSON.parse(text);
  
  // Validate that decisions are for products in this batch
  const batchProductIds = new Set(batch.map(p => p._id));
  const validDecisions = decisions.filter(d => batchProductIds.has(d.productId));
  
  if (validDecisions.length < decisions.length) {
    console.warn(
      `   ⚠️  Filtered out ${decisions.length - validDecisions.length} invalid product IDs`
    );
  }
  
  return validDecisions;
}

/**
 * Calculates spending statistics for a set of decisions
 */
function calculateSpending(decisions: PurchaseDecision[], products: Product[]): {
  total: number;
  count: number;
  productsAffected: number;
} {
  const productMap = new Map(products.map(p => [p._id, p]));
  let total = 0;
  let count = 0;
  
  for (const decision of decisions) {
    const product = productMap.get(decision.productId);
    if (product) {
      total += product.price * decision.quantity;
      count += decision.quantity;
    }
  }
  
  return {
    total,
    count,
    productsAffected: decisions.length,
  };
}

/**
 * Main function to execute AI-powered purchases
 * This is designed to be called from the Convex HTTP endpoint
 */
export async function executeAIPurchases(
  products: Product[],
  geminiApiKey: string,
  adminKey: string,
  purchaseMutation: (purchases: any[], adminKey: string) => Promise<any>
): Promise<{
  success: boolean;
  totalSpent: number;
  totalItems: number;
  totalProductsPurchased: number;
  companiesAffected: number;
  categoryBreakdown: any[];
  errors: string[];
}> {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 AI-POWERED AUTOMATIC PURCHASING SERVICE");
  console.log("=".repeat(80));
  console.log(`📊 Total Products: ${products.length}`);
  console.log(`💵 Total Budget: $${TOTAL_BUDGET.toLocaleString()}`);
  console.log(`🤖 AI Model: Gemini 2.0 Flash Lite`);
  console.log(`📦 Batch Size: ${BATCH_SIZE} products per batch`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  // Step 1: Categorize products by price
  console.log("\n📋 Step 1: Categorizing products by price tier...");
  const categorizedProducts = categorizeProducts(products);
  
  // Step 2: Allocate budget
  console.log("\n📋 Step 2: Allocating budget across categories...");
  const allocations = allocateBudget(categorizedProducts);
  
  // Step 3: Process each category
  console.log("\n📋 Step 3: Processing purchases with AI...");
  console.log("─".repeat(80));
  
  let totalSpent = 0;
  let totalItems = 0;
  let totalProductsPurchased = 0;
  const companiesAffectedSet = new Set<string>();
  const categoryBreakdown: any[] = [];
  const allErrors: string[] = [];
  
  for (const allocation of allocations) {
    if (allocation.products.length === 0) {
      console.log(`\n⏭️  Skipping category "${allocation.category}" (no products)`);
      continue;
    }
    
    const config = PRICE_CATEGORIES[allocation.category as keyof typeof PRICE_CATEGORIES];
    console.log(`\n📦 Processing Category: ${config.name}`);
    console.log(`   Products: ${allocation.products.length} | Budget: $${allocation.budget.toLocaleString()}`);
    
    let categorySpent = 0;
    let categoryItems = 0;
    let categoryProducts = 0;
    
    // Process each batch in this category
    for (let batchIndex = 0; batchIndex < allocation.batches.length; batchIndex++) {
      const batch = allocation.batches[batchIndex];
      const batchBudget = allocation.budget / allocation.batches.length;
      
      try {
        // Get AI decisions
        const decisions = await getAIPurchaseDecisions(
          batch,
          allocation.category,
          batchBudget,
          batchIndex,
          allocation.batches.length,
          geminiApiKey
        );
        
        // Calculate spending for this batch
        const spending = calculateSpending(decisions, batch);
        
        console.log(
          `   ✓ Batch ${batchIndex + 1}/${allocation.batches.length}: ` +
          `${decisions.length} products, ${spending.count} items, ` +
          `$${spending.total.toLocaleString()} ` +
          `(${((spending.total / batchBudget) * 100).toFixed(1)}% of batch budget)`
        );
        
        // Execute purchases via mutation
        if (decisions.length > 0) {
          const purchases = decisions.map(d => ({
            productId: d.productId,
            quantity: d.quantity,
          }));
          
          const result = await purchaseMutation(purchases, adminKey);
          
          categorySpent += result.totalSpent;
          categoryItems += result.totalItems;
          categoryProducts += result.productsPurchased;
          
          // Track companies affected
          batch.forEach(p => {
            if (decisions.some(d => d.productId === p._id)) {
              companiesAffectedSet.add(p.companyName);
            }
          });
          
          if (result.errors) {
            allErrors.push(...result.errors);
          }
        }
        
        // Brief delay between batches to avoid rate limiting
        if (batchIndex < allocation.batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (error) {
        const errorMsg = `Category ${allocation.category}, Batch ${batchIndex + 1}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        console.error(`   ❌ ${errorMsg}`);
        allErrors.push(errorMsg);
      }
    }
    
    totalSpent += categorySpent;
    totalItems += categoryItems;
    totalProductsPurchased += categoryProducts;
    
    categoryBreakdown.push({
      category: allocation.category,
      name: config.name,
      allocated: allocation.budget,
      spent: categorySpent,
      items: categoryItems,
      products: categoryProducts,
      utilization: ((categorySpent / allocation.budget) * 100).toFixed(1) + "%",
    });
    
    console.log(
      `   ✅ Category Complete: $${categorySpent.toLocaleString()} spent ` +
      `(${((categorySpent / allocation.budget) * 100).toFixed(1)}% utilization)`
    );
  }
  
  // Step 4: Summary
  console.log("\n" + "=".repeat(80));
  console.log("✅ PURCHASE SUMMARY");
  console.log("=".repeat(80));
  console.log(`💰 Total Spent: $${totalSpent.toLocaleString()} of $${TOTAL_BUDGET.toLocaleString()}`);
  console.log(`📊 Budget Utilization: ${((totalSpent / TOTAL_BUDGET) * 100).toFixed(1)}%`);
  console.log(`📦 Total Items Purchased: ${totalItems.toLocaleString()}`);
  console.log(`🛍️  Total Products Purchased: ${totalProductsPurchased} of ${products.length}`);
  console.log(`🏢 Companies Affected: ${companiesAffectedSet.size}`);
  
  if (allErrors.length > 0) {
    console.log(`⚠️  Errors: ${allErrors.length}`);
  }
  
  console.log("\n📋 Category Breakdown:");
  console.log("─".repeat(80));
  for (const breakdown of categoryBreakdown) {
    console.log(
      `${breakdown.name.padEnd(25)} | ` +
      `$${breakdown.spent.toLocaleString().padStart(12)} | ` +
      `${breakdown.items.toString().padStart(6)} items | ` +
      `${breakdown.products.toString().padStart(4)} products | ` +
      `${breakdown.utilization.padStart(7)}`
    );
  }
  
  console.log("─".repeat(80));
  console.log(`⏰ Completed at: ${new Date().toISOString()}\n`);
  
  return {
    success: true,
    totalSpent,
    totalItems,
    totalProductsPurchased,
    companiesAffected: companiesAffectedSet.size,
    categoryBreakdown,
    errors: allErrors.length > 0 ? allErrors.slice(0, 20) : [],
  };
}

/**
 * Example usage (when called from Convex HTTP endpoint):
 * 
 * const products = await ctx.runQuery(api.products.getActiveProducts, {});
 * const result = await executeAIPurchases(
 *   products,
 *   process.env.GEMINI_API_KEY!,
 *   process.env.ADMIN_KEY!,
 *   async (purchases, adminKey) => {
 *     return await ctx.runMutation(api.products.adminAIPurchase, {
 *       purchases,
 *       adminKey,
 *     });
 *   }
 * );
 */
