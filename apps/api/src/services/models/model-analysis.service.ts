/**
 * ModelAnalysisService — Derives capability analysis for models.
 *
 * Produces structured analysis including ideal use cases, strengths,
 * weaknesses, and per-task suitability scores for any model in the
 * registry. Falls back to pre-computed demo analysis when the database
 * is unavailable.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModelRegistryRow } from "@thinkora/db";
import type { ModelAnalysis } from "@thinkora/ui-contracts";
import type { ModelRegistryService } from "./model-registry.service.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Full analysis result returned by analyzeModel. */
export interface ModelAnalysisResult extends ModelAnalysis {
  /** ISO-8601 timestamp of when this analysis was computed. */
  computedAt: string;
}

/** Side-by-side model comparison. */
export interface ModelComparison {
  modelA: ModelAnalysisResult;
  modelB: ModelAnalysisResult;
  /** Dimensions where A beats B. */
  aAdvantages: string[];
  /** Dimensions where B beats A. */
  bAdvantages: string[];
  /** Quick recommendation statement. */
  recommendation: string;
}

/** The task types for which we compute suitability scores. */
export const SUITABILITY_TASKS = [
  "chat",
  "deep-reasoning",
  "rag-summarization",
  "citation-heavy",
  "file-comparison",
  "spreadsheet-analysis",
  "json-extraction",
  "code-review",
  "tool-calling",
  "low-latency",
  "low-cost",
] as const;

export type SuitabilityTask = (typeof SUITABILITY_TASKS)[number];

// ---------------------------------------------------------------------------
// Pre-computed demo analyses
// ---------------------------------------------------------------------------

const DEMO_ANALYSES: Record<string, ModelAnalysisResult> = {
  "anthropic/claude-sonnet-4": {
    modelSlug: "anthropic/claude-sonnet-4",
    summary:
      "A well-rounded model with strong reasoning, coding, vision, and tool-use capabilities at a moderate price point. Excellent as a default model for most tasks.",
    idealUseCases: [
      "General-purpose chat and Q&A",
      "Code review and generation",
      "Document analysis with citations",
      "Multi-step reasoning tasks",
      "Tool-augmented workflows",
    ],
    strengths: [
      "Large 200K context window",
      "Strong tool and structured output support",
      "Extended thinking / reasoning mode",
      "Vision support for image understanding",
      "Balanced cost-to-quality ratio at $3/M input",
    ],
    weaknesses: [
      "More expensive than budget models",
      "Slower than Haiku for simple tasks",
    ],
    suitabilityScores: {
      chat: 90,
      "deep-reasoning": 85,
      "rag-summarization": 88,
      "citation-heavy": 85,
      "file-comparison": 82,
      "spreadsheet-analysis": 80,
      "json-extraction": 88,
      "code-review": 92,
      "tool-calling": 90,
      "low-latency": 55,
      "low-cost": 45,
    },
    computedAt: new Date().toISOString(),
  },
  "anthropic/claude-opus-4": {
    modelSlug: "anthropic/claude-opus-4",
    summary:
      "Anthropic's most capable model. Best for complex, multi-step reasoning where quality is paramount and cost is secondary.",
    idealUseCases: [
      "Complex multi-step reasoning",
      "Deep code analysis and architecture design",
      "Long-form report generation",
      "Tasks requiring highest accuracy",
    ],
    strengths: [
      "Highest quality output among Anthropic models",
      "Exceptional reasoning and analysis",
      "Large 200K context window",
      "Strong tool and structured output support",
      "Extended thinking for complex problems",
    ],
    weaknesses: [
      "High cost at $15/M input tokens",
      "Slower inference speed",
      "Overkill for simple chat tasks",
    ],
    suitabilityScores: {
      chat: 80,
      "deep-reasoning": 98,
      "rag-summarization": 90,
      "citation-heavy": 92,
      "file-comparison": 88,
      "spreadsheet-analysis": 85,
      "json-extraction": 85,
      "code-review": 96,
      "tool-calling": 90,
      "low-latency": 30,
      "low-cost": 15,
    },
    computedAt: new Date().toISOString(),
  },
  "anthropic/claude-haiku-3.5": {
    modelSlug: "anthropic/claude-haiku-3.5",
    summary:
      "Anthropic's fastest and most affordable model. Ideal for high-volume, latency-sensitive tasks where top-tier reasoning is not required.",
    idealUseCases: [
      "Quick chat responses",
      "Simple data extraction and classification",
      "High-volume batch processing",
      "Latency-sensitive applications",
      "Cost-sensitive deployments",
    ],
    strengths: [
      "Very low cost at $0.80/M input tokens",
      "Fast response times",
      "Large 200K context window",
      "Good tool and structured output support",
      "Vision support",
    ],
    weaknesses: [
      "Weaker at complex multi-step reasoning",
      "No extended thinking mode",
      "Lower maximum completion tokens (8K)",
    ],
    suitabilityScores: {
      chat: 80,
      "deep-reasoning": 40,
      "rag-summarization": 70,
      "citation-heavy": 60,
      "file-comparison": 55,
      "spreadsheet-analysis": 65,
      "json-extraction": 78,
      "code-review": 60,
      "tool-calling": 75,
      "low-latency": 95,
      "low-cost": 90,
    },
    computedAt: new Date().toISOString(),
  },
  "openai/gpt-4o": {
    modelSlug: "openai/gpt-4o",
    summary:
      "OpenAI's flagship multimodal model. Strong across all modalities with good tool support and competitive pricing.",
    idealUseCases: [
      "General-purpose chat",
      "Image understanding and analysis",
      "Audio transcription and analysis",
      "Structured data extraction",
      "Tool-augmented workflows",
    ],
    strengths: [
      "Multimodal: text, image, and audio input",
      "Strong tool and structured output support",
      "128K context window",
      "Competitive pricing at $2.50/M input",
      "Broadly capable across tasks",
    ],
    weaknesses: [
      "No native extended thinking / reasoning mode",
      "Smaller context than Anthropic and Google models",
      "Moderated content restrictions",
    ],
    suitabilityScores: {
      chat: 88,
      "deep-reasoning": 72,
      "rag-summarization": 82,
      "citation-heavy": 78,
      "file-comparison": 70,
      "spreadsheet-analysis": 78,
      "json-extraction": 85,
      "code-review": 82,
      "tool-calling": 88,
      "low-latency": 65,
      "low-cost": 55,
    },
    computedAt: new Date().toISOString(),
  },
  "openai/gpt-4o-mini": {
    modelSlug: "openai/gpt-4o-mini",
    summary:
      "OpenAI's affordable everyday model. Very low cost with surprisingly good capabilities for simpler tasks.",
    idealUseCases: [
      "High-volume simple queries",
      "Data classification and extraction",
      "Quick summarization",
      "Budget-friendly chat deployments",
    ],
    strengths: [
      "Extremely low cost at $0.15/M input tokens",
      "Fast response times",
      "128K context window",
      "Good tool support",
      "Vision support",
    ],
    weaknesses: [
      "Weaker at complex reasoning",
      "Lower quality for nuanced tasks",
      "No extended thinking mode",
    ],
    suitabilityScores: {
      chat: 75,
      "deep-reasoning": 35,
      "rag-summarization": 65,
      "citation-heavy": 55,
      "file-comparison": 50,
      "spreadsheet-analysis": 60,
      "json-extraction": 72,
      "code-review": 55,
      "tool-calling": 72,
      "low-latency": 92,
      "low-cost": 96,
    },
    computedAt: new Date().toISOString(),
  },
  "google/gemini-2.5-pro": {
    modelSlug: "google/gemini-2.5-pro",
    summary:
      "Google's reasoning-capable model with an industry-leading 1M context window. Excellent for long-document analysis and file comparison at a competitive price.",
    idealUseCases: [
      "Very long document analysis (books, codebases)",
      "Multi-file comparison",
      "Reasoning over large datasets",
      "Video and audio understanding",
      "Complex RAG with many sources",
    ],
    strengths: [
      "Massive 1M token context window",
      "Native reasoning support",
      "Multimodal: text, image, audio, video",
      "Strong tool and structured output support",
      "Competitive pricing at $1.25/M input",
    ],
    weaknesses: [
      "Not moderated (may need guardrails)",
      "Newer model with less community benchmarking",
    ],
    suitabilityScores: {
      chat: 82,
      "deep-reasoning": 88,
      "rag-summarization": 95,
      "citation-heavy": 90,
      "file-comparison": 95,
      "spreadsheet-analysis": 85,
      "json-extraction": 82,
      "code-review": 85,
      "tool-calling": 85,
      "low-latency": 45,
      "low-cost": 70,
    },
    computedAt: new Date().toISOString(),
  },
  "google/gemini-2.0-flash": {
    modelSlug: "google/gemini-2.0-flash",
    summary:
      "Google's ultra-fast, ultra-cheap model with a 1M context window. Exceptional value for high-volume workloads and long-document processing.",
    idealUseCases: [
      "High-volume batch processing",
      "Long document summarization",
      "Quick multimodal tasks",
      "Cost-sensitive applications",
    ],
    strengths: [
      "Extremely low cost at $0.10/M input tokens",
      "Massive 1M token context window",
      "Fast response times",
      "Full multimodal support (text, image, audio, video)",
      "Good tool support",
    ],
    weaknesses: [
      "Lower quality for complex reasoning",
      "Smaller max completion (8K tokens)",
      "Not moderated",
    ],
    suitabilityScores: {
      chat: 70,
      "deep-reasoning": 35,
      "rag-summarization": 75,
      "citation-heavy": 60,
      "file-comparison": 70,
      "spreadsheet-analysis": 60,
      "json-extraction": 68,
      "code-review": 50,
      "tool-calling": 70,
      "low-latency": 90,
      "low-cost": 98,
    },
    computedAt: new Date().toISOString(),
  },
  "deepseek/deepseek-r1": {
    modelSlug: "deepseek/deepseek-r1",
    summary:
      "DeepSeek's open-weight reasoning model. Excellent reasoning at a very low price, but lacks tool use and vision.",
    idealUseCases: [
      "Complex reasoning and math problems",
      "Scientific analysis",
      "Budget-friendly deep thinking",
    ],
    strengths: [
      "Strong reasoning capabilities",
      "Very low cost at $0.55/M input tokens",
      "Open-source weights",
    ],
    weaknesses: [
      "No tool or function calling support",
      "No vision support",
      "No structured output support",
      "Limited 64K context window",
    ],
    suitabilityScores: {
      chat: 55,
      "deep-reasoning": 85,
      "rag-summarization": 50,
      "citation-heavy": 40,
      "file-comparison": 35,
      "spreadsheet-analysis": 30,
      "json-extraction": 25,
      "code-review": 70,
      "tool-calling": 5,
      "low-latency": 55,
      "low-cost": 88,
    },
    computedAt: new Date().toISOString(),
  },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ModelAnalysisService {
  constructor(
    private readonly db: SupabaseClient | null,
    private readonly registryService: ModelRegistryService
  ) {}

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Return a complete analysis for the specified model slug.
   * Checks the DB cache first, computes on the fly if missing, and stores
   * the result for future lookups.
   */
  async analyzeModel(slug: string): Promise<ModelAnalysisResult | null> {
    // Check DB cache
    if (this.db) {
      try {
        const { data, error } = await this.db
          .from("model_analysis_cache")
          .select("*")
          .eq("model_slug", slug)
          .single();

        if (!error && data) {
          return {
            modelSlug: data.model_slug,
            summary: data.summary,
            idealUseCases: data.ideal_use_cases ?? [],
            strengths: data.strengths ?? [],
            weaknesses: data.weaknesses ?? [],
            suitabilityScores: data.suitability_scores ?? {},
            computedAt: data.computed_at ?? new Date().toISOString(),
          } as ModelAnalysisResult;
        }
      } catch {
        // Fall through to computation
      }
    }

    // Check demo fallback
    if (DEMO_ANALYSES[slug]) {
      return DEMO_ANALYSES[slug];
    }

    // Compute from model data
    const model = await this.registryService.getModelBySlug(slug);
    if (!model) return null;

    const analysis: ModelAnalysisResult = {
      modelSlug: slug,
      summary: this.buildSummary(model),
      idealUseCases: this.deriveIdealUseCases(model),
      strengths: this.deriveStrengths(model),
      weaknesses: this.deriveWeaknesses(model),
      suitabilityScores: this.computeSuitabilityScores(model),
      computedAt: new Date().toISOString(),
    };

    // Persist to DB cache (best-effort)
    if (this.db) {
      this.db
        .from("model_analysis_cache")
        .upsert(
          {
            model_slug: slug,
            summary: analysis.summary,
            ideal_use_cases: analysis.idealUseCases,
            strengths: analysis.strengths,
            weaknesses: analysis.weaknesses,
            suitability_scores: analysis.suitabilityScores,
            computed_at: analysis.computedAt,
          },
          { onConflict: "model_slug" }
        )
        .then(({ error }) => {
          if (error) {
            console.warn("[ModelAnalysisService] Failed to cache analysis:", error.message);
          }
        });
    }

    return analysis;
  }

  /**
   * Derive ideal use cases based on the model's tags, context length,
   * pricing, and capabilities.
   */
  deriveIdealUseCases(model: ModelRegistryRow): string[] {
    const useCases: string[] = [];
    const tags = model.tags ?? [];
    const inputCost = model.input_cost_per_m ?? 0;
    const contextLength = model.context_length ?? 0;

    // General chat — almost every model
    if (tags.includes("best-for-chat") || (model.tools_support && contextLength >= 32_000)) {
      useCases.push("General-purpose chat and Q&A");
    }

    // Reasoning
    if (model.reasoning_support || tags.includes("reasoning")) {
      useCases.push("Complex multi-step reasoning tasks");
    }

    // Coding
    if (tags.includes("coding") || (model.tools_support && model.structured_output)) {
      useCases.push("Code review and generation");
    }

    // Document analysis
    if (contextLength >= 100_000) {
      useCases.push("Long document analysis and summarization");
    }

    // File comparison
    if (contextLength >= 200_000) {
      useCases.push("Multi-file comparison and cross-reference");
    }

    // Tool-augmented
    if (model.tools_support) {
      useCases.push("Tool-augmented workflows and function calling");
    }

    // Data extraction
    if (model.structured_output) {
      useCases.push("Structured data extraction (JSON, tables)");
    }

    // Vision
    if ((model.input_modalities ?? []).includes("image")) {
      useCases.push("Image understanding and analysis");
    }

    // Budget / high-volume
    if (inputCost < 1) {
      useCases.push("High-volume batch processing");
    }

    // Latency-sensitive
    if (tags.includes("fast")) {
      useCases.push("Latency-sensitive real-time applications");
    }

    return useCases.slice(0, 6);
  }

  /**
   * Derive human-readable strengths from model characteristics.
   */
  deriveStrengths(model: ModelRegistryRow): string[] {
    const strengths: string[] = [];
    const inputCost = model.input_cost_per_m ?? 0;
    const contextLength = model.context_length ?? 0;
    const tags = model.tags ?? [];

    // Context window
    if (contextLength >= 1_000_000) {
      strengths.push(`Massive ${(contextLength / 1_000_000).toFixed(0)}M token context window`);
    } else if (contextLength >= 100_000) {
      strengths.push(`Large ${(contextLength / 1_000).toFixed(0)}K context window`);
    } else if (contextLength >= 32_000) {
      strengths.push(`${(contextLength / 1_000).toFixed(0)}K context window`);
    }

    // Cost
    if (inputCost === 0) {
      strengths.push("Free to use");
    } else if (inputCost <= 0.5) {
      strengths.push(`Very low cost at $${inputCost.toFixed(2)}/M input tokens`);
    } else if (inputCost <= 3) {
      strengths.push(`Competitive pricing at $${inputCost.toFixed(2)}/M input tokens`);
    }

    // Reasoning
    if (model.reasoning_support) {
      strengths.push("Native extended thinking / reasoning mode");
    }

    // Tools
    if (model.tools_support) {
      strengths.push("Strong tool / function calling support");
    }

    // Structured output
    if (model.structured_output) {
      strengths.push("Structured output (JSON mode) support");
    }

    // Multimodal
    const inputMods = model.input_modalities ?? [];
    if (inputMods.includes("image") && inputMods.includes("audio") && inputMods.includes("video")) {
      strengths.push("Full multimodal support (text, image, audio, video)");
    } else if (inputMods.includes("image") && inputMods.includes("audio")) {
      strengths.push("Multimodal: text, image, and audio input");
    } else if (inputMods.includes("image")) {
      strengths.push("Vision support for image understanding");
    }

    // Speed
    if (tags.includes("fast")) {
      strengths.push("Fast response times");
    }

    // Max completion
    if ((model.max_completion_tokens ?? 0) >= 64_000) {
      strengths.push(`High max output of ${((model.max_completion_tokens ?? 0) / 1_000).toFixed(0)}K tokens`);
    }

    // Moderated
    if (model.is_moderated) {
      strengths.push("Content moderation built-in");
    }

    // Open source
    if (tags.includes("open-source")) {
      strengths.push("Open-source weights available");
    }

    return strengths.slice(0, 6);
  }

  /**
   * Derive human-readable weaknesses from model characteristics.
   */
  deriveWeaknesses(model: ModelRegistryRow): string[] {
    const weaknesses: string[] = [];
    const inputCost = model.input_cost_per_m ?? 0;
    const contextLength = model.context_length ?? 0;
    const tags = model.tags ?? [];

    // Cost
    if (inputCost >= 10) {
      weaknesses.push(`High cost at $${inputCost.toFixed(2)}/M input tokens`);
    } else if (inputCost >= 5) {
      weaknesses.push(`Moderately high cost at $${inputCost.toFixed(2)}/M input tokens`);
    }

    // Context
    if (contextLength < 32_000) {
      weaknesses.push(`Limited context window (${(contextLength / 1_000).toFixed(0)}K tokens)`);
    }

    // No reasoning
    if (!model.reasoning_support) {
      weaknesses.push("No native extended thinking / reasoning mode");
    }

    // No vision
    if (!(model.input_modalities ?? []).includes("image")) {
      weaknesses.push("No vision / image support");
    }

    // No tools
    if (!model.tools_support) {
      weaknesses.push("No tool / function calling support");
    }

    // No structured output
    if (!model.structured_output) {
      weaknesses.push("No structured output (JSON mode) support");
    }

    // Small max completion
    if ((model.max_completion_tokens ?? 0) > 0 && (model.max_completion_tokens ?? 0) <= 8_192) {
      weaknesses.push(`Limited max output (${((model.max_completion_tokens ?? 0) / 1_000).toFixed(0)}K tokens)`);
    }

    // Not moderated
    if (!model.is_moderated) {
      weaknesses.push("Not moderated (may need external guardrails)");
    }

    // Slow (premium models tend to be slower)
    if (tags.includes("premium") && !tags.includes("fast")) {
      weaknesses.push("Slower inference speed compared to budget models");
    }

    return weaknesses.slice(0, 5);
  }

  /**
   * Compute suitability scores (0-100) for each predefined task type.
   */
  computeSuitabilityScores(model: ModelRegistryRow): Record<SuitabilityTask, number> {
    const inputCost = model.input_cost_per_m ?? 0;
    const contextLength = model.context_length ?? 0;
    const maxOutput = model.max_completion_tokens ?? 4_096;
    const hasTools = model.tools_support;
    const hasStructured = model.structured_output;
    const hasReasoning = model.reasoning_support;
    const hasVision = (model.input_modalities ?? []).includes("image");
    const tags = model.tags ?? [];

    const scores: Record<string, number> = {};

    // -- chat --
    {
      let s = 50;
      if (tags.includes("best-for-chat")) s += 25;
      if (hasTools) s += 10;
      if (contextLength >= 128_000) s += 5;
      if (inputCost <= 3) s += 5;
      if (inputCost > 10) s -= 10;
      scores.chat = clamp(s);
    }

    // -- deep-reasoning --
    {
      let s = 30;
      if (hasReasoning) s += 40;
      if (tags.includes("reasoning")) s += 15;
      if (maxOutput >= 32_000) s += 5;
      if (contextLength >= 100_000) s += 5;
      if (tags.includes("premium")) s += 5;
      scores["deep-reasoning"] = clamp(s);
    }

    // -- rag-summarization --
    {
      let s = 40;
      if (contextLength >= 200_000) s += 25;
      else if (contextLength >= 100_000) s += 15;
      else if (contextLength >= 32_000) s += 5;
      if (hasTools) s += 10;
      if (hasStructured) s += 5;
      if (maxOutput >= 16_000) s += 5;
      if (tags.includes("premium") || tags.includes("best-for-chat")) s += 5;
      scores["rag-summarization"] = clamp(s);
    }

    // -- citation-heavy --
    {
      let s = 35;
      if (contextLength >= 200_000) s += 25;
      else if (contextLength >= 100_000) s += 15;
      if (hasStructured) s += 15;
      if (hasTools) s += 10;
      if (hasReasoning) s += 5;
      if (tags.includes("premium")) s += 5;
      scores["citation-heavy"] = clamp(s);
    }

    // -- file-comparison --
    {
      let s = 30;
      if (contextLength >= 500_000) s += 30;
      else if (contextLength >= 200_000) s += 20;
      else if (contextLength >= 100_000) s += 10;
      if (hasVision) s += 10;
      if (hasReasoning) s += 10;
      if (maxOutput >= 16_000) s += 5;
      if (tags.includes("premium")) s += 5;
      scores["file-comparison"] = clamp(s);
    }

    // -- spreadsheet-analysis --
    {
      let s = 30;
      if (hasStructured) s += 20;
      if (hasTools) s += 15;
      if (contextLength >= 100_000) s += 10;
      if (hasReasoning) s += 10;
      if (tags.includes("premium")) s += 5;
      scores["spreadsheet-analysis"] = clamp(s);
    }

    // -- json-extraction --
    {
      let s = 30;
      if (hasStructured) s += 30;
      if (hasTools) s += 15;
      if (tags.includes("best-for-chat") || tags.includes("premium")) s += 10;
      if (contextLength >= 100_000) s += 5;
      scores["json-extraction"] = clamp(s);
    }

    // -- code-review --
    {
      let s = 40;
      if (tags.includes("coding")) s += 20;
      if (hasReasoning) s += 15;
      if (contextLength >= 100_000) s += 10;
      if (maxOutput >= 16_000) s += 5;
      if (tags.includes("premium")) s += 5;
      if (hasTools) s += 5;
      scores["code-review"] = clamp(s);
    }

    // -- tool-calling --
    {
      let s = 10;
      if (hasTools) s += 45;
      if (hasStructured) s += 15;
      if (tags.includes("tool-capable")) s += 10;
      if (tags.includes("premium") || tags.includes("best-for-chat")) s += 10;
      if (contextLength >= 100_000) s += 5;
      scores["tool-calling"] = clamp(s);
    }

    // -- low-latency --
    {
      let s = 50;
      if (tags.includes("fast")) s += 30;
      if (inputCost <= 0.5) s += 10;
      else if (inputCost <= 1) s += 5;
      if (inputCost >= 10) s -= 20;
      else if (inputCost >= 5) s -= 10;
      if (tags.includes("premium") && !tags.includes("fast")) s -= 10;
      scores["low-latency"] = clamp(s);
    }

    // -- low-cost --
    {
      let s = 50;
      if (inputCost === 0) s = 100;
      else if (inputCost <= 0.2) s += 40;
      else if (inputCost <= 1) s += 25;
      else if (inputCost <= 3) s += 5;
      else if (inputCost >= 10) s -= 30;
      else if (inputCost >= 5) s -= 15;
      scores["low-cost"] = clamp(s);
    }

    return scores as Record<SuitabilityTask, number>;
  }

  /**
   * Return a side-by-side comparison of two models.
   */
  async getModelComparison(slugA: string, slugB: string): Promise<ModelComparison | null> {
    const [analysisA, analysisB] = await Promise.all([
      this.analyzeModel(slugA),
      this.analyzeModel(slugB),
    ]);

    if (!analysisA || !analysisB) return null;

    const aAdvantages: string[] = [];
    const bAdvantages: string[] = [];

    for (const task of SUITABILITY_TASKS) {
      const scoreA = analysisA.suitabilityScores[task] ?? 0;
      const scoreB = analysisB.suitabilityScores[task] ?? 0;
      const diff = scoreA - scoreB;
      const label = formatTaskLabel(task);

      if (diff >= 15) {
        aAdvantages.push(`Significantly better at ${label} (${scoreA} vs ${scoreB})`);
      } else if (diff >= 5) {
        aAdvantages.push(`Better at ${label} (${scoreA} vs ${scoreB})`);
      } else if (diff <= -15) {
        bAdvantages.push(`Significantly better at ${label} (${scoreB} vs ${scoreA})`);
      } else if (diff <= -5) {
        bAdvantages.push(`Better at ${label} (${scoreB} vs ${scoreA})`);
      }
    }

    // Build a brief recommendation
    const avgA =
      Object.values(analysisA.suitabilityScores).reduce((a, b) => a + b, 0) /
      SUITABILITY_TASKS.length;
    const avgB =
      Object.values(analysisB.suitabilityScores).reduce((a, b) => a + b, 0) /
      SUITABILITY_TASKS.length;

    let recommendation: string;
    if (Math.abs(avgA - avgB) < 5) {
      recommendation = `Both models are closely matched overall (avg ${avgA.toFixed(0)} vs ${avgB.toFixed(0)}). Choose based on the specific task requirements.`;
    } else if (avgA > avgB) {
      recommendation = `${analysisA.modelSlug} scores higher overall (avg ${avgA.toFixed(0)} vs ${avgB.toFixed(0)}) and is recommended for most use cases.`;
    } else {
      recommendation = `${analysisB.modelSlug} scores higher overall (avg ${avgB.toFixed(0)} vs ${avgA.toFixed(0)}) and is recommended for most use cases.`;
    }

    return {
      modelA: analysisA,
      modelB: analysisB,
      aAdvantages,
      bAdvantages,
      recommendation,
    };
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private buildSummary(model: ModelRegistryRow): string {
    const name = model.display_name ?? model.slug;
    const provider = model.provider_family ?? "unknown";
    const cost = model.input_cost_per_m ?? 0;
    const ctx = model.context_length ?? 0;

    const capabilities: string[] = [];
    if (model.reasoning_support) capabilities.push("reasoning");
    if (model.tools_support) capabilities.push("tool use");
    if (model.structured_output) capabilities.push("structured output");
    if ((model.input_modalities ?? []).includes("image")) capabilities.push("vision");

    const capStr =
      capabilities.length > 0
        ? ` with ${capabilities.join(", ")} capabilities`
        : "";

    const costStr =
      cost === 0
        ? "free"
        : cost <= 1
          ? "budget-friendly"
          : cost <= 5
            ? "moderately priced"
            : "premium";

    const ctxStr =
      ctx >= 1_000_000
        ? `${(ctx / 1_000_000).toFixed(0)}M`
        : ctx >= 1_000
          ? `${(ctx / 1_000).toFixed(0)}K`
          : `${ctx}`;

    return `${name} by ${provider} is a ${costStr} model${capStr}. It offers a ${ctxStr} token context window at $${cost.toFixed(2)}/M input tokens.`;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function formatTaskLabel(task: SuitabilityTask): string {
  return task
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
