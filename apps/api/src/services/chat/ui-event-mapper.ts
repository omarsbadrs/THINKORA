// ---------------------------------------------------------------------------
// @thinkora/api — Maps internal stream events to UI-friendly events
// ---------------------------------------------------------------------------

import type { Citation } from "@thinkora/ui-contracts";
import type { ChatStreamEvent } from "./stream-events.js";

// ---------------------------------------------------------------------------
// UI event type
// ---------------------------------------------------------------------------

/** Event shape consumed by the frontend chat component. */
export interface UiStreamEvent {
  type:
    | "text"
    | "citation"
    | "tool_start"
    | "tool_end"
    | "model_info"
    | "done"
    | "error";
  content?: string;
  citation?: Citation;
  toolName?: string;
  toolCallId?: string;
  toolStatus?: "started" | "completed" | "failed";
  toolOutput?: unknown;
  modelInfo?: {
    modelUsed: string;
    actualModel: string;
  };
  stats?: {
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

/**
 * Maps an internal ChatStreamEvent to a UI-friendly UiStreamEvent.
 *
 * The internal event format is coupled to the orchestrator pipeline; this
 * mapper translates it into the shape the frontend expects, keeping the
 * boundary clean.
 */
export function mapToUiStreamEvent(event: ChatStreamEvent): UiStreamEvent {
  switch (event.type) {
    case "token":
      return {
        type: "text",
        content: event.content,
      };

    case "tool_start":
      return {
        type: "tool_start",
        toolName: event.toolName,
        toolCallId: event.toolCallId,
        toolStatus: "started",
      };

    case "tool_end":
      return {
        type: "tool_end",
        toolName: event.toolName,
        toolCallId: event.toolCallId,
        toolStatus: event.success ? "completed" : "failed",
        toolOutput: event.output,
      };

    case "citation":
      return {
        type: "citation",
        citation: event.citation,
      };

    case "model_info":
      return {
        type: "model_info",
        modelInfo: {
          modelUsed: event.modelUsed,
          actualModel: event.actualModel,
        },
      };

    case "done":
      return {
        type: "done",
        modelInfo: {
          modelUsed: event.modelUsed,
          actualModel: event.actualModel,
        },
        stats: {
          tokensInput: event.tokensInput,
          tokensOutput: event.tokensOutput,
          latencyMs: event.latencyMs,
        },
      };

    case "error":
      return {
        type: "error",
        error: {
          code: event.code,
          message: event.message,
        },
      };
  }
}
