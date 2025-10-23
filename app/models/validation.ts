/**
 * Validation helpers for Quickbuck
 * Centralized field constraints and business rules
 */

// Constants
export const MAX_LOAN_AMOUNT = 500000000; // $5,000,000 in cents
export const LOAN_INTEREST_RATE = 0.05; // 5% daily
export const STARTING_BALANCE = parseInt(process.env.QUICKBUCK_START_BALANCE || "10000000"); // $100,000 in cents
export const COMPANY_GO_PUBLIC_THRESHOLD = 5000000; // $50,000 in cents
export const CRYPTO_CREATION_COST = 1000000; // $10,000 in cents
export const CRYPTO_TOTAL_SUPPLY = 100000000; // 100 million tokens
export const PRODUCTION_COST_MIN = 0.35; // 35% of price
export const PRODUCTION_COST_MAX = 0.67; // 67% of price

// Ticker validation
export function isValidCompanyTicker(ticker: string): boolean {
  // Must be 2-5 uppercase letters
  return /^[A-Z]{2,5}$/.test(ticker);
}

export function isValidCryptoTicker(ticker: string): boolean {
  // Must start with *, total length <= 4 chars including *
  return /^\*[A-Z0-9]{0,3}$/.test(ticker);
}

// Currency helpers (operate on cents)
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatCurrency(cents: number): string {
  const dollars = centsToDollars(Math.abs(cents));
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Safely add cents (prevents overflow)
export function addCents(a: number, b: number): number {
  const result = a + b;
  if (!Number.isSafeInteger(result)) {
    throw new Error("Currency overflow detected");
  }
  return result;
}

// Safely subtract cents
export function subtractCents(a: number, b: number): number {
  return addCents(a, -b);
}

// Safely multiply cents
export function multiplyCents(cents: number, multiplier: number): number {
  const result = Math.round(cents * multiplier);
  if (!Number.isSafeInteger(result)) {
    throw new Error("Currency overflow detected");
  }
  return result;
}

// Production cost calculation (random between 35%-67% of price)
export function calculateProductionCost(price: number): number {
  const randomPercent = Math.random() * (PRODUCTION_COST_MAX - PRODUCTION_COST_MIN) + PRODUCTION_COST_MIN;
  return multiplyCents(price, randomPercent);
}

// Loan calculations
export function calculateLoanInterest(principal: number, dailyRate: number, days: number): number {
  // Simple interest: principal * rate * days
  return multiplyCents(principal, dailyRate * days);
}

export function isValidLoanAmount(amount: number): boolean {
  return amount > 0 && amount <= MAX_LOAN_AMOUNT;
}

// Account balance validation
export function canDebit(balance: number, amount: number, canGoNegative: boolean): boolean {
  if (canGoNegative) {
    return true;
  }
  return balance >= amount;
}

// Generic field validation
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

// Validation errors
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateRequired<T>(value: T | undefined | null, fieldName: string): T {
  if (value === undefined || value === null) {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value;
}

export function validatePositive(value: number, fieldName: string): number {
  if (!isPositiveInteger(value)) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }
  return value;
}

export function validateNonNegative(value: number, fieldName: string): number {
  if (!isNonNegativeInteger(value)) {
    throw new ValidationError(`${fieldName} must be a non-negative integer`);
  }
  return value;
}

export function validateString(value: unknown, fieldName: string): string {
  if (!isNonEmptyString(value)) {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }
  return value;
}

export function validateCompanyTicker(ticker: string): string {
  const upper = ticker.toUpperCase();
  if (!isValidCompanyTicker(upper)) {
    throw new ValidationError("Ticker must be 2-5 uppercase letters");
  }
  return upper;
}

export function validateCryptoTicker(ticker: string): string {
  const upper = ticker.toUpperCase();
  if (!isValidCryptoTicker(upper)) {
    throw new ValidationError("Crypto ticker must start with * and be <= 4 chars total");
  }
  return upper;
}
