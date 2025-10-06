import { query } from "./_generated/server";

export const getStockPriceHistory = query(async ({ db }, { companyId }: { companyId: string }) => {
  const results = await db
    .query("stockPriceHistory")
    .filter(q => q.eq(q.field("companyId"), companyId))
    .order("asc")
    .collect();

  return results.map(r => ({
    price: r.price,
    timestamp: r._creationTime,
  }));
});