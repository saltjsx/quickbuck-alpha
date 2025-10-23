/**
 * Test utilities and fixtures for Quickbuck
 */

import type { Account, Company, Product, Transaction, Loan, Stock, CryptoToken } from "~/models/types";
import { STARTING_BALANCE } from "~/models/validation";

/**
 * Generate a mock account for testing
 */
export function createMockAccount(overrides?: Partial<Account>): Account {
  const now = Date.now();
  return {
    _id: `account_${Math.random().toString(36).substr(2, 9)}`,
    _creationTime: now,
    type: "personal",
    userId: `user_${Math.random().toString(36).substr(2, 9)}`,
    balance: STARTING_BALANCE,
    canGoNegative: false,
    ...overrides,
  };
}

/**
 * Generate a mock company for testing
 */
export function createMockCompany(overrides?: Partial<Company>): Company {
  const now = Date.now();
  const ticker = overrides?.ticker || `TST${Math.floor(Math.random() * 100)}`;
  return {
    _id: `company_${Math.random().toString(36).substr(2, 9)}`,
    _creationTime: now,
    name: `Test Company ${ticker}`,
    ticker: ticker.toUpperCase(),
    description: "A test company",
    tags: ["test"],
    ownerId: `user_${Math.random().toString(36).substr(2, 9)}`,
    accountId: `account_${Math.random().toString(36).substr(2, 9)}`,
    isPublic: false,
    totalRevenue: 0,
    totalProfit: 0,
    costsDue: 0,
    ...overrides,
  };
}

/**
 * Generate a mock product for testing
 */
export function createMockProduct(overrides?: Partial<Product>): Product {
  const now = Date.now();
  return {
    _id: `product_${Math.random().toString(36).substr(2, 9)}`,
    _creationTime: now,
    companyId: `company_${Math.random().toString(36).substr(2, 9)}`,
    name: "Test Product",
    description: "A test product",
    price: 10000, // $100.00
    tags: ["test"],
    totalSold: 0,
    totalRevenue: 0,
    ...overrides,
  };
}

/**
 * Generate a mock transaction for testing
 */
export function createMockTransaction(overrides?: Partial<Transaction>): Transaction {
  const now = Date.now();
  return {
    _id: `transaction_${Math.random().toString(36).substr(2, 9)}`,
    _creationTime: now,
    type: "transfer_cash",
    amount: 10000,
    description: "Test transaction",
    ...overrides,
  };
}

/**
 * Generate a mock loan for testing
 */
export function createMockLoan(overrides?: Partial<Loan>): Loan {
  const now = Date.now();
  return {
    _id: `loan_${Math.random().toString(36).substr(2, 9)}`,
    _creationTime: now,
    accountId: `account_${Math.random().toString(36).substr(2, 9)}`,
    principal: 100000000, // $1,000,000
    remainingPrincipal: 100000000,
    interestRate: 0.05,
    accruedInterest: 0,
    lastAccrualDate: now,
    status: "active",
    ...overrides,
  };
}

/**
 * Generate a mock stock for testing
 */
export function createMockStock(overrides?: Partial<Stock>): Stock {
  const now = Date.now();
  const ticker = overrides?.ticker || `TST${Math.floor(Math.random() * 100)}`;
  return {
    _id: `stock_${Math.random().toString(36).substr(2, 9)}`,
    _creationTime: now,
    companyId: `company_${Math.random().toString(36).substr(2, 9)}`,
    ticker: ticker.toUpperCase(),
    totalShares: 1000000,
    currentPrice: 10000, // $100.00 per share
    marketCap: 10000000000, // $100M
    priceHistory: [{ timestamp: now, price: 10000 }],
    ...overrides,
  };
}

/**
 * Generate a mock crypto token for testing
 */
export function createMockCryptoToken(overrides?: Partial<CryptoToken>): CryptoToken {
  const now = Date.now();
  const ticker = overrides?.ticker || `*TST`;
  return {
    _id: `crypto_${Math.random().toString(36).substr(2, 9)}`,
    _creationTime: now,
    ticker: ticker.toUpperCase(),
    name: `Test Token ${ticker}`,
    creatorAccountId: `account_${Math.random().toString(36).substr(2, 9)}`,
    totalSupply: 100000000,
    currentPrice: 100, // $1.00 per token
    priceHistory: [{ timestamp: now, price: 100 }],
    ...overrides,
  };
}

/**
 * Currency test helpers
 */
export const TestAmounts = {
  ZERO: 0,
  ONE_CENT: 1,
  ONE_DOLLAR: 100,
  TEN_DOLLARS: 1000,
  HUNDRED_DOLLARS: 10000,
  THOUSAND_DOLLARS: 100000,
  TEN_THOUSAND: 1000000,
  HUNDRED_THOUSAND: 10000000,
  MILLION: 100000000,
  FIVE_MILLION: 500000000,
} as const;

/**
 * Time helpers for tests
 */
export const TestTime = {
  NOW: Date.now(),
  ONE_HOUR_AGO: Date.now() - 60 * 60 * 1000,
  ONE_DAY_AGO: Date.now() - 24 * 60 * 60 * 1000,
  ONE_WEEK_AGO: Date.now() - 7 * 24 * 60 * 60 * 1000,
  ONE_HOUR_FROM_NOW: Date.now() + 60 * 60 * 1000,
  ONE_DAY_FROM_NOW: Date.now() + 24 * 60 * 60 * 1000,
};
