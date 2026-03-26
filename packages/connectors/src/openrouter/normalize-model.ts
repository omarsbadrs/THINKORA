// ---------------------------------------------------------------------------
// Raw OpenRouter model -> internal ModelRecord normalizer
// ---------------------------------------------------------------------------

import type { OpenRouterModel } from "./types";
import { deriveCapabilityTags } from "./capability-tags";

/**
 * The internal model record format aligned with `@thinkora/ui-contracts`
 * ModelRecord and the `model_registry` database table.
 */
export interface ModelRecord {
  slug: string;
  canonicalSlug: string;
  displayName: string;
  providerFamily: string;
  description: string;
  contextLength: number;
  inputCostPerM: number;
  outputCostPerM: number;
  inputModalities: string[];
  outputModalities: string[];
  supportedParameters: string[];
  structuredOutput: boolean;
  toolsSupport: boolean;
  reasoningSupport: boolean;
  isModerated: boolean;
  maxCompletionTokens: number | null;
  deprecated: boolean;
  expiresAt: string | null;
  tags: string[];
  syncedAt: string;
}

/**
 * Normalizes a raw OpenRouter model response into the internal
 * `ModelRecord` format with derived capability tags.
 *
 * This is the authoritative mapping used during model catalog sync
 * (`scripts/sync-models.ts`) and by the model registry repository.
 */
export function normalizeModel(raw: OpenRouterModel): ModelRecord {
  const slug = raw.id;

  // Split slug into provider/model parts
  const slashIndex = slug.indexOf("/");
  const providerFamily = slashIndex > 0 ? slug.slice(0, slashIndex) : "unknown";
  const canonicalSlug = slashIndex > 0 ? slug.slice(slashIndex + 1) : slug;

  // Parse pricing strings to numbers (cost per million tokens)
  const inputCostPerM = parseCost(raw.pricing.prompt);
  const outputCostPerM = parseCost(raw.pricing.completion);

  // Parse modality string (e.g., "text+image->text")
  const modalityStr = raw.architecture?.modality ?? "text->text";
  const [inputPart, outputPart] = modalityStr.split("->");
  const inputModalities = parseModalities(inputPart);
  const outputModalities = parseModalities(outputPart);

  // Detect feature support from model name / known patterns
  const structuredOutput = detectStructuredOutput(slug, raw.name);
  const toolsSupport = detectToolsSupport(slug, raw.name);
  const reasoningSupport = detectReasoningSupport(slug, raw.name);

  const record: ModelRecord = {
    slug,
    canonicalSlug,
    displayName: raw.name,
    providerFamily,
    description: raw.description ?? "",
    contextLength: raw.context_length ?? 0,
    inputCostPerM,
    outputCostPerM,
    inputModalities,
    outputModalities,
    supportedParameters: [],
    structuredOutput,
    toolsSupport,
    reasoningSupport,
    isModerated: raw.top_provider?.is_moderated ?? false,
    maxCompletionTokens: raw.top_provider?.max_completion_tokens ?? null,
    deprecated: false,
    expiresAt: null,
    tags: [],
    syncedAt: new Date().toISOString(),
  };

  // Derive capability tags from the normalized metadata
  record.tags = deriveCapabilityTags(record);

  return record;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parses a pricing string to cost per million tokens.
 * OpenRouter pricing is in cost per token as a string (e.g., "0.000001").
 */
function parseCost(priceStr: string | undefined): number {
  if (!priceStr) return 0;
  const perToken = parseFloat(priceStr);
  if (isNaN(perToken)) return 0;
  return perToken * 1_000_000;
}

/** Splits a modality segment like "text+image" into an array. */
function parseModalities(segment: string | undefined): string[] {
  if (!segment) return ["text"];
  return segment
    .split("+")
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
}

/** Heuristic: does this model support structured / JSON output? */
function detectStructuredOutput(slug: string, name: string): boolean {
  const id = `${slug} ${name}`.toLowerCase();
  // GPT-4o, GPT-4-turbo, Claude 3+, Gemini 1.5+ generally support JSON mode
  return (
    /gpt-4o/.test(id) ||
    /gpt-4-turbo/.test(id) ||
    /claude-3/.test(id) ||
    /claude-4/.test(id) ||
    /gemini-1\.5/.test(id) ||
    /gemini-2/.test(id) ||
    /mistral-large/.test(id)
  );
}

/** Heuristic: does this model support tool/function calling? */
function detectToolsSupport(slug: string, name: string): boolean {
  const id = `${slug} ${name}`.toLowerCase();
  return (
    /gpt-4/.test(id) ||
    /gpt-3\.5-turbo/.test(id) ||
    /claude-3/.test(id) ||
    /claude-4/.test(id) ||
    /gemini/.test(id) ||
    /mistral-large/.test(id) ||
    /command-r/.test(id) ||
    /llama-3\.1/.test(id) ||
    /llama-3\.2/.test(id) ||
    /llama-3\.3/.test(id)
  );
}

/** Heuristic: does this model have reasoning/chain-of-thought capabilities? */
function detectReasoningSupport(slug: string, name: string): boolean {
  const id = `${slug} ${name}`.toLowerCase();
  return (
    /\bo[134]-/.test(id) ||
    /\bo[134]\b/.test(id) ||
    /deepseek-r/.test(id) ||
    /qwq/.test(id) ||
    /reasoning/.test(id) ||
    /think/.test(id)
  );
}
