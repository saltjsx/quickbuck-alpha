import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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

// Mutation to reset the entire economy by deleting all data
export const resetEconomy = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all documents from each table in order to avoid foreign key issues
    // Start with dependent tables first

    // Delete stock transactions
    const stockTransactions = await ctx.db.query("stockTransactions").collect();
    for (const tx of stockTransactions) {
      await ctx.db.delete(tx._id);
    }

    // Delete stock price history
    const stockPriceHistory = await ctx.db.query("stockPriceHistory").collect();
    for (const history of stockPriceHistory) {
      await ctx.db.delete(history._id);
    }

    // Delete stocks
    const stocks = await ctx.db.query("stocks").collect();
    for (const stock of stocks) {
      await ctx.db.delete(stock._id);
    }

    // Delete products
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    // Delete company access
    const companyAccess = await ctx.db.query("companyAccess").collect();
    for (const access of companyAccess) {
      await ctx.db.delete(access._id);
    }

    // Delete companies
    const companies = await ctx.db.query("companies").collect();
    for (const company of companies) {
      await ctx.db.delete(company._id);
    }

    // Delete balances
    const balances = await ctx.db.query("balances").collect();
    for (const balance of balances) {
      await ctx.db.delete(balance._id);
    }

    // Delete ledger transactions
    const ledger = await ctx.db.query("ledger").collect();
    for (const tx of ledger) {
      await ctx.db.delete(tx._id);
    }

    // Delete accounts
    const accounts = await ctx.db.query("accounts").collect();
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    // Optionally delete users - uncomment if you want to remove all user data too
    // const users = await ctx.db.query("users").collect();
    // for (const user of users) {
    //   await ctx.db.delete(user._id);
    // }

    return { success: true, message: "Economy reset complete. All data has been deleted." };
  },
});
