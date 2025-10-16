import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    // OPTIMIZED: Use take() instead of collect() to avoid full table scan
    const users = await ctx.db.query("users").take(100);
    return users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      image: user.image,
      tokenIdentifier: user.tokenIdentifier,
    }));
  },
});

// Debug query to inspect product sales data
export const inspectProductSales = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // OPTIMIZED: Use index to filter by productId instead of full table scan
    const allTransactions = await ctx.db
      .query("ledger")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    
    const productTransactions = allTransactions;

    const purchaseTransactions = productTransactions.filter(
      tx => tx.type === "product_purchase"
    );

    const costTransactions = productTransactions.filter(
      tx => tx.type === "product_cost"
    );

    const totalRevenue = purchaseTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalCosts = costTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      product: {
        _id: product._id,
        name: product.name,
        currentPrice: product.price,
        totalSalesField: product.totalSales,
      },
      transactions: {
        purchaseCount: purchaseTransactions.length,
        costCount: costTransactions.length,
        purchases: purchaseTransactions.map(tx => ({
          amount: tx.amount,
          createdAt: new Date(tx.createdAt).toISOString(),
          productId: tx.productId,
        })),
      },
      calculations: {
        unitsSold: purchaseTransactions.length,
        totalRevenue,
        totalCosts,
        totalProfit: totalRevenue - totalCosts,
        avgSalePrice: purchaseTransactions.length > 0 
          ? totalRevenue / purchaseTransactions.length 
          : 0,
      },
      expectedRevenue: {
        ifAllSalesAtCurrentPrice: product.price * purchaseTransactions.length,
        actualRevenue: totalRevenue,
        difference: totalRevenue - (product.price * purchaseTransactions.length),
      },
    };
  },
});

// Debug query to check all products for a company
export const inspectCompanyProducts = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const products = await ctx.db
      .query("products")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // OPTIMIZED: For each product, fetch its specific transactions using index
    const results = await Promise.all(
      products.map(async (product) => {
        const productTransactions = await ctx.db
          .query("ledger")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .collect();

        const productPurchases = productTransactions.filter(
          tx => tx.type === "product_purchase"
        );

        const productCosts = productTransactions.filter(
          tx => tx.type === "product_cost"
        );

        const revenue = productPurchases.reduce((sum, tx) => sum + tx.amount, 0);
        const costs = productCosts.reduce((sum, tx) => sum + tx.amount, 0);

        return {
          productId: product._id,
          name: product.name,
          currentPrice: product.price,
          totalSalesField: product.totalSales,
          actualPurchaseCount: productPurchases.length,
          revenue,
          costs,
          avgSalePrice: productPurchases.length > 0 ? revenue / productPurchases.length : 0,
          mismatch: product.totalSales !== productPurchases.length,
        };
      })
    );

    return {
      companyName: company.name,
      products: results,
      summary: {
        totalProducts: results.length,
        productsWithMismatch: results.filter(p => p.mismatch).length,
      },
    };
  },
});

// Mutation to migrate existing products to have totalRevenue and totalCosts
export const migrateProductRevenue = mutation({
  args: {},
  handler: async (ctx) => {
    // OPTIMIZED: Process in batches to avoid excessive bandwidth
    const products = await ctx.db.query("products").take(500);
    
    for (const product of products) {
      const productData = product as any;
      
      // Set default values if missing
      const updates: any = {};
      if (productData.totalRevenue === undefined) {
        updates.totalRevenue = 0;
      }
      if (productData.totalCosts === undefined) {
        updates.totalCosts = 0;
      }
      
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(productData._id, updates);
      }
    }
    
    return { success: true, migratedProducts: products.length };
  },
});

const TABLE_RESET_CONFIG = [
  { table: "ledger" as const, metric: "ledgerDeleted" as const, batchSize: 250 },
  { table: "stocks" as const, metric: "stockHoldingsDeleted" as const, batchSize: 250 },
  { table: "stockTransactions" as const, metric: "stockTransactionsDeleted" as const, batchSize: 250 },
  { table: "stockPriceHistory" as const, metric: "stockHistoryDeleted" as const, batchSize: 250 },
  { table: "collections" as const, metric: "collectionsDeleted" as const, batchSize: 250 },
  { table: "expenses" as const, metric: "expensesDeleted" as const, batchSize: 250 },
  { table: "licenses" as const, metric: "licensesDeleted" as const, batchSize: 250 },
] as const;

type ResetMetrics = {
  ledgerDeleted: number;
  stockHoldingsDeleted: number;
  stockTransactionsDeleted: number;
  stockHistoryDeleted: number;
  collectionsDeleted: number;
  expensesDeleted: number;
  licensesDeleted: number;
  personalAccountsReset: number;
  companyAccountsReset: number;
  companiesReset: number;
  productsReset: number;
};

type ResetPhase =
  | "deleteTables"
  | "resetAccounts"
  | "resetCompanies"
  | "resetProducts"
  | "complete";

type ResetState = {
  phase: ResetPhase;
  tableIndex: number;
  tableCursor: string | null;
  accountCursor: string | null;
  companyCursor: string | null;
  productCursor: string | null;
  metrics: ResetMetrics;
  startedAt: number;
};

const metricsValidator = v.object({
  ledgerDeleted: v.number(),
  stockHoldingsDeleted: v.number(),
  stockTransactionsDeleted: v.number(),
  stockHistoryDeleted: v.number(),
  collectionsDeleted: v.number(),
  expensesDeleted: v.number(),
  licensesDeleted: v.number(),
  personalAccountsReset: v.number(),
  companyAccountsReset: v.number(),
  companiesReset: v.number(),
  productsReset: v.number(),
});

const resetStateValidator = v.object({
  phase: v.union(
    v.literal("deleteTables"),
    v.literal("resetAccounts"),
    v.literal("resetCompanies"),
    v.literal("resetProducts"),
    v.literal("complete")
  ),
  tableIndex: v.number(),
  tableCursor: v.union(v.string(), v.null()),
  accountCursor: v.union(v.string(), v.null()),
  companyCursor: v.union(v.string(), v.null()),
  productCursor: v.union(v.string(), v.null()),
  metrics: metricsValidator,
  startedAt: v.number(),
});

type PerformResetResult = {
  state: ResetState;
  completed: boolean;
  operationsUsed: number;
};

const MAX_OPERATION_BUDGET = 2500;
const ACCOUNT_BATCH_SIZE = 150;
const COMPANY_BATCH_SIZE = 150;
const PRODUCT_BATCH_SIZE = 150;

function createInitialResetState(): ResetState {
  const startedAt = Date.now();
  return {
    phase: "deleteTables",
    tableIndex: 0,
    tableCursor: null,
    accountCursor: null,
    companyCursor: null,
    productCursor: null,
    metrics: {
      ledgerDeleted: 0,
      stockHoldingsDeleted: 0,
      stockTransactionsDeleted: 0,
      stockHistoryDeleted: 0,
      collectionsDeleted: 0,
      expensesDeleted: 0,
      licensesDeleted: 0,
      personalAccountsReset: 0,
      companyAccountsReset: 0,
      companiesReset: 0,
      productsReset: 0,
    },
    startedAt,
  };
}

async function syncBalanceRecord(
  ctx: any,
  accountId: any,
  balance: number,
  timestamp: number
): Promise<number> {
  let operations = 1;
  const existing = await ctx.db
    .query("balances")
    .withIndex("by_account", (q: any) => q.eq("accountId", accountId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, { balance, lastUpdated: timestamp });
  } else {
    await ctx.db.insert("balances", {
      accountId,
      balance,
      lastUpdated: timestamp,
    });
  }

  operations += 1;
  return operations;
}

async function performReset(
  ctx: any,
  state: ResetState,
  budget: number = MAX_OPERATION_BUDGET
): Promise<PerformResetResult> {
  let operations = 0;
  const runTimestamp = Date.now();

  while (operations < budget) {
    if (state.phase === "deleteTables") {
      const config = TABLE_RESET_CONFIG[state.tableIndex];

      if (!config) {
        state.phase = "resetAccounts";
        state.tableCursor = null;
        continue;
      }

      const page = await ctx.db
        .query(config.table)
        .paginate({
          limit: config.batchSize,
          cursor: state.tableCursor === null ? undefined : state.tableCursor,
        });

      if (page.page.length === 0) {
        state.tableIndex += 1;
        state.tableCursor = null;
        if (page.isDone) {
          continue;
        }
      } else {
        for (const doc of page.page) {
          await ctx.db.delete(doc._id);
          operations += 2;
          state.metrics[config.metric] += 1;
        }

        if (page.isDone) {
          state.tableIndex += 1;
          state.tableCursor = null;
        } else {
          state.tableCursor = page.continueCursor;
        }

        if (operations >= budget) {
          return { state, completed: false, operationsUsed: operations };
        }
      }

      continue;
    }

    if (state.phase === "resetAccounts") {
      const page = await ctx.db
        .query("accounts")
        .paginate({
          limit: ACCOUNT_BATCH_SIZE,
          cursor: state.accountCursor === null ? undefined : state.accountCursor,
        });

      if (page.page.length === 0) {
        if (page.isDone) {
          state.phase = "resetCompanies";
          state.accountCursor = null;
          continue;
        }
      } else {
        for (const account of page.page) {
          const isPersonal = account.type === "personal";
          const baseline = isPersonal
            ? account.name === "System"
              ? 0
              : 10000
            : 0;

          if ((account.balance ?? 0) !== baseline) {
            await ctx.db.patch(account._id, { balance: baseline });
            operations += 1;
          }

          operations += await syncBalanceRecord(ctx, account._id, baseline, runTimestamp);

          if (isPersonal) {
            state.metrics.personalAccountsReset += 1;
          } else {
            state.metrics.companyAccountsReset += 1;
          }
        }

        if (page.isDone) {
          state.phase = "resetCompanies";
          state.accountCursor = null;
        } else {
          state.accountCursor = page.continueCursor;
        }

        if (operations >= budget) {
          return { state, completed: false, operationsUsed: operations };
        }
      }

      continue;
    }

    if (state.phase === "resetCompanies") {
      const page = await ctx.db
        .query("companies")
        .paginate({
          limit: COMPANY_BATCH_SIZE,
          cursor: state.companyCursor === null ? undefined : state.companyCursor,
        });

      if (page.page.length === 0) {
        if (page.isDone) {
          state.phase = "resetProducts";
          state.companyCursor = null;
          continue;
        }
      } else {
        for (const company of page.page) {
          await ctx.db.patch(company._id, {
            isPublic: false,
            sharePrice: 0.01,
            marketSentiment: 1.0,
            monthlyRevenue: 0,
            unpaidTaxes: 0,
            lastTaxPayment: runTimestamp,
            lastExpenseDate: runTimestamp,
          });
          operations += 1;
          state.metrics.companiesReset += 1;
        }

        if (page.isDone) {
          state.phase = "resetProducts";
          state.companyCursor = null;
        } else {
          state.companyCursor = page.continueCursor;
        }

        if (operations >= budget) {
          return { state, completed: false, operationsUsed: operations };
        }
      }

      continue;
    }

    if (state.phase === "resetProducts") {
      const page = await ctx.db
        .query("products")
        .paginate({
          limit: PRODUCT_BATCH_SIZE,
          cursor: state.productCursor === null ? undefined : state.productCursor,
        });

      if (page.page.length === 0) {
        if (page.isDone) {
          state.phase = "complete";
          state.productCursor = null;
          continue;
        }
      } else {
        for (const product of page.page) {
          await ctx.db.patch(product._id, {
            totalSales: 0,
            totalRevenue: 0,
            totalCosts: 0,
          });
          operations += 1;
          state.metrics.productsReset += 1;
        }

        if (page.isDone) {
          state.phase = "complete";
          state.productCursor = null;
        } else {
          state.productCursor = page.continueCursor;
        }

        if (operations >= budget) {
          return { state, completed: false, operationsUsed: operations };
        }
      }

      continue;
    }

    if (state.phase === "complete") {
      return { state, completed: true, operationsUsed: operations };
    }
  }

  return { state, completed: false, operationsUsed: operations };
}

// Administrative reset to restore the in-game economy using batched operations
export const resetEconomy = mutation({
  args: {},
  handler: async (ctx) => {
    const state = createInitialResetState();
    const result = await performReset(ctx, state);

    if (!result.completed) {
      await ctx.scheduler.runAfter(0, internal.debug.continueResetEconomy, {
        state: result.state,
      });

      return {
        status: "scheduled",
        nextPhase: result.state.phase,
        operationsUsed: result.operationsUsed,
        metrics: result.state.metrics,
        startedAt: result.state.startedAt,
      };
    }

    return {
      status: "complete",
      finishedAt: Date.now(),
      metrics: result.state.metrics,
      startedAt: result.state.startedAt,
    };
  },
});

export const continueResetEconomy = internalMutation({
  args: {
    state: resetStateValidator,
  },
  handler: async (ctx, args) => {
    const result = await performReset(ctx, args.state);

    if (!result.completed) {
      await ctx.scheduler.runAfter(0, internal.debug.continueResetEconomy, {
        state: result.state,
      });

      return {
        status: "scheduled",
        nextPhase: result.state.phase,
        operationsUsed: result.operationsUsed,
        metrics: result.state.metrics,
        startedAt: result.state.startedAt,
      };
    }

    return {
      status: "complete",
      finishedAt: Date.now(),
      metrics: result.state.metrics,
      startedAt: result.state.startedAt,
    };
  },
});

// Find orphaned products (products whose companies no longer exist)
export const findOrphanedProducts = query({
  args: {},
  handler: async (ctx) => {
    // Get all active products
    const activeProducts = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const orphanedProducts = [];

    for (const product of activeProducts) {
      const company = await ctx.db.get(product.companyId);
      if (!company) {
        orphanedProducts.push({
          _id: product._id,
          name: product.name,
          companyId: product.companyId,
          createdBy: product.createdBy,
          createdAt: product.createdAt,
          price: product.price,
        });
      }
    }

    return {
      total: activeProducts.length,
      orphaned: orphanedProducts.length,
      orphanedProducts,
    };
  },
});

// Fix orphaned products by deactivating them
export const fixOrphanedProducts = mutation({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check admin key
    if (args.adminKey !== process.env.ADMIN_KEY) {
      throw new Error("Invalid admin key");
    }

    // Get all active products
    const activeProducts = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    let fixedCount = 0;
    const fixedProducts = [];

    for (const product of activeProducts) {
      const company = await ctx.db.get(product.companyId);
      if (!company) {
        await ctx.db.patch(product._id, { isActive: false });
        fixedCount++;
        fixedProducts.push({
          _id: product._id,
          name: product.name,
          companyId: product.companyId,
        });
      }
    }

    return {
      fixed: fixedCount,
      fixedProducts,
    };
  },
});

// Fix System account to ensure it's not owned by a player
export const fixSystemAccount = mutation({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check admin key
    if (args.adminKey !== process.env.ADMIN_KEY) {
      throw new Error("Invalid admin key");
    }

    // === FIX SYSTEM ACCOUNT ===
    
    // Get or create designated system user
    let systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("name"), "System"))
      .first();
    
    if (!systemUser) {
      const systemUserId = await ctx.db.insert("users", {
        name: "System",
        email: "system@quickbuck.internal",
        tokenIdentifier: "system-internal-account",
      });
      systemUser = await ctx.db.get(systemUserId);
    }

    // Check if System account exists
    let systemAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", "System"))
      .first();

    let systemCreated = false;
    let systemFixed = false;
    let systemOldOwnerName = null;

    if (!systemAccount) {
      // Create new system account
      const systemAccountId = await ctx.db.insert("accounts", {
        name: "System",
        type: "personal",
        ownerId: systemUser!._id,
        balance: Number.MAX_SAFE_INTEGER,
        createdAt: Date.now(),
      });
      systemAccount = await ctx.db.get(systemAccountId);
      systemCreated = true;
    } else {
      // Check if it's owned by a player (not the system user)
      if (systemAccount.ownerId !== systemUser!._id) {
        const oldOwner = await ctx.db.get(systemAccount.ownerId);
        systemOldOwnerName = oldOwner?.name || "Unknown Player";
        
        // Update to be owned by system user
        await ctx.db.patch(systemAccount._id, {
          ownerId: systemUser!._id,
          balance: Number.MAX_SAFE_INTEGER,
        });
        
        systemFixed = true;
      }
    }

    // === FIX CASINO RESERVE ACCOUNT ===
    
    // Get or create designated casino user
    let casinoUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("name"), "QuickBuck Casino"))
      .first();
    
    if (!casinoUser) {
      const casinoUserId = await ctx.db.insert("users", {
        name: "QuickBuck Casino",
        email: "casino@quickbuck.internal",
        tokenIdentifier: "casino-internal-account",
      });
      casinoUser = await ctx.db.get(casinoUserId);
    }

    // Check if Casino Reserve account exists
    let casinoAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", "QuickBuck Casino Reserve"))
      .first();

    let casinoCreated = false;
    let casinoFixed = false;
    let casinoOldOwnerName = null;

    if (!casinoAccount) {
      // Create new casino account
      const casinoAccountId = await ctx.db.insert("accounts", {
        name: "QuickBuck Casino Reserve",
        type: "personal",
        ownerId: casinoUser!._id,
        balance: Number.MAX_SAFE_INTEGER,
        createdAt: Date.now(),
      });
      casinoAccount = await ctx.db.get(casinoAccountId);
      casinoCreated = true;
    } else {
      // Check if it's owned by a player (not the casino user)
      if (casinoAccount.ownerId !== casinoUser!._id) {
        const oldOwner = await ctx.db.get(casinoAccount.ownerId);
        casinoOldOwnerName = oldOwner?.name || "Unknown Player";
        
        // Update to be owned by casino user
        await ctx.db.patch(casinoAccount._id, {
          ownerId: casinoUser!._id,
          balance: Number.MAX_SAFE_INTEGER,
        });
        
        casinoFixed = true;
      }
    }

    return {
      system: {
        created: systemCreated,
        fixed: systemFixed,
        oldOwnerName: systemOldOwnerName,
        userId: systemUser!._id,
        accountId: systemAccount!._id,
      },
      casino: {
        created: casinoCreated,
        fixed: casinoFixed,
        oldOwnerName: casinoOldOwnerName,
        userId: casinoUser!._id,
        accountId: casinoAccount!._id,
      },
    };
  },
});
