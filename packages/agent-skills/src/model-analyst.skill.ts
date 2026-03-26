// ---------------------------------------------------------------------------
// @thinkora/agent-skills — Model Analyst Skill
// ---------------------------------------------------------------------------

import type {
  AgentContext,
  SkillDefinition,
  SkillHandler,
} from "@thinkora/agent-core";

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

export const ModelAnalystDefinition: SkillDefinition = {
  id: "model-analyst",
  name: "Model Analyst",
  description:
    "Scores and compares AI models for specific tasks. Recommends the best " +
    "model for: chat, deep reasoning, RAG summarization, citation-heavy, " +
    "file comparison, spreadsheet analysis, JSON extraction, code review, " +
    "tool calling, low-latency, and low-cost use cases.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Model evaluation query" },
      taskType: {
        type: "string",
        description: "Specific task type to evaluate models for (optional)",
      },
      modelsToCompare: {
        type: "array",
        items: { type: "string" },
        description: "Specific model slugs to compare (optional)",
      },
    },
    required: ["query"],
  },
  outputSchema: {
    type: "object",
    properties: {
      recommendation: {
        type: "object",
        properties: {
          modelSlug: { type: "string" },
          reason: { type: "string" },
          taskType: { type: "string" },
        },
      },
      scores: {
        type: "array",
        items: {
          type: "object",
          properties: {
            modelSlug: { type: "string" },
            overall: { type: "number" },
            dimensions: { type: "object" },
          },
        },
      },
      taskSuitability: {
        type: "object",
        description: "Map of task type to recommended model slug",
      },
    },
  },
  toolDependencies: ["get_model_info"],
  failureModes: [
    "Model catalogue may be stale if not recently synced",
    "Benchmark data may not exist for newer models",
    "Cost estimates may differ from actual billing",
  ],
  observabilityMetadata: {
    category: "analysis",
    costTier: "none",
    typicalLatencyMs: 20,
  },
};

// ---------------------------------------------------------------------------
// Task types and model scoring profiles
// ---------------------------------------------------------------------------

/** Known task types that models can be scored against. */
const TASK_TYPES = [
  "chat",
  "deep_reasoning",
  "rag_summarization",
  "citation_heavy",
  "file_comparison",
  "spreadsheet_analysis",
  "json_extraction",
  "code_review",
  "tool_calling",
  "low_latency",
  "low_cost",
] as const;

type TaskType = (typeof TASK_TYPES)[number];

/**
 * Scoring profiles for well-known model families.
 * In production these would come from benchmark data in the database.
 */
const MODEL_PROFILES: Record<string, Partial<Record<TaskType, number>>> = {
  "anthropic/claude-sonnet": {
    chat: 0.92,
    deep_reasoning: 0.88,
    rag_summarization: 0.93,
    citation_heavy: 0.95,
    file_comparison: 0.90,
    spreadsheet_analysis: 0.80,
    json_extraction: 0.88,
    code_review: 0.92,
    tool_calling: 0.95,
    low_latency: 0.70,
    low_cost: 0.50,
  },
  "anthropic/claude-haiku": {
    chat: 0.80,
    deep_reasoning: 0.65,
    rag_summarization: 0.82,
    citation_heavy: 0.78,
    file_comparison: 0.72,
    spreadsheet_analysis: 0.70,
    json_extraction: 0.85,
    code_review: 0.75,
    tool_calling: 0.85,
    low_latency: 0.95,
    low_cost: 0.92,
  },
  "openai/gpt-4o": {
    chat: 0.90,
    deep_reasoning: 0.85,
    rag_summarization: 0.88,
    citation_heavy: 0.85,
    file_comparison: 0.87,
    spreadsheet_analysis: 0.82,
    json_extraction: 0.90,
    code_review: 0.88,
    tool_calling: 0.92,
    low_latency: 0.75,
    low_cost: 0.55,
  },
  "openai/gpt-4o-mini": {
    chat: 0.82,
    deep_reasoning: 0.70,
    rag_summarization: 0.80,
    citation_heavy: 0.75,
    file_comparison: 0.72,
    spreadsheet_analysis: 0.75,
    json_extraction: 0.85,
    code_review: 0.78,
    tool_calling: 0.88,
    low_latency: 0.92,
    low_cost: 0.90,
  },
  "google/gemini-pro-1.5": {
    chat: 0.88,
    deep_reasoning: 0.82,
    rag_summarization: 0.90,
    citation_heavy: 0.80,
    file_comparison: 0.85,
    spreadsheet_analysis: 0.85,
    json_extraction: 0.82,
    code_review: 0.82,
    tool_calling: 0.80,
    low_latency: 0.72,
    low_cost: 0.60,
  },
  "meta-llama/llama-3.1-70b": {
    chat: 0.82,
    deep_reasoning: 0.75,
    rag_summarization: 0.80,
    citation_heavy: 0.72,
    file_comparison: 0.72,
    spreadsheet_analysis: 0.70,
    json_extraction: 0.78,
    code_review: 0.78,
    tool_calling: 0.70,
    low_latency: 0.80,
    low_cost: 0.85,
  },
  "deepseek/deepseek-r1": {
    chat: 0.78,
    deep_reasoning: 0.95,
    rag_summarization: 0.82,
    citation_heavy: 0.75,
    file_comparison: 0.80,
    spreadsheet_analysis: 0.78,
    json_extraction: 0.80,
    code_review: 0.88,
    tool_calling: 0.72,
    low_latency: 0.50,
    low_cost: 0.80,
  },
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const ModelAnalystHandler: SkillHandler = async (
  input: unknown,
  _context: AgentContext,
): Promise<unknown> => {
  const {
    query,
    taskType: requestedTaskType,
    modelsToCompare,
  } = input as {
    query: string;
    taskType?: string;
    modelsToCompare?: string[];
  };

  // --- Determine task type from query ---
  const taskType = requestedTaskType
    ? (requestedTaskType as TaskType)
    : inferTaskType(query);

  // --- Select models to evaluate ---
  const modelSlugs =
    modelsToCompare && modelsToCompare.length > 0
      ? modelsToCompare
      : Object.keys(MODEL_PROFILES);

  // --- Score each model ---
  const scores = modelSlugs.map((slug) => {
    const profile = findProfile(slug);
    if (!profile) {
      return {
        modelSlug: slug,
        overall: 0.5,
        dimensions: Object.fromEntries(
          TASK_TYPES.map((t) => [t, 0.5]),
        ),
      };
    }

    const overall = taskType
      ? (profile[taskType] ?? 0.5)
      : averageScore(profile);

    return {
      modelSlug: slug,
      overall: Math.round(overall * 100) / 100,
      dimensions: Object.fromEntries(
        TASK_TYPES.map((t) => [t, profile[t] ?? 0.5]),
      ),
    };
  });

  // Sort by overall score descending
  scores.sort((a, b) => b.overall - a.overall);

  // --- Build recommendation ---
  const best = scores[0];
  const recommendation = {
    modelSlug: best.modelSlug,
    reason: taskType
      ? `"${best.modelSlug}" scores highest (${best.overall}) for ${taskType.replace(/_/g, " ")}`
      : `"${best.modelSlug}" has the best overall score (${best.overall}) across all task types`,
    taskType: taskType ?? "general",
  };

  // --- Build per-task suitability map ---
  const taskSuitability: Record<string, string> = {};
  for (const task of TASK_TYPES) {
    let bestSlug = modelSlugs[0];
    let bestScore = 0;
    for (const slug of modelSlugs) {
      const profile = findProfile(slug);
      const score = profile?.[task] ?? 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestSlug = slug;
      }
    }
    taskSuitability[task] = bestSlug;
  }

  return { recommendation, scores, taskSuitability };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferTaskType(query: string): TaskType | undefined {
  const lower = query.toLowerCase();

  const taskSignals: [TaskType, string[]][] = [
    ["deep_reasoning", ["reasoning", "think", "complex", "logic", "math"]],
    ["rag_summarization", ["summarize", "summary", "rag", "retrieval"]],
    ["citation_heavy", ["citation", "cite", "sources", "reference"]],
    ["file_comparison", ["compare file", "file comparison", "diff"]],
    ["spreadsheet_analysis", ["spreadsheet", "csv", "xlsx", "data analysis"]],
    ["json_extraction", ["json", "extract", "structured output", "parse"]],
    ["code_review", ["code review", "code", "programming", "debug"]],
    ["tool_calling", ["tool", "function calling", "agent"]],
    ["low_latency", ["fast", "quick", "low latency", "speed"]],
    ["low_cost", ["cheap", "low cost", "budget", "affordable"]],
    ["chat", ["chat", "conversation", "general"]],
  ];

  for (const [taskType, signals] of taskSignals) {
    if (signals.some((s) => lower.includes(s))) {
      return taskType;
    }
  }

  return undefined;
}

function findProfile(
  slug: string,
): Partial<Record<TaskType, number>> | undefined {
  // Direct match
  if (MODEL_PROFILES[slug]) return MODEL_PROFILES[slug];

  // Partial match (e.g. "claude-sonnet" matches "anthropic/claude-sonnet")
  for (const [key, profile] of Object.entries(MODEL_PROFILES)) {
    if (key.includes(slug) || slug.includes(key)) return profile;
  }

  return undefined;
}

function averageScore(profile: Partial<Record<TaskType, number>>): number {
  const values = Object.values(profile).filter(
    (v): v is number => v !== undefined,
  );
  if (values.length === 0) return 0.5;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
