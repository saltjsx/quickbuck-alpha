import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Helper to get current user ID
async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
    .unique();

  return user?._id || null;
}

// Calculate employee bonus based on role and level
function calculateEmployeeBonus(employee: Doc<"employees">): {
  salesBoost: number;
  maintenanceReduction: number;
  qualityBoost: number;
  costReduction: number;
  efficiencyBoost: number;
} {
  const baseMultiplier = 0.02; // 2% per level
  const levelMultiplier = employee.level * baseMultiplier;
  const totalMultiplier = levelMultiplier * employee.bonusMultiplier;

  const bonuses = {
    salesBoost: 0,
    maintenanceReduction: 0,
    qualityBoost: 0,
    costReduction: 0,
    efficiencyBoost: 0,
  };

  // Apply role-specific bonuses
  switch (employee.role) {
    case "marketer":
      bonuses.salesBoost = totalMultiplier; // Boost sales rate
      break;
    case "engineer":
      bonuses.maintenanceReduction = totalMultiplier; // Reduce maintenance costs
      break;
    case "quality_control":
      bonuses.qualityBoost = totalMultiplier; // Improve product quality
      break;
    case "cost_optimizer":
      bonuses.costReduction = totalMultiplier; // Reduce production costs
      break;
    case "manager":
      bonuses.efficiencyBoost = totalMultiplier * 0.5; // Boost all by 50% of normal
      bonuses.salesBoost = totalMultiplier * 0.5;
      bonuses.maintenanceReduction = totalMultiplier * 0.5;
      bonuses.qualityBoost = totalMultiplier * 0.5;
      bonuses.costReduction = totalMultiplier * 0.5;
      break;
  }

  // Apply morale multiplier (50% morale = 50% effectiveness)
  const moraleMultiplier = employee.morale / 100;
  bonuses.salesBoost *= moraleMultiplier;
  bonuses.maintenanceReduction *= moraleMultiplier;
  bonuses.qualityBoost *= moraleMultiplier;
  bonuses.costReduction *= moraleMultiplier;
  bonuses.efficiencyBoost *= moraleMultiplier;

  return bonuses;
}

// Calculate total employee bonuses for a company
export const getCompanyEmployeeBonuses = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const employees = await ctx.db
      .query("employees")
      .withIndex("by_company_active", (q) =>
        q.eq("companyId", args.companyId).eq("isActive", true)
      )
      .collect();

    const totalBonuses = {
      salesBoost: 0,
      maintenanceReduction: 0,
      qualityBoost: 0,
      costReduction: 0,
      efficiencyBoost: 0,
    };

    for (const employee of employees) {
      const bonuses = calculateEmployeeBonus(employee);
      totalBonuses.salesBoost += bonuses.salesBoost;
      totalBonuses.maintenanceReduction += bonuses.maintenanceReduction;
      totalBonuses.qualityBoost += bonuses.qualityBoost;
      totalBonuses.costReduction += bonuses.costReduction;
      totalBonuses.efficiencyBoost += bonuses.efficiencyBoost;
    }

    return totalBonuses;
  },
});

// Get available NPC employees for hire
export const getAvailableNPCEmployees = query({
  args: {},
  handler: async (ctx) => {
    // Generate a pool of NPC employees with varied stats
    const roles = ["marketer", "engineer", "manager", "quality_control", "cost_optimizer"] as const;
    const names = [
      "Alex Johnson", "Sarah Chen", "Michael Brown", "Emma Davis", "James Wilson",
      "Olivia Martinez", "Robert Taylor", "Sophia Anderson", "William Thomas", "Isabella Garcia",
      "David Rodriguez", "Mia Lopez", "John Lee", "Charlotte White", "Daniel Harris",
      "Amelia Martin", "Joseph Thompson", "Harper Clark", "Christopher Lewis", "Evelyn Walker"
    ];

    const npcPool: Array<{
      name: string;
      role: typeof roles[number];
      level: number;
      salary: number;
      morale: number;
      satisfaction: number;
      bonusMultiplier: number;
      description: string;
    }> = [];

    // Generate 20 random NPCs
    for (let i = 0; i < 20; i++) {
      const role = roles[Math.floor(Math.random() * roles.length)];
      const level = Math.floor(Math.random() * 10) + 1; // 1-10
      const baseSalary = 1000 + (level * 500); // $1,000 to $5,500
      const bonusMultiplier = 1.0 + (Math.random() * 1.0); // 1.0-2.0

      let roleDescription = "";
      switch (role) {
        case "marketer":
          roleDescription = "Boosts product sales rate";
          break;
        case "engineer":
          roleDescription = "Reduces maintenance costs";
          break;
        case "quality_control":
          roleDescription = "Improves product quality";
          break;
        case "cost_optimizer":
          roleDescription = "Reduces production costs";
          break;
        case "manager":
          roleDescription = "Provides balanced boosts to all areas";
          break;
      }

      npcPool.push({
        name: names[i],
        role,
        level,
        salary: baseSalary,
        morale: 80 + Math.floor(Math.random() * 20), // 80-100
        satisfaction: 80 + Math.floor(Math.random() * 20), // 80-100
        bonusMultiplier,
        description: roleDescription,
      });
    }

    return npcPool;
  },
});

// Hire an employee
export const hireEmployee = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    type: v.union(v.literal("npc"), v.literal("player")),
    playerId: v.optional(v.id("users")),
    role: v.union(
      v.literal("marketer"),
      v.literal("engineer"),
      v.literal("manager"),
      v.literal("quality_control"),
      v.literal("cost_optimizer")
    ),
    level: v.number(),
    salary: v.number(),
    bonusMultiplier: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has access to company
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const access = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", args.companyId).eq("userId", userId)
      )
      .first();

    if (!access) throw new Error("No access to this company");

    // Validate level
    if (args.level < 1 || args.level > 10) {
      throw new Error("Employee level must be between 1 and 10");
    }

    // Validate salary
    if (args.salary <= 0) {
      throw new Error("Salary must be positive");
    }

    // If player employee, check if already employed by this company
    if (args.type === "player" && args.playerId) {
      const existingEmployee = await ctx.db
        .query("employees")
        .withIndex("by_company_active", (q) =>
          q.eq("companyId", args.companyId).eq("isActive", true)
        )
        .filter((q) => q.eq(q.field("playerId"), args.playerId))
        .first();

      if (existingEmployee) {
        throw new Error("This player is already employed by your company");
      }
    }

    // Create employee record
    const employeeId = await ctx.db.insert("employees", {
      companyId: args.companyId,
      name: args.name,
      type: args.type,
      playerId: args.playerId,
      role: args.role,
      level: args.level,
      salary: args.salary,
      morale: 85, // Start with good morale
      satisfaction: 85, // Start with good satisfaction
      bonusMultiplier: args.bonusMultiplier || 1.0,
      hiredAt: Date.now(),
      lastPayrollDate: Date.now(), // Set to now so first payroll is in 10 minutes
      isActive: true,
    });

    return {
      success: true,
      employeeId,
      message: `Successfully hired ${args.name}`,
    };
  },
});

// Fire an employee
export const fireEmployee = mutation({
  args: {
    employeeId: v.id("employees"),
    severancePay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const employee = await ctx.db.get(args.employeeId);
    if (!employee) throw new Error("Employee not found");

    // Check if user has access to company
    const access = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", employee.companyId).eq("userId", userId)
      )
      .first();

    if (!access) throw new Error("No access to this company");

    // Deactivate employee
    await ctx.db.patch(args.employeeId, {
      isActive: false,
    });

    // Optional severance payment
    if (args.severancePay && args.severancePay > 0) {
      const company = await ctx.db.get(employee.companyId);
      if (!company) throw new Error("Company not found");

      const companyAccount = await ctx.db.get(company.accountId);
      if (!companyAccount) throw new Error("Company account not found");

      const companyBalance = companyAccount.balance ?? 0;
      if (companyBalance >= args.severancePay) {
        // Get system account or create it
        let systemAccount = await ctx.db
          .query("accounts")
          .withIndex("by_name", (q) => q.eq("name", "System"))
          .first();

        if (!systemAccount) {
          let systemUser = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("name"), "System"))
            .first();

          if (!systemUser) {
            const systemUserId = await ctx.db.insert("users", {
              name: "System",
              email: "system@quickbuck.internal",
              tokenIdentifier: "system-internal-account",
            });
            systemUser = await ctx.db.get(systemUserId);
          }

          const systemAccountId = await ctx.db.insert("accounts", {
            name: "System",
            type: "personal",
            ownerId: systemUser!._id,
            balance: 0,
            createdAt: Date.now(),
          });

          systemAccount = await ctx.db.get(systemAccountId);
        }

        if (systemAccount) {
          // Deduct from company
          await ctx.db.patch(company.accountId, {
            balance: companyBalance - args.severancePay,
          });

          // Add to system (represents payment to employee)
          await ctx.db.patch(systemAccount._id, {
            balance: (systemAccount.balance ?? 0) + args.severancePay,
          });

          // Create ledger entry
          await ctx.db.insert("ledger", {
            fromAccountId: company.accountId,
            toAccountId: systemAccount._id,
            amount: args.severancePay,
            type: "transfer",
            description: `Severance payment for ${employee.name}`,
            createdAt: Date.now(),
          });
        }
      }
    }

    return {
      success: true,
      message: `${employee.name} has been terminated`,
    };
  },
});

// Get company employees
export const getCompanyEmployees = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const employees = await ctx.db
      .query("employees")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Enrich with bonus calculations
    const enrichedEmployees = employees.map((employee) => {
      const bonuses = calculateEmployeeBonus(employee);
      return {
        ...employee,
        bonuses,
      };
    });

    return enrichedEmployees;
  },
});

// Give bonus to employee
export const giveEmployeeBonus = mutation({
  args: {
    employeeId: v.id("employees"),
    bonusAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.bonusAmount <= 0) {
      throw new Error("Bonus amount must be positive");
    }

    const employee = await ctx.db.get(args.employeeId);
    if (!employee) throw new Error("Employee not found");

    // Check if user has access to company
    const company = await ctx.db.get(employee.companyId);
    if (!company) throw new Error("Company not found");

    const access = await ctx.db
      .query("companyAccess")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", employee.companyId).eq("userId", userId)
      )
      .first();

    if (!access) throw new Error("No access to this company");

    // Check company balance
    const companyAccount = await ctx.db.get(company.accountId);
    if (!companyAccount) throw new Error("Company account not found");

    const companyBalance = companyAccount.balance ?? 0;
    if (companyBalance < args.bonusAmount) {
      throw new Error("Insufficient company balance for bonus");
    }

    // Get system account
    let systemAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", "System"))
      .first();

    if (!systemAccount) {
      let systemUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("name"), "System"))
        .first();

      if (!systemUser) {
        const systemUserId = await ctx.db.insert("users", {
          name: "System",
          email: "system@quickbuck.internal",
          tokenIdentifier: "system-internal-account",
        });
        systemUser = await ctx.db.get(systemUserId);
      }

      const systemAccountId = await ctx.db.insert("accounts", {
        name: "System",
        type: "personal",
        ownerId: systemUser!._id,
        balance: 0,
        createdAt: Date.now(),
      });

      systemAccount = await ctx.db.get(systemAccountId);
    }

    if (!systemAccount) throw new Error("System account not found");

    // Process bonus payment
    await ctx.db.patch(company.accountId, {
      balance: companyBalance - args.bonusAmount,
    });

    await ctx.db.patch(systemAccount._id, {
      balance: (systemAccount.balance ?? 0) + args.bonusAmount,
    });

    // Create ledger entry
    await ctx.db.insert("ledger", {
      fromAccountId: company.accountId,
      toAccountId: systemAccount._id,
      amount: args.bonusAmount,
      type: "transfer",
      description: `Bonus payment to ${employee.name}`,
      createdAt: Date.now(),
    });

    // Increase morale and satisfaction
    const newMorale = Math.min(100, employee.morale + 10);
    const newSatisfaction = Math.min(100, employee.satisfaction + 10);

    await ctx.db.patch(args.employeeId, {
      morale: newMorale,
      satisfaction: newSatisfaction,
    });

    return {
      success: true,
      message: `Bonus of $${args.bonusAmount.toLocaleString()} paid to ${employee.name}`,
      newMorale,
      newSatisfaction,
    };
  },
});

// Process payroll (internal mutation, called by cron)
export const processPayroll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const tenMinutesAgo = now - (10 * 60 * 1000);

    // Get all active employees who haven't been paid in the last 10 minutes
    const employeesDue = await ctx.db
      .query("employees")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .filter((q) => q.lt(q.field("lastPayrollDate"), tenMinutesAgo))
      .collect();

    if (employeesDue.length === 0) {
      return { processed: 0, totalPaid: 0, failures: 0 };
    }

    let processed = 0;
    let totalPaid = 0;
    let failures = 0;

    // Group employees by company for batch processing
    const companiesMap = new Map<string, Array<Doc<"employees">>>();
    for (const employee of employeesDue) {
      const key = employee.companyId;
      if (!companiesMap.has(key)) {
        companiesMap.set(key, []);
      }
      companiesMap.get(key)!.push(employee);
    }

    // Get system account
    let systemAccount = await ctx.db
      .query("accounts")
      .withIndex("by_name", (q) => q.eq("name", "System"))
      .first();

    if (!systemAccount) {
      let systemUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("name"), "System"))
        .first();

      if (!systemUser) {
        const systemUserId = await ctx.db.insert("users", {
          name: "System",
          email: "system@quickbuck.internal",
          tokenIdentifier: "system-internal-account",
        });
        systemUser = await ctx.db.get(systemUserId);
      }

      const systemAccountId = await ctx.db.insert("accounts", {
        name: "System",
        type: "personal",
        ownerId: systemUser!._id,
        balance: 0,
        createdAt: Date.now(),
      });

      systemAccount = await ctx.db.get(systemAccountId);
    }

    if (!systemAccount) {
      return { processed: 0, totalPaid: 0, failures: employeesDue.length };
    }

    // Process each company's payroll
    for (const [companyIdStr, employees] of companiesMap) {
      try {
        const companyId = companyIdStr as Id<"companies">;
        const company = await ctx.db.get(companyId);
        if (!company) continue;

        const companyAccount = await ctx.db.get(company.accountId);
        if (!companyAccount) continue;

        const companyBalance = companyAccount.balance ?? 0;
        const totalPayroll = employees.reduce((sum, emp) => sum + emp.salary, 0);

        if (companyBalance >= totalPayroll) {
          // Company can afford payroll
          await ctx.db.patch(company.accountId, {
            balance: companyBalance - totalPayroll,
          });

          await ctx.db.patch(systemAccount._id, {
            balance: (systemAccount.balance ?? 0) + totalPayroll,
          });

          // Create ledger entry
          await ctx.db.insert("ledger", {
            fromAccountId: company.accountId,
            toAccountId: systemAccount._id,
            amount: totalPayroll,
            type: "payroll",
            description: `Payroll for ${employees.length} employees`,
            createdAt: now,
          });

          // Update each employee
          for (const employee of employees) {
            await ctx.db.patch(employee._id, {
              lastPayrollDate: now,
              morale: Math.max(0, employee.morale - 1), // Slight morale decay
            });
            processed++;
            totalPaid += employee.salary;
          }
        } else {
          // Company cannot afford payroll - decrease morale significantly
          for (const employee of employees) {
            const newMorale = Math.max(0, employee.morale - 15);
            await ctx.db.patch(employee._id, {
              morale: newMorale,
            });
            failures++;
          }
        }
      } catch (error) {
        console.error(`Payroll processing error for company ${companyIdStr}:`, error);
        failures += employees.length;
      }
    }

    return {
      processed,
      totalPaid,
      failures,
      companiesProcessed: companiesMap.size,
    };
  },
});

// Update employee morale (internal mutation, called periodically)
export const updateEmployeeMorale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const activeEmployees = await ctx.db
      .query("employees")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    let updated = 0;

    for (const employee of activeEmployees) {
      // Natural morale decay over time (1 point per hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      if (employee.lastPayrollDate < oneHourAgo) {
        const newMorale = Math.max(0, employee.morale - 1);
        await ctx.db.patch(employee._id, {
          morale: newMorale,
        });
        updated++;
      }
    }

    return { updated };
  },
});
