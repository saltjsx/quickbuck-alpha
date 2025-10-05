/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as balances from "../balances.js";
import type * as collections from "../collections.js";
import type * as companies from "../companies.js";
import type * as crons from "../crons.js";
import type * as debug from "../debug.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as products from "../products.js";
import type * as stocks from "../stocks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

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
  http: typeof http;
  leaderboard: typeof leaderboard;
  products: typeof products;
  stocks: typeof stocks;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
