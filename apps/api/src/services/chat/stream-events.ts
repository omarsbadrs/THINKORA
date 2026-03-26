// ---------------------------------------------------------------------------
// @thinkora/api — Chat stream event types and SSE utilities
// ---------------------------------------------------------------------------

import type { Citation } from "@thinkora/ui-contracts";

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export interface TokenEvent {
  type: "token";
  content: string;
}

export interface ToolStartEvent {
  type: "tool_start";
  toolName: string;
  toolCallId?: string;
}

export interface ToolEndEvent {
  type: "tool_end";
  toolName: string;
  toolCallId?: string;
  success: boolean;
  output?: unknown;
}

export interface CitationEvent {
  type: "citation";
  citation: Citation;
}

export interface ModelInfoEvent {
  type: "model_info";
  modelUsed: string;
  actualModel: string;
}

export interface DoneEvent {
  type: "done";
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  modelUsed: string;
  actualModel: string;
}

export interface ErrorEvent {
  type: "error";
  code: string;
  message: string;
}

/** Discriminated union of all chat stream event types. */
export type ChatStreamEvent =
  | TokenEvent
  | ToolStartEvent
  | ToolEndEvent
  | CitationEvent
  | ModelInfoEvent
  | DoneEvent
  | ErrorEvent;

// ---------------------------------------------------------------------------
// SSE formatting
// ---------------------------------------------------------------------------

/**
 * Formats a ChatStreamEvent as a Server-Sent Events data line.
 *
 * Output format: `data: {"type":"token","content":"..."}\n\n`
 */
export function formatStreamEvent(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Parses an SSE data line back into a ChatStreamEvent.
 *
 * Strips the leading `data: ` prefix before JSON parsing.
 * Returns null if the line is a comment, empty, or unparseable.
 */
export function parseStreamEvent(line: string): ChatStreamEvent | null {
  const trimmed = line.trim();

  // SSE comments or empty lines
  if (!trimmed || trimmed.startsWith(":")) {
    return null;
  }

  // Strip "data: " prefix
  const prefix = "data: ";
  const payload = trimmed.startsWith(prefix)
    ? trimmed.slice(prefix.length)
    : trimmed;

  // "[DONE]" sentinel used by some providers
  if (payload === "[DONE]") {
    return null;
  }

  try {
    const parsed = JSON.parse(payload);

    // Validate that the parsed object has a known event type
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.type === "string"
    ) {
      return parsed as ChatStreamEvent;
    }

    return null;
  } catch {
    return null;
  }
}
