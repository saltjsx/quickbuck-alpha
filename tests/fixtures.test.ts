import { describe, it, expect } from "vitest";
import {
  createMockAccount,
  createMockCompany,
  createMockProduct,
  createMockTransaction,
  createMockLoan,
  createMockStock,
  createMockCryptoToken,
  TestAmounts,
} from "./fixtures";
import { STARTING_BALANCE } from "~/models/validation";

describe("Model Fixtures", () => {
  describe("Account fixtures", () => {
    it("should create a valid personal account", () => {
      const account = createMockAccount();
      
      expect(account._id).toBeDefined();
      expect(account.type).toBe("personal");
      expect(account.userId).toBeDefined();
      expect(account.balance).toBe(STARTING_BALANCE);
      expect(account.canGoNegative).toBe(false);
    });

    it("should allow overrides", () => {
      const account = createMockAccount({
        type: "company",
        balance: TestAmounts.MILLION,
        canGoNegative: true,
      });
      
      expect(account.type).toBe("company");
      expect(account.balance).toBe(TestAmounts.MILLION);
      expect(account.canGoNegative).toBe(true);
    });
  });

  describe("Company fixtures", () => {
    it("should create a valid company", () => {
      const company = createMockCompany();
      
      expect(company._id).toBeDefined();
      expect(company.name).toBeDefined();
      expect(company.ticker).toBeDefined();
      expect(company.ticker).toMatch(/^[A-Z0-9]+$/);
      expect(company.description).toBeDefined();
      expect(company.isPublic).toBe(false);
      expect(company.totalRevenue).toBe(0);
      expect(company.totalProfit).toBe(0);
    });

    it("should allow overrides", () => {
      const company = createMockCompany({
        ticker: "AAPL",
        isPublic: true,
        totalRevenue: TestAmounts.MILLION,
      });
      
      expect(company.ticker).toBe("AAPL");
      expect(company.isPublic).toBe(true);
      expect(company.totalRevenue).toBe(TestAmounts.MILLION);
    });
  });

  describe("Product fixtures", () => {
    it("should create a valid product", () => {
      const product = createMockProduct();
      
      expect(product._id).toBeDefined();
      expect(product.companyId).toBeDefined();
      expect(product.name).toBeDefined();
      expect(product.price).toBeGreaterThan(0);
      expect(product.totalSold).toBe(0);
      expect(product.totalRevenue).toBe(0);
    });

    it("should allow overrides", () => {
      const product = createMockProduct({
        price: TestAmounts.HUNDRED_DOLLARS,
        totalSold: 100,
        totalRevenue: TestAmounts.TEN_THOUSAND,
      });
      
      expect(product.price).toBe(TestAmounts.HUNDRED_DOLLARS);
      expect(product.totalSold).toBe(100);
      expect(product.totalRevenue).toBe(TestAmounts.TEN_THOUSAND);
    });
  });

  describe("Transaction fixtures", () => {
    it("should create a valid transaction", () => {
      const transaction = createMockTransaction();
      
      expect(transaction._id).toBeDefined();
      expect(transaction.type).toBeDefined();
      expect(transaction.amount).toBeGreaterThan(0);
      expect(transaction.description).toBeDefined();
    });

    it("should allow overrides", () => {
      const transaction = createMockTransaction({
        type: "loan_borrow",
        amount: TestAmounts.FIVE_MILLION,
        fromAccountId: "account_123",
        toAccountId: "account_456",
      });
      
      expect(transaction.type).toBe("loan_borrow");
      expect(transaction.amount).toBe(TestAmounts.FIVE_MILLION);
      expect(transaction.fromAccountId).toBe("account_123");
      expect(transaction.toAccountId).toBe("account_456");
    });
  });

  describe("Loan fixtures", () => {
    it("should create a valid loan", () => {
      const loan = createMockLoan();
      
      expect(loan._id).toBeDefined();
      expect(loan.accountId).toBeDefined();
      expect(loan.principal).toBeGreaterThan(0);
      expect(loan.remainingPrincipal).toBe(loan.principal);
      expect(loan.interestRate).toBe(0.05);
      expect(loan.accruedInterest).toBe(0);
      expect(loan.status).toBe("active");
    });

    it("should allow overrides", () => {
      const loan = createMockLoan({
        principal: TestAmounts.MILLION,
        remainingPrincipal: TestAmounts.HUNDRED_THOUSAND,
        accruedInterest: TestAmounts.TEN_THOUSAND,
        status: "repaid",
      });
      
      expect(loan.principal).toBe(TestAmounts.MILLION);
      expect(loan.remainingPrincipal).toBe(TestAmounts.HUNDRED_THOUSAND);
      expect(loan.accruedInterest).toBe(TestAmounts.TEN_THOUSAND);
      expect(loan.status).toBe("repaid");
    });
  });

  describe("Stock fixtures", () => {
    it("should create a valid stock", () => {
      const stock = createMockStock();
      
      expect(stock._id).toBeDefined();
      expect(stock.companyId).toBeDefined();
      expect(stock.ticker).toBeDefined();
      expect(stock.totalShares).toBeGreaterThan(0);
      expect(stock.currentPrice).toBeGreaterThan(0);
      expect(stock.marketCap).toBeGreaterThan(0);
      expect(stock.priceHistory).toHaveLength(1);
    });

    it("should allow overrides", () => {
      const stock = createMockStock({
        ticker: "MSFT",
        totalShares: 1000000,
        currentPrice: TestAmounts.HUNDRED_DOLLARS,
      });
      
      expect(stock.ticker).toBe("MSFT");
      expect(stock.totalShares).toBe(1000000);
      expect(stock.currentPrice).toBe(TestAmounts.HUNDRED_DOLLARS);
    });
  });

  describe("Crypto token fixtures", () => {
    it("should create a valid crypto token", () => {
      const token = createMockCryptoToken();
      
      expect(token._id).toBeDefined();
      expect(token.ticker).toMatch(/^\*/); // starts with *
      expect(token.name).toBeDefined();
      expect(token.totalSupply).toBe(100000000);
      expect(token.currentPrice).toBeGreaterThan(0);
      expect(token.priceHistory).toHaveLength(1);
    });

    it("should allow overrides", () => {
      const token = createMockCryptoToken({
        ticker: "*BTC",
        currentPrice: TestAmounts.TEN_DOLLARS,
      });
      
      expect(token.ticker).toBe("*BTC");
      expect(token.currentPrice).toBe(TestAmounts.TEN_DOLLARS);
    });
  });

  describe("Test amount constants", () => {
    it("should have correct values", () => {
      expect(TestAmounts.ZERO).toBe(0);
      expect(TestAmounts.ONE_DOLLAR).toBe(100);
      expect(TestAmounts.HUNDRED_DOLLARS).toBe(10000);
      expect(TestAmounts.MILLION).toBe(100000000);
      expect(TestAmounts.FIVE_MILLION).toBe(500000000);
    });
  });
});
