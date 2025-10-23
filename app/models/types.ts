/**
 * Core data models for Quickbuck
 * All monetary values are stored in cents (integers) to avoid floating point errors
 */

// Account Types
export type AccountType = "personal" | "company";

export interface Account {
  _id: string;
  _creationTime: number;
  type: AccountType;
  userId: string;
  companyId?: string;
  balance: number; // in cents
  canGoNegative: boolean;
}

// Company
export interface Company {
  _id: string;
  _creationTime: number;
  name: string;
  ticker: string; // unique, uppercase
  description: string;
  tags: string[];
  logoUrl?: string;
  ownerId: string;
  accountId: string;
  isPublic: boolean;
  totalRevenue: number; // in cents
  totalProfit: number; // in cents
  costsDue: number; // in cents
}

// Product
export interface Product {
  _id: string;
  _creationTime: number;
  companyId: string;
  name: string;
  description: string;
  price: number; // in cents
  imageUrl?: string;
  tags: string[];
  totalSold: number;
  totalRevenue: number; // in cents
}

// Marketplace Listing
export interface MarketplaceListing {
  _id: string;
  _creationTime: number;
  productId: string;
  companyId: string;
  quantity: number;
  pricePerUnit: number; // in cents
  productionCostPerUnit: number; // in cents
  status: "available" | "sold" | "cancelled";
}

// Transaction Types
export type TransactionType =
  | "transfer_cash"
  | "transfer_stock"
  | "transfer_crypto"
  | "marketplace_purchase"
  | "product_sale"
  | "loan_borrow"
  | "loan_repay"
  | "loan_interest"
  | "stock_buy"
  | "stock_sell"
  | "crypto_buy"
  | "crypto_sell"
  | "crypto_create"
  | "company_cost"
  | "gamble_bet"
  | "gamble_win"
  | "upgrade_purchase"
  | "account_creation";

export interface Transaction {
  _id: string;
  _creationTime: number;
  type: TransactionType;
  fromAccountId?: string;
  toAccountId?: string;
  amount: number; // in cents
  description: string;
  metadata?: Record<string, unknown>;
  balanceAfter?: number; // in cents, for the primary account
}

// Order (marketplace purchase)
export interface Order {
  _id: string;
  _creationTime: number;
  buyerAccountId: string;
  listingId: string;
  productId: string;
  companyId: string;
  quantity: number;
  pricePerUnit: number; // in cents
  totalAmount: number; // in cents
  transactionId: string;
  paidWithCrypto?: boolean;
  cryptoTokenId?: string;
}

// Stock
export interface Stock {
  _id: string;
  _creationTime: number;
  companyId: string;
  ticker: string; // same as company ticker
  totalShares: number;
  currentPrice: number; // in cents
  marketCap: number; // in cents
  priceHistory: PricePoint[];
}

export interface PricePoint {
  timestamp: number;
  price: number; // in cents
}

// Stock Holding
export interface StockHolding {
  _id: string;
  _creationTime: number;
  accountId: string;
  stockId: string;
  companyId: string;
  shares: number;
  averageCost: number; // in cents per share
}

// Crypto Token
export interface CryptoToken {
  _id: string;
  _creationTime: number;
  ticker: string; // starts with *, max 4 chars including *
  name: string;
  creatorAccountId: string;
  totalSupply: number; // 100,000,000
  currentPrice: number; // in cents
  priceHistory: PricePoint[];
}

// Crypto Holding
export interface CryptoHolding {
  _id: string;
  _creationTime: number;
  accountId: string;
  tokenId: string;
  amount: number;
  averageCost: number; // in cents per token
}

// Loan
export interface Loan {
  _id: string;
  _creationTime: number;
  accountId: string;
  principal: number; // in cents
  remainingPrincipal: number; // in cents
  interestRate: number; // 0.05 for 5% daily
  accruedInterest: number; // in cents
  lastAccrualDate: number; // timestamp
  status: "active" | "repaid" | "defaulted";
  nextPaymentDue?: number; // timestamp
}

// Offer (for company sales)
export type OfferStatus = "pending" | "countered" | "accepted" | "rejected";

export interface Offer {
  _id: string;
  _creationTime: number;
  companyId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number; // in cents
  percentage?: number; // ownership percentage
  status: OfferStatus;
  parentOfferId?: string; // for counter-offers
  resolvedAt?: number; // timestamp
  metadata?: Record<string, unknown>;
}

// Notification
export interface Notification {
  _id: string;
  _creationTime: number;
  userId: string;
  type: "offer" | "counter_offer" | "offer_accepted" | "offer_rejected" | "general";
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  relatedOfferId?: string;
}

// Upgrade
export interface Upgrade {
  _id: string;
  _creationTime: number;
  name: string;
  description: string;
  cost: number; // in cents
  iconUrl?: string;
  category: string;
}

// User Upgrade (purchased upgrades)
export interface UserUpgrade {
  _id: string;
  _creationTime: number;
  userId: string;
  upgradeId: string;
  purchasedAt: number; // timestamp
  transactionId: string;
}

// Collection Item (marketplace purchases by user)
export interface CollectionItem {
  _id: string;
  _creationTime: number;
  accountId: string;
  productId: string;
  companyId: string;
  quantity: number;
  totalPaid: number; // in cents
  averageCost: number; // in cents per item
}

// Tick Lock (for ensuring single tick execution)
export interface TickLock {
  _id: string;
  _creationTime: number;
  tickId: string;
  locked: boolean;
  lockedAt?: number;
  completedAt?: number;
}
