// ---------------------------------------------------------------------------
// OpenRouter connector types
// ---------------------------------------------------------------------------

/** Configuration for the OpenRouter client. */
export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  siteName?: string;
  siteUrl?: string;
  /** Request timeout in milliseconds (default 60000). */
  timeoutMs?: number;
  /** Maximum retry attempts for failed requests (default 3). */
  maxRetries?: number;
}

/** An OpenRouter model from the API catalog. */
export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  created: number;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
  };
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
  top_provider: {
    context_length: number | null;
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  per_request_limits: Record<string, string> | null;
}

/** Message in an OpenAI-compatible chat completion request. */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ChatContentPart[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCallRequest[];
}

/** Multi-modal content part (text or image). */
export interface ChatContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: "auto" | "low" | "high" };
}

/** A tool call emitted by the model. */
export interface ToolCallRequest {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/** Tool definition for function calling. */
export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Parameters for a chat completion request. */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  tools?: ToolDefinition[];
  tool_choice?: "none" | "auto" | { type: "function"; function: { name: string } };
  response_format?: { type: "text" | "json_object" };
  frequency_penalty?: number;
  presence_penalty?: number;
  /** OpenRouter-specific: routing transforms. */
  transforms?: string[];
  /** OpenRouter-specific: model routing preferences. */
  route?: "fallback";
  /** OpenRouter-specific: provider ordering. */
  provider?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
    data_collection?: "deny" | "allow";
  };
}

/** Token usage information from a completion response. */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/** A single choice in a completion response. */
export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
}

/** Full chat completion response. */
export interface ChatCompletionResponse {
  id: string;
  model: string;
  created: number;
  choices: ChatCompletionChoice[];
  usage: TokenUsage;
  system_fingerprint: string | null;
}

/** A single chunk from a streaming completion. */
export interface StreamChunk {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    delta: Partial<ChatMessage>;
    finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
  }>;
  usage?: TokenUsage | null;
}

/** Normalized model metadata for internal use. */
export interface ModelMetadata {
  slug: string;
  canonicalSlug: string;
  displayName: string;
  providerFamily: string;
  description: string;
  contextLength: number;
  inputCostPerM: number;
  outputCostPerM: number;
  inputModalities: string[];
  outputModalities: string[];
  supportedParameters: string[];
  structuredOutput: boolean;
  toolsSupport: boolean;
  reasoningSupport: boolean;
  isModerated: boolean;
  maxCompletionTokens: number | null;
  deprecated: boolean;
  expiresAt: string | null;
  tags: string[];
  syncedAt: string;
}

/** Routing strategy types. */
export type RoutingStrategy =
  | "direct"
  | "auto"
  | "task-based"
  | "cheap-first"
  | "quality-first";

/** Constraints for model selection during routing. */
export interface RoutingConstraints {
  maxCostPerMTokens?: number;
  requireZdr?: boolean;
  requireParametersMatch?: boolean;
  requiredModalities?: string[];
  requiredCapabilities?: string[];
  preferredProviders?: string[];
  excludeProviders?: string[];
  minContextLength?: number;
  allowDeprecated?: boolean;
}

/** A routing policy definition. */
export interface RoutingPolicy {
  id: string;
  name: string;
  strategy: RoutingStrategy;
  primaryModel: string | null;
  fallbackModels: string[];
  constraints: RoutingConstraints;
  taskTypes: string[];
  priority: number;
}

/** Cost estimation for a request. */
export interface CostEstimate {
  model: string;
  inputTokens: number;
  outputTokensEstimate: number;
  estimatedInputCost: number;
  estimatedOutputCost: number;
  estimatedTotalCost: number;
  currency: "USD";
}

/** Actual cost after a request completes. */
export interface ActualCost {
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: "USD";
}

/** Cost deviation analysis. */
export interface CostDeviation {
  estimated: CostEstimate;
  actual: ActualCost;
  inputTokenDeviation: number;
  outputTokenDeviation: number;
  costDeviation: number;
  costDeviationPercent: number;
}
