// ---------------------------------------------------------------------------
// Supabase MCP connector types
// ---------------------------------------------------------------------------

/** Configuration for the Supabase MCP client. */
export interface SupabaseMCPConfig {
  url: string;
  accessToken: string;
  /** Query timeout in milliseconds (default 30000). */
  timeoutMs?: number;
  /** Maximum rows returned per query (default 1000). */
  rowLimit?: number;
  /** Whether to allow write operations (default false). */
  allowWrites?: boolean;
}

/** Describes the full schema of a Supabase project. */
export interface SchemaInfo {
  schemaName: string;
  tables: TableInfo[];
  views: TableInfo[];
  functions: FunctionInfo[];
}

/** Metadata for a single table or view. */
export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  rowCountEstimate: number | null;
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  isView: boolean;
}

/** Metadata for a single column. */
export interface ColumnInfo {
  name: string;
  type: string;
  isNullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  maxLength: number | null;
  comment: string | null;
}

/** Foreign key relationship metadata. */
export interface ForeignKeyInfo {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  referencedSchema: string;
}

/** Metadata for a database function. */
export interface FunctionInfo {
  name: string;
  schema: string;
  arguments: FunctionArgument[];
  returnType: string;
  language: string;
  isSecurityDefiner: boolean;
}

/** A single argument of a database function. */
export interface FunctionArgument {
  name: string;
  type: string;
  hasDefault: boolean;
}

/** Result of a SQL query execution. */
export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  columns: string[];
  durationMs: number;
  truncated: boolean;
}

/** Describes an MCP tool invocation against Supabase. */
export interface MCPToolInvocation {
  toolName: string;
  arguments: Record<string, unknown>;
  result: unknown;
  durationMs: number;
  status: "success" | "error";
  error: string | null;
}
