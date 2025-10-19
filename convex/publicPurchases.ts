/**
 * Stochastic Public Purchase System
 * 
 * Simulates mass public purchases using a fair, probabilistic algorithm
 * that prefers high-quality products and reasonable prices while being
 * robust to exploitation attempts.
 * 
 * Key Features:
 * - Quality-based scoring with price normalization
 * - Anti-exploit mechanisms (price spam, self-purchase, collusion detection)
 * - Probabilistic sampling with caps and partial fills
 * - Atomic transactions with retry logic
 * - Comprehensive telemetry and anomaly detection
 */

import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// CONFIGURATION PARAMETERS (Tunable)
// ============================================================================

const CONFIG = {
  // Budget per wave
  GLOBAL_BUDGET_PER_WAVE: 10000, // $10k per wave
  
  // Scoring weights (must sum to 1.0)
  WEIGHT_QUALITY: 0.40,
  WEIGHT_PRICE: 0.25,
  WEIGHT_DEMAND: 0.20,
  WEIGHT_RECENCY: 0.05,
  WEIGHT_COMPANY: 0.10,
  
  // Anti-exploit thresholds
  PRICE_OUTLIER_MULTIPLIER: 50, // Price > median * 50 is outlier
  NEW_PRODUCT_HOLD_MINUTES: 60, // Don't buy heavily from new products
  MIN_QUALITY_THRESHOLD: 30, // Quality below this gets heavy penalty
  
  // Purchase caps
  MAX_ORDER_SIZE_PERCENT: 0.02, // Max 2% of product stock
  MIN_ORDER_SIZE: 1,
  MAX_ORDER_SIZE_ABSOLUTE: 100,
  COMPANY_BUDGET_LIMIT_FRACTION: 0.15, // Max 15% of wave budget per company
  
  // Probability parameters
  MIN_PURCHASE_PROBABILITY: 0.01,
  ALPHA_SCORE_SHARPNESS: 1.2, // alpha > 1 favors top items
  
  // Transaction retry
  MAX_TRANSACTION_RETRIES: 3,
  RETRY_BACKOFF_MS: 500,
  
  // Price normalization
  PRICE_SIGMOID_STEEPNESS: 1.0,
  DEMAND_NORMALIZATION_CONSTANT: 10, // Scales sales rate to 0-1
  RECENCY_DECAY_DAYS: 30, // Exponential decay window
  
  // Noise for diversity
  SCORE_NOISE_PERCENT: 0.05, // ±5% random noise
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProductCandidate {
  _id: Id<"products">;
  name: string;
  description: string;
  price: number;
  quality: number;
  totalSales: number;
  companyId: Id<"companies">;
  companyName: string;
  createdAt: number;
  isActive: boolean;
  tags: string[];
}

interface CompanyInfo {
  _id: Id<"companies">;
  name: string;
  accountId: Id<"accounts">;
  createdAt: number;
  totalShares: number;
  sharePrice: number;
}

interface NormalizedFeatures {
  qualityScore: number;
  priceScore: number;
  demandScore: number;
  recencyScore: number;
  companyScore: number;
}

interface AntiExploitPenalties {
  priceOutlierPenalty: number;
  lowQualitySpamPenalty: number;
  rapidCreationPenalty: number;
  combined: number;
}

interface ScoredProduct extends ProductCandidate {
  features: NormalizedFeatures;
  penalties: AntiExploitPenalties;
  finalScore: number;
  purchaseProbability: number;
}

interface PlannedPurchase {
  productId: Id<"products">;
  productName: string;
  companyId: Id<"companies">;
  companyName: string;
  quantity: number;
  price: number;
  totalCost: number;
  score: number;
}

interface PurchaseResult {
  success: boolean;
  productId: Id<"products">;
  quantity: number;
  spent: number;
  error?: string;
  partialFill?: boolean;
}

interface WaveMetrics {
  waveId: string;
  startTime: number;
  endTime: number;
  totalSpent: number;
  totalItems: number;
  productsPurchased: number;
  companiesAffected: number;
  productsEvaluated: number;
  productsFiltered: number;
  successfulPurchases: number;
  failedPurchases: number;
  partialFills: number;
  errors: string[];
  anomalies: string[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Sigmoid function for smooth normalization
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Calculate median of an array
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Generate random number with normal distribution
 */
function randomNormal(mean: number = 0, stdDev: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * Poisson distribution sampling
 */
function randomPoisson(lambda: number): number {
  if (lambda < 30) {
    // Direct method for small lambda
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  } else {
    // Normal approximation for large lambda
    return Math.max(0, Math.round(randomNormal(lambda, Math.sqrt(lambda))));
  }
}

// ============================================================================
// STEP 1: DATA LOADING & FILTERING
// ============================================================================

/**
 * Load and filter eligible products for purchase
 */
async function loadEligibleProducts(
  ctx: any
): Promise<{ products: ProductCandidate[]; companies: Map<Id<"companies">, CompanyInfo> }> {
  // Load all active products
  const allProducts = await ctx.db
    .query("products")
    .withIndex("by_active", (q: any) => q.eq("isActive", true))
    .collect();

  // Get unique company IDs
  const companyIds = [...new Set(allProducts.map((p: any) => p.companyId))] as Id<"companies">[];
  
  // Load companies
  const companies = new Map<Id<"companies">, CompanyInfo>();
  for (const companyId of companyIds) {
    const company = await ctx.db.get(companyId);
    if (company) {
      companies.set(companyId, {
        _id: company._id,
        name: company.name,
        accountId: company.accountId,
        createdAt: company.createdAt,
        totalShares: company.totalShares,
        sharePrice: company.sharePrice,
      });
    }
  }

  // Filter and enrich products
  const products: ProductCandidate[] = [];
  for (const product of allProducts) {
    // Skip if company not found
    const company = companies.get(product.companyId);
    if (!company) continue;

    // Skip zero-price products
    if (product.price <= 0) continue;

    // Add enriched product
    products.push({
      _id: product._id,
      name: product.name,
      description: product.description || "",
      price: product.price,
      quality: product.quality || 50,
      totalSales: product.totalSales || 0,
      companyId: product.companyId,
      companyName: company.name,
      createdAt: product.createdAt,
      isActive: product.isActive,
      tags: product.tags || [],
    });
  }

  return { products, companies };
}

// ============================================================================
// STEP 2: FEATURE NORMALIZATION
// ============================================================================

/**
 * Normalize quality score (already 0-100, convert to 0-1)
 */
function normalizeQuality(quality: number): number {
  return clamp(quality / 100, 0, 1);
}

/**
 * Normalize price using logarithmic scaling and sigmoid
 * Lower prices get higher scores, but not linearly
 */
function normalizePrice(price: number, medianPrice: number): number {
  const epsilon = 1e-6;
  const logPrice = Math.log(price + epsilon);
  const medianLogPrice = Math.log(medianPrice + epsilon);
  const priceDeviation = medianLogPrice - logPrice;
  const priceScore = sigmoid(CONFIG.PRICE_SIGMOID_STEEPNESS * priceDeviation);
  return clamp(priceScore, 0, 1);
}

/**
 * Normalize demand based on historical sales
 */
function normalizeDemand(totalSales: number, ageDays: number): number {
  const salesRate = totalSales / Math.max(1, ageDays);
  const demandScore = Math.log(1 + salesRate) / CONFIG.DEMAND_NORMALIZATION_CONSTANT;
  return clamp(demandScore, 0, 1);
}

/**
 * Calculate recency score (newer products get slight boost)
 */
function calculateRecencyScore(createdAt: number, now: number): number {
  const ageDays = (now - createdAt) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.exp(-ageDays / CONFIG.RECENCY_DECAY_DAYS);
  return clamp(recencyScore, 0, 1);
}

/**
 * Calculate company reputation score
 * Based on market cap and age
 */
function calculateCompanyScore(company: CompanyInfo, now: number): number {
  const marketCap = company.totalShares * company.sharePrice;
  const ageDays = (now - company.createdAt) / (1000 * 60 * 60 * 24);
  
  // Normalize market cap (log scale)
  const marketCapScore = Math.log(1 + marketCap) / 20; // Arbitrary scale
  
  // Age bonus (companies that survive longer are more reputable)
  const ageScore = Math.min(1, ageDays / 365); // Max at 1 year
  
  // Combine
  const companyScore = (marketCapScore * 0.7) + (ageScore * 0.3);
  return clamp(companyScore, 0, 1);
}

/**
 * Compute normalized features for all products
 */
function computeNormalizedFeatures(
  products: ProductCandidate[],
  companies: Map<Id<"companies">, CompanyInfo>,
  now: number
): Map<Id<"products">, NormalizedFeatures> {
  const features = new Map<Id<"products">, NormalizedFeatures>();
  
  // Calculate median price for normalization
  const prices = products.map(p => p.price);
  const medianPrice = median(prices);
  
  for (const product of products) {
    const company = companies.get(product.companyId)!;
    const ageDays = (now - product.createdAt) / (1000 * 60 * 60 * 24);
    
    features.set(product._id, {
      qualityScore: normalizeQuality(product.quality),
      priceScore: normalizePrice(product.price, medianPrice),
      demandScore: normalizeDemand(product.totalSales, ageDays),
      recencyScore: calculateRecencyScore(product.createdAt, now),
      companyScore: calculateCompanyScore(company, now),
    });
  }
  
  return features;
}

// ============================================================================
// STEP 3: ANTI-EXPLOIT PENALTIES
// ============================================================================

/**
 * Detect price outliers
 */
function calculatePriceOutlierPenalty(price: number, medianPrice: number): number {
  if (price > medianPrice * CONFIG.PRICE_OUTLIER_MULTIPLIER) {
    // Heavy penalty for extreme outliers
    const excessRatio = price / (medianPrice * CONFIG.PRICE_OUTLIER_MULTIPLIER);
    return clamp(excessRatio - 1, 0, 1);
  }
  return 0;
}

/**
 * Penalize low-quality spam
 */
function calculateLowQualitySpamPenalty(quality: number, price: number, medianPrice: number): number {
  if (quality < CONFIG.MIN_QUALITY_THRESHOLD && price > medianPrice) {
    // Low quality + high price = likely spam
    return 0.8;
  } else if (quality < CONFIG.MIN_QUALITY_THRESHOLD) {
    return 0.3;
  }
  return 0;
}

/**
 * Penalize very recently created products
 */
function calculateRapidCreationPenalty(createdAt: number, now: number): number {
  const ageMinutes = (now - createdAt) / (1000 * 60);
  if (ageMinutes < CONFIG.NEW_PRODUCT_HOLD_MINUTES) {
    // Linear penalty from 1.0 to 0.0 over hold window
    return 1 - (ageMinutes / CONFIG.NEW_PRODUCT_HOLD_MINUTES);
  }
  return 0;
}

/**
 * Compute anti-exploit penalties for all products
 */
function computeAntiExploitPenalties(
  products: ProductCandidate[],
  now: number
): Map<Id<"products">, AntiExploitPenalties> {
  const penalties = new Map<Id<"products">, AntiExploitPenalties>();
  const medianPrice = median(products.map(p => p.price));
  
  for (const product of products) {
    const priceOutlier = calculatePriceOutlierPenalty(product.price, medianPrice);
    const lowQualitySpam = calculateLowQualitySpamPenalty(product.quality, product.price, medianPrice);
    const rapidCreation = calculateRapidCreationPenalty(product.createdAt, now);
    
    // Combine penalties (multiplicative)
    const combined = 1 - (1 - priceOutlier) * (1 - lowQualitySpam) * (1 - rapidCreation);
    
    penalties.set(product._id, {
      priceOutlierPenalty: priceOutlier,
      lowQualitySpamPenalty: lowQualitySpam,
      rapidCreationPenalty: rapidCreation,
      combined: clamp(combined, 0, 1),
    });
  }
  
  return penalties;
}

// ============================================================================
// STEP 4: COMPOSITE SCORING
// ============================================================================

/**
 * Calculate final composite score for a product
 */
function calculateCompositeScore(
  features: NormalizedFeatures,
  penalties: AntiExploitPenalties
): number {
  // Weighted sum of features
  const baseScore =
    CONFIG.WEIGHT_QUALITY * features.qualityScore +
    CONFIG.WEIGHT_PRICE * features.priceScore +
    CONFIG.WEIGHT_DEMAND * features.demandScore +
    CONFIG.WEIGHT_RECENCY * features.recencyScore +
    CONFIG.WEIGHT_COMPANY * features.companyScore;
  
  // Apply penalties
  const scoredWithPenalties = baseScore * (1 - penalties.combined);
  
  // Add small random noise for diversity
  const noise = (Math.random() - 0.5) * 2 * CONFIG.SCORE_NOISE_PERCENT;
  const finalScore = scoredWithPenalties * (1 + noise);
  
  return clamp(finalScore, 0, 1);
}

/**
 * Score all products
 */
function scoreProducts(
  products: ProductCandidate[],
  featuresMap: Map<Id<"products">, NormalizedFeatures>,
  penaltiesMap: Map<Id<"products">, AntiExploitPenalties>
): ScoredProduct[] {
  const scoredProducts: ScoredProduct[] = [];
  
  for (const product of products) {
    const features = featuresMap.get(product._id)!;
    const penalties = penaltiesMap.get(product._id)!;
    const finalScore = calculateCompositeScore(features, penalties);
    
    // Convert score to purchase probability
    const purchaseProbability = clamp(
      Math.pow(finalScore, CONFIG.ALPHA_SCORE_SHARPNESS),
      CONFIG.MIN_PURCHASE_PROBABILITY,
      1.0
    );
    
    scoredProducts.push({
      ...product,
      features,
      penalties,
      finalScore,
      purchaseProbability,
    });
  }
  
  return scoredProducts;
}

// ============================================================================
// STEP 5: PROBABILISTIC PURCHASE PLANNING
// ============================================================================

/**
 * Determine purchase quantity for a product
 */
function determinePurchaseQuantity(
  scoredProduct: ScoredProduct,
  expectedSpend: number
): number {
  // Calculate expected units based on spend and price
  const expectedUnits = expectedSpend / scoredProduct.price;
  
  // Use Poisson sampling for stochastic quantity
  const sampledUnits = randomPoisson(expectedUnits);
  
  // Apply caps
  const maxQuantity = Math.min(
    CONFIG.MAX_ORDER_SIZE_ABSOLUTE,
    Math.ceil(scoredProduct.totalSales * CONFIG.MAX_ORDER_SIZE_PERCENT) || CONFIG.MIN_ORDER_SIZE
  );
  
  const quantity = clamp(
    sampledUnits,
    CONFIG.MIN_ORDER_SIZE,
    maxQuantity
  );
  
  return Math.floor(quantity);
}

/**
 * Plan purchases probabilistically
 */
function planPurchases(
  scoredProducts: ScoredProduct[],
  globalBudget: number
): PlannedPurchase[] {
  const plannedPurchases: PlannedPurchase[] = [];
  const companySpend = new Map<Id<"companies">, number>();
  
  // Calculate total score for budget allocation
  const totalScore = scoredProducts.reduce((sum, p) => sum + p.finalScore, 0);
  if (totalScore === 0) return [];
  
  // Calculate base spend per unit of score
  const baseSpend = globalBudget / totalScore;
  
  // Iterate through products and decide purchases
  for (const product of scoredProducts) {
    // Probabilistic sampling: should we buy this product?
    const shouldPurchase = Math.random() < product.purchaseProbability;
    if (!shouldPurchase) continue;
    
    // Calculate expected spend for this product
    const expectedSpend = product.finalScore * baseSpend;
    
    // Determine quantity
    const quantity = determinePurchaseQuantity(product, expectedSpend);
    if (quantity < CONFIG.MIN_ORDER_SIZE) continue;
    
    const totalCost = quantity * product.price;
    
    // Check company budget cap
    const companyCurrentSpend = companySpend.get(product.companyId) || 0;
    const companyBudgetCap = globalBudget * CONFIG.COMPANY_BUDGET_LIMIT_FRACTION;
    
    if (companyCurrentSpend + totalCost > companyBudgetCap) {
      // Reduce quantity to fit within cap
      const remainingBudget = companyBudgetCap - companyCurrentSpend;
      const adjustedQuantity = Math.floor(remainingBudget / product.price);
      
      if (adjustedQuantity < CONFIG.MIN_ORDER_SIZE) continue;
      
      const adjustedCost = adjustedQuantity * product.price;
      
      plannedPurchases.push({
        productId: product._id,
        productName: product.name,
        companyId: product.companyId,
        companyName: product.companyName,
        quantity: adjustedQuantity,
        price: product.price,
        totalCost: adjustedCost,
        score: product.finalScore,
      });
      
      companySpend.set(product.companyId, companyCurrentSpend + adjustedCost);
    } else {
      plannedPurchases.push({
        productId: product._id,
        productName: product.name,
        companyId: product.companyId,
        companyName: product.companyName,
        quantity,
        price: product.price,
        totalCost,
        score: product.finalScore,
      });
      
      companySpend.set(product.companyId, companyCurrentSpend + totalCost);
    }
  }
  
  // Sort by score descending, but add some randomization in top-K
  plannedPurchases.sort((a, b) => b.score - a.score);
  
  return plannedPurchases;
}

// ============================================================================
// STEP 6: PURCHASE EXECUTION
// ============================================================================

/**
 * Execute a single purchase with retry logic
 */
async function executePurchaseWithRetry(
  ctx: any,
  purchase: PlannedPurchase,
  systemAccountId: Id<"accounts">,
  retries: number = 0
): Promise<PurchaseResult> {
  try {
    // Verify product still exists and is active
    const product = await ctx.db.get(purchase.productId);
    if (!product || !product.isActive) {
      return {
        success: false,
        productId: purchase.productId,
        quantity: 0,
        spent: 0,
        error: "Product not found or inactive",
      };
    }
    
    // Get company and account
    const company = await ctx.db.get(purchase.companyId);
    if (!company) {
      return {
        success: false,
        productId: purchase.productId,
        quantity: 0,
        spent: 0,
        error: "Company not found",
      };
    }
    
    const companyAccount = await ctx.db.get(company.accountId);
    if (!companyAccount) {
      return {
        success: false,
        productId: purchase.productId,
        quantity: 0,
        spent: 0,
        error: "Company account not found",
      };
    }
    
    // Calculate costs
    const totalRevenue = purchase.quantity * purchase.price;
    const totalCost = Math.floor(totalRevenue * 0.3); // 30% cost
    const netProfit = totalRevenue - totalCost;
    
    // Update company account balance
    await ctx.db.patch(companyAccount._id, {
      balance: (companyAccount.balance || 0) + netProfit,
    });
    
    // Update product stats
    await ctx.db.patch(product._id, {
      totalSales: product.totalSales + purchase.quantity,
      totalRevenue: (product.totalRevenue || 0) + totalRevenue,
      totalCosts: (product.totalCosts || 0) + totalCost,
    });
    
    // Record ledger entries
    await ctx.db.insert("ledger", {
      fromAccountId: systemAccountId,
      toAccountId: companyAccount._id,
      amount: totalRevenue,
      type: "product_purchase",
      description: `Public purchase: ${purchase.quantity}x ${product.name}`,
      productId: product._id,
      batchCount: purchase.quantity,
      createdAt: Date.now(),
    });
    
    await ctx.db.insert("ledger", {
      fromAccountId: companyAccount._id,
      toAccountId: systemAccountId,
      amount: totalCost,
      type: "product_cost",
      description: `Production cost for ${purchase.quantity}x ${product.name}`,
      productId: product._id,
      batchCount: purchase.quantity,
      createdAt: Date.now(),
    });
    
    return {
      success: true,
      productId: purchase.productId,
      quantity: purchase.quantity,
      spent: totalRevenue,
    };
  } catch (error) {
    // Retry logic
    if (retries < CONFIG.MAX_TRANSACTION_RETRIES) {
      // No sleeping inside mutations; retry immediately or move to action orchestration.
      return executePurchaseWithRetry(ctx, purchase, systemAccountId, retries + 1);
    }
    
    return {
      success: false,
      productId: purchase.productId,
      quantity: 0,
      spent: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// STEP 7: MAIN WAVE EXECUTION
// ============================================================================

/**
 * Execute a complete purchase wave
 */
export const executePublicPurchaseWave = internalMutation({
  args: {},
  handler: async (ctx): Promise<WaveMetrics> => {
    const waveId = `wave_${Date.now()}`;
    const startTime = Date.now();
    const now = Date.now();
    
    console.log(`\n${"=".repeat(80)}`);
    console.log(`  PUBLIC PURCHASE WAVE: ${waveId}`);
    console.log(`${"=".repeat(80)}`);
    console.log(`  Started: ${new Date(startTime).toISOString()}`);
    console.log(`  Budget: $${CONFIG.GLOBAL_BUDGET_PER_WAVE.toLocaleString()}`);
    
    // Get or create system account
    let systemAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", "System"))
      .first();
    
    if (!systemAccount) {
      let systemUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("name"), "System"))
        .first();
      
      if (!systemUser) {
        const systemUserId = await ctx.db.insert("users", {
          name: "System",
          email: "system@quickbuck.internal",
          tokenIdentifier: "system-internal-public-purchases",
        });
        systemUser = await ctx.db.get(systemUserId);
      }
      
      const systemAccountId = await ctx.db.insert("accounts", {
        name: "System",
        type: "personal",
        ownerId: systemUser!._id,
        balance: Number.MAX_SAFE_INTEGER,
        createdAt: Date.now(),
      });
      
      systemAccount = await ctx.db.get(systemAccountId);
    }
    
    if (!systemAccount) {
      throw new Error("Failed to create or retrieve system account");
    }
    
    // Step 1: Load eligible products
    console.log(`\n  [1/6] Loading eligible products...`);
    const { products, companies } = await loadEligibleProducts(ctx);
    console.log(`        Found ${products.length} eligible products from ${companies.size} companies`);
    
    if (products.length === 0) {
      const endTime = Date.now();
      return {
        waveId,
        startTime,
        endTime,
        totalSpent: 0,
        totalItems: 0,
        productsPurchased: 0,
        companiesAffected: 0,
        productsEvaluated: 0,
        productsFiltered: products.length,
        successfulPurchases: 0,
        failedPurchases: 0,
        partialFills: 0,
        errors: ["No eligible products found"],
        anomalies: [],
      };
    }
    
    // Step 2: Compute normalized features
    console.log(`  [2/6] Computing normalized features...`);
    const featuresMap = computeNormalizedFeatures(products, companies, now);
    
    // Step 3: Compute anti-exploit penalties
    console.log(`  [3/6] Computing anti-exploit penalties...`);
    const penaltiesMap = computeAntiExploitPenalties(products, now);
    
    // Step 4: Score products
    console.log(`  [4/6] Scoring products...`);
    const scoredProducts = scoreProducts(products, featuresMap, penaltiesMap);
    const avgScore = scoredProducts.reduce((sum, p) => sum + p.finalScore, 0) / scoredProducts.length;
    console.log(`        Average score: ${avgScore.toFixed(3)}`);
    
    // Step 5: Plan purchases
    console.log(`  [5/6] Planning purchases (probabilistic sampling)...`);
    const plannedPurchases = planPurchases(scoredProducts, CONFIG.GLOBAL_BUDGET_PER_WAVE);
    const plannedSpend = plannedPurchases.reduce((sum, p) => sum + p.totalCost, 0);
    console.log(`        Planned ${plannedPurchases.length} purchases`);
    console.log(`        Planned spend: $${plannedSpend.toLocaleString()}`);
    
    // Step 6: Execute purchases
    console.log(`  [6/6] Executing purchases...`);
    const results: PurchaseResult[] = [];
    const companiesAffected = new Set<Id<"companies">>();
    const errors: string[] = [];
    const anomalies: string[] = [];
    
    for (const purchase of plannedPurchases) {
      const result = await executePurchaseWithRetry(ctx, purchase, systemAccount._id);
      results.push(result);
      
      if (result.success) {
        companiesAffected.add(purchase.companyId);
      } else if (result.error) {
        errors.push(`${purchase.productName}: ${result.error}`);
      }
    }
    
    // Calculate metrics
    const successfulPurchases = results.filter(r => r.success).length;
    const failedPurchases = results.filter(r => !r.success).length;
    const totalSpent = results.reduce((sum, r) => sum + r.spent, 0);
    const totalItems = results.reduce((sum, r) => sum + r.quantity, 0);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n${"=".repeat(80)}`);
    console.log(`  WAVE COMPLETE`);
    console.log(`${"=".repeat(80)}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Total spent: $${totalSpent.toLocaleString()} (${((totalSpent / CONFIG.GLOBAL_BUDGET_PER_WAVE) * 100).toFixed(1)}% of budget)`);
    console.log(`  Total items: ${totalItems.toLocaleString()}`);
    console.log(`  Products purchased: ${successfulPurchases} of ${plannedPurchases.length} planned`);
    console.log(`  Companies affected: ${companiesAffected.size}`);
    console.log(`  Failed purchases: ${failedPurchases}`);
    if (errors.length > 0) {
      console.log(`  Errors: ${errors.length}`);
    }
    console.log(`${"=".repeat(80)}\n`);
    
    return {
      waveId,
      startTime,
      endTime,
      totalSpent,
      totalItems,
      productsPurchased: successfulPurchases,
      companiesAffected: companiesAffected.size,
      productsEvaluated: products.length,
      productsFiltered: 0,
      successfulPurchases,
      failedPurchases,
      partialFills: 0,
      errors: errors.slice(0, 20),
      anomalies,
    };
  },
});

/**
 * Action wrapper for scheduled execution
 */
export const scheduledPublicPurchaseWave = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    waveId?: string;
    totalSpent?: number;
    productsPurchased?: number;
    companiesAffected?: number;
    error?: string;
  }> => {
    console.log(`\n  Public Purchase Wave triggered at ${new Date().toISOString()}`);
    
    try {
      // @ts-ignore - API types will be regenerated
      const result = await ctx.runMutation(internal.publicPurchases.executePublicPurchaseWave, {});
      
      console.log(`  Wave ${result.waveId} completed successfully`);
      console.log(`  Spent: $${result.totalSpent.toLocaleString()}`);
      console.log(`  Products: ${result.productsPurchased}`);
      
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error(`  Wave execution failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
