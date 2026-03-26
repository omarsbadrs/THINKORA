/**
 * Models repository — CRUD for the model_registry table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModelRegistryRow, ModelRegistryInsert } from "../schema";

export interface ModelSearchParams {
  /** Filter by provider family (e.g., 'anthropic', 'openai') */
  providerFamily?: string;
  /** Filter by tag (e.g., 'reasoning', 'fast') */
  tag?: string;
  /** Free-text search against display_name and description */
  query?: string;
  /** Include deprecated models */
  includeDeprecated?: boolean;
  /** Filter models that support tools */
  toolsSupport?: boolean;
  /** Filter models that support reasoning */
  reasoningSupport?: boolean;
  /** Filter models that support structured output */
  structuredOutput?: boolean;
  /** Maximum results */
  limit?: number;
}

export class ModelsRepo {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Get all models from the registry.
   * By default excludes deprecated models.
   */
  async getAll(
    options?: { includeDeprecated?: boolean }
  ): Promise<ModelRegistryRow[]> {
    let query = this.client
      .from("model_registry")
      .select("*")
      .order("provider_family", { ascending: true })
      .order("display_name", { ascending: true });

    if (!options?.includeDeprecated) {
      query = query.eq("deprecated", false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as ModelRegistryRow[];
  }

  /**
   * Get a single model by its slug.
   */
  async getBySlug(slug: string): Promise<ModelRegistryRow | null> {
    const { data, error } = await this.client
      .from("model_registry")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as ModelRegistryRow;
  }

  /**
   * Upsert a model into the registry.
   * Uses the slug as the conflict key.
   */
  async upsert(input: ModelRegistryInsert): Promise<ModelRegistryRow> {
    const { data, error } = await this.client
      .from("model_registry")
      .upsert(
        { ...input, synced_at: new Date().toISOString() },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (error) throw error;
    return data as ModelRegistryRow;
  }

  /**
   * Bulk upsert models (e.g., after syncing from an external API).
   */
  async bulkUpsert(inputs: ModelRegistryInsert[]): Promise<ModelRegistryRow[]> {
    if (inputs.length === 0) return [];

    const rows = inputs.map((input) => ({
      ...input,
      synced_at: new Date().toISOString(),
    }));

    const { data, error } = await this.client
      .from("model_registry")
      .upsert(rows, { onConflict: "slug" })
      .select();

    if (error) throw error;
    return (data ?? []) as ModelRegistryRow[];
  }

  /**
   * Search and filter models with multiple criteria.
   */
  async search(params: ModelSearchParams): Promise<ModelRegistryRow[]> {
    const {
      providerFamily,
      tag,
      query: textQuery,
      includeDeprecated = false,
      toolsSupport,
      reasoningSupport,
      structuredOutput,
      limit = 50,
    } = params;

    let query = this.client
      .from("model_registry")
      .select("*")
      .order("display_name", { ascending: true })
      .limit(limit);

    if (!includeDeprecated) {
      query = query.eq("deprecated", false);
    }

    if (providerFamily) {
      query = query.eq("provider_family", providerFamily);
    }

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    if (textQuery) {
      query = query.or(
        `display_name.ilike.%${textQuery}%,description.ilike.%${textQuery}%`
      );
    }

    if (toolsSupport !== undefined) {
      query = query.eq("tools_support", toolsSupport);
    }

    if (reasoningSupport !== undefined) {
      query = query.eq("reasoning_support", reasoningSupport);
    }

    if (structuredOutput !== undefined) {
      query = query.eq("structured_output", structuredOutput);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as ModelRegistryRow[];
  }

  /**
   * Delete a model from the registry by slug.
   */
  async delete(slug: string): Promise<void> {
    const { error } = await this.client
      .from("model_registry")
      .delete()
      .eq("slug", slug);

    if (error) throw error;
  }

  /**
   * Mark a model as deprecated.
   */
  async deprecate(slug: string, expiresAt?: string): Promise<ModelRegistryRow> {
    const updates: Record<string, unknown> = { deprecated: true };
    if (expiresAt) {
      updates.expires_at = expiresAt;
    }

    const { data, error } = await this.client
      .from("model_registry")
      .update(updates)
      .eq("slug", slug)
      .select()
      .single();

    if (error) throw error;
    return data as ModelRegistryRow;
  }
}
