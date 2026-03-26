// ---------------------------------------------------------------------------
// @thinkora/agent-core — Core agent types
// ---------------------------------------------------------------------------

import type {
  Citation,
  RoutingMode,
  StreamEvent,
} from "@thinkora/ui-contracts";

// Re-export shared types so downstream consumers can import from agent-core
export type { Citation, StreamEvent };

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** Runtime context passed through the entire agent pipeline. */
export interface AgentContext {
  /** Authenticated user id. */
  userId: string;
  /** Active workspace id. */
  workspaceId: string;
  /** Current conversation id. */
  conversationId: string;
  /** Raw content of the user message. */
  messageContent: string;
  /** Model slug the user explicitly selected (may be overridden by router). */
  selectedModel: string;
  /** How the model router should behave. */
  routingMode: RoutingMode;
  /** Data sources available for retrieval (e.g. "files", "notion", "supabase"). */
  availableSources: string[];
  /** Key-value store that persists within the current session. */
  sessionMemory: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

/** The type of work a single plan step performs. */
export type PlanStepType = "retrieve" | "tool" | "analyze" | "respond";

/** A single step within an agent plan. */
export interface PlanStep {
  /** What kind of work this step performs. */
  type: PlanStepType;
  /** Data source to target (for retrieve steps). */
  source?: string;
  /** Sub-query to execute (for retrieve steps). */
  query?: string;
  /** Skill to invoke (for analyze steps). */
  skillId?: string;
  /** Arbitrary parameters forwarded to the skill or tool. */
  params?: Record<string, unknown>;
}

/** An ordered execution plan produced by the Planner. */
export interface AgentPlan {
  /** Ordered list of steps to execute. */
  steps: PlanStep[];
  /** Human-readable explanation of why these steps were chosen. */
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

/** Token usage breakdown for a single LLM call. */
export interface TokenUsage {
  input: number;
  output: number;
}

/** Numeric confidence score with optional breakdown. */
export interface ConfidenceScore {
  /** Overall confidence 0-1. */
  overall: number;
  /** Per-dimension breakdown (e.g. retrieval_quality, citation_coverage). */
  dimensions: Record<string, number>;
}

/** Result of a single tool invocation. */
export interface ToolCallResult {
  /** Name of the tool that was called. */
  toolName: string;
  /** Outcome status (e.g. "completed", "failed", "timeout"). */
  status: string;
  /** Input that was passed to the tool. */
  input: unknown;
  /** Output returned by the tool. */
  output: unknown;
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
}

/** Final assembled response returned by the Orchestrator. */
export interface AgentResponse {
  /** The natural-language answer. */
  content: string;
  /** Citations backing the answer. */
  citations: Citation[];
  /** Tools that were invoked during processing. */
  toolCalls: ToolCallResult[];
  /** Confidence assessment of the answer. */
  confidence: ConfidenceScore;
  /** Model slug the user selected. */
  modelUsed: string;
  /** Model slug that actually served the request (may differ due to routing). */
  actualModel: string;
  /** Token counts for the LLM call. */
  tokensUsed: TokenUsage;
  /** End-to-end latency in milliseconds. */
  latencyMs: number;
  /** Bag of extra metadata consumers may need. */
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

/** Static definition of a registerable skill. */
export interface SkillDefinition {
  /** Unique skill identifier (e.g. "retrieval-planner"). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** What the skill does. */
  description: string;
  /** JSON-Schema-like description of the expected input. */
  inputSchema: Record<string, unknown>;
  /** JSON-Schema-like description of the output shape. */
  outputSchema: Record<string, unknown>;
  /** Tool names this skill may call during execution. */
  toolDependencies: string[];
  /** Known ways this skill can fail. */
  failureModes: string[];
  /** Extra metadata exposed to observability / tracing systems. */
  observabilityMetadata: Record<string, unknown>;
}

/** The result of executing a skill. */
export interface SkillExecutionResult {
  /** Id of the skill that ran. */
  skillId: string;
  /** Output produced by the skill. */
  output: unknown;
  /** Execution duration in milliseconds. */
  duration: number;
  /** Whether execution completed without error. */
  success: boolean;
  /** Error message when success is false. */
  error?: string;
}

/** Function signature that skill handlers must satisfy. */
export type SkillHandler = (
  input: unknown,
  context: AgentContext,
) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Logger interface
// ---------------------------------------------------------------------------

/** Minimal logger contract used throughout agent-core. */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
