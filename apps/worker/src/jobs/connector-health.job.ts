// ---------------------------------------------------------------------------
// @thinkora/worker — Connector health check job
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import { NotionMCPClient, type NotionConfig } from "@thinkora/connectors";
import { createJobRunner } from "../lib/job-runner.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConnectorHealthData {
  /** If provided, check only this connector. Otherwise check all. */
  connectorId?: string;
}

interface HealthCheckResult {
  connectorId: string;
  connectorType: string;
  healthy: boolean;
  message: string;
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

/**
 * Creates the periodic connector health check job processor.
 *
 * Pipeline:
 * 1. Fetch all active connectors (or a single one if connectorId is specified)
 * 2. For each connector, perform a lightweight health check
 * 3. Update connector status in the database
 * 4. Log any issues
 */
export function createConnectorHealthJob(db: SupabaseClient | null) {
  return createJobRunner(
    "connector-health",
    async (data: Record<string, unknown>) => {
      const input = data as ConnectorHealthData;

      if (!db) {
        console.log("[connector-health] (demo) Would check connector health");
        return { status: "demo" };
      }

      // ── 1. Fetch connectors ─────────────────────────────────────
      let query = db
        .from("connector_accounts")
        .select("*")
        .in("status", ["connected", "error"]);

      if (input.connectorId) {
        query = query.eq("id", input.connectorId);
      }

      const { data: connectors, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(
          `Failed to fetch connectors: ${fetchError.message}`
        );
      }

      if (!connectors || connectors.length === 0) {
        return { checked: 0, results: [] };
      }

      // ── 2. Check each connector ─────────────────────────────────
      const results: HealthCheckResult[] = [];

      for (const connector of connectors) {
        const start = Date.now();
        let healthy = false;
        let message = "Unknown connector type";

        try {
          switch (connector.connector_type) {
            case "notion": {
              const config = connector.config as unknown as NotionConfig;
              const client = new NotionMCPClient(config);
              // Lightweight check: attempt a minimal search
              await client.search({ query: "", limit: 1 });
              healthy = true;
              message = "Notion API reachable";
              break;
            }

            case "supabase": {
              // For Supabase connectors, we just verify the config exists
              healthy = !!connector.config;
              message = healthy
                ? "Supabase connector configured"
                : "Missing configuration";
              break;
            }

            default: {
              message = `Unknown connector type: ${connector.connector_type}`;
              break;
            }
          }
        } catch (err) {
          healthy = false;
          message = err instanceof Error ? err.message : String(err);
        }

        const latencyMs = Date.now() - start;
        results.push({
          connectorId: connector.id,
          connectorType: connector.connector_type,
          healthy,
          message,
          latencyMs,
        });

        // ── 3. Update connector status ──────────────────────────────
        const newStatus = healthy ? "connected" : "error";
        const updates: Record<string, unknown> = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        };

        if (!healthy) {
          updates.error_message = message;
        } else {
          updates.error_message = null;
        }

        await db
          .from("connector_accounts")
          .update(updates)
          .eq("id", connector.id);

        // ── 4. Log issues ───────────────────────────────────────────
        if (!healthy) {
          console.warn(
            `[connector-health] Connector ${connector.id} (${connector.connector_type}) unhealthy: ${message}`
          );
        }
      }

      return {
        checked: results.length,
        healthy: results.filter((r) => r.healthy).length,
        unhealthy: results.filter((r) => !r.healthy).length,
        results,
      };
    }
  );
}
