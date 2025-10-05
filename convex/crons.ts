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

// Clean up old price history daily at 3 AM
crons.daily(
  "cleanup old price history",
  { hourUTC: 3, minuteUTC: 0 },
  internal.stocks.cleanupOldPriceHistory
);

export default crons;
