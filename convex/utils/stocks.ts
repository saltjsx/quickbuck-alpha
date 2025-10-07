import type { Doc, Id } from "../_generated/dataModel";

export type CompanyDoc = Doc<"companies">;
export type StockDoc = Doc<"stocks">;

export type OwnershipSnapshot = {
  ownerShares: number;
  ownerEquityValue: number;
  externalShares: number;
  treasuryShares: number;
};

export function computeOwnerMetricsFromHoldings(
  company: CompanyDoc,
  holdings: StockDoc[],
  ownerId: Id<"users">
): OwnershipSnapshot {
  const totalShares = Math.max(company.totalShares ?? 0, 0);
  if (totalShares === 0) {
    return {
      ownerShares: 0,
      ownerEquityValue: 0,
      externalShares: 0,
      treasuryShares: 0,
    };
  }

  let recordedOwnerShares = 0;
  let externalShares = 0;

  for (const holding of holdings) {
    const shares = Math.max(holding.shares ?? 0, 0);
    if (holding.holderType === "user") {
      if (holding.holderId === ownerId) {
        recordedOwnerShares += shares;
      } else {
        externalShares += shares;
      }
    } else if (holding.holderType === "company") {
      if (holding.holderId !== company._id) {
        // Shares held by other companies count as external ownership
        externalShares += shares;
      }
      // Shares held by the company itself are treated as treasury stock
    }
  }

  externalShares = Math.min(externalShares, totalShares);
  const impliedOwnerShares = Math.max(totalShares - externalShares, 0);

  let ownerShares = recordedOwnerShares > 0
    ? Math.max(recordedOwnerShares, impliedOwnerShares)
    : impliedOwnerShares;

  ownerShares = Math.min(ownerShares, totalShares);
  const treasuryShares = Math.max(totalShares - (ownerShares + externalShares), 0);
  const sharePrice = Math.max(company.sharePrice ?? 0, 0);
  const ownerEquityValue = ownerShares * sharePrice;

  return {
    ownerShares,
    ownerEquityValue,
    externalShares,
    treasuryShares,
  };
}

type FairValueInput = {
  company: CompanyDoc;
  cashBalance: number;
  sentimentOverride?: number;
};

export function calculateFairValue({
  company,
  cashBalance,
  sentimentOverride,
}: FairValueInput): number {
  const totalShares = Math.max(company.totalShares ?? 0, 1);
  const sentiment = Math.min(
    Math.max(sentimentOverride ?? company.marketSentiment ?? 1,
      0.6),
    1.4
  );

  const annualRevenue = Math.max(company.monthlyRevenue ?? 0, 0) * 12;
  const cashPerShare = cashBalance / totalShares;
  const revenuePerShare = annualRevenue / totalShares;

  // Blend revenue and cash for a fundamentals-based anchor
  const fundamentalsValue = cashPerShare * 0.35 + revenuePerShare * 0.65;

  // Growth premium rewards higher revenue per share without letting it explode
  const growthPremium = Math.min(revenuePerShare * 0.25, fundamentalsValue * 0.5);

  const anchoredPrice = Math.max(company.sharePrice ?? fundamentalsValue, 0.01);

  let fairValue = (fundamentalsValue + growthPremium) * sentiment;

  // Keep price anchored to the recent trading price to avoid extreme jumps
  fairValue = (fairValue * 0.5) + (anchoredPrice * 0.5);

  if (!Number.isFinite(fairValue) || fairValue <= 0) {
    return Math.max(anchoredPrice, 0.01);
  }

  return Math.max(0.01, fairValue);
}
