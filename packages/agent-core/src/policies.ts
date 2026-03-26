// ---------------------------------------------------------------------------
// @thinkora/agent-core — Agent policies and guardrails
// ---------------------------------------------------------------------------

import type { AgentContext } from "./types";

// ---------------------------------------------------------------------------
// Numeric limits
// ---------------------------------------------------------------------------

/** Maximum number of tool calls allowed in a single request. */
export const MAX_TOOL_CALLS_PER_REQUEST = 10;

/** Maximum number of retrieval chunks that may be injected into a prompt. */
export const MAX_RETRIEVAL_CHUNKS = 20;

/** Maximum tokens the LLM is allowed to produce for a single response. */
export const MAX_RESPONSE_TOKENS = 4096;

/** Default timeout for any single tool invocation (milliseconds). */
export const TOOL_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Allowlists
// ---------------------------------------------------------------------------

/** Tools that any authenticated user may invoke. */
const PUBLIC_TOOLS = new Set([
  "search_files",
  "search_notion",
  "query_database",
  "upload_file",
  "get_model_info",
]);

/** Tools restricted to admin users. */
const ADMIN_TOOLS = new Set([
  "admin_diagnostics",
  "system_health",
]);

// ---------------------------------------------------------------------------
// Policy helpers
// ---------------------------------------------------------------------------

/**
 * Determines whether a failed operation should be retried.
 * Retries are allowed for transient / network-style errors only.
 */
export function shouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Retry on transient network or rate-limit errors
    if (msg.includes("timeout") || msg.includes("econnreset")) return true;
    if (msg.includes("rate limit") || msg.includes("429")) return true;
    if (msg.includes("503") || msg.includes("service unavailable")) return true;
  }
  return false;
}

/**
 * Checks whether a given tool is allowed for the current context.
 * Admin tools require `context.sessionMemory.isAdmin === true`.
 */
export function isToolAllowed(
  toolName: string,
  context: AgentContext,
): boolean {
  if (PUBLIC_TOOLS.has(toolName)) return true;

  if (ADMIN_TOOLS.has(toolName)) {
    return context.sessionMemory?.isAdmin === true;
  }

  // Unknown tools are rejected by default
  return false;
}

/**
 * Returns true when the estimated cost is within the user's budget.
 * A budget of 0 or negative means "unlimited".
 */
export function isCostWithinBudget(
  estimatedCost: number,
  budget: number,
): boolean {
  if (budget <= 0) return true; // unlimited
  return estimatedCost <= budget;
}
