/**
 * ModelRecommendationService — Recommends models based on task type,
 * user history, popularity, and value analysis.
 *
 * Provides:
 *  - Task-based recommendations (top 3 with reasoning)
 *  - User-personalized recommendations from usage history
 *  - Popular models by request count
 *  - Best value models (quality / cost balance)
 *  - Static fallback recommendations when the DB is unavailable
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModelRegistryRow } from "@thinkora/db";
import type { ModelRegistryService } from "./model-registry.service.js";
import type {
  ModelAnalysisService,
  SuitabilityTask,
} from "./model-analysis.service.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single model recommendation with reasoning. */
export interface ModelRecommendation {
  slug: string;
  displayName: string;
  providerFamily: string;
  score: number;
  reasoning: string;
  inputCostPerM: number;
  outputCostPerM: number;
  contextLength: number;
}

/** Optional constraints to apply when recommending. */
export interface RecommendationConstraints {
  /** Max input cost per million tokens. */
  maxCost?: number;
  /** Minimum context length. */
  minContext?: number;
  /** Require tool support. */
  requireTools?: boolean;
  /** Require structured output support. */
  requireStructuredOutput?: boolean;
  /** Require reasoning support. */
  requireReasoning?: boolean;
  /** Require vision (image input). */
  requireVision?: boolean;
  /** Exclude specific providers. */
  excludeProviders?: string[];
}

/** Time period for popularity queries. */
export type PopularityPeriod = "day" | "week" | "month" | "all";

/** Task type to suitability mapping. */
const TASK_SUITABILITY_MAP: Record<string, SuitabilityTask> = {
  chat: "chat",
  code_review: "code-review",
  coding: "code-review",
  data_analysis: "spreadsheet-analysis",
  file_analysis: "file-comparison",
  reasoning: "deep-reasoning",
  quick_chat: "low-latency",
  report_generation: "rag-summarization",
  json_extraction: "json-extraction",
  tool_calling: "tool-calling",
  summarization: "rag-summarization",
  citation: "citation-heavy",
  general: "chat",
};

// ---------------------------------------------------------------------------
// Static fallback recommendations
// ---------------------------------------------------------------------------

const STATIC_RECOMMENDATIONS: Record<string, ModelRecommendation[]> = {
  chat: [
    {
      slug: "anthropic/claude-sonnet-4",
      displayName: "Claude Sonnet 4",
      providerFamily: "anthropic",
      score: 90,
      reasoning:
        "Best overall model for general chat. Strong reasoning, tool use, and structured output at a moderate price.",
      inputCostPerM: 3.0,
      outputCostPerM: 15.0,
      contextLength: 200_000,
    },
    {
      slug: "openai/gpt-4o",
      displayName: "GPT-4o",
      providerFamily: "openai",
      score: 88,
      reasoning:
        "Excellent multimodal chat model with broad capabilities and competitive pricing.",
      inputCostPerM: 2.5,
      outputCostPerM: 10.0,
      contextLength: 128_000,
    },
    {
      slug: "google/gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      providerFamily: "google",
      score: 82,
      reasoning:
        "Strong reasoning with the largest context window (1M tokens) at a very competitive price.",
      inputCostPerM: 1.25,
      outputCostPerM: 10.0,
      contextLength: 1_000_000,
    },
  ],
  reasoning: [
    {
      slug: "anthropic/claude-opus-4",
      displayName: "Claude Opus 4",
      providerFamily: "anthropic",
      score: 98,
      reasoning:
        "Top-tier reasoning capabilities with extended thinking mode. Best for the most complex analytical tasks.",
      inputCostPerM: 15.0,
      outputCostPerM: 75.0,
      contextLength: 200_000,
    },
    {
      slug: "google/gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      providerFamily: "google",
      score: 88,
      reasoning:
        "Excellent reasoning with native thinking support and a massive 1M context window at much lower cost.",
      inputCostPerM: 1.25,
      outputCostPerM: 10.0,
      contextLength: 1_000_000,
    },
    {
      slug: "deepseek/deepseek-r1",
      displayName: "DeepSeek R1",
      providerFamily: "deepseek",
      score: 85,
      reasoning:
        "Strong open-source reasoning model at extremely low cost. Great budget option for reasoning tasks.",
      inputCostPerM: 0.55,
      outputCostPerM: 2.19,
      contextLength: 64_000,
    },
  ],
  coding: [
    {
      slug: "anthropic/claude-sonnet-4",
      displayName: "Claude Sonnet 4",
      providerFamily: "anthropic",
      score: 92,
      reasoning:
        "Widely regarded as the best model for code review, generation, and debugging. Strong tool support.",
      inputCostPerM: 3.0,
      outputCostPerM: 15.0,
      contextLength: 200_000,
    },
    {
      slug: "anthropic/claude-opus-4",
      displayName: "Claude Opus 4",
      providerFamily: "anthropic",
      score: 96,
      reasoning:
        "Highest quality code analysis with extended thinking for complex architectural decisions.",
      inputCostPerM: 15.0,
      outputCostPerM: 75.0,
      contextLength: 200_000,
    },
    {
      slug: "openai/gpt-4o",
      displayName: "GPT-4o",
      providerFamily: "openai",
      score: 82,
      reasoning:
        "Solid coding capabilities with good tool support. A dependable alternative.",
      inputCostPerM: 2.5,
      outputCostPerM: 10.0,
      contextLength: 128_000,
    },
  ],
  low_cost: [
    {
      slug: "google/gemini-2.0-flash",
      displayName: "Gemini 2.0 Flash",
      providerFamily: "google",
      score: 98,
      reasoning:
        "Ultra-low cost ($0.10/M input) with a massive 1M context window. Best value for high-volume workloads.",
      inputCostPerM: 0.1,
      outputCostPerM: 0.4,
      contextLength: 1_000_000,
    },
    {
      slug: "openai/gpt-4o-mini",
      displayName: "GPT-4o Mini",
      providerFamily: "openai",
      score: 96,
      reasoning:
        "Extremely affordable ($0.15/M input) with surprisingly good quality and 128K context.",
      inputCostPerM: 0.15,
      outputCostPerM: 0.6,
      contextLength: 128_000,
    },
    {
      slug: "deepseek/deepseek-r1",
      displayName: "DeepSeek R1",
      providerFamily: "deepseek",
      score: 88,
      reasoning:
        "Budget reasoning model with open-source weights at $0.55/M input. Great for thinking tasks on a budget.",
      inputCostPerM: 0.55,
      outputCostPerM: 2.19,
      contextLength: 64_000,
    },
  ],
  file_analysis: [
    {
      slug: "google/gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      providerFamily: "google",
      score: 95,
      reasoning:
        "1M context window and reasoning support make it ideal for analyzing very long documents.",
      inputCostPerM: 1.25,
      outputCostPerM: 10.0,
      contextLength: 1_000_000,
    },
    {
      slug: "anthropic/claude-sonnet-4",
      displayName: "Claude Sonnet 4",
      providerFamily: "anthropic",
      score: 82,
      reasoning:
        "200K context with strong reasoning and citation capabilities for document analysis.",
      inputCostPerM: 3.0,
      outputCostPerM: 15.0,
      contextLength: 200_000,
    },
    {
      slug: "google/gemini-2.0-flash",
      displayName: "Gemini 2.0 Flash",
      providerFamily: "google",
      score: 70,
      reasoning:
        "Budget option with 1M context window. Good for summarizing long documents where cost matters.",
      inputCostPerM: 0.1,
      outputCostPerM: 0.4,
      contextLength: 1_000_000,
    },
  ],
  data_analysis: [
    {
      slug: "anthropic/claude-sonnet-4",
      displayName: "Claude Sonnet 4",
      providerFamily: "anthropic",
      score: 88,
      reasoning:
        "Strong tool use and structured output for data extraction, table analysis, and spreadsheet work.",
      inputCostPerM: 3.0,
      outputCostPerM: 15.0,
      contextLength: 200_000,
    },
    {
      slug: "openai/gpt-4o",
      displayName: "GPT-4o",
      providerFamily: "openai",
      score: 85,
      reasoning:
        "Excellent tool support and JSON mode for structured data analysis tasks.",
      inputCostPerM: 2.5,
      outputCostPerM: 10.0,
      contextLength: 128_000,
    },
    {
      slug: "google/gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      providerFamily: "google",
      score: 82,
      reasoning:
        "Reasoning + tools + 1M context make it great for analyzing large datasets and spreadsheets.",
      inputCostPerM: 1.25,
      outputCostPerM: 10.0,
      contextLength: 1_000_000,
    },
  ],
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ModelRecommendationService {
  constructor(
    private readonly db: SupabaseClient | null,
    private readonly registryService: ModelRegistryService,
    private readonly analysisService: ModelAnalysisService
  ) {}

  // -----------------------------------------------------------------------
  // Task-based recommendations
  // -----------------------------------------------------------------------

  /**
   * Recommend the top 3 models for a given task type, optionally
   * constrained by cost, capabilities, or provider restrictions.
   */
  async recommendForTask(
    taskType: string,
    constraints?: RecommendationConstraints
  ): Promise<ModelRecommendation[]> {
    // Determine the suitability dimension
    const suitabilityTask: SuitabilityTask =
      TASK_SUITABILITY_MAP[taskType] ?? "chat";

    // Get candidate models
    const candidates = await this.getCandidates(constraints);

    if (candidates.length === 0) {
      // Fall back to static recommendations
      return this.getStaticRecommendations(taskType);
    }

    // Score each candidate
    const scored = candidates.map((model) => {
      const scores = this.analysisService.computeSuitabilityScores(model);
      const suitScore = scores[suitabilityTask] ?? 50;

      // Compute a composite score factoring in cost efficiency
      const costFactor = this.computeCostFactor(model);
      const qualityBonus = this.computeQualityBonus(model, taskType);
      const score = Math.round(suitScore * 0.6 + costFactor * 0.2 + qualityBonus * 0.2);

      return {
        model,
        score: Math.min(100, Math.max(0, score)),
        suitScore,
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Take top 3 and build recommendations
    return scored.slice(0, 3).map(({ model, score, suitScore }) => ({
      slug: model.slug,
      displayName: model.display_name ?? model.slug,
      providerFamily: model.provider_family ?? "unknown",
      score,
      reasoning: this.buildReasoningText(model, taskType, suitScore),
      inputCostPerM: model.input_cost_per_m ?? 0,
      outputCostPerM: model.output_cost_per_m ?? 0,
      contextLength: model.context_length ?? 0,
    }));
  }

  // -----------------------------------------------------------------------
  // User-based recommendations
  // -----------------------------------------------------------------------

  /**
   * Recommend models based on a user's historical usage patterns.
   * Factors in: most-used models, success rates, cost trends, and
   * models the user has not yet tried.
   */
  async recommendForUser(userId: string): Promise<ModelRecommendation[]> {
    if (!this.db) {
      return this.getStaticRecommendations("chat");
    }

    try {
      // Fetch user's recent usage grouped by model
      const { data: usageData, error: usageError } = await this.db
        .from("model_usage_logs")
        .select("actual_model, status, cost_usd, latency_ms, task_type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (usageError || !usageData || usageData.length === 0) {
        return this.getStaticRecommendations("chat");
      }

      type UsageRow = {
        actual_model: string | null;
        status: string | null;
        cost_usd: number | null;
        latency_ms: number | null;
        task_type: string | null;
      };
      const rows = usageData as UsageRow[];

      // Aggregate by model
      const modelStats = new Map<
        string,
        {
          requests: number;
          successes: number;
          totalCost: number;
          avgLatency: number;
          taskTypes: Set<string>;
        }
      >();

      for (const row of rows) {
        const model = row.actual_model ?? "unknown";
        const stats = modelStats.get(model) ?? {
          requests: 0,
          successes: 0,
          totalCost: 0,
          avgLatency: 0,
          taskTypes: new Set<string>(),
        };

        stats.requests++;
        if (row.status === "success") stats.successes++;
        stats.totalCost += row.cost_usd ?? 0;
        stats.avgLatency =
          (stats.avgLatency * (stats.requests - 1) + (row.latency_ms ?? 0)) /
          stats.requests;
        if (row.task_type) stats.taskTypes.add(row.task_type);

        modelStats.set(model, stats);
      }

      // Determine user's most common task type
      const taskCounts = new Map<string, number>();
      for (const row of rows) {
        if (row.task_type) {
          taskCounts.set(row.task_type, (taskCounts.get(row.task_type) ?? 0) + 1);
        }
      }
      let dominantTask = "chat";
      let maxTaskCount = 0;
      for (const [task, count] of taskCounts) {
        if (count > maxTaskCount) {
          dominantTask = task;
          maxTaskCount = count;
        }
      }

      // Score models the user has used
      const usedModels: Array<{ slug: string; score: number; reasoning: string }> = [];

      for (const [slug, stats] of modelStats) {
        const successRate = stats.requests > 0 ? stats.successes / stats.requests : 0;
        const frequencyScore = Math.min(100, stats.requests * 5); // 20 uses = 100
        const successScore = successRate * 100;
        const score = Math.round(frequencyScore * 0.4 + successScore * 0.6);

        usedModels.push({
          slug,
          score,
          reasoning: `You've used this model ${stats.requests} times with a ${(successRate * 100).toFixed(0)}% success rate. Average cost: $${stats.totalCost.toFixed(4)}/request.`,
        });
      }

      usedModels.sort((a, b) => b.score - a.score);

      // Also suggest a model the user hasn't tried yet
      const allModels = await this.registryService.getFilteredCatalog({
        includeDeprecated: false,
      });
      const usedSlugs = new Set(modelStats.keys());
      const untestedCandidates = allModels.filter((m) => !usedSlugs.has(m.slug));

      // Pick the best untested model for the user's dominant task
      let untestedRec: ModelRecommendation | null = null;
      if (untestedCandidates.length > 0) {
        const suitTask: SuitabilityTask =
          TASK_SUITABILITY_MAP[dominantTask] ?? "chat";

        let bestScore = -1;
        let bestModel: ModelRegistryRow | null = null;

        for (const model of untestedCandidates) {
          const scores = this.analysisService.computeSuitabilityScores(model);
          const s = scores[suitTask] ?? 50;
          if (s > bestScore) {
            bestScore = s;
            bestModel = model;
          }
        }

        if (bestModel) {
          untestedRec = {
            slug: bestModel.slug,
            displayName: bestModel.display_name ?? bestModel.slug,
            providerFamily: bestModel.provider_family ?? "unknown",
            score: bestScore,
            reasoning: `You haven't tried this model yet. It scores ${bestScore}/100 for your most common task type (${dominantTask}).`,
            inputCostPerM: bestModel.input_cost_per_m ?? 0,
            outputCostPerM: bestModel.output_cost_per_m ?? 0,
            contextLength: bestModel.context_length ?? 0,
          };
        }
      }

      // Build final list: top 2 from used + 1 untested suggestion
      const results: ModelRecommendation[] = [];

      for (const used of usedModels.slice(0, untestedRec ? 2 : 3)) {
        const model = allModels.find((m) => m.slug === used.slug);
        results.push({
          slug: used.slug,
          displayName: model?.display_name ?? used.slug,
          providerFamily: model?.provider_family ?? "unknown",
          score: used.score,
          reasoning: used.reasoning,
          inputCostPerM: model?.input_cost_per_m ?? 0,
          outputCostPerM: model?.output_cost_per_m ?? 0,
          contextLength: model?.context_length ?? 0,
        });
      }

      if (untestedRec) {
        results.push(untestedRec);
      }

      return results.length > 0 ? results : this.getStaticRecommendations("chat");
    } catch (err) {
      console.error("[ModelRecommendationService] recommendForUser error:", err);
      return this.getStaticRecommendations("chat");
    }
  }

  // -----------------------------------------------------------------------
  // Popularity
  // -----------------------------------------------------------------------

  /**
   * Get the most popular models by request count for the given period.
   */
  async getPopularModels(
    period: PopularityPeriod = "week"
  ): Promise<ModelRecommendation[]> {
    if (!this.db) {
      return this.getStaticRecommendations("chat");
    }

    try {
      const after = this.getPeriodStart(period);

      let query = this.db
        .from("model_usage_logs")
        .select("actual_model, cost_usd");

      if (after) {
        query = query.gte("created_at", after);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return this.getStaticRecommendations("chat");
      }

      type Row = { actual_model: string | null; cost_usd: number | null };
      const rows = data as Row[];

      // Aggregate
      const counts = new Map<string, { requests: number; totalCost: number }>();
      for (const row of rows) {
        const slug = row.actual_model ?? "unknown";
        const entry = counts.get(slug) ?? { requests: 0, totalCost: 0 };
        entry.requests++;
        entry.totalCost += row.cost_usd ?? 0;
        counts.set(slug, entry);
      }

      // Sort by request count
      const sorted = [...counts.entries()].sort(
        (a, b) => b[1].requests - a[1].requests
      );

      // Fetch model details for top results
      const allModels = await this.registryService.getFilteredCatalog({
        includeDeprecated: false,
      });
      const modelMap = new Map(allModels.map((m) => [m.slug, m]));

      return sorted.slice(0, 5).map(([slug, stats]) => {
        const model = modelMap.get(slug);
        return {
          slug,
          displayName: model?.display_name ?? slug,
          providerFamily: model?.provider_family ?? "unknown",
          score: Math.min(100, Math.round((stats.requests / (sorted[0][1].requests || 1)) * 100)),
          reasoning: `${stats.requests} requests in the last ${period}. Total cost: $${stats.totalCost.toFixed(4)}.`,
          inputCostPerM: model?.input_cost_per_m ?? 0,
          outputCostPerM: model?.output_cost_per_m ?? 0,
          contextLength: model?.context_length ?? 0,
        };
      });
    } catch (err) {
      console.error("[ModelRecommendationService] getPopularModels error:", err);
      return this.getStaticRecommendations("chat");
    }
  }

  // -----------------------------------------------------------------------
  // Best value
  // -----------------------------------------------------------------------

  /**
   * Get models that offer the best balance of quality and cost for a
   * given task type.
   */
  async getBestValueModels(taskType: string): Promise<ModelRecommendation[]> {
    const suitabilityTask: SuitabilityTask =
      TASK_SUITABILITY_MAP[taskType] ?? "chat";

    const candidates = await this.registryService.getFilteredCatalog({
      includeDeprecated: false,
    });

    if (candidates.length === 0) {
      return STATIC_RECOMMENDATIONS.low_cost ?? [];
    }

    // Score using a value formula: quality / cost
    const scored = candidates
      .filter((m) => (m.input_cost_per_m ?? 0) > 0) // exclude free models from value calc
      .map((model) => {
        const scores = this.analysisService.computeSuitabilityScores(model);
        const quality = scores[suitabilityTask] ?? 50;
        const cost = model.input_cost_per_m ?? 1;
        const value = quality / Math.log2(cost + 1); // log scale so cheap models aren't over-weighted

        return { model, quality, value };
      });

    scored.sort((a, b) => b.value - a.value);

    return scored.slice(0, 3).map(({ model, quality, value }) => ({
      slug: model.slug,
      displayName: model.display_name ?? model.slug,
      providerFamily: model.provider_family ?? "unknown",
      score: Math.min(100, Math.round(value)),
      reasoning:
        `Quality score ${quality}/100 for ${taskType} at $${(model.input_cost_per_m ?? 0).toFixed(2)}/M input. ` +
        `Value index: ${value.toFixed(1)}.`,
      inputCostPerM: model.input_cost_per_m ?? 0,
      outputCostPerM: model.output_cost_per_m ?? 0,
      contextLength: model.context_length ?? 0,
    }));
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Get candidate models filtered by constraints.
   */
  private async getCandidates(
    constraints?: RecommendationConstraints
  ): Promise<ModelRegistryRow[]> {
    const filters: import("./model-registry.service.js").CatalogFilters = {
      includeDeprecated: false,
    };

    if (constraints) {
      if (constraints.maxCost != null) filters.maxCost = constraints.maxCost;
      if (constraints.minContext != null) filters.minContext = constraints.minContext;
      if (constraints.requireVision) {
        filters.modalities = [...(filters.modalities ?? []), "image"];
      }

      filters.features = {};
      if (constraints.requireTools) filters.features.toolsSupport = true;
      if (constraints.requireStructuredOutput)
        filters.features.structuredOutput = true;
      if (constraints.requireReasoning)
        filters.features.reasoningSupport = true;
    }

    let candidates = await this.registryService.getFilteredCatalog(filters);

    // Apply provider exclusions
    if (constraints?.excludeProviders?.length) {
      const excluded = new Set(constraints.excludeProviders);
      candidates = candidates.filter(
        (m) => !excluded.has(m.provider_family ?? "")
      );
    }

    return candidates;
  }

  /**
   * Compute a cost efficiency factor (0-100).
   * Lower cost = higher factor.
   */
  private computeCostFactor(model: ModelRegistryRow): number {
    const cost = model.input_cost_per_m ?? 0;
    if (cost === 0) return 100;
    if (cost <= 0.2) return 95;
    if (cost <= 1) return 80;
    if (cost <= 3) return 60;
    if (cost <= 10) return 40;
    return 20;
  }

  /**
   * Compute bonus points based on model characteristics relevant to the task.
   */
  private computeQualityBonus(model: ModelRegistryRow, taskType: string): number {
    let bonus = 50; // baseline

    const tags = model.tags ?? [];
    const contextLength = model.context_length ?? 0;

    switch (taskType) {
      case "reasoning":
      case "deep-reasoning":
        if (model.reasoning_support) bonus += 30;
        if (tags.includes("premium")) bonus += 10;
        break;
      case "coding":
      case "code_review":
        if (tags.includes("coding")) bonus += 20;
        if (model.reasoning_support) bonus += 10;
        if (model.tools_support) bonus += 10;
        break;
      case "file_analysis":
        if (contextLength >= 500_000) bonus += 30;
        else if (contextLength >= 100_000) bonus += 15;
        break;
      case "data_analysis":
        if (model.tools_support) bonus += 15;
        if (model.structured_output) bonus += 15;
        break;
      case "json_extraction":
        if (model.structured_output) bonus += 30;
        if (model.tools_support) bonus += 10;
        break;
      case "quick_chat":
        if (tags.includes("fast")) bonus += 25;
        if ((model.input_cost_per_m ?? 0) <= 1) bonus += 15;
        break;
      default:
        if (tags.includes("best-for-chat")) bonus += 15;
        if (model.tools_support) bonus += 5;
        break;
    }

    return Math.min(100, bonus);
  }

  /**
   * Build a human-readable reasoning string for a recommendation.
   */
  private buildReasoningText(
    model: ModelRegistryRow,
    taskType: string,
    suitScore: number
  ): string {
    const parts: string[] = [];

    parts.push(
      `Scores ${suitScore}/100 for ${taskType.replace(/_/g, " ")}.`
    );

    const cost = model.input_cost_per_m ?? 0;
    if (cost === 0) {
      parts.push("Free to use.");
    } else if (cost <= 1) {
      parts.push(`Very affordable at $${cost.toFixed(2)}/M input.`);
    } else if (cost <= 5) {
      parts.push(`Moderately priced at $${cost.toFixed(2)}/M input.`);
    } else {
      parts.push(`Premium pricing at $${cost.toFixed(2)}/M input.`);
    }

    const ctx = model.context_length ?? 0;
    if (ctx >= 1_000_000) {
      parts.push(`${(ctx / 1_000_000).toFixed(0)}M token context window.`);
    } else if (ctx >= 100_000) {
      parts.push(`${(ctx / 1_000).toFixed(0)}K token context window.`);
    }

    const features: string[] = [];
    if (model.reasoning_support) features.push("reasoning");
    if (model.tools_support) features.push("tools");
    if (model.structured_output) features.push("structured output");
    if ((model.input_modalities ?? []).includes("image")) features.push("vision");

    if (features.length > 0) {
      parts.push(`Supports: ${features.join(", ")}.`);
    }

    return parts.join(" ");
  }

  /**
   * Get static fallback recommendations for a task type.
   */
  private getStaticRecommendations(taskType: string): ModelRecommendation[] {
    return (
      STATIC_RECOMMENDATIONS[taskType] ??
      STATIC_RECOMMENDATIONS.chat ??
      []
    );
  }

  /**
   * Convert a PopularityPeriod to an ISO-8601 "after" timestamp.
   */
  private getPeriodStart(period: PopularityPeriod): string | null {
    const now = new Date();
    switch (period) {
      case "day":
        now.setDate(now.getDate() - 1);
        return now.toISOString();
      case "week":
        now.setDate(now.getDate() - 7);
        return now.toISOString();
      case "month":
        now.setMonth(now.getMonth() - 1);
        return now.toISOString();
      case "all":
        return null;
    }
  }
}
