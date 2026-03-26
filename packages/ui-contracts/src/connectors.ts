// ---------------------------------------------------------------------------
// External connector types
// ---------------------------------------------------------------------------

/** Supported connector integrations. */
export type ConnectorType = "notion" | "supabase_mcp";

/** Status of a connector account. */
export type ConnectorAccountStatus = "connected" | "disconnected" | "error";

/** A user's connected external account. */
export interface ConnectorAccount {
  id: string;
  userId: string;
  type: ConnectorType;
  status: ConnectorAccountStatus;
  /** Encrypted credential reference — never the raw secret. */
  credentials: string;
  config: Record<string, unknown>;
  lastSync: string | null;
  documentsCount: number;
  errorMessage: string | null;
  createdAt: string;
}

/** Status of a connector sync job. */
export type ConnectorSyncJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

/** Tracks a single sync run for a connector. */
export interface ConnectorSyncJob {
  id: string;
  connectorId: string;
  status: ConnectorSyncJobStatus;
  documentsProcessed: number;
  documentsTotal: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

/** Health status of a connector type. */
export type ConnectorHealthStatus = "healthy" | "degraded" | "down";

/** Runtime health snapshot for a connector type. */
export interface ConnectorHealth {
  type: ConnectorType;
  status: ConnectorHealthStatus;
  lastCheck: string;
  uptime: number;
  errorCount: number;
  latencyMs: number;
}
