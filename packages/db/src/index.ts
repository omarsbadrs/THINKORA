/**
 * @thinkora/db — Database client, schema types, and repository layer.
 *
 * Usage:
 *   import { createServerClient, ConversationsRepo } from '@thinkora/db';
 *
 *   const client = createServerClient();
 *   const conversations = new ConversationsRepo(client);
 *   const list = await conversations.list({ userId: '...' });
 */

// Client
export {
  createServerClient,
  createAdminClient,
  isDemoMode,
  type SupabaseClientOptions,
} from "./client";

// Schema types
export type {
  Json,
  // Users & Workspaces
  UsersProfileRow,
  UsersProfileInsert,
  WorkspaceRow,
  WorkspaceInsert,
  WorkspaceMemberRow,
  WorkspaceMemberInsert,
  // Conversations & Messages
  ConversationRow,
  ConversationInsert,
  ConversationUpdate,
  MessageRow,
  MessageInsert,
  MessageUpdate,
  MessageCitationRow,
  MessageCitationInsert,
  // Files & Processing
  FileRow,
  FileInsert,
  FileUpdate,
  FileVersionRow,
  FileProcessingJobRow,
  ParsedArtifactRow,
  ChunkRow,
  ChunkInsert,
  // Connectors
  ConnectorAccountRow,
  ConnectorAccountInsert,
  ConnectorAccountUpdate,
  ConnectorSyncJobRow,
  // Memory & Prompts
  MemoryEntryRow,
  MemoryEntryInsert,
  SavedPromptRow,
  // Observability & Logs
  ToolExecutionLogRow,
  ToolExecutionLogInsert,
  RetrievalLogRow,
  RetrievalLogInsert,
  AuditLogRow,
  AuditLogInsert,
  // Feature Flags
  FeatureFlagRow,
  // Model Registry & Routing
  ModelRegistryRow,
  ModelRegistryInsert,
  ModelSyncJobRow,
  ModelRoutingPolicyRow,
  // Model Usage & Analytics
  ModelUsageLogRow,
  ModelUsageLogInsert,
  ModelBenchmarkRow,
  ModelTaskScoreRow,
  ModelFallbackEventRow,
  ModelCostDailyRow,
  ModelCostMonthlyRow,
  ModelErrorEventRow,
  ModelCacheMetricsRow,
} from "./schema";

// Repositories
export { ConversationsRepo } from "./repositories/conversations.repo";
export type {
  ListConversationsParams,
  PaginatedResult,
} from "./repositories/conversations.repo";

export { MessagesRepo } from "./repositories/messages.repo";
export type { MessageWithCitations } from "./repositories/messages.repo";

export { FilesRepo } from "./repositories/files.repo";
export type { ListFilesParams } from "./repositories/files.repo";

export { ChunksRepo } from "./repositories/chunks.repo";
export type {
  VectorSearchParams,
  VectorSearchResult,
} from "./repositories/chunks.repo";

export { ConnectorsRepo } from "./repositories/connectors.repo";

export { MemoryRepo } from "./repositories/memory.repo";
export type { ListMemoryParams } from "./repositories/memory.repo";

export { LogsRepo } from "./repositories/logs.repo";
export type { QueryLogsParams } from "./repositories/logs.repo";

export { ModelsRepo } from "./repositories/models.repo";
export type { ModelSearchParams } from "./repositories/models.repo";

export { ModelUsageRepo } from "./repositories/model-usage.repo";
export type {
  UsageQueryParams,
  UsageAggregation,
  CostSummary,
} from "./repositories/model-usage.repo";
