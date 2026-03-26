/**
 * Model usage repository — insert usage logs, query usage by model/user/date,
 * aggregate stats, and get cost summaries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ModelUsageLogRow,
  ModelUsageLogInsert,
  ModelCostDailyRow,
  ModelCostMonthlyRow,
} from "../schema";

export interface UsageQueryParams {
  userId?: string;
  selectedModel?: string;
  status?: string;
  taskType?: string;
  after?: string;
  before?: string;
  limit?: number;
  offset?: number;
}

export interface UsageAggregation {
  totalRequests: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  fallbackRate: number;
}

export interface CostSummary {
  daily: ModelCostDailyRow[];
  monthly: ModelCostMonthlyRow[];
}

export class ModelUsageRepo {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Insert a usage log entry.
   */
  async insertUsageLog(input: ModelUsageLogInsert): Promise<ModelUsageLogRow> {
    const { data, error } = await this.client
      .from("model_usage_logs")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as ModelUsageLogRow;
  }

  /**
   * Query usage logs with filtering and pagination.
   */
  async queryUsage(params?: UsageQueryParams): Promise<ModelUsageLogRow[]> {
    const {
      userId,
      selectedModel,
      status,
      taskType,
      after,
      before,
      limit = 50,
      offset = 0,
    } = params ?? {};

    let query = this.client
      .from("model_usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) query = query.eq("user_id", userId);
    if (selectedModel) query = query.eq("selected_model", selectedModel);
    if (status) query = query.eq("status", status);
    if (taskType) query = query.eq("task_type", taskType);
    if (after) query = query.gte("created_at", after);
    if (before) query = query.lte("created_at", before);

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as ModelUsageLogRow[];
  }

  /**
   * Get aggregated usage statistics for a given filter.
   */
  async getAggregateStats(
    params?: Pick<UsageQueryParams, "userId" | "selectedModel" | "after" | "before">
  ): Promise<UsageAggregation> {
    const { userId, selectedModel, after, before } = params ?? {};

    let query = this.client
      .from("model_usage_logs")
      .select("tokens_input, tokens_output, cost_usd, latency_ms, fallback_used");

    if (userId) query = query.eq("user_id", userId);
    if (selectedModel) query = query.eq("selected_model", selectedModel);
    if (after) query = query.gte("created_at", after);
    if (before) query = query.lte("created_at", before);

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as Array<{
      tokens_input: number | null;
      tokens_output: number | null;
      cost_usd: number | null;
      latency_ms: number | null;
      fallback_used: boolean;
    }>;

    if (rows.length === 0) {
      return {
        totalRequests: 0,
        totalTokensInput: 0,
        totalTokensOutput: 0,
        totalCostUsd: 0,
        avgLatencyMs: 0,
        fallbackRate: 0,
      };
    }

    let totalTokensInput = 0;
    let totalTokensOutput = 0;
    let totalCostUsd = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    let fallbackCount = 0;

    for (const row of rows) {
      totalTokensInput += row.tokens_input ?? 0;
      totalTokensOutput += row.tokens_output ?? 0;
      totalCostUsd += row.cost_usd ?? 0;
      if (row.latency_ms != null) {
        totalLatency += row.latency_ms;
        latencyCount++;
      }
      if (row.fallback_used) {
        fallbackCount++;
      }
    }

    return {
      totalRequests: rows.length,
      totalTokensInput,
      totalTokensOutput,
      totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
      avgLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
      fallbackRate:
        rows.length > 0
          ? Math.round((fallbackCount / rows.length) * 10000) / 10000
          : 0,
    };
  }

  /**
   * Get usage grouped by model for a user in a date range.
   */
  async getUsageByModel(
    params: Pick<UsageQueryParams, "userId" | "after" | "before">
  ): Promise<
    Array<{
      model: string;
      requests: number;
      totalCost: number;
      totalTokens: number;
    }>
  > {
    const { userId, after, before } = params;

    let query = this.client
      .from("model_usage_logs")
      .select("selected_model, tokens_input, tokens_output, cost_usd");

    if (userId) query = query.eq("user_id", userId);
    if (after) query = query.gte("created_at", after);
    if (before) query = query.lte("created_at", before);

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as Array<{
      selected_model: string | null;
      tokens_input: number | null;
      tokens_output: number | null;
      cost_usd: number | null;
    }>;

    // Group by model
    const byModel = new Map<
      string,
      { requests: number; totalCost: number; totalTokens: number }
    >();

    for (const row of rows) {
      const model = row.selected_model ?? "unknown";
      const existing = byModel.get(model) ?? {
        requests: 0,
        totalCost: 0,
        totalTokens: 0,
      };
      existing.requests++;
      existing.totalCost += row.cost_usd ?? 0;
      existing.totalTokens += (row.tokens_input ?? 0) + (row.tokens_output ?? 0);
      byModel.set(model, existing);
    }

    return Array.from(byModel.entries())
      .map(([model, stats]) => ({
        model,
        requests: stats.requests,
        totalCost: Math.round(stats.totalCost * 1_000_000) / 1_000_000,
        totalTokens: stats.totalTokens,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  // ============================================================
  // COST SUMMARIES (pre-aggregated tables)
  // ============================================================

  /**
   * Get daily cost data for a date range.
   */
  async getDailyCosts(
    params: {
      modelSlug?: string;
      after?: string;
      before?: string;
      limit?: number;
    } = {}
  ): Promise<ModelCostDailyRow[]> {
    const { modelSlug, after, before, limit = 90 } = params;

    let query = this.client
      .from("model_cost_daily")
      .select("*")
      .order("date", { ascending: false })
      .limit(limit);

    if (modelSlug) query = query.eq("model_slug", modelSlug);
    if (after) query = query.gte("date", after);
    if (before) query = query.lte("date", before);

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as ModelCostDailyRow[];
  }

  /**
   * Get monthly cost data for a date range.
   */
  async getMonthlyCosts(
    params: {
      modelSlug?: string;
      after?: string;
      before?: string;
      limit?: number;
    } = {}
  ): Promise<ModelCostMonthlyRow[]> {
    const { modelSlug, after, before, limit = 24 } = params;

    let query = this.client
      .from("model_cost_monthly")
      .select("*")
      .order("month", { ascending: false })
      .limit(limit);

    if (modelSlug) query = query.eq("model_slug", modelSlug);
    if (after) query = query.gte("month", after);
    if (before) query = query.lte("month", before);

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as ModelCostMonthlyRow[];
  }

  /**
   * Get a combined cost summary (daily + monthly).
   */
  async getCostSummary(
    params: {
      modelSlug?: string;
      dailyDays?: number;
      monthlyMonths?: number;
    } = {}
  ): Promise<CostSummary> {
    const { modelSlug, dailyDays = 30, monthlyMonths = 12 } = params;

    const dailyAfter = new Date();
    dailyAfter.setDate(dailyAfter.getDate() - dailyDays);

    const monthlyAfter = new Date();
    monthlyAfter.setMonth(monthlyAfter.getMonth() - monthlyMonths);

    const [daily, monthly] = await Promise.all([
      this.getDailyCosts({
        modelSlug,
        after: dailyAfter.toISOString().split("T")[0],
      }),
      this.getMonthlyCosts({
        modelSlug,
        after: monthlyAfter.toISOString().slice(0, 7) + "-01",
      }),
    ]);

    return { daily, monthly };
  }
}
