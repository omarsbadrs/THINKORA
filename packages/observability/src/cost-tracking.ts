/**
 * Cost tracking — Track LLM API spend against daily and monthly budgets.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CostRecord {
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  timestamp: number;
}

export interface BudgetUsage {
  daily: { used: number; limit: number; percent: number };
  monthly: { used: number; limit: number; percent: number };
}

// ---------------------------------------------------------------------------
// Configuration (can be overridden via constructor)
// ---------------------------------------------------------------------------

export interface CostTrackerOptions {
  dailyBudgetUsd?: number;
  monthlyBudgetUsd?: number;
}

const DEFAULT_DAILY_BUDGET = 10; // $10/day
const DEFAULT_MONTHLY_BUDGET = 200; // $200/month

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

export class CostTracker {
  private records: CostRecord[] = [];
  private readonly dailyBudget: number;
  private readonly monthlyBudget: number;

  constructor(options?: CostTrackerOptions) {
    this.dailyBudget = options?.dailyBudgetUsd ?? DEFAULT_DAILY_BUDGET;
    this.monthlyBudget = options?.monthlyBudgetUsd ?? DEFAULT_MONTHLY_BUDGET;
  }

  // -----------------------------------------------------------------------
  // Recording
  // -----------------------------------------------------------------------

  /**
   * Record a single LLM API request and its cost.
   */
  trackRequest(params: {
    model: string;
    tokensInput: number;
    tokensOutput: number;
    costUsd: number;
  }): void {
    this.records.push({
      model: params.model,
      tokensInput: params.tokensInput,
      tokensOutput: params.tokensOutput,
      costUsd: params.costUsd,
      timestamp: Date.now(),
    });
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /**
   * Total spend for a given date (defaults to today).
   */
  getDailyCost(date?: Date): number {
    const target = date ?? new Date();
    const dayStart = startOfDay(target);
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    return this.records
      .filter((r) => r.timestamp >= dayStart && r.timestamp < dayEnd)
      .reduce((sum, r) => sum + r.costUsd, 0);
  }

  /**
   * Total spend for a given month (defaults to current month).
   */
  getMonthlyCost(month?: Date): number {
    const target = month ?? new Date();
    const monthStart = startOfMonth(target);
    const nextMonth = new Date(target.getFullYear(), target.getMonth() + 1, 1);
    const monthEnd = nextMonth.getTime();

    return this.records
      .filter((r) => r.timestamp >= monthStart && r.timestamp < monthEnd)
      .reduce((sum, r) => sum + r.costUsd, 0);
  }

  /**
   * Check whether spend has exceeded the configured budget.
   */
  isOverBudget(type: "daily" | "monthly"): boolean {
    if (type === "daily") {
      return this.getDailyCost() >= this.dailyBudget;
    }
    return this.getMonthlyCost() >= this.monthlyBudget;
  }

  /**
   * Return a full budget usage summary for both daily and monthly windows.
   */
  getBudgetUsage(): BudgetUsage {
    const dailyUsed = this.getDailyCost();
    const monthlyUsed = this.getMonthlyCost();

    return {
      daily: {
        used: round(dailyUsed),
        limit: this.dailyBudget,
        percent: round((dailyUsed / this.dailyBudget) * 100),
      },
      monthly: {
        used: round(monthlyUsed),
        limit: this.monthlyBudget,
        percent: round((monthlyUsed / this.monthlyBudget) * 100),
      },
    };
  }

  /**
   * Return all raw cost records (useful for exporting or debugging).
   */
  getRecords(): CostRecord[] {
    return [...this.records];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function startOfMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function round(n: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
