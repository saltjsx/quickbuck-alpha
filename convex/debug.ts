import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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
