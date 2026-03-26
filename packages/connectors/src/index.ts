// ---------------------------------------------------------------------------
// @thinkora/connectors — public API barrel export
// ---------------------------------------------------------------------------

// ---- Notion MCP ----
export { NotionMCPClient, NotionMCPError } from "./notion-mcp/client";
export type {
  NotionConfig,
  NotionCredentials,
  NotionPage,
  NotionDatabase,
  NotionDatabaseProperty,
  NotionBlock,
  NotionSearchOptions,
  NotionSearchResult,
  NotionSyncState,
} from "./notion-mcp/types";
export {
  mapPageToDocument,
  mapDatabaseToDocuments,
} from "./notion-mcp/mapper";
export type { RetrievalDocument } from "./notion-mcp/mapper";

// ---- Supabase MCP ----
export { SupabaseMCPClient, SupabaseMCPError } from "./supabase-mcp/client";
export type {
  SupabaseMCPConfig,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  ForeignKeyInfo,
  FunctionInfo,
  FunctionArgument,
  QueryResult,
  MCPToolInvocation,
} from "./supabase-mcp/types";

// ---- OpenRouter ----
export { OpenRouterClient, OpenRouterError } from "./openrouter/client";
export type {
  OpenRouterConfig,
  OpenRouterModel,
  ChatMessage,
  ChatContentPart,
  ToolCallRequest,
  ToolDefinition,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChoice,
  TokenUsage,
  StreamChunk,
  ModelMetadata,
  RoutingStrategy,
  RoutingConstraints,
  RoutingPolicy,
  CostEstimate,
  ActualCost,
  CostDeviation,
} from "./openrouter/types";

export {
  fetchModelCatalog,
  normalizeModelMetadata,
  updateModelCache,
  getCachedModels,
  setCacheTtl,
  clearModelCache,
} from "./openrouter/models";

export { normalizeModel } from "./openrouter/normalize-model";
export type { ModelRecord } from "./openrouter/normalize-model";

export {
  deriveCapabilityTags,
} from "./openrouter/capability-tags";
export type { CapabilityTag } from "./openrouter/capability-tags";

export {
  estimateRequestCost,
  calculateActualCost,
  compareCosts,
} from "./openrouter/cost-estimator";

export {
  resolveModel,
  buildFallbackChain,
  validateModelChoice,
} from "./openrouter/router-policy";
export type { ModelResolution } from "./openrouter/router-policy";

// ---- Storage ----
export {
  uploadToStorage,
  getSignedUrl,
  deleteFromStorage,
  validateUpload,
  StorageUploadError,
} from "./storage/uploads";
export type { UploadValidation } from "./storage/uploads";
