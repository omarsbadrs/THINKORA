// ---------------------------------------------------------------------------
// Model catalog management
// ---------------------------------------------------------------------------

import type { OpenRouterClient } from "./client";
import type { OpenRouterModel, ModelMetadata } from "./types";
import { deriveCapabilityTags } from "./capability-tags";

/** In-memory model cache entry. */
interface ModelCacheEntry {
  models: ModelMetadata[];
  fetchedAt: number;
}

/** Default cache TTL: 1 hour. */
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;

/** The singleton cache instance. */
let modelCache: ModelCacheEntry | null = null;

/** Configurable TTL for the model cache. */
let cacheTtlMs = DEFAULT_CACHE_TTL_MS;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches the full model catalog from OpenRouter, normalizes each model,
 * derives capability tags, and updates the in-memory cache.
 */
export async function fetchModelCatalog(
  client: OpenRouterClient,
): Promise<ModelMetadata[]> {
  const rawModels = await client.getModels();
  const normalized = rawModels.map(normalizeModelMetadata);
  updateModelCache(normalized);
  return normalized;
}

/**
 * Maps a raw OpenRouter model object to the internal `ModelMetadata` format.
 * Derives capability tags from the model's properties.
 */
export function normalizeModelMetadata(raw: OpenRouterModel): ModelMetadata {
  const slug = raw.id;

  // Derive canonical slug (strip provider prefix if present)
  const parts = slug.split("/");
  const canonicalSlug = parts.length > 1 ? parts.slice(1).join("/") : slug;

  // Derive provider family from slug prefix
  const providerFamily = parts.length > 1 ? parts[0] : "unknown";

  // Parse costs from string to number (per-million tokens)
  const inputCostPerM = parseFloat(raw.pricing.prompt) * 1_000_000;
  const outputCostPerM = parseFloat(raw.pricing.completion) * 1_000_000;

  // Parse modalities
  const modalityStr = raw.architecture.modality ?? "text->text";
  const [inputMod, outputMod] = modalityStr.split("->");
  const inputModalities = inputMod
    ? inputMod.split("+").map((m) => m.trim())
    : ["text"];
  const outputModalities = outputMod
    ? outputMod.split("+").map((m) => m.trim())
    : ["text"];

  const metadata: ModelMetadata = {
    slug,
    canonicalSlug,
    displayName: raw.name,
    providerFamily,
    description: raw.description,
    contextLength: raw.context_length,
    inputCostPerM,
    outputCostPerM,
    inputModalities,
    outputModalities,
    supportedParameters: [],
    structuredOutput: false,
    toolsSupport: false,
    reasoningSupport: false,
    isModerated: raw.top_provider?.is_moderated ?? false,
    maxCompletionTokens: raw.top_provider?.max_completion_tokens ?? null,
    deprecated: false,
    expiresAt: null,
    tags: [],
    syncedAt: new Date().toISOString(),
  };

  // Derive and attach capability tags
  metadata.tags = deriveCapabilityTags(metadata);

  return metadata;
}

/**
 * Replaces the in-memory model cache with the given models.
 */
export function updateModelCache(models: ModelMetadata[]): void {
  modelCache = {
    models,
    fetchedAt: Date.now(),
  };
}

/**
 * Returns the cached model catalog if still within TTL, or `null` if
 * expired or not yet populated.
 */
export function getCachedModels(): ModelMetadata[] | null {
  if (!modelCache) return null;

  const age = Date.now() - modelCache.fetchedAt;
  if (age > cacheTtlMs) return null;

  return modelCache.models;
}

/**
 * Sets the cache TTL in milliseconds.
 */
export function setCacheTtl(ttlMs: number): void {
  cacheTtlMs = ttlMs;
}

/**
 * Clears the model cache. Useful for testing.
 */
export function clearModelCache(): void {
  modelCache = null;
}
