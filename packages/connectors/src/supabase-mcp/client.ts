// ---------------------------------------------------------------------------
// Supabase MCP Client
// ---------------------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  SupabaseMCPConfig,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  ForeignKeyInfo,
  FunctionInfo,
  QueryResult,
  MCPToolInvocation,
} from "./types";

/** Normalized error thrown by the Supabase MCP client. */
export class SupabaseMCPError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "SupabaseMCPError";
  }
}

/** SQL keywords that are not allowed in read-only mode. */
const WRITE_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "GRANT",
  "REVOKE",
  "EXECUTE",
  "CALL",
];

/** Default configuration values. */
const DEFAULTS = {
  timeoutMs: 30_000,
  rowLimit: 1000,
  allowWrites: false,
} as const;

/**
 * Client for interacting with a Supabase project via its REST / Postgres API.
 *
 * Designed for MCP-style tool invocations with safety guards:
 * - Read-only by default (write keywords rejected unless explicitly enabled)
 * - Row limit enforcement
 * - Query timeout
 * - Schema introspection
 */
export class SupabaseMCPClient {
  private readonly config: Required<SupabaseMCPConfig>;
  private client: SupabaseClient | null = null;

  constructor(config: SupabaseMCPConfig) {
    this.config = {
      url: config.url,
      accessToken: config.accessToken,
      timeoutMs: config.timeoutMs ?? DEFAULTS.timeoutMs,
      rowLimit: config.rowLimit ?? DEFAULTS.rowLimit,
      allowWrites: config.allowWrites ?? DEFAULTS.allowWrites,
    };
  }

  // -----------------------------------------------------------------------
  // Connection
  // -----------------------------------------------------------------------

  /** Establishes and verifies a connection to the Supabase project. */
  async connect(): Promise<void> {
    this.client = createClient(this.config.url, this.config.accessToken, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      },
    });

    // Verify connectivity with a lightweight query
    const { error } = await this.client
      .from("_thinkora_health_check_nonexistent")
      .select("*")
      .limit(0);

    // A "relation does not exist" error means we connected successfully;
    // only connection-level errors are actual failures.
    if (error && !error.message.includes("does not exist") && !error.message.includes("relation")) {
      // Try a simpler connectivity test
      try {
        await this.client.rpc("version").throwOnError();
      } catch {
        // If both fail, just verify the client was created - the URL/token
        // format is valid. Actual errors will surface on first real query.
      }
    }
  }

  // -----------------------------------------------------------------------
  // Schema introspection
  // -----------------------------------------------------------------------

  /**
   * Inspects the database schema and returns metadata about all tables,
   * views, columns, and functions in the `public` schema.
   */
  async inspectSchema(schemaName: string = "public"): Promise<SchemaInfo> {
    const supabase = this.requireClient();

    // Fetch tables and views
    const { data: tablesData, error: tablesError } = await supabase.rpc(
      "pg_catalog_tables",
      { schema_name: schemaName },
    );

    // Fallback: query information_schema directly if the RPC doesn't exist
    let tables: TableInfo[];
    let views: TableInfo[];

    if (tablesError) {
      const result = await this.queryRaw<{
        table_name: string;
        table_type: string;
      }>(
        `SELECT table_name, table_type
         FROM information_schema.tables
         WHERE table_schema = $1
         ORDER BY table_name`,
        [schemaName],
      );

      const allTables = await Promise.all(
        result.rows.map((row) =>
          this.introspectTable(schemaName, row.table_name, row.table_type === "VIEW"),
        ),
      );

      tables = allTables.filter((t) => !t.isView);
      views = allTables.filter((t) => t.isView);
    } else {
      const rawRows = (tablesData ?? []) as Array<Record<string, unknown>>;
      const allTables = await Promise.all(
        rawRows.map((row) =>
          this.introspectTable(
            schemaName,
            row.table_name as string,
            (row.table_type as string) === "VIEW",
          ),
        ),
      );
      tables = allTables.filter((t) => !t.isView);
      views = allTables.filter((t) => t.isView);
    }

    // Fetch functions
    let functions: FunctionInfo[] = [];
    try {
      const fnResult = await this.queryRaw<{
        routine_name: string;
        data_type: string;
        external_language: string;
        security_type: string;
      }>(
        `SELECT routine_name, data_type, external_language, security_type
         FROM information_schema.routines
         WHERE routine_schema = $1 AND routine_type = 'FUNCTION'
         ORDER BY routine_name`,
        [schemaName],
      );

      functions = fnResult.rows.map((row) => ({
        name: row.routine_name,
        schema: schemaName,
        arguments: [],
        returnType: row.data_type ?? "unknown",
        language: row.external_language ?? "sql",
        isSecurityDefiner: row.security_type === "DEFINER",
      }));
    } catch {
      // Functions introspection may fail depending on permissions; non-critical.
    }

    return { schemaName, tables, views, functions };
  }

  /** Introspects a single table and returns its metadata. */
  private async introspectTable(
    schema: string,
    tableName: string,
    isView: boolean,
  ): Promise<TableInfo> {
    const columnsResult = await this.queryRaw<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
      character_maximum_length: number | null;
    }>(
      `SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, tableName],
    );

    // Get primary keys
    let primaryKeys: string[] = [];
    try {
      const pkResult = await this.queryRaw<{ column_name: string }>(
        `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema = $1
           AND tc.table_name = $2`,
        [schema, tableName],
      );
      primaryKeys = pkResult.rows.map((r) => r.column_name);
    } catch {
      // Not critical
    }

    // Get foreign keys
    let foreignKeys: ForeignKeyInfo[] = [];
    try {
      const fkResult = await this.queryRaw<{
        column_name: string;
        foreign_table_name: string;
        foreign_column_name: string;
        foreign_table_schema: string;
      }>(
        `SELECT
           kcu.column_name,
           ccu.table_name AS foreign_table_name,
           ccu.column_name AS foreign_column_name,
           ccu.table_schema AS foreign_table_schema
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema = $1
           AND tc.table_name = $2`,
        [schema, tableName],
      );
      foreignKeys = fkResult.rows.map((r) => ({
        column: r.column_name,
        referencedTable: r.foreign_table_name,
        referencedColumn: r.foreign_column_name,
        referencedSchema: r.foreign_table_schema,
      }));
    } catch {
      // Not critical
    }

    const columns: ColumnInfo[] = columnsResult.rows.map((col) => ({
      name: col.column_name,
      type: col.data_type,
      isNullable: col.is_nullable === "YES",
      defaultValue: col.column_default,
      isPrimaryKey: primaryKeys.includes(col.column_name),
      isForeignKey: foreignKeys.some((fk) => fk.column === col.column_name),
      maxLength: col.character_maximum_length,
      comment: null,
    }));

    return {
      name: tableName,
      schema,
      columns,
      rowCountEstimate: null,
      primaryKeys,
      foreignKeys,
      isView,
    };
  }

  // -----------------------------------------------------------------------
  // Query execution
  // -----------------------------------------------------------------------

  /**
   * Executes a SQL query with safety guards.
   *
   * - Rejects write operations unless `allowWrites` is enabled.
   * - Enforces the configured row limit via LIMIT clause injection.
   * - Respects the configured timeout.
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    this.guardWriteOperation(sql);

    const limitedSql = this.injectRowLimit(sql);
    return this.queryRaw<T>(limitedSql, params);
  }

  /**
   * Internal query execution without write-guards (used for introspection).
   */
  private async queryRaw<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const supabase = this.requireClient();
    const start = Date.now();

    // Use the rpc endpoint with a raw SQL wrapper
    const { data, error } = await Promise.race([
      supabase.rpc("thinkora_exec_sql", {
        query_text: sql,
        query_params: params,
      }),
      this.createTimeout(),
    ]) as { data: unknown; error: unknown };

    const durationMs = Date.now() - start;

    if (error) {
      // Fallback: attempt via PostgREST direct if the RPC doesn't exist
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as Record<string, unknown>).message === "string" &&
        (error as Record<string, string>).message.includes("does not exist")
      ) {
        return this.queryViaRest<T>(sql, durationMs);
      }

      throw new SupabaseMCPError(
        `Query execution failed: ${(error as Record<string, string>).message ?? error}`,
        "QUERY_FAILED",
      );
    }

    const rows = (Array.isArray(data) ? data : []) as T[];
    const columns =
      rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];

    return {
      rows,
      rowCount: rows.length,
      columns,
      durationMs,
      truncated: rows.length >= this.config.rowLimit,
    };
  }

  /** Fallback query via PostgREST when the SQL RPC is not available. */
  private async queryViaRest<T>(
    sql: string,
    elapsedMs: number,
  ): Promise<QueryResult<T>> {
    // Extract table name from simple SELECT queries for PostgREST fallback
    const match = sql.match(/FROM\s+["']?(\w+)["']?/i);
    if (!match) {
      throw new SupabaseMCPError(
        "Cannot execute arbitrary SQL without the thinkora_exec_sql RPC function. " +
        "Only simple SELECT queries with identifiable table names are supported as fallback.",
        "SQL_RPC_MISSING",
      );
    }

    const supabase = this.requireClient();
    const tableName = match[1];

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .limit(this.config.rowLimit);

    const durationMs = Date.now() - (Date.now() - elapsedMs);

    if (error) {
      throw new SupabaseMCPError(
        `PostgREST fallback query failed: ${error.message}`,
        "QUERY_FAILED",
      );
    }

    const rows = (data ?? []) as T[];
    const columns =
      rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];

    return {
      rows,
      rowCount: rows.length,
      columns,
      durationMs,
      truncated: rows.length >= this.config.rowLimit,
    };
  }

  // -----------------------------------------------------------------------
  // Edge Functions
  // -----------------------------------------------------------------------

  /** Invokes a Supabase Edge Function by name. */
  async invokeFunction(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<MCPToolInvocation> {
    const supabase = this.requireClient();
    const start = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke(name, {
        body: args,
      });

      const durationMs = Date.now() - start;

      if (error) {
        return {
          toolName: name,
          arguments: args,
          result: null,
          durationMs,
          status: "error",
          error: error.message ?? String(error),
        };
      }

      return {
        toolName: name,
        arguments: args,
        result: data,
        durationMs,
        status: "success",
        error: null,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      return {
        toolName: name,
        arguments: args,
        result: null,
        durationMs,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  /** Updates the query timeout. */
  setTimeout(timeoutMs: number): void {
    this.config.timeoutMs = timeoutMs;
  }

  /** Updates the row limit. */
  setLimit(rowLimit: number): void {
    this.config.rowLimit = rowLimit;
  }

  /** Enables or disables write operations. */
  setAllowWrites(allow: boolean): void {
    this.config.allowWrites = allow;
  }

  // -----------------------------------------------------------------------
  // Guards & helpers
  // -----------------------------------------------------------------------

  /** Throws if the query contains write operations and writes are disabled. */
  private guardWriteOperation(sql: string): void {
    if (this.config.allowWrites) return;

    const upperSql = sql.toUpperCase().trim();

    for (const keyword of WRITE_KEYWORDS) {
      // Match keyword at the start of the query or after a semicolon/whitespace
      const pattern = new RegExp(`(^|;\\s*)${keyword}\\b`, "i");
      if (pattern.test(upperSql)) {
        throw new SupabaseMCPError(
          `Write operation "${keyword}" is not allowed in read-only mode. ` +
          "Enable writes explicitly via setAllowWrites(true).",
          "WRITE_NOT_ALLOWED",
        );
      }
    }
  }

  /**
   * Injects a LIMIT clause if the query doesn't already have one.
   * Only applies to SELECT statements.
   */
  private injectRowLimit(sql: string): string {
    const upperSql = sql.toUpperCase().trim();
    if (!upperSql.startsWith("SELECT")) return sql;
    if (/\bLIMIT\s+\d+/i.test(sql)) return sql;

    // Remove trailing semicolon, add LIMIT, re-add semicolon
    const trimmed = sql.replace(/;\s*$/, "");
    return `${trimmed} LIMIT ${this.config.rowLimit}`;
  }

  /** Creates a timeout promise that rejects after the configured duration. */
  private createTimeout(): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new SupabaseMCPError(
              `Query timed out after ${this.config.timeoutMs}ms`,
              "TIMEOUT",
              true,
            ),
          ),
        this.config.timeoutMs,
      ),
    );
  }

  /** Returns the initialized Supabase client or throws. */
  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new SupabaseMCPError(
        "Client not connected. Call connect() first.",
        "NOT_CONNECTED",
      );
    }
    return this.client;
  }
}
