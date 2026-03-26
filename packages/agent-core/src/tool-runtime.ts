// ---------------------------------------------------------------------------
// @thinkora/agent-core — Tool runtime
// ---------------------------------------------------------------------------

import type { AgentContext, Logger, ToolCallResult } from "./types";
import { AgentError, ToolTimeoutError } from "./errors";
import { isToolAllowed, TOOL_TIMEOUT_MS } from "./policies";

// ---------------------------------------------------------------------------
// Connector / security interfaces expected by the runtime
// ---------------------------------------------------------------------------

/** Minimal interface for the set of external connectors the runtime can use. */
export interface ToolConnectors {
  /** Search indexed files. */
  searchFiles?(query: string, workspaceId: string): Promise<unknown>;
  /** Search Notion pages / databases via MCP. */
  searchNotion?(query: string, workspaceId: string): Promise<unknown>;
  /** Run a read-only SQL query against Supabase. */
  queryDatabase?(sql: string, workspaceId: string): Promise<unknown>;
  /** Upload a file to storage. */
  uploadFile?(file: unknown, workspaceId: string): Promise<unknown>;
  /** Return metadata about a model from the catalogue. */
  getModelInfo?(modelSlug: string): Promise<unknown>;
}

/** Security gate checked before every tool execution. */
export interface ToolSecurity {
  /** Return true if the context is allowed to invoke the named tool. */
  isAllowed(toolName: string, context: AgentContext): boolean;
}

// ---------------------------------------------------------------------------
// Default security implementation
// ---------------------------------------------------------------------------

class DefaultToolSecurity implements ToolSecurity {
  isAllowed(toolName: string, context: AgentContext): boolean {
    return isToolAllowed(toolName, context);
  }
}

// ---------------------------------------------------------------------------
// ToolRuntime
// ---------------------------------------------------------------------------

/**
 * Executes tools on behalf of the agent, enforcing timeouts, permission
 * checks, and structured logging.
 */
export class ToolRuntime {
  private readonly connectors: ToolConnectors;
  private readonly security: ToolSecurity;
  private readonly logger: Logger;
  private readonly timeoutMs: number;

  constructor(params: {
    connectors: ToolConnectors;
    security?: ToolSecurity;
    logger: Logger;
    timeoutMs?: number;
  }) {
    this.connectors = params.connectors;
    this.security = params.security ?? new DefaultToolSecurity();
    this.logger = params.logger;
    this.timeoutMs = params.timeoutMs ?? TOOL_TIMEOUT_MS;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Execute a named tool with the given input.
   *
   * The call is guarded by a permission check and a timeout cap.  All
   * invocations are logged regardless of outcome.
   */
  async executeTool(
    toolName: string,
    input: unknown,
    context: AgentContext,
  ): Promise<ToolCallResult> {
    const start = Date.now();

    // --- Permission gate ---------------------------------------------------
    if (!this.security.isAllowed(toolName, context)) {
      this.logger.warn(`Tool "${toolName}" blocked by security policy`, {
        userId: context.userId,
      });
      return {
        toolName,
        status: "denied",
        input,
        output: { error: `Tool "${toolName}" is not allowed in the current context` },
        durationMs: Date.now() - start,
      };
    }

    // --- Execute with timeout ----------------------------------------------
    this.logger.info(`Executing tool "${toolName}"`, { input });

    try {
      const output = await this.withTimeout(
        this.dispatch(toolName, input, context),
        toolName,
      );

      const durationMs = Date.now() - start;
      this.logger.info(`Tool "${toolName}" completed in ${durationMs}ms`);

      return {
        toolName,
        status: "completed",
        input,
        output,
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const status = err instanceof ToolTimeoutError ? "timeout" : "failed";

      this.logger.error(`Tool "${toolName}" ${status} after ${durationMs}ms: ${errorMessage}`);

      return {
        toolName,
        status,
        input,
        output: { error: errorMessage },
        durationMs,
      };
    }
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /** Route a tool call to the correct connector method. */
  private async dispatch(
    toolName: string,
    input: unknown,
    context: AgentContext,
  ): Promise<unknown> {
    const params = (input ?? {}) as Record<string, unknown>;

    switch (toolName) {
      case "search_files": {
        if (!this.connectors.searchFiles) {
          throw new AgentError("search_files connector not configured");
        }
        return this.connectors.searchFiles(
          String(params.query ?? ""),
          context.workspaceId,
        );
      }

      case "search_notion": {
        if (!this.connectors.searchNotion) {
          throw new AgentError("search_notion connector not configured");
        }
        return this.connectors.searchNotion(
          String(params.query ?? ""),
          context.workspaceId,
        );
      }

      case "query_database": {
        if (!this.connectors.queryDatabase) {
          throw new AgentError("query_database connector not configured");
        }
        return this.connectors.queryDatabase(
          String(params.sql ?? ""),
          context.workspaceId,
        );
      }

      case "upload_file": {
        if (!this.connectors.uploadFile) {
          throw new AgentError("upload_file connector not configured");
        }
        return this.connectors.uploadFile(params.file, context.workspaceId);
      }

      case "get_model_info": {
        if (!this.connectors.getModelInfo) {
          throw new AgentError("get_model_info connector not configured");
        }
        return this.connectors.getModelInfo(String(params.modelSlug ?? ""));
      }

      default:
        throw new AgentError(`Unknown tool: ${toolName}`);
    }
  }

  /** Race a promise against a timeout. */
  private withTimeout<T>(
    promise: Promise<T>,
    toolName: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new ToolTimeoutError(toolName, this.timeoutMs));
      }, this.timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
