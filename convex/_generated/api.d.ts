/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as accounts from "../accounts.js";
import type * as balances from "../balances.js";
import type * as collections from "../collections.js";
import type * as companies from "../companies.js";
import type * as crons from "../crons.js";
import type * as debug from "../debug.js";
import type * as employees from "../employees.js";
import type * as expenses from "../expenses.js";
import type * as gamble from "../gamble.js";
import type * as globalAlerts from "../globalAlerts.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as loans from "../loans.js";
import type * as maintenance from "../maintenance.js";
import type * as mod from "../mod.js";
import type * as moderation from "../moderation.js";
import type * as products from "../products.js";
import type * as publicPurchases from "../publicPurchases.js";
import type * as queries from "../queries.js";
import type * as reset from "../reset.js";
import type * as resources from "../resources.js";
import type * as restore_balances from "../restore_balances.js";
import type * as restore_balances_action from "../restore_balances_action.js";
import type * as stocks from "../stocks.js";
import type * as upgrades from "../upgrades.js";
import type * as users from "../users.js";
import type * as utils_stocks from "../utils/stocks.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  balances: typeof balances;
  collections: typeof collections;
  companies: typeof companies;
  crons: typeof crons;
  debug: typeof debug;
  employees: typeof employees;
  expenses: typeof expenses;
  gamble: typeof gamble;
  globalAlerts: typeof globalAlerts;
  http: typeof http;
  leaderboard: typeof leaderboard;
  loans: typeof loans;
  maintenance: typeof maintenance;
  mod: typeof mod;
  moderation: typeof moderation;
  products: typeof products;
  publicPurchases: typeof publicPurchases;
  queries: typeof queries;
  reset: typeof reset;
  resources: typeof resources;
  restore_balances: typeof restore_balances;
  restore_balances_action: typeof restore_balances_action;
  stocks: typeof stocks;
  upgrades: typeof upgrades;
  users: typeof users;
  "utils/stocks": typeof utils_stocks;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
