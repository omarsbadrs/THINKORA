/**
 * ModelRegistryService — Manages the model catalogue synced from OpenRouter.
 *
 * Responsibilities:
 *  - Sync models from the OpenRouter catalogue into the local DB
 *  - Provide filtered catalogue queries
 *  - Maintain an in-memory TTL cache
 *  - Mark stale models as deprecated
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ModelRegistryRow,
  ModelRegistryInsert,
} from "@thinkora/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Slim interface for the OpenRouter REST client used by this service. */
export interface OpenRouterClient {
  /** Fetch the full model catalogue from OpenRouter. */
  fetchModels(): Promise<OpenRouterModel[]>;
}

/** Shape returned by the OpenRouter /models endpoint (simplified). */
export interface OpenRouterModel {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  supported_parameters?: string[];
  per_request_limits?: Record<string, unknown> | null;
}

/** Filters accepted by getFilteredCatalog. */
export interface CatalogFilters {
  search?: string;
  tags?: string[];
  maxCost?: number;
  minContext?: number;
  modalities?: string[];
  features?: {
    toolsSupport?: boolean;
    structuredOutput?: boolean;
    reasoningSupport?: boolean;
  };
  includeDeprecated?: boolean;
  limit?: number;
}

/** Stats returned after a sync operation. */
export interface SyncStats {
  fetched: number;
  upserted: number;
  deprecated: number;
  errors: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Demo / fallback data
// ---------------------------------------------------------------------------

const DEMO_MODELS: ModelRegistryRow[] = [
  {
    slug: "anthropic/claude-sonnet-4",
    canonical_slug: "anthropic/claude-sonnet-4",
    display_name: "Claude Sonnet 4",
    provider_family: "anthropic",
    description: "Anthropic's balanced model with strong reasoning and coding.",
    context_length: 200_000,
    input_cost_per_m: 3.0,
    output_cost_per_m: 15.0,
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    supported_parameters: ["temperature", "top_p", "tools", "response_format", "reasoning"],
    structured_output: true,
    tools_support: true,
    reasoning_support: true,
    is_moderated: true,
    max_completion_tokens: 64_000,
    deprecated: false,
    expires_at: null,
    tags: ["premium", "reasoning", "coding", "vision", "best-for-chat", "tool-capable", "structured-output"],
    synced_at: new Date().toISOString(),
  },
  {
    slug: "anthropic/claude-opus-4",
    canonical_slug: "anthropic/claude-opus-4",
    display_name: "Claude Opus 4",
    provider_family: "anthropic",
    description: "Anthropic's most capable model for complex tasks.",
    context_length: 200_000,
    input_cost_per_m: 15.0,
    output_cost_per_m: 75.0,
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    supported_parameters: ["temperature", "top_p", "tools", "response_format", "reasoning"],
    structured_output: true,
    tools_support: true,
    reasoning_support: true,
    is_moderated: true,
    max_completion_tokens: 64_000,
    deprecated: false,
    expires_at: null,
    tags: ["premium", "reasoning", "coding", "vision", "best-for-chat", "tool-capable", "structured-output"],
    synced_at: new Date().toISOString(),
  },
  {
    slug: "anthropic/claude-haiku-3.5",
    canonical_slug: "anthropic/claude-haiku-3.5",
    display_name: "Claude 3.5 Haiku",
    provider_family: "anthropic",
    description: "Anthropic's fastest and most affordable model.",
    context_length: 200_000,
    input_cost_per_m: 0.8,
    output_cost_per_m: 4.0,
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    supported_parameters: ["temperature", "top_p", "tools", "response_format"],
    structured_output: true,
    tools_support: true,
    reasoning_support: false,
    is_moderated: true,
    max_completion_tokens: 8_192,
    deprecated: false,
    expires_at: null,
    tags: ["fast", "cheap", "vision", "tool-capable", "structured-output"],
    synced_at: new Date().toISOString(),
  },
  {
    slug: "openai/gpt-4o",
    canonical_slug: "openai/gpt-4o",
    display_name: "GPT-4o",
    provider_family: "openai",
    description: "OpenAI's flagship multimodal model.",
    context_length: 128_000,
    input_cost_per_m: 2.5,
    output_cost_per_m: 10.0,
    input_modalities: ["text", "image", "audio"],
    output_modalities: ["text"],
    supported_parameters: ["temperature", "top_p", "tools", "response_format"],
    structured_output: true,
    tools_support: true,
    reasoning_support: false,
    is_moderated: true,
    max_completion_tokens: 16_384,
    deprecated: false,
    expires_at: null,
    tags: ["premium", "vision", "best-for-chat", "tool-capable", "structured-output"],
    synced_at: new Date().toISOString(),
  },
  {
    slug: "openai/gpt-4o-mini",
    canonical_slug: "openai/gpt-4o-mini",
    display_name: "GPT-4o Mini",
    provider_family: "openai",
    description: "OpenAI's affordable model for everyday tasks.",
    context_length: 128_000,
    input_cost_per_m: 0.15,
    output_cost_per_m: 0.6,
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    supported_parameters: ["temperature", "top_p", "tools", "response_format"],
    structured_output: true,
    tools_support: true,
    reasoning_support: false,
    is_moderated: true,
    max_completion_tokens: 16_384,
    deprecated: false,
    expires_at: null,
    tags: ["fast", "cheap", "vision", "tool-capable", "structured-output"],
    synced_at: new Date().toISOString(),
  },
  {
    slug: "openai/o3",
    canonical_slug: "openai/o3",
    display_name: "o3",
    provider_family: "openai",
    description: "OpenAI's advanced reasoning model.",
    context_length: 200_000,
    input_cost_per_m: 10.0,
    output_cost_per_m: 40.0,
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    supported_parameters: ["reasoning", "tools", "response_format"],
    structured_output: true,
    tools_support: true,
    reasoning_support: true,
    is_moderated: true,
    max_completion_tokens: 100_000,
    deprecated: false,
    expires_at: null,
    tags: ["premium", "reasoning", "tool-capable", "structured-output"],
    synced_at: new Date().toISOString(),
  },
  {
    slug: "google/gemini-2.5-pro",
    canonical_slug: "google/gemini-2.5-pro",
    display_name: "Gemini 2.5 Pro",
    provider_family: "google",
    description: "Google's reasoning-capable long-context model.",
    context_length: 1_000_000,
    input_cost_per_m: 1.25,
    output_cost_per_m: 10.0,
    input_modalities: ["text", "image", "audio", "video"],
    output_modalities: ["text"],
    supported_parameters: ["temperature", "top_p", "tools", "response_format", "reasoning"],
    structured_output: true,
    tools_support: true,
    reasoning_support: true,
    is_moderated: false,
    max_completion_tokens: 65_536,
    deprecated: false,
    expires_at: null,
    tags: ["premium", "reasoning", "vision", "long-context", "tool-capable", "structured-output"],
    synced_at: new Date().toISOString(),
  },
  {
    slug: "google/gemini-2.0-flash",
    canonical_slug: "google/gemini-2.0-flash",
    display_name: "Gemini 2.0 Flash",
    provider_family: "google",
    description: "Google's fast multimodal model.",
    context_length: 1_000_000,
    input_cost_per_m: 0.1,
    output_cost_per_m: 0.4,
    input_modalities: ["text", "image", "audio", "video"],
    output_modalities: ["text"],
    supported_parameters: ["temperature", "top_p", "tools", "response_format"],
    structured_output: true,
    tools_support: true,
    reasoning_support: false,
    is_moderated: false,
    max_completion_tokens: 8_192,
    deprecated: false,
    expires_at: null,
    tags: ["fast", "cheap", "vision", "long-context", "tool-capable", "structured-output"],
    synced_at: new Date().toISOString(),
  },
  {
    slug: "deepseek/deepseek-r1",
    canonical_slug: "deepseek/deepseek-r1",
    display_name: "DeepSeek R1",
    provider_family: "deepseek",
    description: "DeepSeek's open-weight reasoning model.",
    context_length: 64_000,
    input_cost_per_m: 0.55,
    output_cost_per_m: 2.19,
    input_modalities: ["text"],
    output_modalities: ["text"],
    supported_parameters: ["temperature", "top_p", "reasoning"],
    structured_output: false,
    tools_support: false,
    reasoning_support: true,
    is_moderated: false,
    max_completion_tokens: 32_768,
    deprecated: false,
    expires_at: null,
    tags: ["reasoning", "cheap", "open-source"],
    synced_at: new Date().toISOString(),
  },
  {
    slug: "meta/llama-4-maverick",
    canonical_slug: "meta/llama-4-maverick",
    display_name: "Llama 4 Maverick",
    provider_family: "meta",
    description: "Meta's open-weight multimodal model.",
    context_length: 1_000_000,
    input_cost_per_m: 0.2,
    output_cost_per_m: 0.6,
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    supported_parameters: ["temperature", "top_p", "tools"],
    structured_output: false,
    tools_support: true,
    reasoning_support: false,
    is_moderated: false,
    max_completion_tokens: 32_768,
    deprecated: false,
    expires_at: null,
    tags: ["cheap", "vision", "long-context", "open-source", "tool-capable"],
    synced_at: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ModelRegistryService {
  private cache: CacheEntry<ModelRegistryRow[]> | null = null;
  private readonly cacheTtlMs: number;

  constructor(
    private readonly db: SupabaseClient | null,
    private readonly openRouterClient: OpenRouterClient | null,
    options?: { cacheTtlMs?: number }
  ) {
    this.cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  // -----------------------------------------------------------------------
  // Sync
  // -----------------------------------------------------------------------

  /**
   * Fetch the full catalogue from OpenRouter, normalise each record and
   * upsert it into the database. Models present in the DB but no longer
   * in the upstream catalogue are marked as deprecated.
   */
  async syncFromOpenRouter(): Promise<SyncStats> {
    const start = Date.now();
    const stats: SyncStats = {
      fetched: 0,
      upserted: 0,
      deprecated: 0,
      errors: 0,
      durationMs: 0,
    };

    if (!this.openRouterClient) {
      console.warn("[ModelRegistryService] No OpenRouter client — skipping sync");
      stats.durationMs = Date.now() - start;
      return stats;
    }

    try {
      const rawModels = await this.openRouterClient.fetchModels();
      stats.fetched = rawModels.length;

      const inserts: ModelRegistryInsert[] = [];
      const fetchedSlugs = new Set<string>();

      for (const raw of rawModels) {
        try {
          const normalized = this.normalizeOpenRouterModel(raw);
          inserts.push(normalized);
          fetchedSlugs.add(normalized.slug);
        } catch (err) {
          stats.errors++;
          console.error(
            `[ModelRegistryService] Failed to normalize model ${raw.id}:`,
            err
          );
        }
      }

      // Bulk upsert into DB
      if (this.db && inserts.length > 0) {
        // Upsert in batches of 100 to stay within payload limits
        const BATCH_SIZE = 100;
        for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
          const batch = inserts.slice(i, i + BATCH_SIZE);
          const rows = batch.map((row) => ({
            ...row,
            synced_at: new Date().toISOString(),
          }));

          const { error } = await this.db
            .from("model_registry")
            .upsert(rows, { onConflict: "slug" });

          if (error) {
            stats.errors += batch.length;
            console.error("[ModelRegistryService] Bulk upsert error:", error);
          } else {
            stats.upserted += batch.length;
          }
        }

        // Deprecate models that are no longer in the upstream catalogue
        const { data: existing } = await this.db
          .from("model_registry")
          .select("slug")
          .eq("deprecated", false);

        if (existing) {
          const stale = (existing as Array<{ slug: string }>).filter(
            (row) => !fetchedSlugs.has(row.slug)
          );
          for (const { slug } of stale) {
            const { error: depError } = await this.db
              .from("model_registry")
              .update({ deprecated: true })
              .eq("slug", slug);

            if (!depError) stats.deprecated++;
            else stats.errors++;
          }
        }
      }

      // Invalidate cache so next read picks up fresh data
      this.cache = null;
    } catch (err) {
      stats.errors++;
      console.error("[ModelRegistryService] Sync failed:", err);
    }

    stats.durationMs = Date.now() - start;
    return stats;
  }

  // -----------------------------------------------------------------------
  // Catalogue queries
  // -----------------------------------------------------------------------

  /**
   * Return models matching the supplied filters.
   */
  async getFilteredCatalog(filters: CatalogFilters = {}): Promise<ModelRegistryRow[]> {
    const all = await this.getAllModels(filters.includeDeprecated ?? false);

    return all.filter((model) => {
      // Free-text search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          model.slug.toLowerCase().includes(q) ||
          (model.display_name ?? "").toLowerCase().includes(q) ||
          (model.description ?? "").toLowerCase().includes(q) ||
          (model.provider_family ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }

      // Tag match (any)
      if (filters.tags && filters.tags.length > 0) {
        if (!filters.tags.some((t) => (model.tags ?? []).includes(t))) {
          return false;
        }
      }

      // Max cost (input)
      if (filters.maxCost != null) {
        if ((model.input_cost_per_m ?? Infinity) > filters.maxCost) {
          return false;
        }
      }

      // Min context
      if (filters.minContext != null) {
        if ((model.context_length ?? 0) < filters.minContext) {
          return false;
        }
      }

      // Modality match (all required must be present)
      if (filters.modalities && filters.modalities.length > 0) {
        const inputMods = model.input_modalities ?? [];
        if (!filters.modalities.every((m) => inputMods.includes(m))) {
          return false;
        }
      }

      // Feature flags
      if (filters.features) {
        if (
          filters.features.toolsSupport === true &&
          !model.tools_support
        ) {
          return false;
        }
        if (
          filters.features.structuredOutput === true &&
          !model.structured_output
        ) {
          return false;
        }
        if (
          filters.features.reasoningSupport === true &&
          !model.reasoning_support
        ) {
          return false;
        }
      }

      return true;
    }).slice(0, filters.limit ?? 100);
  }

  /**
   * Fetch a single model by its slug.
   */
  async getModelBySlug(slug: string): Promise<ModelRegistryRow | null> {
    // Try DB first
    if (this.db) {
      try {
        const { data, error } = await this.db
          .from("model_registry")
          .select("*")
          .eq("slug", slug)
          .single();

        if (!error && data) return data as ModelRegistryRow;
      } catch {
        // Fall through to cache / demo
      }
    }

    // Fall back to cache or demo data
    const all = await this.getAllModels(true);
    return all.find((m) => m.slug === slug) ?? null;
  }

  /**
   * Force-refresh the in-memory cache from the DB.
   */
  async refreshCache(): Promise<void> {
    this.cache = null;
    await this.getAllModels(false);
  }

  /**
   * Mark models not seen in recent syncs as deprecated.
   *
   * @param olderThan  ISO-8601 timestamp — models with synced_at before
   *                   this value are marked deprecated.
   */
  async deprecateStaleModels(olderThan: string): Promise<number> {
    if (!this.db) return 0;

    const { data, error } = await this.db
      .from("model_registry")
      .update({ deprecated: true })
      .eq("deprecated", false)
      .lt("synced_at", olderThan)
      .select("slug");

    if (error) {
      console.error("[ModelRegistryService] deprecateStaleModels error:", error);
      return 0;
    }

    const count = (data ?? []).length;
    if (count > 0) {
      this.cache = null; // invalidate
    }
    return count;
  }

  /**
   * Returns the total number of active (non-deprecated) models.
   */
  async getModelCount(): Promise<number> {
    const models = await this.getAllModels(false);
    return models.length;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /**
   * Get all models, using the TTL cache when possible.
   */
  async getAllModels(includeDeprecated: boolean): Promise<ModelRegistryRow[]> {
    // Check cache
    if (this.cache && Date.now() < this.cache.expiresAt) {
      const models = this.cache.data;
      return includeDeprecated
        ? models
        : models.filter((m) => !m.deprecated);
    }

    // Try DB
    if (this.db) {
      try {
        const { data, error } = await this.db
          .from("model_registry")
          .select("*")
          .order("provider_family", { ascending: true })
          .order("display_name", { ascending: true });

        if (!error && data && data.length > 0) {
          const rows = data as ModelRegistryRow[];
          this.cache = {
            data: rows,
            expiresAt: Date.now() + this.cacheTtlMs,
          };
          return includeDeprecated
            ? rows
            : rows.filter((m) => !m.deprecated);
        }
      } catch {
        // Fall through to demo data
      }
    }

    // Demo fallback
    this.cache = {
      data: DEMO_MODELS,
      expiresAt: Date.now() + this.cacheTtlMs,
    };
    return includeDeprecated
      ? DEMO_MODELS
      : DEMO_MODELS.filter((m) => !m.deprecated);
  }

  /**
   * Normalise a raw OpenRouter model into a ModelRegistryInsert.
   */
  private normalizeOpenRouterModel(raw: OpenRouterModel): ModelRegistryInsert {
    const slug = raw.id;
    const providerFamily = slug.split("/")[0] ?? "unknown";
    const inputModalities = raw.architecture?.input_modalities ?? ["text"];
    const outputModalities = raw.architecture?.output_modalities ?? ["text"];
    const supportedParams = raw.supported_parameters ?? [];

    // Derive feature flags from supported_parameters and other hints
    const toolsSupport = supportedParams.includes("tools");
    const structuredOutput = supportedParams.includes("response_format");
    const reasoningSupport = supportedParams.includes("reasoning");

    // Derive tags
    const tags = this.deriveTags({
      slug,
      providerFamily,
      inputModalities,
      supportedParams,
      toolsSupport,
      structuredOutput,
      reasoningSupport,
      contextLength: raw.context_length ?? 0,
      inputCost: parseFloat(raw.pricing?.prompt ?? "0"),
    });

    return {
      slug,
      canonical_slug: slug,
      display_name: raw.name ?? slug,
      provider_family: providerFamily,
      description: raw.description ?? "",
      context_length: raw.context_length ?? 0,
      input_cost_per_m: parseFloat(raw.pricing?.prompt ?? "0") * 1_000_000,
      output_cost_per_m: parseFloat(raw.pricing?.completion ?? "0") * 1_000_000,
      input_modalities: inputModalities,
      output_modalities: outputModalities,
      supported_parameters: supportedParams,
      structured_output: structuredOutput,
      tools_support: toolsSupport,
      reasoning_support: reasoningSupport,
      is_moderated: raw.top_provider?.is_moderated ?? false,
      max_completion_tokens: raw.top_provider?.max_completion_tokens ?? null,
      deprecated: false,
      expires_at: null,
      tags,
    };
  }

  /**
   * Derive auto-tags based on model characteristics.
   */
  private deriveTags(params: {
    slug: string;
    providerFamily: string;
    inputModalities: string[];
    supportedParams: string[];
    toolsSupport: boolean;
    structuredOutput: boolean;
    reasoningSupport: boolean;
    contextLength: number;
    inputCost: number;
  }): string[] {
    const tags: string[] = [];

    if (params.inputModalities.includes("image")) tags.push("vision");
    if (params.toolsSupport) tags.push("tool-capable");
    if (params.structuredOutput) tags.push("structured-output");
    if (params.reasoningSupport) tags.push("reasoning");
    if (params.contextLength >= 100_000) tags.push("long-context");
    if (params.inputCost === 0) tags.push("free");
    if (params.inputCost > 0 && params.inputCost <= 0.000001) tags.push("cheap");
    if (params.inputCost >= 0.000005) tags.push("premium");

    // Provider-specific tags
    const slug = params.slug.toLowerCase();
    if (slug.includes("haiku") || slug.includes("mini") || slug.includes("flash")) {
      tags.push("fast");
      if (!tags.includes("cheap")) tags.push("cheap");
    }

    if (slug.includes("opus") || slug.includes("gpt-4o") || slug.includes("pro")) {
      if (!tags.includes("premium")) tags.push("premium");
      tags.push("best-for-chat");
    }

    if (slug.includes("code") || params.slug.includes("codestral") || params.slug.includes("qwen-coder")) {
      tags.push("coding");
    }

    return [...new Set(tags)];
  }
}
