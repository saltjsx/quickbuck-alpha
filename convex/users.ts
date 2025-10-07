import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const CLERK_API_BASE = "https://api.clerk.com/v1";

type ClerkUserResponse = {
  username?: string | null;
  primary_username?: string | null;
  email_addresses?: Array<{ email_address: string }>;
  image_url?: string | null;
  profile_image_url?: string | null;
};

function resolveClerkSecret(): string | undefined {
  return (
    process.env.CLERK_SECRET_KEY ??
    process.env.CLERK_API_KEY ??
    process.env.CLERK_BEARER_TOKEN ??
    undefined
  );
}

async function fetchClerkUser(
  userId: string,
  secret: string
): Promise<ClerkUserResponse | null> {
  if (!secret) return null;

  try {
    const response = await fetch(`${CLERK_API_BASE}/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("Failed to fetch Clerk user", {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    return (await response.json()) as ClerkUserResponse;
  } catch (error) {
    console.warn("Error fetching Clerk user", error);
    return null;
  }
}

function resolveImageUrl(
  identity: any,
  clerkUser: ClerkUserResponse | null
): string | null {
  return (
    clerkUser?.image_url ??
    clerkUser?.profile_image_url ??
    identity?.pictureUrl ??
    identity?.imageUrl ??
    null
  );
}

function resolveUsername(
  identity: any,
  clerkUser: ClerkUserResponse | null
): string | null {
  return (
    clerkUser?.username ??
    clerkUser?.primary_username ??
    identity?.username ??
    identity?.nickname ??
    null
  );
}

export const findUserByToken = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Check if we've already stored this identity before
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (user !== null) {
      return user;
    }

    return null;
  },
});

export const upsertUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const secret = resolveClerkSecret();
    let pictureUrl = (identity as any).pictureUrl ?? (identity as any).imageUrl ?? null;
    let nickname =
      (identity as any).username ?? (identity as any).nickname ?? null;

    let clerkUser: ClerkUserResponse | null = null;
    if ((!pictureUrl || !nickname) && secret) {
      clerkUser = await fetchClerkUser(identity.subject, secret);
      if (clerkUser) {
        if (!pictureUrl) {
          pictureUrl = resolveImageUrl(identity, clerkUser);
        }
        if (!nickname) {
          nickname = resolveUsername(identity, clerkUser);
        }
      }
    }

    const emailFromIdentity = (identity as any).email ?? null;

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      // Update if needed
      const updates: Record<string, any> = {};

      if (existingUser.name !== identity.name) {
        updates.name = identity.name;
      }

      if (emailFromIdentity && existingUser.email !== emailFromIdentity) {
        updates.email = emailFromIdentity;
      }

      if (pictureUrl && existingUser.image !== pictureUrl) {
        updates.image = pictureUrl;
      }

      if (nickname && existingUser.username !== nickname) {
        updates.username = nickname;
      }

      if (!pictureUrl && secret) {
        clerkUser = clerkUser ?? (await fetchClerkUser(identity.subject, secret));
        const remotePicture = resolveImageUrl(identity, clerkUser);
        if (remotePicture && existingUser.image !== remotePicture) {
          updates.image = remotePicture;
        }
      }

      if (!nickname && secret) {
        clerkUser = clerkUser ?? (await fetchClerkUser(identity.subject, secret));
        const remoteNickname = resolveUsername(identity, clerkUser);
        if (remoteNickname && existingUser.username !== remoteNickname) {
          updates.username = remoteNickname;
        }
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existingUser._id, updates);
        return { ...existingUser, ...updates };
      }

      return existingUser;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: identity.name,
      email: emailFromIdentity ?? undefined,
      image: pictureUrl ?? undefined,
      username: nickname ?? undefined,
      tokenIdentifier: identity.subject,
    });

    return await ctx.db.get(userId);
  },
});

export const syncAllProfiles = mutation({
  args: {},
  handler: async (ctx) => {
    const secret = resolveClerkSecret();
    if (!secret) {
      throw new Error("Missing Clerk API secret; set CLERK_SECRET_KEY for Convex");
    }

    // OPTIMIZED: Use take() with batching to avoid full table scan
    const users = await ctx.db.query("users").take(200);
    let updated = 0;

    for (const user of users) {
      const clerkUser = await fetchClerkUser(user.tokenIdentifier, secret);
      if (!clerkUser) continue;

      const nextImage = resolveImageUrl({}, clerkUser);
      const nextUsername = resolveUsername({}, clerkUser);

      const updates: Record<string, any> = {};
      if (nextImage && user.image !== nextImage) {
        updates.image = nextImage;
      }
      if (nextUsername && user.username !== nextUsername) {
        updates.username = nextUsername;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
        updated += 1;
      }
    }

    return { total: users.length, updated };
  },
});

// Update user's username
export const updateUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if username is already taken
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUser && existingUser.tokenIdentifier !== identity.subject) {
      throw new Error("Username already taken");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    // Update username
    await ctx.db.patch(user._id, {
      username: args.username,
    });

    return { success: true };
  },
});

// OPTIMIZED: Combined query for dashboard overview
// This reduces multiple separate queries into one for better performance
export const getDashboardOverview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return null;
    const userId = user._id;

    // Get personal account
    // OPTIMIZED: Use compound index to avoid filter after withIndex
    const personalAccount = await ctx.db
      .query("accounts")
      .withIndex("by_owner_type", (q) => q.eq("ownerId", userId).eq("type", "personal"))
      .first();

    // Get company access and companies
    const companyAccess = await ctx.db
      .query("companyAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const companyIds = companyAccess.map(a => a.companyId);
    const companies = await Promise.all(companyIds.map(id => ctx.db.get(id)));
    const validCompanies = companies.filter(Boolean);

    // Batch fetch company accounts
    const accountIds = validCompanies.map((c: any) => c.accountId);
    const accounts = await Promise.all(accountIds.map(id => ctx.db.get(id)));
    
    const accountBalanceMap = new Map();
    accounts.forEach((account: any) => {
      if (account) {
        accountBalanceMap.set(account._id, account.balance ?? 0);
      }
    });

    const enrichedCompanies = validCompanies.map((company: any, index) => {
      const access = companyAccess.find(a => a.companyId === company._id);
      return {
        ...company,
        balance: accountBalanceMap.get(company.accountId) ?? 0,
        role: access?.role || "viewer",
      };
    });

    // Get portfolio
    // OPTIMIZED: Use compound index to avoid filter after withIndex
    const holdings = await ctx.db
      .query("stocks")
      .withIndex("by_holder_holderType", (q) => q.eq("holderId", userId).eq("holderType", "user"))
      .collect();

    // Batch fetch companies for portfolio
    const portfolioCompanyIds = [...new Set(holdings.map((h: any) => h.companyId))];
    const portfolioCompanies = await Promise.all(
      portfolioCompanyIds.map(id => ctx.db.get(id))
    );
    
    const portfolioCompanyMap = new Map();
    portfolioCompanies.forEach((company: any) => {
      if (company) {
        portfolioCompanyMap.set(company._id, company);
      }
    });

    const portfolio = holdings.map((holding: any) => {
      const company = portfolioCompanyMap.get(holding.companyId);
      if (!company) return null;

      const currentValue = holding.shares * company.sharePrice;
      const costBasis = holding.shares * holding.averagePurchasePrice;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      return {
        ...holding,
        companyName: company.name,
        companyTicker: company.ticker,
        currentPrice: company.sharePrice,
        currentValue,
        costBasis,
        gainLoss,
        gainLossPercent,
      };
    }).filter(Boolean);

    return {
      personalAccount,
      companies: enrichedCompanies,
      portfolio,
      totalCompanies: enrichedCompanies.length,
      portfolioValue: portfolio.reduce((sum: number, p: any) => sum + (p?.currentValue || 0), 0),
    };
  },
});
