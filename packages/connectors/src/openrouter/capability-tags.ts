// ---------------------------------------------------------------------------
// Capability tag derivation
// ---------------------------------------------------------------------------

import type { ModelMetadata } from "./types";

/**
 * Internal capability tags that can be assigned to models.
 * Used for filtering and routing decisions.
 */
export type CapabilityTag =
  | "fast"
  | "cheap"
  | "premium"
  | "reasoning"
  | "coding"
  | "vision"
  | "long-context"
  | "structured-output"
  | "tool-capable"
  | "best-for-rag"
  | "best-for-chat"
  | "best-for-file-analysis";

/** Cost thresholds for classification (per million tokens). */
const COST_THRESHOLDS = {
  cheapInput: 0.5,
  cheapOutput: 1.5,
  premiumInput: 10,
  premiumOutput: 30,
} as const;

/** Context length thresholds. */
const CONTEXT_THRESHOLDS = {
  long: 100_000,
} as const;

/** Model name patterns that indicate coding specialization. */
const CODING_PATTERNS = [
  /code/i,
  /coder/i,
  /codestral/i,
  /starcoder/i,
  /deepseek-coder/i,
  /wizard-?coder/i,
  /phind/i,
  /codellama/i,
  /code-?llama/i,
];

/** Model name patterns that indicate reasoning specialization. */
const REASONING_PATTERNS = [
  /o1/i,
  /o3/i,
  /o4/i,
  /reasoning/i,
  /think/i,
  /deepseek-r/i,
  /qwq/i,
];

/** Model name/family patterns known for strong RAG performance. */
const RAG_STRONG_PATTERNS = [
  /gpt-4/i,
  /claude-3/i,
  /claude-4/i,
  /gemini-1\.5/i,
  /gemini-2/i,
  /command-r/i,
];

/** Model name/family patterns known for strong chat performance. */
const CHAT_STRONG_PATTERNS = [
  /gpt-4/i,
  /gpt-3\.5/i,
  /claude/i,
  /gemini/i,
  /llama-3/i,
  /mistral-large/i,
  /mixtral/i,
];

/** Model name/family patterns for fast inference. */
const FAST_PATTERNS = [
  /flash/i,
  /mini/i,
  /haiku/i,
  /instant/i,
  /turbo/i,
  /small/i,
  /nano/i,
  /lite/i,
  /gpt-3\.5/i,
  /gemma/i,
];

/**
 * Derives a set of capability tags from model metadata.
 *
 * Tags are inferred from:
 * - Pricing (cheap / premium)
 * - Context window size (long-context)
 * - Model name patterns (coding, reasoning, fast)
 * - Modality support (vision)
 * - Feature flags (structured-output, tool-capable)
 * - Composite heuristics (best-for-rag, best-for-chat, best-for-file-analysis)
 */
export function deriveCapabilityTags(model: ModelMetadata): string[] {
  const tags = new Set<CapabilityTag>();

  // ---- Cost-based ----
  if (
    model.inputCostPerM <= COST_THRESHOLDS.cheapInput &&
    model.outputCostPerM <= COST_THRESHOLDS.cheapOutput
  ) {
    tags.add("cheap");
  }

  if (
    model.inputCostPerM >= COST_THRESHOLDS.premiumInput ||
    model.outputCostPerM >= COST_THRESHOLDS.premiumOutput
  ) {
    tags.add("premium");
  }

  // ---- Context window ----
  if (model.contextLength >= CONTEXT_THRESHOLDS.long) {
    tags.add("long-context");
  }

  // ---- Modalities ----
  if (model.inputModalities.includes("image")) {
    tags.add("vision");
  }

  // ---- Feature flags ----
  if (model.structuredOutput) {
    tags.add("structured-output");
  }

  if (model.toolsSupport) {
    tags.add("tool-capable");
  }

  if (model.reasoningSupport) {
    tags.add("reasoning");
  }

  // ---- Name-based patterns ----
  const identifier = `${model.slug} ${model.displayName}`;

  if (matchesAny(identifier, CODING_PATTERNS)) {
    tags.add("coding");
  }

  if (matchesAny(identifier, REASONING_PATTERNS)) {
    tags.add("reasoning");
  }

  if (matchesAny(identifier, FAST_PATTERNS)) {
    tags.add("fast");
  }

  // ---- Composite: best-for-rag ----
  // Good RAG models need long context, tool support, and strong generation
  if (
    model.contextLength >= CONTEXT_THRESHOLDS.long &&
    matchesAny(identifier, RAG_STRONG_PATTERNS)
  ) {
    tags.add("best-for-rag");
  }

  // ---- Composite: best-for-chat ----
  // Good chat models: fast, reliable, good instruction following
  if (matchesAny(identifier, CHAT_STRONG_PATTERNS)) {
    tags.add("best-for-chat");
  }

  // ---- Composite: best-for-file-analysis ----
  // Good file analysis models need long context and vision or strong text understanding
  if (
    model.contextLength >= CONTEXT_THRESHOLDS.long &&
    (model.inputModalities.includes("image") ||
      matchesAny(identifier, RAG_STRONG_PATTERNS))
  ) {
    tags.add("best-for-file-analysis");
  }

  return Array.from(tags);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the string matches any of the given patterns. */
function matchesAny(str: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(str));
}
