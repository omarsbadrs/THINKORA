/**
 * Connectors repository — CRUD for connector accounts and sync jobs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConnectorAccountRow,
  ConnectorAccountInsert,
  ConnectorAccountUpdate,
  ConnectorSyncJobRow,
} from "../schema";

export class ConnectorsRepo {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Get all connector accounts for a user.
   */
  async getByUser(userId: string): Promise<ConnectorAccountRow[]> {
    const { data, error } = await this.client
      .from("connector_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as ConnectorAccountRow[];
  }

  /**
   * Get a single connector account by ID.
   */
  async get(id: string): Promise<ConnectorAccountRow | null> {
    const { data, error } = await this.client
      .from("connector_accounts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as ConnectorAccountRow;
  }

  /**
   * Create a new connector account.
   */
  async create(input: ConnectorAccountInsert): Promise<ConnectorAccountRow> {
    const { data, error } = await this.client
      .from("connector_accounts")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as ConnectorAccountRow;
  }

  /**
   * Update a connector account (status, credentials, config, etc.).
   */
  async update(
    id: string,
    updates: ConnectorAccountUpdate
  ): Promise<ConnectorAccountRow> {
    const { data, error } = await this.client
      .from("connector_accounts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ConnectorAccountRow;
  }

  /**
   * Delete a connector account and all associated sync jobs (cascade).
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from("connector_accounts")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  // ============================================================
  // Sync Jobs
  // ============================================================

  /**
   * List sync jobs for a connector, most recent first.
   */
  async listSyncJobs(
    connectorId: string,
    limit = 20
  ): Promise<ConnectorSyncJobRow[]> {
    const { data, error } = await this.client
      .from("connector_sync_jobs")
      .select("*")
      .eq("connector_id", connectorId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as ConnectorSyncJobRow[];
  }

  /**
   * Create a new sync job record.
   */
  async createSyncJob(
    connectorId: string,
    status: string = "pending"
  ): Promise<ConnectorSyncJobRow> {
    const { data, error } = await this.client
      .from("connector_sync_jobs")
      .insert({
        connector_id: connectorId,
        status,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as ConnectorSyncJobRow;
  }

  /**
   * Update a sync job (progress, completion, error).
   */
  async updateSyncJob(
    id: string,
    updates: Partial<
      Pick<
        ConnectorSyncJobRow,
        | "status"
        | "documents_processed"
        | "documents_total"
        | "completed_at"
        | "error"
      >
    >
  ): Promise<ConnectorSyncJobRow> {
    const { data, error } = await this.client
      .from("connector_sync_jobs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ConnectorSyncJobRow;
  }
}
