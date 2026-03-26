/**
 * Logs repository — insert and query for audit_logs, tool_execution_logs,
 * and retrieval_logs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditLogRow,
  AuditLogInsert,
  ToolExecutionLogRow,
  ToolExecutionLogInsert,
  RetrievalLogRow,
  RetrievalLogInsert,
} from "../schema";

export interface QueryLogsParams {
  /** Filter by user ID */
  userId?: string;
  /** Filter by action type (audit_logs) */
  action?: string;
  /** Filter by resource type (audit_logs) */
  resourceType?: string;
  /** Return only logs after this timestamp */
  after?: string;
  /** Return only logs before this timestamp */
  before?: string;
  /** Max results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export class LogsRepo {
  constructor(private readonly client: SupabaseClient) {}

  // ============================================================
  // AUDIT LOGS
  // ============================================================

  /**
   * Insert an audit log entry.
   */
  async insertAuditLog(input: AuditLogInsert): Promise<AuditLogRow> {
    const { data, error } = await this.client
      .from("audit_logs")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as AuditLogRow;
  }

  /**
   * Query audit logs with filtering.
   * Note: requires admin role or service-role key (RLS restricts reads).
   */
  async queryAuditLogs(params?: QueryLogsParams): Promise<AuditLogRow[]> {
    const {
      userId,
      action,
      resourceType,
      after,
      before,
      limit = 50,
      offset = 0,
    } = params ?? {};

    let query = this.client
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) query = query.eq("user_id", userId);
    if (action) query = query.eq("action", action);
    if (resourceType) query = query.eq("resource_type", resourceType);
    if (after) query = query.gte("created_at", after);
    if (before) query = query.lte("created_at", before);

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as AuditLogRow[];
  }

  // ============================================================
  // TOOL EXECUTION LOGS
  // ============================================================

  /**
   * Insert a tool execution log entry.
   */
  async insertToolLog(
    input: ToolExecutionLogInsert
  ): Promise<ToolExecutionLogRow> {
    const { data, error } = await this.client
      .from("tool_execution_logs")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as ToolExecutionLogRow;
  }

  /**
   * Query tool execution logs for a specific message.
   */
  async getToolLogsByMessage(
    messageId: string
  ): Promise<ToolExecutionLogRow[]> {
    const { data, error } = await this.client
      .from("tool_execution_logs")
      .select("*")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as ToolExecutionLogRow[];
  }

  /**
   * Query tool execution logs with optional filtering.
   */
  async queryToolLogs(
    params?: Pick<QueryLogsParams, "after" | "before" | "limit" | "offset"> & {
      toolName?: string;
      status?: string;
    }
  ): Promise<ToolExecutionLogRow[]> {
    const {
      toolName,
      status,
      after,
      before,
      limit = 50,
      offset = 0,
    } = params ?? {};

    let query = this.client
      .from("tool_execution_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (toolName) query = query.eq("tool_name", toolName);
    if (status) query = query.eq("status", status);
    if (after) query = query.gte("created_at", after);
    if (before) query = query.lte("created_at", before);

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as ToolExecutionLogRow[];
  }

  // ============================================================
  // RETRIEVAL LOGS
  // ============================================================

  /**
   * Insert a retrieval log entry.
   */
  async insertRetrievalLog(
    input: RetrievalLogInsert
  ): Promise<RetrievalLogRow> {
    const { data, error } = await this.client
      .from("retrieval_logs")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as RetrievalLogRow;
  }

  /**
   * Get retrieval logs for a specific message.
   */
  async getRetrievalLogsByMessage(
    messageId: string
  ): Promise<RetrievalLogRow[]> {
    const { data, error } = await this.client
      .from("retrieval_logs")
      .select("*")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as RetrievalLogRow[];
  }

  /**
   * Query retrieval logs with optional filtering.
   */
  async queryRetrievalLogs(
    params?: Pick<QueryLogsParams, "after" | "before" | "limit" | "offset"> & {
      cacheHit?: boolean;
    }
  ): Promise<RetrievalLogRow[]> {
    const {
      cacheHit,
      after,
      before,
      limit = 50,
      offset = 0,
    } = params ?? {};

    let query = this.client
      .from("retrieval_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (cacheHit !== undefined) query = query.eq("cache_hit", cacheHit);
    if (after) query = query.gte("created_at", after);
    if (before) query = query.lte("created_at", before);

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as RetrievalLogRow[];
  }
}
