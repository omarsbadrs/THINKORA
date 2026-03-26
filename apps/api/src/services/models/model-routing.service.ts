/**
 * ModelRoutingService — Resolves which model to use for a given request.
 *
 * Supports multiple routing modes (direct, auto, fast, balanced, etc.),
 * heuristic task classification, policy enforcement, and automatic
 * fallback chain construction.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModelRegistryRow, ModelRoutingPolicyRow } from "@thinkora/db";
import type { ModelRegistryService } from "./model-registry.service.js";
import type { ModelAnalysisService, SuitabilityTask } from "./model-analysis.service.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Routing modes supported by the system. */
export type ServiceRoutingMode =
  | "direct"
  | "auto"
  | "fast"
  | "balanced"
  | "best-quality"
  | "reasoning"
  | "coding"
  | "vision"
  | "file-analysis"
  | "data-analysis";

/** Task classification labels used for heuristic routing. */
export type TaskType =
  | "code_review"
  | "data_analysis"
  | "file_analysis"
  | "reasoning"
  | "quick_chat"
  | "report_generation"
  | "json_extraction"
  | "vision"
  | "general";

/** Parameters accepted by resolveModelForRequest. */
export interface RouteRequestParams {
  /** Explicit model slug chosen by the user (used in "direct" mode). */
  selectedModel?: string;
  /** Routing mode override. */
  routingMode?: ServiceRoutingMode;
  /** Detected or declared task type. */
  taskType?: TaskType;
  /** Message content used for heuristic task classification. */
  messageContent?: string;
  /** Per-user routing policies. */
  userPolicies?: RoutingPolicyInput[];
  /** System-wide routing policies. */
  systemPolicies?: RoutingPolicyInput[];
}

/** Simplified policy input (mirrors important fields of ModelRoutingPolicyRow). */
export interface RoutingPolicyInput {
  /** Max cost in USD per million input tokens. */
  maxCostPerRequest?: number | null;
  /** Preferred providers and weights (e.g., {"anthropic": 1, "openai": 0.5}). */
  providerPreferences?: Record<string, number>;
  /** Require ZDR (zero data retention). */
  requireZdr?: boolean;
  /** Require all declared parameters to be supported. */
  requireParametersMatch?: boolean;
  /** Required parameters that the model must support. */
  requiredParameters?: string[];
}

/** Result of model resolution. */
export interface RouteResult {
  primaryModel: string;
  fallbackModels: string[];
  routingExplanation: string;
}

/** Model with a computed score for ranking. */
interface ScoredModel {
  model: ModelRegistryRow;
  score: number;
}

// ---------------------------------------------------------------------------
// Keyword sets for task classification
// ---------------------------------------------------------------------------

const CODE_KEYWORDS = [
  "code", "function", "bug", "refactor", "typescript", "javascript", "python",
  "java", "rust", "go", "sql", "api", "class", "interface", "debug", "compile",
  "lint", "test", "unit test", "PR", "pull request", "commit", "merge",
  "variable", "algorithm", "data structure", "regex", "import", "export",
];

const DATA_KEYWORDS = [
  "spreadsheet", "csv", "excel", "table", "column", "row", "chart", "graph",
  "pivot", "aggregate", "sum", "average", "mean", "median", "statistics",
  "dataset", "database", "query", "filter", "sort", "group by",
];

const FILE_KEYWORDS = [
  "file", "document", "pdf", "upload", "attachment", "compare", "diff",
  "summarize this document", "analyze this file", "read this", "extract from",
];

const REASONING_KEYWORDS = [
  "think", "reason", "analyze", "explain why", "step by step", "logic",
  "proof", "math", "calculate", "derive", "hypothesis", "evaluate",
  "pros and cons", "trade-off", "implications",
];

const JSON_KEYWORDS = [
  "json", "extract", "schema", "parse", "structured", "key-value",
  "object", "array", "field", "property",
];

const REPORT_KEYWORDS = [
  "report", "write up", "summarize", "executive summary", "brief",
  "long-form", "article", "essay", "paper", "draft",
];

const VISION_KEYWORDS = [
  "image", "picture", "photo", "screenshot", "diagram", "chart image",
  "what do you see", "describe this image", "OCR",
];

// ---------------------------------------------------------------------------
// Routing mode to suitability task mapping
// ---------------------------------------------------------------------------

const MODE_TO_TASK: Partial<Record<ServiceRoutingMode, SuitabilityTask>> = {
  fast: "low-latency",
  balanced: "chat",
  "best-quality": "deep-reasoning",
  reasoning: "deep-reasoning",
  coding: "code-review",
  vision: "chat", // vision is handled via modality filter
  "file-analysis": "file-comparison",
  "data-analysis": "spreadsheet-analysis",
};

const TASK_TO_SUITABILITY: Partial<Record<TaskType, SuitabilityTask>> = {
  code_review: "code-review",
  data_analysis: "spreadsheet-analysis",
  file_analysis: "file-comparison",
  reasoning: "deep-reasoning",
  quick_chat: "low-latency",
  report_generation: "rag-summarization",
  json_extraction: "json-extraction",
  general: "chat",
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ModelRoutingService {
  constructor(
    private readonly db: SupabaseClient | null,
    private readonly registryService: ModelRegistryService,
    private readonly analysisService: ModelAnalysisService
  ) {}

  // -----------------------------------------------------------------------
  // Primary resolution
  // -----------------------------------------------------------------------

  /**
   * Resolve which model(s) should handle a given request.
   */
  async resolveModelForRequest(params: RouteRequestParams): Promise<RouteResult> {
    const {
      selectedModel,
      routingMode = "auto",
      taskType: declaredTask,
      messageContent,
      userPolicies = [],
      systemPolicies = [],
    } = params;

    const allPolicies = [...systemPolicies, ...userPolicies];

    // ── Direct mode: user chose a specific model ──
    if (routingMode === "direct" && selectedModel) {
      const validationError = await this.validateModelChoice(selectedModel, allPolicies);

      if (validationError) {
        // Fall back to auto-routing if the chosen model is invalid
        const fallbackResult = await this.autoRoute(
          declaredTask ?? this.classifyTask(messageContent ?? ""),
          allPolicies
        );
        return {
          ...fallbackResult,
          routingExplanation: `Selected model "${selectedModel}" is unavailable (${validationError}). ${fallbackResult.routingExplanation}`,
        };
      }

      const fallbacks = await this.buildAutoFallbackChain(selectedModel, declaredTask ?? "general");
      return {
        primaryModel: selectedModel,
        fallbackModels: fallbacks,
        routingExplanation: `Using directly selected model: ${selectedModel}`,
      };
    }

    // ── All other modes: auto-resolve ──
    const taskType = declaredTask ?? this.classifyTask(messageContent ?? "");
    return this.autoRoute(taskType, allPolicies, routingMode);
  }

  /**
   * Classify the task type from message content using simple heuristics.
   */
  classifyTask(messageContent: string): TaskType {
    if (!messageContent || messageContent.trim().length === 0) {
      return "general";
    }

    const lower = messageContent.toLowerCase();

    // Score each task type
    const scores: Record<TaskType, number> = {
      code_review: 0,
      data_analysis: 0,
      file_analysis: 0,
      reasoning: 0,
      quick_chat: 0,
      report_generation: 0,
      json_extraction: 0,
      vision: 0,
      general: 0,
    };

    for (const kw of CODE_KEYWORDS) {
      if (lower.includes(kw)) scores.code_review += 2;
    }
    for (const kw of DATA_KEYWORDS) {
      if (lower.includes(kw)) scores.data_analysis += 2;
    }
    for (const kw of FILE_KEYWORDS) {
      if (lower.includes(kw)) scores.file_analysis += 2;
    }
    for (const kw of REASONING_KEYWORDS) {
      if (lower.includes(kw)) scores.reasoning += 2;
    }
    for (const kw of JSON_KEYWORDS) {
      if (lower.includes(kw)) scores.json_extraction += 2;
    }
    for (const kw of REPORT_KEYWORDS) {
      if (lower.includes(kw)) scores.report_generation += 2;
    }
    for (const kw of VISION_KEYWORDS) {
      if (lower.includes(kw)) scores.vision += 2;
    }

    // Short messages are likely quick chat
    if (messageContent.length < 50) {
      scores.quick_chat += 3;
    }

    // Find the highest scoring task
    let best: TaskType = "general";
    let bestScore = 0;

    for (const [task, score] of Object.entries(scores) as Array<[TaskType, number]>) {
      if (score > bestScore) {
        bestScore = score;
        best = task;
      }
    }

    return bestScore >= 2 ? best : "general";
  }

  /**
   * Validate that a model slug is usable under the given constraints.
   * Returns null if valid, or an error string if invalid.
   */
  async validateModelChoice(
    slug: string,
    constraints: RoutingPolicyInput[] = []
  ): Promise<string | null> {
    const model = await this.registryService.getModelBySlug(slug);

    if (!model) {
      return "model not found in registry";
    }

    if (model.deprecated) {
      return "model is deprecated";
    }

    if (model.expires_at) {
      const expires = new Date(model.expires_at);
      if (expires <= new Date()) {
        return "model has expired";
      }
    }

    // Check against each policy
    for (const policy of constraints) {
      if (
        policy.maxCostPerRequest != null &&
        (model.input_cost_per_m ?? 0) > policy.maxCostPerRequest
      ) {
        return `input cost $${(model.input_cost_per_m ?? 0).toFixed(2)}/M exceeds policy limit of $${policy.maxCostPerRequest}/M`;
      }

      if (policy.requireParametersMatch && policy.requiredParameters) {
        const supported = new Set(model.supported_parameters ?? []);
        const missing = policy.requiredParameters.filter((p) => !supported.has(p));
        if (missing.length > 0) {
          return `model does not support required parameters: ${missing.join(", ")}`;
        }
      }
    }

    return null;
  }

  /**
   * Build an ordered fallback chain for a primary model and task type.
   */
  async buildAutoFallbackChain(
    primarySlug: string,
    taskType: TaskType | string
  ): Promise<string[]> {
    const all = await this.registryService.getFilteredCatalog({
      includeDeprecated: false,
    });

    const primary = all.find((m) => m.slug === primarySlug);
    if (!primary) return [];

    const suitabilityTask: SuitabilityTask =
      TASK_TO_SUITABILITY[taskType as TaskType] ?? "chat";

    // Score all other models
    const scored: ScoredModel[] = [];
    for (const model of all) {
      if (model.slug === primarySlug) continue;

      const scores = this.analysisService.computeSuitabilityScores(model);
      let score = scores[suitabilityTask] ?? 50;

      // Prefer same provider family as a first fallback
      if (model.provider_family === primary.provider_family) {
        score += 5;
      }

      // Prefer models with similar cost (within 2x)
      const primaryCost = primary.input_cost_per_m ?? 1;
      const modelCost = model.input_cost_per_m ?? 1;
      if (modelCost <= primaryCost * 2 && modelCost >= primaryCost * 0.5) {
        score += 3;
      }

      scored.push({ model, score });
    }

    // Sort by score descending, take top 3
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((s) => s.model.slug);
  }

  /**
   * Filter candidate models by the given policies.
   */
  applyPolicies(
    candidates: ModelRegistryRow[],
    policies: RoutingPolicyInput[]
  ): ModelRegistryRow[] {
    if (policies.length === 0) return candidates;

    return candidates.filter((model) => {
      for (const policy of policies) {
        // Cost ceiling
        if (
          policy.maxCostPerRequest != null &&
          (model.input_cost_per_m ?? 0) > policy.maxCostPerRequest
        ) {
          return false;
        }

        // Provider preferences (exclude models from providers with weight 0)
        if (policy.providerPreferences) {
          const weight = policy.providerPreferences[model.provider_family ?? ""];
          if (weight !== undefined && weight === 0) {
            return false;
          }
        }

        // ZDR requirement
        if (policy.requireZdr && !model.is_moderated) {
          return false;
        }

        // Parameter support
        if (policy.requireParametersMatch && policy.requiredParameters) {
          const supported = new Set(model.supported_parameters ?? []);
          if (!policy.requiredParameters.every((p) => supported.has(p))) {
            return false;
          }
        }
      }

      return true;
    });
  }

  // -----------------------------------------------------------------------
  // Internal routing logic
  // -----------------------------------------------------------------------

  /**
   * Auto-route based on the task type, policies, and routing mode.
   */
  private async autoRoute(
    taskType: TaskType,
    policies: RoutingPolicyInput[],
    routingMode: ServiceRoutingMode = "auto"
  ): Promise<RouteResult> {
    // Load DB policies if available
    const dbPolicies = await this.loadDbPolicies(routingMode);
    if (dbPolicies) {
      const validationError = await this.validateModelChoice(
        dbPolicies.primary_model ?? "",
        policies
      );
      if (!validationError && dbPolicies.primary_model) {
        return {
          primaryModel: dbPolicies.primary_model,
          fallbackModels: dbPolicies.fallback_models ?? [],
          routingExplanation: `Resolved via DB policy "${dbPolicies.name}" for mode "${routingMode}".`,
        };
      }
    }

    // Determine which filters and suitability task to use
    const filters = this.getFiltersForMode(routingMode);
    const suitabilityTask = this.getSuitabilityTaskForRouting(routingMode, taskType);

    // Get candidate models
    let candidates = await this.registryService.getFilteredCatalog(filters);

    // Apply policies
    candidates = this.applyPolicies(candidates, policies);

    if (candidates.length === 0) {
      // Last resort: return a sensible default
      return {
        primaryModel: "anthropic/claude-sonnet-4",
        fallbackModels: ["openai/gpt-4o", "google/gemini-2.5-pro"],
        routingExplanation:
          "No models matched the given constraints. Falling back to default (claude-sonnet-4).",
      };
    }

    // Score and rank candidates
    const scored: ScoredModel[] = candidates.map((model) => {
      const scores = this.analysisService.computeSuitabilityScores(model);
      let score = scores[suitabilityTask] ?? 50;

      // Apply provider preference weights
      for (const policy of policies) {
        if (policy.providerPreferences) {
          const weight = policy.providerPreferences[model.provider_family ?? ""];
          if (weight !== undefined) {
            score *= weight;
          }
        }
      }

      return { model, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const primary = scored[0].model.slug;
    const fallbacks = scored
      .slice(1, 4)
      .map((s) => s.model.slug);

    const modeName = routingMode === "auto" ? `auto (task: ${taskType})` : routingMode;

    return {
      primaryModel: primary,
      fallbackModels: fallbacks,
      routingExplanation:
        `Routed via "${modeName}" mode. Selected ${primary} (score: ${scored[0].score.toFixed(0)}) ` +
        `from ${candidates.length} candidate model(s).`,
    };
  }

  /**
   * Build CatalogFilters appropriate for a given routing mode.
   */
  private getFiltersForMode(mode: ServiceRoutingMode): import("./model-registry.service.js").CatalogFilters {
    switch (mode) {
      case "fast":
        return { tags: ["fast"], maxCost: 2 };
      case "balanced":
        return { features: { toolsSupport: true } };
      case "best-quality":
        return { tags: ["premium"] };
      case "reasoning":
        return { features: { reasoningSupport: true } };
      case "coding":
        return { tags: ["coding"] };
      case "vision":
        return { modalities: ["image"] };
      case "file-analysis":
        return { minContext: 100_000 };
      case "data-analysis":
        return { features: { toolsSupport: true, structuredOutput: true } };
      case "direct":
      case "auto":
      default:
        return {};
    }
  }

  /**
   * Determine the suitability task to score candidates against.
   */
  private getSuitabilityTaskForRouting(
    mode: ServiceRoutingMode,
    taskType: TaskType
  ): SuitabilityTask {
    // Explicit mode takes precedence
    const modeTask = MODE_TO_TASK[mode];
    if (modeTask) return modeTask;

    // Fall back to task-type mapping
    return TASK_TO_SUITABILITY[taskType] ?? "chat";
  }

  /**
   * Try to load a matching routing policy from the database.
   */
  private async loadDbPolicies(
    routingMode: string
  ): Promise<ModelRoutingPolicyRow | null> {
    if (!this.db) return null;

    try {
      const { data, error } = await this.db
        .from("model_routing_policies")
        .select("*")
        .eq("routing_mode", routingMode)
        .order("priority", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;
      return data as ModelRoutingPolicyRow;
    } catch {
      return null;
    }
  }
}
