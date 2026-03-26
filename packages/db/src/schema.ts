/**
 * TypeScript row types matching the Thinkora SQL schema.
 *
 * These are "Row" types representing what you get back from a SELECT.
 * For inserts, use the corresponding `*Insert` types which make
 * server-generated columns optional.
 */

// ============================================================
// Utility
// ============================================================

/** JSON-compatible value */
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

// ============================================================
// Users & Workspaces
// ============================================================

export interface UsersProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  preferences: Json;
  created_at: string;
  updated_at: string;
}

export interface UsersProfileInsert {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  preferences?: Json;
}

export interface WorkspaceRow {
  id: string;
  name: string;
  owner_id: string;
  settings: Json;
  created_at: string;
}

export interface WorkspaceInsert {
  id?: string;
  name: string;
  owner_id: string;
  settings?: Json;
}

export interface WorkspaceMemberRow {
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface WorkspaceMemberInsert {
  workspace_id: string;
  user_id: string;
  role?: string;
}

// ============================================================
// Conversations & Messages
// ============================================================

export interface ConversationRow {
  id: string;
  title: string | null;
  user_id: string;
  workspace_id: string | null;
  model_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationInsert {
  id?: string;
  title?: string | null;
  user_id: string;
  workspace_id?: string | null;
  model_used?: string | null;
}

export interface ConversationUpdate {
  title?: string | null;
  model_used?: string | null;
  workspace_id?: string | null;
  updated_at?: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model_used: string | null;
  actual_model: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  latency_ms: number | null;
  metadata: Json;
  created_at: string;
}

export interface MessageInsert {
  id?: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model_used?: string | null;
  actual_model?: string | null;
  tokens_input?: number | null;
  tokens_output?: number | null;
  latency_ms?: number | null;
  metadata?: Json;
}

export interface MessageUpdate {
  content?: string;
  metadata?: Json;
}

export interface MessageCitationRow {
  id: string;
  message_id: string;
  source_type: string;
  source_name: string | null;
  source_id: string | null;
  chunk_text: string | null;
  relevance_score: number | null;
  page_number: number | null;
  section_title: string | null;
  created_at: string;
}

export interface MessageCitationInsert {
  id?: string;
  message_id: string;
  source_type: string;
  source_name?: string | null;
  source_id?: string | null;
  chunk_text?: string | null;
  relevance_score?: number | null;
  page_number?: number | null;
  section_title?: string | null;
}

// ============================================================
// Files & Processing
// ============================================================

export interface FileRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_key: string | null;
  status: string;
  version: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface FileInsert {
  id?: string;
  user_id: string;
  workspace_id?: string | null;
  name: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  storage_key?: string | null;
  status?: string;
  version?: number;
  metadata?: Json;
}

export interface FileUpdate {
  name?: string;
  status?: string;
  version?: number;
  metadata?: Json;
  updated_at?: string;
}

export interface FileVersionRow {
  id: string;
  file_id: string;
  version: number;
  storage_key: string;
  created_at: string;
}

export interface FileProcessingJobRow {
  id: string;
  file_id: string;
  status: string;
  stage: string | null;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  retry_count: number;
  created_at: string;
}

export interface ParsedArtifactRow {
  id: string;
  file_id: string;
  artifact_type: string;
  content: string | null;
  metadata: Json;
  page_number: number | null;
  section_title: string | null;
  created_at: string;
}

export interface ChunkRow {
  id: string;
  file_id: string;
  content: string;
  embedding: number[] | null;
  metadata: Json;
  position: number;
  token_count: number | null;
  created_at: string;
}

export interface ChunkInsert {
  id?: string;
  file_id: string;
  content: string;
  embedding?: number[] | null;
  metadata?: Json;
  position: number;
  token_count?: number | null;
}

// ============================================================
// Connectors
// ============================================================

export interface ConnectorAccountRow {
  id: string;
  user_id: string;
  connector_type: string;
  status: string;
  credentials_encrypted: string | null;
  config: Json;
  last_sync: string | null;
  documents_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectorAccountInsert {
  id?: string;
  user_id: string;
  connector_type: string;
  status?: string;
  credentials_encrypted?: string | null;
  config?: Json;
}

export interface ConnectorAccountUpdate {
  status?: string;
  credentials_encrypted?: string | null;
  config?: Json;
  last_sync?: string | null;
  documents_count?: number;
  error_message?: string | null;
  updated_at?: string;
}

export interface ConnectorSyncJobRow {
  id: string;
  connector_id: string;
  status: string;
  documents_processed: number;
  documents_total: number | null;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  created_at: string;
}

// ============================================================
// Memory & Prompts
// ============================================================

export interface MemoryEntryRow {
  id: string;
  user_id: string;
  entry_type: string;
  content: string;
  metadata: Json;
  expires_at: string | null;
  created_at: string;
}

export interface MemoryEntryInsert {
  id?: string;
  user_id: string;
  entry_type: string;
  content: string;
  metadata?: Json;
  expires_at?: string | null;
}

export interface SavedPromptRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
}

// ============================================================
// Observability & Logs
// ============================================================

export interface ToolExecutionLogRow {
  id: string;
  message_id: string | null;
  tool_name: string;
  status: string;
  input: Json | null;
  output: Json | null;
  duration_ms: number | null;
  created_at: string;
}

export interface ToolExecutionLogInsert {
  id?: string;
  message_id?: string | null;
  tool_name: string;
  status: string;
  input?: Json | null;
  output?: Json | null;
  duration_ms?: number | null;
}

export interface RetrievalLogRow {
  id: string;
  message_id: string | null;
  query: string;
  chunks_retrieved: number | null;
  avg_relevance: number | null;
  duration_ms: number | null;
  cache_hit: boolean | null;
  created_at: string;
}

export interface RetrievalLogInsert {
  id?: string;
  message_id?: string | null;
  query: string;
  chunks_retrieved?: number | null;
  avg_relevance?: number | null;
  duration_ms?: number | null;
  cache_hit?: boolean | null;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Json;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  id?: string;
  user_id?: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  metadata?: Json;
  ip_address?: string | null;
}

// ============================================================
// Feature Flags
// ============================================================

export interface FeatureFlagRow {
  id: string;
  key: string;
  enabled: boolean;
  config: Json;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Model Registry & Routing
// ============================================================

export interface ModelRegistryRow {
  slug: string;
  canonical_slug: string | null;
  display_name: string | null;
  provider_family: string | null;
  description: string | null;
  context_length: number | null;
  input_cost_per_m: number | null;
  output_cost_per_m: number | null;
  input_modalities: string[];
  output_modalities: string[];
  supported_parameters: string[];
  structured_output: boolean;
  tools_support: boolean;
  reasoning_support: boolean;
  is_moderated: boolean;
  max_completion_tokens: number | null;
  deprecated: boolean;
  expires_at: string | null;
  tags: string[];
  synced_at: string | null;
}

export interface ModelRegistryInsert {
  slug: string;
  canonical_slug?: string | null;
  display_name?: string | null;
  provider_family?: string | null;
  description?: string | null;
  context_length?: number | null;
  input_cost_per_m?: number | null;
  output_cost_per_m?: number | null;
  input_modalities?: string[];
  output_modalities?: string[];
  supported_parameters?: string[];
  structured_output?: boolean;
  tools_support?: boolean;
  reasoning_support?: boolean;
  is_moderated?: boolean;
  max_completion_tokens?: number | null;
  deprecated?: boolean;
  expires_at?: string | null;
  tags?: string[];
}

export interface ModelSyncJobRow {
  id: string;
  status: string;
  models_synced: number | null;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface ModelRoutingPolicyRow {
  id: string;
  name: string;
  routing_mode: string;
  primary_model: string | null;
  fallback_models: string[];
  provider_preferences: Json;
  max_cost_per_request: number | null;
  require_zdr: boolean;
  require_parameters_match: boolean;
  task_types: string[];
  priority: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Model Usage & Analytics
// ============================================================

export interface ModelUsageLogRow {
  id: string;
  request_id: string | null;
  user_id: string | null;
  selected_model: string | null;
  actual_model: string | null;
  routing_mode: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  latency_ms: number | null;
  status: string | null;
  task_type: string | null;
  fallback_used: boolean;
  workspace_id: string | null;
  created_at: string;
}

export interface ModelUsageLogInsert {
  id?: string;
  request_id?: string | null;
  user_id?: string | null;
  selected_model?: string | null;
  actual_model?: string | null;
  routing_mode?: string | null;
  tokens_input?: number | null;
  tokens_output?: number | null;
  cost_usd?: number | null;
  latency_ms?: number | null;
  status?: string | null;
  task_type?: string | null;
  fallback_used?: boolean;
  workspace_id?: string | null;
}

export interface ModelBenchmarkRow {
  id: string;
  model_slug: string;
  task_type: string;
  score: number;
  metadata: Json;
  run_at: string;
}

export interface ModelTaskScoreRow {
  id: string;
  model_slug: string;
  task_type: string;
  score: number;
  sample_size: number | null;
  updated_at: string;
}

export interface ModelFallbackEventRow {
  id: string;
  request_id: string | null;
  original_model: string;
  fallback_model: string;
  reason: string | null;
  created_at: string;
}

export interface ModelCostDailyRow {
  id: string;
  date: string;
  model_slug: string;
  total_cost: number;
  total_requests: number;
  total_tokens: number;
}

export interface ModelCostMonthlyRow {
  id: string;
  month: string;
  model_slug: string;
  total_cost: number;
  total_requests: number;
  total_tokens: number;
}

export interface ModelErrorEventRow {
  id: string;
  model_slug: string;
  error_type: string;
  error_message: string | null;
  request_id: string | null;
  created_at: string;
}

export interface ModelCacheMetricsRow {
  id: string;
  model_slug: string;
  cache_hits: number;
  cache_misses: number;
  tokens_saved: number;
  cost_saved: number;
  date: string;
}
