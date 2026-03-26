// ---------------------------------------------------------------------------
// Chat domain types
// ---------------------------------------------------------------------------

/** A single conversation thread. */
export interface Conversation {
  id: string;
  title: string;
  userId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessagePreview: string | null;
  modelUsed: string | null;
}

/** Role of a message participant. */
export type MessageRole = "user" | "assistant" | "system" | "tool";

/** A single message within a conversation. */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  modelUsed: string | null;
  actualModel: string | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  latencyMs: number | null;
  citations: Citation[];
  toolCalls: ToolCall[];
  metadata: Record<string, unknown>;
}

/** Where a citation was sourced from. */
export type CitationSourceType = "file" | "notion" | "supabase" | "web";

/** A citation attached to a message. */
export interface Citation {
  id: string;
  messageId: string;
  sourceType: CitationSourceType;
  sourceName: string;
  sourceId: string;
  chunkText: string;
  relevanceScore: number;
  pageNumber: number | null;
  sectionTitle: string | null;
}

/** Status of a tool invocation. */
export type ToolCallStatus = "pending" | "running" | "completed" | "failed";

/** A tool invocation triggered during message generation. */
export interface ToolCall {
  id: string;
  messageId: string;
  toolName: string;
  status: ToolCallStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  durationMs: number | null;
}

/** Discriminated stream event types. */
export type StreamEventType =
  | "token"
  | "tool_start"
  | "tool_end"
  | "citation"
  | "done"
  | "error";

/** A single event emitted over a streaming response. */
export interface StreamEvent {
  type: StreamEventType;
  data: unknown;
}

/** Status of a file upload job. */
export type UploadJobStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

/** Tracks the progress of a file upload. */
export interface UploadJob {
  id: string;
  fileId: string;
  status: UploadJobStatus;
  progress: number;
  error: string | null;
}

/** Connector connection status. */
export type ConnectorStatus = "connected" | "disconnected" | "error";

/** Runtime state of an external connector. */
export interface ConnectorState {
  id: string;
  type: string;
  status: ConnectorStatus;
  lastSync: string | null;
  documentsCount: number;
  errorMessage: string | null;
}

/** How the model router should behave. */
export type RoutingMode =
  | "manual"
  | "cost_optimized"
  | "quality_optimized"
  | "latency_optimized"
  | "balanced"
  | "fallback_chain";

/** Payload sent when the user selects / configures model routing. */
export interface ModelSelectionPayload {
  selectedModel: string;
  routingMode: RoutingMode;
  fallbackModels: string[];
  providerPreferences: Record<string, number>;
  maxCost: number | null;
  strictZdr: boolean;
  requireParametersMatch: boolean;
}
