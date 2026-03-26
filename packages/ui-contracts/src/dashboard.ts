// ---------------------------------------------------------------------------
// Dashboard & analytics types
// ---------------------------------------------------------------------------

import type { ConnectorType } from "./connectors";
import type { RoutingMode } from "./chat";

/** High-level usage overview for a time period. */
export interface DashboardOverview {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  errorRate: number;
  activeModels: number;
  period: string;
}

/** A single data point in a usage time-series. */
export interface UsageTimeseriesPoint {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

/** Time-series wrapper. */
export interface UsageTimeseries {
  points: UsageTimeseriesPoint[];
}

/** Status of a logged request. */
export type RequestStatus = "success" | "error" | "fallback";

/** A single request in the request log table. */
export interface RequestLog {
  id: string;
  timestamp: string;
  userId: string;
  model: string;
  actualModel: string;
  routingMode: RoutingMode;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  status: RequestStatus;
  costUsd: number;
  taskType: string;
  fallbackUsed: boolean;
  sourcesUsed: string[];
}

/** Fallback activity entry within a request trace. */
export interface FallbackActivity {
  model: string;
  status: RequestStatus;
  latencyMs: number;
  error: string | null;
}

/** Source retrieval summary within a request trace. */
export interface SourceRetrievalSummary {
  sourceType: string;
  documentsRetrieved: number;
  avgRelevance: number;
  latencyMs: number;
}

/** Extended request trace with full debugging detail. */
export interface RequestTrace extends RequestLog {
  promptMetadata: Record<string, unknown>;
  fallbackActivity: FallbackActivity[];
  sourceRetrievalSummary: SourceRetrievalSummary[];
  toolCalls: string[];
  citationsBuilt: number;
  answerStatus: string;
}

/** Cost breakdown record keyed by label. */
export interface CostEntry {
  label: string;
  cost: number;
}

/** Multi-dimensional cost breakdown. */
export interface CostBreakdown {
  daily: CostEntry[];
  monthly: CostEntry[];
  byModel: CostEntry[];
  byTaskType: CostEntry[];
}

/** Per-model performance summary. */
export interface ModelPerformance {
  slug: string;
  requests: number;
  avgLatency: number;
  errorRate: number;
  avgCost: number;
  fallbackRate: number;
  successByTaskType: Record<string, number>;
}

/** Aggregated error summary row. */
export interface ErrorSummary {
  message: string;
  model: string;
  count: number;
  lastSeen: string;
  firstSeen: string;
}

/** Connector health tile on the dashboard. */
export interface ConnectorDashboard {
  type: ConnectorType;
  status: string;
  lastSync: string | null;
  documentsCount: number;
  errorCount: number;
}

/** Ingestion pipeline summary. */
export interface IngestionDashboard {
  active: number;
  completed: number;
  failed: number;
  recent: string[];
}

/** Retrieval subsystem health. */
export interface RetrievalHealth {
  totalChunks: number;
  avgLatency: number;
  avgRelevance: number;
  cacheHitRate: number;
}
