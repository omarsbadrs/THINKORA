// ---------------------------------------------------------------------------
// @thinkora/ui-contracts — barrel export
// ---------------------------------------------------------------------------

// Auth
export type {
  User,
  Session,
  AuthState,
  SignInRequest,
  SignUpRequest,
  ResetPasswordRequest,
} from "./auth";

// Chat
export type {
  Conversation,
  Message,
  MessageRole,
  Citation,
  CitationSourceType,
  ToolCall,
  ToolCallStatus,
  StreamEvent,
  StreamEventType,
  UploadJob,
  UploadJobStatus,
  ConnectorState,
  ConnectorStatus,
  ModelSelectionPayload,
  RoutingMode,
} from "./chat";

// Files
export type {
  FileRecord,
  FileStatus,
  FileVersion,
  FileProcessingJob,
  FileProcessingJobStatus,
  FileProcessingStage,
  ParsedArtifact,
  Chunk,
} from "./files";

// Connectors
export type {
  ConnectorAccount,
  ConnectorAccountStatus,
  ConnectorType,
  ConnectorSyncJob,
  ConnectorSyncJobStatus,
  ConnectorHealth,
  ConnectorHealthStatus,
} from "./connectors";

// Models
export type {
  ModelRecord,
  Modality,
  FeatureSupport,
  ModelRoutingPolicy,
  ModelUsageLog,
  ModelUsageStatus,
  ModelBenchmark,
  ModelAnalysis,
} from "./models";

// Dashboard
export type {
  DashboardOverview,
  UsageTimeseries,
  UsageTimeseriesPoint,
  RequestLog,
  RequestStatus,
  RequestTrace,
  FallbackActivity,
  SourceRetrievalSummary,
  CostBreakdown,
  CostEntry,
  ModelPerformance,
  ErrorSummary,
  ConnectorDashboard,
  IngestionDashboard,
  RetrievalHealth,
} from "./dashboard";

// Zod schemas (runtime values — use `export` not `export type`)
export {
  SendMessageSchema,
  FileUploadSchema,
  ModelSelectionSchema,
  RoutingModeSchema,
  ConnectorConfigSchema,
  SearchQuerySchema,
} from "./zod-schemas";

export type {
  SendMessagePayload,
  FileUploadPayload,
  ModelSelectionPayloadValidated,
  ConnectorConfigPayload,
  SearchQueryPayload,
} from "./zod-schemas";
