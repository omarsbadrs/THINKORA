/**
 * ModelLoggingService — Logs model usage, fallback events, errors,
 * cache metrics, and maintains pre-aggregated daily/monthly cost tables.
 *
 * All write operations are best-effort: errors are logged but never thrown
 * to prevent logging failures from disrupting request processing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ModelUsageLogInsert,
  ModelUsageLogRow,
  ModelFallbackEventRow,
  ModelErrorEventRow,
  ModelCacheMetricsRow,
  ModelCostDailyRow,
  ModelCostMonthlyRow,
} from "@thinkora/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Parameters for logging a single model usage event. */
export interface UsageLogParams {
  requestId: string;
  userId: string;
  selectedModel: string;
  actualModel: string;
  routingMode: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  latencyMs: number;
  status: "success" | "error" | "fallback";
  taskType: string;
  fallbackUsed: boolean;
  workspaceId?: string;
}

/** Parameters for logging a fallback event. */
export interface FallbackEventParams {
  requestId: string;
  originalModel: string;
  fallbackModel: string;
  reason: string;
}

/** Parameters for logging a model error. */
export interface ErrorEventParams {
  modelSlug: string;
  errorType: string;
  errorMessage: string;
  requestId?: string;
}

/** Parameters for logging a prompt cache metric. */
export interface CacheMetricParams {
  modelSlug: string;
  cacheHit: boolean;
  tokensSaved?: number;
  costSaved?: number;
}

/** In-memory log entry used when the database is unavailable. */
interface InMemoryLogEntry {
  type: "usage" | "fallback" | "error" | "cache";
  data: unknown;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ModelLoggingService {
  /** In-memory log buffer used in demo/offline mode. */
  private readonly memoryLog: InMemoryLogEntry[] = [];
  private readonly maxMemoryLogSize = 1000;

  constructor(private readonly db: SupabaseClient | null) {}

  // -----------------------------------------------------------------------
  // Usage logging
  // -----------------------------------------------------------------------

  /**
   * Log a model usage event.
   * Also triggers daily and monthly cost aggregation updates.
   */
  async logUsage(params: UsageLogParams): Promise<ModelUsageLogRow | null> {
    const insert: ModelUsageLogInsert = {
      request_id: params.requestId,
      user_id: params.userId,
      selected_model: params.selectedModel,
      actual_model: params.actualModel,
      routing_mode: params.routingMode,
      tokens_input: params.tokensInput,
      tokens_output: params.tokensOutput,
      cost_usd: params.costUsd,
      latency_ms: params.latencyMs,
      status: params.status,
      task_type: params.taskType,
      fallback_used: params.fallbackUsed,
      workspace_id: params.workspaceId ?? null,
    };

    if (!this.db) {
      this.addToMemoryLog("usage", insert);
      return null;
    }

    try {
      const { data, error } = await this.db
        .from("model_usage_logs")
        .insert(insert)
        .select()
        .single();

      if (error) {
        console.error("[ModelLoggingService] logUsage error:", error.message);
        this.addToMemoryLog("usage", insert);
        return null;
      }

      // Fire-and-forget cost aggregation updates
      const today = new Date().toISOString().split("T")[0];
      const month = today.slice(0, 7);

      this.updateDailyCost(
        today,
        params.actualModel,
        params.costUsd,
        1,
        params.tokensInput + params.tokensOutput
      ).catch((err) =>
        console.error("[ModelLoggingService] updateDailyCost error:", err)
      );

      this.updateMonthlyCost(
        month,
        params.actualModel,
        params.costUsd,
        1,
        params.tokensInput + params.tokensOutput
      ).catch((err) =>
        console.error("[ModelLoggingService] updateMonthlyCost error:", err)
      );

      return data as ModelUsageLogRow;
    } catch (err) {
      console.error("[ModelLoggingService] logUsage exception:", err);
      this.addToMemoryLog("usage", insert);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Fallback event logging
  // -----------------------------------------------------------------------

  /**
   * Log a fallback event (when the primary model fails and a fallback is used).
   */
  async logFallbackEvent(
    params: FallbackEventParams
  ): Promise<ModelFallbackEventRow | null> {
    const insert = {
      request_id: params.requestId,
      original_model: params.originalModel,
      fallback_model: params.fallbackModel,
      reason: params.reason,
    };

    if (!this.db) {
      this.addToMemoryLog("fallback", insert);
      return null;
    }

    try {
      const { data, error } = await this.db
        .from("model_fallback_events")
        .insert(insert)
        .select()
        .single();

      if (error) {
        console.error("[ModelLoggingService] logFallbackEvent error:", error.message);
        this.addToMemoryLog("fallback", insert);
        return null;
      }

      return data as ModelFallbackEventRow;
    } catch (err) {
      console.error("[ModelLoggingService] logFallbackEvent exception:", err);
      this.addToMemoryLog("fallback", insert);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Error event logging
  // -----------------------------------------------------------------------

  /**
   * Log a model error event (rate limit, timeout, API error, etc.).
   */
  async logErrorEvent(
    params: ErrorEventParams
  ): Promise<ModelErrorEventRow | null> {
    const insert = {
      model_slug: params.modelSlug,
      error_type: params.errorType,
      error_message: params.errorMessage,
      request_id: params.requestId ?? null,
    };

    if (!this.db) {
      this.addToMemoryLog("error", insert);
      return null;
    }

    try {
      const { data, error } = await this.db
        .from("model_error_events")
        .insert(insert)
        .select()
        .single();

      if (error) {
        console.error("[ModelLoggingService] logErrorEvent error:", error.message);
        this.addToMemoryLog("error", insert);
        return null;
      }

      return data as ModelErrorEventRow;
    } catch (err) {
      console.error("[ModelLoggingService] logErrorEvent exception:", err);
      this.addToMemoryLog("error", insert);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Cache metrics
  // -----------------------------------------------------------------------

  /**
   * Log a prompt cache hit/miss metric.
   * Upserts into daily aggregation table.
   */
  async logCacheMetric(
    params: CacheMetricParams
  ): Promise<ModelCacheMetricsRow | null> {
    const today = new Date().toISOString().split("T")[0];

    if (!this.db) {
      this.addToMemoryLog("cache", { ...params, date: today });
      return null;
    }

    try {
      // Try to fetch existing row for today
      const { data: existing } = await this.db
        .from("model_cache_metrics")
        .select("*")
        .eq("model_slug", params.modelSlug)
        .eq("date", today)
        .single();

      if (existing) {
        const row = existing as ModelCacheMetricsRow;
        const updates = {
          cache_hits: row.cache_hits + (params.cacheHit ? 1 : 0),
          cache_misses: row.cache_misses + (params.cacheHit ? 0 : 1),
          tokens_saved: row.tokens_saved + (params.tokensSaved ?? 0),
          cost_saved: row.cost_saved + (params.costSaved ?? 0),
        };

        const { data, error } = await this.db
          .from("model_cache_metrics")
          .update(updates)
          .eq("id", row.id)
          .select()
          .single();

        if (error) {
          console.error("[ModelLoggingService] logCacheMetric update error:", error.message);
          return null;
        }
        return data as ModelCacheMetricsRow;
      }

      // Insert new row
      const insert = {
        model_slug: params.modelSlug,
        cache_hits: params.cacheHit ? 1 : 0,
        cache_misses: params.cacheHit ? 0 : 1,
        tokens_saved: params.tokensSaved ?? 0,
        cost_saved: params.costSaved ?? 0,
        date: today,
      };

      const { data, error } = await this.db
        .from("model_cache_metrics")
        .insert(insert)
        .select()
        .single();

      if (error) {
        console.error("[ModelLoggingService] logCacheMetric insert error:", error.message);
        return null;
      }

      return data as ModelCacheMetricsRow;
    } catch (err) {
      console.error("[ModelLoggingService] logCacheMetric exception:", err);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Cost aggregation
  // -----------------------------------------------------------------------

  /**
   * Upsert a daily cost aggregation row.
   * Increments totals if a row for the given date+model already exists.
   */
  async updateDailyCost(
    date: string,
    modelSlug: string,
    cost: number,
    requests: number,
    tokens: number
  ): Promise<ModelCostDailyRow | null> {
    if (!this.db) return null;

    try {
      // Try to fetch existing
      const { data: existing } = await this.db
        .from("model_cost_daily")
        .select("*")
        .eq("date", date)
        .eq("model_slug", modelSlug)
        .single();

      if (existing) {
        const row = existing as ModelCostDailyRow;
        const { data, error } = await this.db
          .from("model_cost_daily")
          .update({
            total_cost: row.total_cost + cost,
            total_requests: row.total_requests + requests,
            total_tokens: row.total_tokens + tokens,
          })
          .eq("id", row.id)
          .select()
          .single();

        if (error) {
          console.error("[ModelLoggingService] updateDailyCost update error:", error.message);
          return null;
        }
        return data as ModelCostDailyRow;
      }

      // Insert new
      const { data, error } = await this.db
        .from("model_cost_daily")
        .insert({
          date,
          model_slug: modelSlug,
          total_cost: cost,
          total_requests: requests,
          total_tokens: tokens,
        })
        .select()
        .single();

      if (error) {
        console.error("[ModelLoggingService] updateDailyCost insert error:", error.message);
        return null;
      }
      return data as ModelCostDailyRow;
    } catch (err) {
      console.error("[ModelLoggingService] updateDailyCost exception:", err);
      return null;
    }
  }

  /**
   * Upsert a monthly cost aggregation row.
   * Increments totals if a row for the given month+model already exists.
   */
  async updateMonthlyCost(
    month: string,
    modelSlug: string,
    cost: number,
    requests: number,
    tokens: number
  ): Promise<ModelCostMonthlyRow | null> {
    if (!this.db) return null;

    try {
      // Try to fetch existing
      const { data: existing } = await this.db
        .from("model_cost_monthly")
        .select("*")
        .eq("month", month)
        .eq("model_slug", modelSlug)
        .single();

      if (existing) {
        const row = existing as ModelCostMonthlyRow;
        const { data, error } = await this.db
          .from("model_cost_monthly")
          .update({
            total_cost: row.total_cost + cost,
            total_requests: row.total_requests + requests,
            total_tokens: row.total_tokens + tokens,
          })
          .eq("id", row.id)
          .select()
          .single();

        if (error) {
          console.error("[ModelLoggingService] updateMonthlyCost update error:", error.message);
          return null;
        }
        return data as ModelCostMonthlyRow;
      }

      // Insert new
      const { data, error } = await this.db
        .from("model_cost_monthly")
        .insert({
          month,
          model_slug: modelSlug,
          total_cost: cost,
          total_requests: requests,
          total_tokens: tokens,
        })
        .select()
        .single();

      if (error) {
        console.error("[ModelLoggingService] updateMonthlyCost insert error:", error.message);
        return null;
      }
      return data as ModelCostMonthlyRow;
    } catch (err) {
      console.error("[ModelLoggingService] updateMonthlyCost exception:", err);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // In-memory log (demo / offline mode)
  // -----------------------------------------------------------------------

  /**
   * Get all in-memory log entries (useful for testing and demo mode).
   */
  getMemoryLog(): ReadonlyArray<InMemoryLogEntry> {
    return this.memoryLog;
  }

  /**
   * Clear the in-memory log buffer.
   */
  clearMemoryLog(): void {
    this.memoryLog.length = 0;
  }

  private addToMemoryLog(type: InMemoryLogEntry["type"], data: unknown): void {
    if (this.memoryLog.length >= this.maxMemoryLogSize) {
      // Evict oldest 10%
      this.memoryLog.splice(0, Math.floor(this.maxMemoryLogSize * 0.1));
    }

    this.memoryLog.push({
      type,
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
