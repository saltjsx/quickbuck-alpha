import { describe, it, expect } from "vitest";
import {
  isValidCompanyTicker,
  isValidCryptoTicker,
  dollarsToCents,
  centsToDollars,
  formatCurrency,
  addCents,
  subtractCents,
  multiplyCents,
  calculateProductionCost,
  calculateLoanInterest,
  isValidLoanAmount,
  canDebit,
  validateCompanyTicker,
  validateCryptoTicker,
  ValidationError,
  MAX_LOAN_AMOUNT,
  PRODUCTION_COST_MIN,
  PRODUCTION_COST_MAX,
} from "~/models/validation";

describe("Validation Helpers", () => {
  describe("Ticker validation", () => {
    it("should validate company tickers", () => {
      expect(isValidCompanyTicker("AAPL")).toBe(true);
      expect(isValidCompanyTicker("MSFT")).toBe(true);
      expect(isValidCompanyTicker("AB")).toBe(true);
      expect(isValidCompanyTicker("ABCDE")).toBe(true);
      
      expect(isValidCompanyTicker("A")).toBe(false); // too short
      expect(isValidCompanyTicker("ABCDEF")).toBe(false); // too long
      expect(isValidCompanyTicker("abc")).toBe(false); // lowercase
      expect(isValidCompanyTicker("A1")).toBe(false); // numbers
    });

    it("should validate crypto tickers", () => {
      expect(isValidCryptoTicker("*BTC")).toBe(true);
      expect(isValidCryptoTicker("*ETH")).toBe(true);
      expect(isValidCryptoTicker("*A")).toBe(true);
      expect(isValidCryptoTicker("*")).toBe(true);
      
      expect(isValidCryptoTicker("BTC")).toBe(false); // no *
      expect(isValidCryptoTicker("*ABCD")).toBe(false); // too long
      expect(isValidCryptoTicker("**")).toBe(false); // multiple *
    });

    it("should throw on invalid company ticker", () => {
      expect(() => validateCompanyTicker("A")).toThrow(ValidationError);
      expect(() => validateCompanyTicker("abc")).not.toThrow();
      expect(validateCompanyTicker("abc")).toBe("ABC"); // should uppercase
    });

    it("should throw on invalid crypto ticker", () => {
      expect(() => validateCryptoTicker("BTC")).toThrow(ValidationError);
      expect(() => validateCryptoTicker("*btc")).not.toThrow();
      expect(validateCryptoTicker("*btc")).toBe("*BTC"); // should uppercase
    });
  });

  describe("Currency conversion", () => {
    it("should convert dollars to cents", () => {
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(10.50)).toBe(1050);
      expect(dollarsToCents(100.99)).toBe(10099);
    });

    it("should convert cents to dollars", () => {
      expect(centsToDollars(100)).toBe(1);
      expect(centsToDollars(1050)).toBe(10.50);
      expect(centsToDollars(10099)).toBe(100.99);
    });

    it("should format currency correctly", () => {
      expect(formatCurrency(100)).toBe("$1.00");
      expect(formatCurrency(1050)).toBe("$10.50");
      expect(formatCurrency(10099)).toBe("$100.99");
      expect(formatCurrency(-100)).toBe("-$1.00");
      expect(formatCurrency(0)).toBe("$0.00");
    });
  });

  describe("Currency math", () => {
    it("should safely add cents", () => {
      expect(addCents(100, 50)).toBe(150);
      expect(addCents(100, -50)).toBe(50);
      expect(addCents(-100, -50)).toBe(-150);
    });

    it("should safely subtract cents", () => {
      expect(subtractCents(100, 50)).toBe(50);
      expect(subtractCents(100, 150)).toBe(-50);
    });

    it("should safely multiply cents", () => {
      expect(multiplyCents(100, 2)).toBe(200);
      expect(multiplyCents(100, 0.5)).toBe(50);
      expect(multiplyCents(100, 1.5)).toBe(150);
    });

    it("should throw on overflow", () => {
      expect(() => addCents(Number.MAX_SAFE_INTEGER, 1)).toThrow("Currency overflow");
      expect(() => multiplyCents(Number.MAX_SAFE_INTEGER, 2)).toThrow("Currency overflow");
    });
  });

  describe("Production cost calculation", () => {
    it("should calculate production cost within range", () => {
      const price = 10000; // $100
      const minCost = price * PRODUCTION_COST_MIN;
      const maxCost = price * PRODUCTION_COST_MAX;
      
      // Run multiple times to check randomness
      for (let i = 0; i < 100; i++) {
        const cost = calculateProductionCost(price);
        expect(cost).toBeGreaterThanOrEqual(minCost);
        expect(cost).toBeLessThanOrEqual(maxCost);
      }
    });
  });

  describe("Loan calculations", () => {
    it("should calculate loan interest correctly", () => {
      const principal = 100000000; // $1M
      const dailyRate = 0.05; // 5% daily
      
      expect(calculateLoanInterest(principal, dailyRate, 1)).toBe(5000000); // $50k
      expect(calculateLoanInterest(principal, dailyRate, 7)).toBe(35000000); // $350k
    });

    it("should validate loan amounts", () => {
      expect(isValidLoanAmount(100000)).toBe(true); // $1k
      expect(isValidLoanAmount(MAX_LOAN_AMOUNT)).toBe(true);
      
      expect(isValidLoanAmount(0)).toBe(false);
      expect(isValidLoanAmount(-100)).toBe(false);
      expect(isValidLoanAmount(MAX_LOAN_AMOUNT + 1)).toBe(false);
    });
  });

  describe("Account balance validation", () => {
    it("should check if account can be debited", () => {
      expect(canDebit(10000, 5000, false)).toBe(true);
      expect(canDebit(10000, 10000, false)).toBe(true);
      expect(canDebit(10000, 15000, false)).toBe(false);
      
      // Accounts that can go negative
      expect(canDebit(10000, 15000, true)).toBe(true);
      expect(canDebit(-10000, 5000, true)).toBe(true);
    });
  });
});
