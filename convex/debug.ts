import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
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

    // Get all ledger transactions for this product
    const allTransactions = await ctx.db.query("ledger").collect();
    
    const productTransactions = allTransactions.filter(
      tx => tx.productId === args.productId
    );

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

    // Get all ledger transactions
    const allTransactions = await ctx.db.query("ledger").collect();

    const results = await Promise.all(
      products.map(async (product) => {
        const productPurchases = allTransactions.filter(
          tx => tx.productId === product._id && tx.type === "product_purchase"
        );

        const productCosts = allTransactions.filter(
          tx => tx.productId === product._id && tx.type === "product_cost"
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
    const products = await ctx.db.query("products").collect();
    
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
