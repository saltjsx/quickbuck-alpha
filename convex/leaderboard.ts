import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { computeOwnerMetricsFromHoldings } from "./utils/stocks";

const DEFAULT_LIMIT = 5;
const SAMPLE_MULTIPLIER = 3; // Reduced from 4 to 3 to fetch fewer candidates

type AccountDoc = Doc<"accounts">;
type UserDoc = Doc<"users">;
type CompanyDoc = Doc<"companies">;
type ProductDoc = Doc<"products">;
type StockDoc = Doc<"stocks">;

function formatPlayerName(user: UserDoc | null | undefined): {
  displayName: string;
  username?: string | null;
} {
  if (!user) {
    return { displayName: "Unknown Player", username: null };
  }

  const displayName = user.name ?? user.username ?? user.email ?? "Unknown Player";
  return { displayName, username: user.username ?? null };
}

function normalizeImageUrl(url?: string | null) {
  if (!url) return null;
  if (/^(?:https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
    const normalized = url.startsWith("/") ? url : `/${url}`;
    return normalized.replace(/\/+/g, "/");
}

function normalizeLimit(requestedLimit?: number) {
  if (!requestedLimit || requestedLimit < 1) return DEFAULT_LIMIT;
  return Math.min(requestedLimit, 25);
}

// Get all companies with full statistics
export const getAllCompanies = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // BANDWIDTH OPTIMIZATION: Reduced from 200 to 100 by default, max 150
    // Most users only view top 10-20 companies on leaderboards
    const limit = Math.min(args.limit || 100, 150);
    const companies = await ctx.db.query("companies").take(limit);
    
    // Batch fetch all accounts
    const accountIds = companies.map(c => c.accountId);
    const accounts = await Promise.all(accountIds.map(id => ctx.db.get(id)));
    
    // Create balance map
    const balanceMap = new Map();
    accounts.forEach((account: any) => {
      if (account) {
        balanceMap.set(account._id, account.balance ?? 0);
      }
    });
    
    // Batch fetch owners
    const ownerIds = companies.map(c => c.ownerId);
    const owners = await Promise.all(ownerIds.map(id => ctx.db.get(id)));
    
    // Create owner map
    const ownerMap = new Map();
    owners.forEach((owner: any, index) => {
      if (owner) {
        ownerMap.set(ownerIds[index], owner.name || "Unknown");
      }
    });

    // Batch fetch stock holdings for all companies
    const allCompanyHoldings = await Promise.all(
      companies.map(company =>
        ctx.db
          .query("stocks")
          .withIndex("by_holder_holderType", (q) => q.eq("holderId", company._id).eq("holderType", "company"))
          .take(50) // Limit holdings per company
      )
    );

    // Get unique company IDs from all holdings
    const heldCompanyIds = [...new Set(allCompanyHoldings.flat().map((h: any) => h.companyId))];
    const heldCompanies = await Promise.all(heldCompanyIds.map(id => ctx.db.get(id)));
    const heldCompanyMap = new Map();
    heldCompanies.forEach((company: any) => {
      if (company) {
        heldCompanyMap.set(company._id, company);
      }
    });

    const enrichedCompanies = companies.map((company, index) => {
      const holdings = allCompanyHoldings[index] as StockDoc[];
      
      // Calculate stock portfolio value
      let portfolioValue = 0;
      for (const holding of holdings) {
        const heldCompany = heldCompanyMap.get(holding.companyId);
        if (heldCompany) {
          portfolioValue += (holding.shares ?? 0) * (heldCompany.sharePrice ?? 0);
        }
      }

      const balance = balanceMap.get(company.accountId) ?? 0;
      const netWorth = balance + portfolioValue;

      return {
        _id: company._id,
        name: company.name,
        ticker: company.ticker,
        sharePrice: company.sharePrice ?? 0,
        totalShares: company.totalShares ?? 0,
        marketCap: (company.sharePrice ?? 0) * (company.totalShares ?? 0),
        balance,
        portfolioValue,
        netWorth,
        isPublic: company.isPublic ?? false,
        monthlyRevenue: company.monthlyRevenue ?? 0,
        ownerName: ownerMap.get(company.ownerId) || "Unknown",
        logoUrl: normalizeImageUrl(company.logoUrl),
        createdAt: company.createdAt,
      };
    });

    return enrichedCompanies;
  },
});

// Get all players with full statistics
export const getAllPlayers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // BANDWIDTH OPTIMIZATION: Reduced from 200 to 100 by default, max 150
    // Most users only view top 10-20 players on leaderboards
    const limit = Math.min(args.limit || 100, 150);
    const users = await ctx.db.query("users").take(limit);
    
    // Batch fetch personal accounts
    const userIds = users.map(u => u._id);
    const accountsResults = await Promise.all(
      userIds.map(userId =>
        ctx.db
          .query("accounts")
          .withIndex("by_owner_type", (q) => q.eq("ownerId", userId).eq("type", "personal"))
          .first()
      )
    );
    
    const accountMap = new Map();
    accountsResults.forEach((account, index) => {
      if (account) {
        accountMap.set(userIds[index], account);
      }
    });

    // BANDWIDTH OPTIMIZATION: Only fetch stock holdings for users who have accounts
    const usersWithAccounts = userIds.filter(id => accountMap.has(id));
    const allHoldings = await Promise.all(
      usersWithAccounts.map(userId =>
        ctx.db
          .query("stocks")
          .withIndex("by_holder_holderType", (q) => q.eq("holderId", userId).eq("holderType", "user"))
          .take(50) // BANDWIDTH OPTIMIZATION: Limit holdings per user
      )
    );

    // Get unique company IDs from all holdings
    const companyIds = [...new Set(allHoldings.flat().map((h: any) => h.companyId))];
    const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));
    const companyMap = new Map();
    companies.forEach((company: any) => {
      if (company) {
        companyMap.set(company._id, company);
      }
    });

    // Build holdings map
    const holdingsMap = new Map();
    usersWithAccounts.forEach((userId, index) => {
      holdingsMap.set(userId, allHoldings[index] as StockDoc[]);
    });

    const ownedCompaniesResults = await Promise.all(
      userIds.map((userId) =>
        ctx.db
          .query("companies")
          .withIndex("by_owner", (q) => q.eq("ownerId", userId))
          .take(25)
      )
    );

    const companyRefs: Array<{ userId: Id<"users">; company: CompanyDoc }> = [];
    ownedCompaniesResults.forEach((companies, index) => {
      companies.forEach((company) => {
        companyRefs.push({ userId: userIds[index], company: company as CompanyDoc });
      });
    });

    const companyHoldings = await Promise.all(
      companyRefs.map((ref) =>
        ctx.db
          .query("stocks")
          .withIndex("by_company", (q) => q.eq("companyId", ref.company._id))
          .take(500)
      )
    );

    const ownerEquityMap = new Map<Id<"users">, number>();
    companyRefs.forEach((ref, index) => {
      const holdings = companyHoldings[index] as StockDoc[];
      const snapshot = computeOwnerMetricsFromHoldings(ref.company, holdings ?? [], ref.userId);
      const current = ownerEquityMap.get(ref.userId) ?? 0;
      ownerEquityMap.set(ref.userId, current + snapshot.ownerEquityValue);
    });

    const enrichedPlayers = users.map((user) => {
      const account = accountMap.get(user._id);
      const holdings = holdingsMap.get(user._id) || [];
      
      let portfolioValue = 0;
      for (const holding of holdings) {
        const company = companyMap.get(holding.companyId);
        if (company) {
          portfolioValue += (holding.shares ?? 0) * (company.sharePrice ?? 0);
        }
      }

      const cashBalance = account?.balance ?? 0;
      const ownerEquityValue = ownerEquityMap.get(user._id) ?? 0;
      const netWorth = cashBalance + portfolioValue + ownerEquityValue;

      return {
        _id: user._id,
        name: formatPlayerName(user).displayName,
        username: user.username,
        email: user.email,
        avatarUrl: normalizeImageUrl(user.image),
        cashBalance,
        portfolioValue,
        ownerEquityValue,
        netWorth,
        totalHoldings: holdings.length,
      };
    });

    return enrichedPlayers;
  },
});

// Get all products with full statistics
export const getAllProducts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // BANDWIDTH OPTIMIZATION: Reduced from 400 to 200 by default, max 300
    // Most users only view top 10-20 products on leaderboards
    const limit = Math.min(args.limit || 200, 300);
    const products = await ctx.db.query("products").take(limit);

    // Batch fetch all companies
    const companyIds = [...new Set(products.map(p => p.companyId))];
    const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));
    
    const companyMap = new Map();
    companies.forEach((company: any) => {
      if (company) {
        companyMap.set(company._id, {
          name: company.name,
          ticker: company.ticker,
          logoUrl: company.logoUrl,
        });
      }
    });

    const enrichedProducts = products.map((product) => {
      const company = companyMap.get(product.companyId);
      return {
        _id: product._id,
        name: product.name,
        price: product.price ?? 0,
        totalSales: product.totalSales ?? 0,
        totalRevenue: product.totalRevenue ?? 0,
        totalCosts: product.totalCosts ?? 0,
        profit: (product.totalRevenue ?? 0) - (product.totalCosts ?? 0),
        isActive: product.isActive ?? false,
        quality: product.quality ?? 100,
        companyName: company?.name || "Unknown",
        companyTicker: company?.ticker,
        companyLogoUrl: normalizeImageUrl(company?.logoUrl),
        imageUrl: normalizeImageUrl(product.imageUrl),
        createdAt: product.createdAt,
      };
    });

    return enrichedProducts;
  },
});

export const getLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeLimit(args.limit);
    const sampleSize = Math.max(limit * SAMPLE_MULTIPLIER, limit);

    // --- Top cash players --------------------------------------------------
    const personalAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_type_balance", (q) => q.eq("type", "personal"))
      .order("desc")
      .take(sampleSize);

    const personalAccountMap = new Map<Id<"users">, AccountDoc>();
    for (const account of personalAccounts) {
      personalAccountMap.set(account.ownerId, account);
    }

    const userIds = Array.from(personalAccountMap.keys());
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map<Id<"users">, UserDoc | null>();
    userIds.forEach((id, index) => {
      userMap.set(id, (users[index] as UserDoc | null) ?? null);
    });

    const highestBalancePlayers = personalAccounts.slice(0, limit).map((account) => {
      const user = userMap.get(account.ownerId) ?? null;
      const { displayName, username } = formatPlayerName(user);
      const avatarUrl = normalizeImageUrl(user?.image ?? null);
      return {
        accountId: account._id,
        userId: account.ownerId,
        name: displayName,
        username,
        avatarUrl,
        balance: account.balance ?? 0,
      };
    });

    // --- Net worth ranking -------------------------------------------------
    // OPTIMIZED: Limit candidate set to avoid excessive processing
    const candidateUserIds = new Set<Id<"users">>(userIds);

    // Only consider top stockholders (limit to 50 to avoid excessive queries)
    const topHoldings = await ctx.db
      .query("stocks")
      .withIndex("by_holderType_shares", (q) => q.eq("holderType", "user"))
      .order("desc")
      .take(Math.min(sampleSize, 50)); // Cap at 50 top holdings

    for (const holding of topHoldings) {
      if (holding.holderType === "user") {
        candidateUserIds.add(holding.holderId as Id<"users">);
      }
    }
    
    // OPTIMIZED: Stop processing if we have too many candidates
    if (candidateUserIds.size > 150) {
      // Keep only the top cash holders
      const sortedByBalance = Array.from(candidateUserIds)
        .map(id => ({ id, balance: personalAccountMap.get(id)?.balance ?? 0 }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 75);
      
      candidateUserIds.clear();
      sortedByBalance.forEach(item => candidateUserIds.add(item.id));
    }

    for (const userId of Array.from(candidateUserIds)) {
      if (!personalAccountMap.has(userId)) {
        // OPTIMIZED: Use compound index to avoid filter after withIndex
        const account = await ctx.db
          .query("accounts")
          .withIndex("by_owner_type", (q) => q.eq("ownerId", userId).eq("type", "personal"))
          .first();

        if (account) {
          personalAccountMap.set(userId, account);
        } else {
          candidateUserIds.delete(userId);
          continue;
        }
      }

      if (!userMap.has(userId)) {
        const user = (await ctx.db.get(userId)) as UserDoc | null;
        userMap.set(userId, user ?? null);
      }
    }

    const companyCache = new Map<Id<"companies">, CompanyDoc | null>();
    const getCompany = async (companyId: Id<"companies">) => {
      if (!companyCache.has(companyId)) {
        const company = (await ctx.db.get(companyId)) as CompanyDoc | null;
        companyCache.set(companyId, company ?? null);
      }
      return companyCache.get(companyId);
    };

    const ownedCompaniesResults = await Promise.all(
      Array.from(candidateUserIds).map((userId) =>
        ctx.db
          .query("companies")
          .withIndex("by_owner", (q) => q.eq("ownerId", userId))
          .take(25)
      )
    );

    const ownedCompanyRefs: Array<{ userId: Id<"users">; company: CompanyDoc }> = [];
    Array.from(candidateUserIds).forEach((userId, index) => {
      const companies = ownedCompaniesResults[index];
      companies.forEach((company) => {
        const typedCompany = company as CompanyDoc;
        ownedCompanyRefs.push({ userId, company: typedCompany });
        if (!companyCache.has(typedCompany._id)) {
          companyCache.set(typedCompany._id, typedCompany);
        }
      });
    });

    const ownedCompanyHoldings = await Promise.all(
      ownedCompanyRefs.map((ref) =>
        ctx.db
          .query("stocks")
          .withIndex("by_company", (q) => q.eq("companyId", ref.company._id))
          .take(200) // Increased from 50 to 200 for accurate ownership calculation
      )
    );

    const ownerEquityMap = new Map<Id<"users">, number>();
    ownedCompanyRefs.forEach((ref, index) => {
      const holdings = ownedCompanyHoldings[index] as StockDoc[];
      const snapshot = computeOwnerMetricsFromHoldings(ref.company, holdings ?? [], ref.userId);
      const current = ownerEquityMap.get(ref.userId) ?? 0;
      ownerEquityMap.set(ref.userId, current + snapshot.ownerEquityValue);
    });

    const netWorthEntries: {
      accountId: Id<"accounts">;
      userId: Id<"users">;
      name: string;
      username?: string | null;
      avatarUrl: string | null;
      cashBalance: number;
      portfolioValue: number;
      ownerEquityValue: number;
      netWorth: number;
    }[] = [];

    // OPTIMIZED: Batch fetch all holdings for all candidates at once
    // OPTIMIZED: Use compound index to avoid filter after withIndex
    const allUserHoldings = await Promise.all(
      Array.from(candidateUserIds).map(userId =>
        ctx.db
          .query("stocks")
          .withIndex("by_holder_holderType", (q) => q.eq("holderId", userId).eq("holderType", "user"))
          .collect()
      )
    );

    const userHoldingsMap = new Map<Id<"users">, StockDoc[]>();
    Array.from(candidateUserIds).forEach((userId, index) => {
      userHoldingsMap.set(userId, allUserHoldings[index] as StockDoc[]);
    });

    for (const userId of candidateUserIds) {
      const account = personalAccountMap.get(userId);
      if (!account) continue;

      const user = userMap.get(userId) ?? null;
      const { displayName, username } = formatPlayerName(user);
      const avatarUrl = normalizeImageUrl(user?.image ?? null);

      const holdings = userHoldingsMap.get(userId) ?? [];

      let portfolioValue = 0;
      for (const holding of holdings) {
        if (holding.holderType !== "user") continue;
        const company = await getCompany(holding.companyId);
        if (!company) continue;
        const shares = holding.shares ?? 0;
        const sharePrice = company.sharePrice ?? 0;
        portfolioValue += shares * sharePrice;
      }

      const cashBalance = account.balance ?? 0;
      const ownerEquityValue = ownerEquityMap.get(userId) ?? 0;
      netWorthEntries.push({
        accountId: account._id,
        userId,
        name: displayName,
        username,
        avatarUrl,
        cashBalance,
        portfolioValue,
        ownerEquityValue,
        netWorth: cashBalance + portfolioValue + ownerEquityValue,
      });
    }

    const highestNetWorthPlayers = netWorthEntries
      .sort((a, b) => b.netWorth - a.netWorth)
      .slice(0, limit);

    // --- Companies ---------------------------------------------------------
    const companyAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_type_balance", (q) => q.eq("type", "company"))
      .order("desc")
      .take(sampleSize);

    for (const account of companyAccounts) {
      if (!account.companyId) continue;
      if (!companyCache.has(account.companyId)) {
        const company = (await ctx.db.get(account.companyId)) as CompanyDoc | null;
        companyCache.set(account.companyId, company ?? null);
      }
    }

    // Batch fetch company stock holdings
    const companyIds = companyAccounts
      .map(acc => acc.companyId)
      .filter((id): id is Id<"companies"> => id !== undefined);
    
    // OPTIMIZED: Use compound index to avoid filter after withIndex
    const companyHoldingsResults = await Promise.all(
      companyIds.map(companyId =>
        ctx.db
          .query("stocks")
          .withIndex("by_holder_holderType", (q) => q.eq("holderId", companyId).eq("holderType", "company"))
          .take(50) // Limit holdings per company
      )
    );

    const companyHoldingsMap = new Map<Id<"companies">, StockDoc[]>();
    companyIds.forEach((companyId, index) => {
      companyHoldingsMap.set(companyId, companyHoldingsResults[index] as StockDoc[]);
    });

    const mostCashCompanies = companyAccounts
      .filter((account) => account.companyId && companyCache.get(account.companyId))
      .slice(0, limit)
      .map((account) => {
        const company = companyCache.get(account.companyId!)!;
        const holdings = companyHoldingsMap.get(company._id) ?? [];
        
        let portfolioValue = 0;
        for (const holding of holdings) {
          const heldCompany = companyCache.get(holding.companyId);
          if (heldCompany) {
            portfolioValue += (holding.shares ?? 0) * (heldCompany.sharePrice ?? 0);
          }
        }

        const sharePrice = company.sharePrice ?? 0;
        const totalShares = company.totalShares ?? 0;
        const cashBalance = account.balance ?? 0;
        const logoUrl = normalizeImageUrl(company.logoUrl ?? null);
        return {
          companyId: company._id,
          name: company.name,
          ticker: company.ticker,
          sharePrice,
          totalShares,
          marketCap: sharePrice * totalShares,
          balance: cashBalance,
          portfolioValue,
          netWorth: cashBalance + portfolioValue,
          logoUrl,
        };
      });

    const sharePriceLeaders = await ctx.db
      .query("companies")
      .withIndex("by_sharePrice")
      .order("desc")
      .take(sampleSize);

    const totalShareLeaders = await ctx.db
      .query("companies")
      .withIndex("by_totalShares")
      .order("desc")
      .take(sampleSize);

    const companyCandidates = new Map<Id<"companies">, CompanyDoc>();
    const addCompanyCandidate = (company: CompanyDoc | null | undefined) => {
      if (!company) return;
      companyCandidates.set(company._id, company);
      if (!companyCache.has(company._id)) {
        companyCache.set(company._id, company);
      }
    };

    for (const account of companyAccounts) {
      if (!account.companyId) continue;
      addCompanyCandidate(companyCache.get(account.companyId) ?? null);
    }
    for (const company of sharePriceLeaders as CompanyDoc[]) {
      addCompanyCandidate(company);
    }
    for (const company of totalShareLeaders as CompanyDoc[]) {
      addCompanyCandidate(company);
    }

    // Fetch holdings for companies not already in companyHoldingsMap
    const additionalCompanyIds = Array.from(companyCandidates.keys())
      .filter(id => !companyHoldingsMap.has(id));
    
    if (additionalCompanyIds.length > 0) {
      // OPTIMIZED: Use compound index to avoid filter after withIndex
      const additionalHoldingsResults = await Promise.all(
        additionalCompanyIds.map(companyId =>
          ctx.db
            .query("stocks")
            .withIndex("by_holder_holderType", (q) => q.eq("holderId", companyId).eq("holderType", "company"))
            .take(50)
        )
      );

      additionalCompanyIds.forEach((companyId, index) => {
        companyHoldingsMap.set(companyId, additionalHoldingsResults[index] as StockDoc[]);
      });
    }

    const mostValuableCompanies = Array.from(companyCandidates.values())
      .map((company) => {
        const holdings = companyHoldingsMap.get(company._id) ?? [];
        
        let portfolioValue = 0;
        for (const holding of holdings) {
          const heldCompany = companyCache.get(holding.companyId);
          if (heldCompany) {
            portfolioValue += (holding.shares ?? 0) * (heldCompany.sharePrice ?? 0);
          }
        }

        const sharePrice = company.sharePrice ?? 0;
        const totalShares = company.totalShares ?? 0;
        const logoUrl = normalizeImageUrl(company.logoUrl ?? null);
        return {
          companyId: company._id,
          name: company.name,
          ticker: company.ticker,
          sharePrice,
          totalShares,
          marketCap: sharePrice * totalShares,
          portfolioValue,
          netWorth: portfolioValue, // For most valuable companies, net worth is just portfolio (no cash balance included)
          logoUrl,
        };
      })
      .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
      .slice(0, limit);

    // --- Products ----------------------------------------------------------
    const products = await ctx.db
      .query("products")
      .withIndex("by_active_totalSales", (q) => q.eq("isActive", true))
      .order("desc")
      .take(sampleSize);

    const bestSellingProducts = [] as {
      productId: Id<"products">;
      name: string;
      totalSales: number;
      price: number;
      companyId: Id<"companies">;
      companyName: string;
      companyTicker?: string;
      companyLogoUrl: string | null;
      imageUrl: string | null;
    }[];

    for (const product of products as ProductDoc[]) {
      const company = await getCompany(product.companyId);
      const companyLogoUrl = normalizeImageUrl(company?.logoUrl ?? null);
      const imageUrl = normalizeImageUrl(product.imageUrl ?? null);
      bestSellingProducts.push({
        productId: product._id,
        name: product.name,
        totalSales: product.totalSales ?? 0,
        price: product.price ?? 0,
        companyId: product.companyId,
        companyName: company?.name ?? "Unknown Company",
        companyTicker: company?.ticker,
        companyLogoUrl,
        imageUrl,
      });
    }

    bestSellingProducts.sort((a, b) => (b.totalSales ?? 0) - (a.totalSales ?? 0));

    return {
      highestBalancePlayers,
      highestNetWorthPlayers,
      mostValuableCompanies,
      mostCashCompanies,
      bestSellingProducts: bestSellingProducts.slice(0, limit),
      lastUpdated: Date.now(),
    };
  },
});
