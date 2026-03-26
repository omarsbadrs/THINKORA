// ---------------------------------------------------------------------------
// @thinkora/worker — Model catalog sync job
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  OpenRouterClient,
  fetchModelCatalog,
  normalizeModel,
} from "@thinkora/connectors";
import { createJobRunner } from "../lib/job-runner.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelSyncData {
  /** If true, force a full sync even if models were recently synced. */
  force?: boolean;
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

/**
 * Creates the model catalog sync job processor.
 *
 * Pipeline:
 * 1. Call OpenRouter to fetch the full model catalog
 * 2. Normalize each model into the registry schema
 * 3. Upsert models into the model_registry table
 * 4. Create a sync job record for audit
 */
export function createModelSyncJob(db: SupabaseClient | null) {
  return createJobRunner(
    "model-sync",
    async (data: Record<string, unknown>) => {
      const input = data as ModelSyncData;

      if (!db) {
        console.log("[model-sync] (demo) Would sync model catalog");
        return { status: "demo" };
      }

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        console.warn(
          "[model-sync] No OPENROUTER_API_KEY set, skipping model sync"
        );
        return { status: "skipped", reason: "no_api_key" };
      }

      // ── 1. Create sync job record ───────────────────────────────
      const { data: syncJob, error: syncJobError } = await db
        .from("model_sync_jobs")
        .insert({
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (syncJobError) {
        console.error(
          "[model-sync] Failed to create sync job record:",
          syncJobError.message
        );
      }

      const syncJobId = syncJob?.id;

      try {
        // ── 2. Fetch model catalog from OpenRouter ──────────────────
        const client = new OpenRouterClient({
          apiKey,
          baseUrl:
            process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
        });

        const models = await fetchModelCatalog(client);

        console.log(
          `[model-sync] Fetched ${models.length} models from OpenRouter`
        );

        // ── 3. Upsert each model into the registry ─────────────────
        let syncedCount = 0;
        let errorCount = 0;

        for (const model of models) {
          try {
            const record = normalizeModel(model);

            const upsertData = {
              slug: record.slug,
              canonical_slug: record.canonicalSlug ?? null,
              display_name: record.displayName ?? null,
              provider_family: record.providerFamily ?? null,
              description: record.description ?? null,
              context_length: record.contextLength ?? null,
              input_cost_per_m: record.inputCostPerM ?? null,
              output_cost_per_m: record.outputCostPerM ?? null,
              input_modalities: record.inputModalities ?? [],
              output_modalities: record.outputModalities ?? [],
              supported_parameters: record.supportedParameters ?? [],
              structured_output: record.structuredOutput ?? false,
              tools_support: record.toolsSupport ?? false,
              reasoning_support: record.reasoningSupport ?? false,
              is_moderated: record.isModerated ?? false,
              max_completion_tokens: record.maxCompletionTokens ?? null,
              deprecated: record.deprecated ?? false,
              tags: record.tags ?? [],
              synced_at: new Date().toISOString(),
            };

            const { error: upsertError } = await db
              .from("model_registry")
              .upsert(upsertData, { onConflict: "slug" });

            if (upsertError) {
              console.error(
                `[model-sync] Failed to upsert model ${record.slug}:`,
                upsertError.message
              );
              errorCount++;
            } else {
              syncedCount++;
            }
          } catch (modelErr) {
            errorCount++;
            console.error(
              `[model-sync] Error processing model:`,
              modelErr instanceof Error ? modelErr.message : String(modelErr)
            );
          }
        }

        // ── 4. Update sync job record ───────────────────────────────
        if (syncJobId) {
          await db
            .from("model_sync_jobs")
            .update({
              status: "completed",
              models_synced: syncedCount,
              completed_at: new Date().toISOString(),
              error:
                errorCount > 0
                  ? `${errorCount} model(s) failed to sync`
                  : null,
            })
            .eq("id", syncJobId);
        }

        console.log(
          `[model-sync] Synced ${syncedCount} models, ${errorCount} errors`
        );

        return {
          modelsFound: models.length,
          modelsSynced: syncedCount,
          errors: errorCount,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        // Mark sync job as failed
        if (syncJobId) {
          await db
            .from("model_sync_jobs")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
              error: errorMsg,
            })
            .eq("id", syncJobId);
        }

        console.error("[model-sync] Sync failed:", errorMsg);
        throw err;
      }
    }
  );
}
