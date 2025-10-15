import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run automatic product purchases every 10 minutes
crons.interval(
  "automatic product purchases",
  { minutes: 10 },
  internal.products.automaticPurchase
);

// Update stock prices every 5 minutes
crons.interval(
  "update stock prices",
  { minutes: 5 },
  internal.stocks.updateStockPrices
);

// BANDWIDTH OPTIMIZATION: Update company metrics cache every 30 minutes (reduced frequency)
// Most companies don't need real-time metrics - 30 min is acceptable
crons.interval(
  "update company metrics cache",
  { minutes: 30 },
  internal.companies.updateAllCompanyMetrics
);

// Clean up old price history daily at 3 AM
crons.daily(
  "cleanup old price history",
  { hourUTC: 3, minuteUTC: 0 },
  internal.stocks.cleanupOldPriceHistory
);

// Process company expenses daily at 12 PM UTC
crons.daily(
  "process company expenses",
  { hourUTC: 12, minuteUTC: 0 },
  internal.expenses.processCompanyExpenses
);

// Degrade product quality weekly on Mondays at 6 AM UTC
crons.weekly(
  "degrade product quality",
  { hourUTC: 6, minuteUTC: 0, dayOfWeek: "monday" },
  internal.expenses.degradeProductQuality
);

// Expire old licenses daily at 1 AM UTC
crons.daily(
  "expire old licenses",
  { hourUTC: 1, minuteUTC: 0 },
  internal.expenses.expireLicenses
);

export default crons;
