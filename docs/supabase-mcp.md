# Supabase MCP Integration

The Supabase MCP (Model Context Protocol) integration allows users to query their Supabase databases through natural language in the Thinkora chat interface. The implementation is in `packages/connectors/src/supabase-mcp/`.

## Setup and Configuration

### 1. Deploy or locate a Supabase MCP Server

The Supabase MCP client connects to a Supabase project's REST API using the Supabase JS client. You need:
- A Supabase project URL
- An access token (service role key or a scoped API key)

### 2. Configure Environment Variables

```bash
SUPABASE_MCP_URL=https://your-project.supabase.co
SUPABASE_MCP_ACCESS_TOKEN=your-service-role-key-or-api-key
```

### 3. Connect in Thinkora

1. Navigate to the **Connectors** page
2. Click **"Connect Supabase MCP"**
3. The system tests connectivity by attempting a lightweight query
4. On success, the connector status is set to "connected"

## Schema Inspection

The `SupabaseMCPClient` can introspect the database schema to understand available tables, views, columns, and functions. This information is used by the agent to generate appropriate SQL queries.

### What is inspected

When `inspectSchema(schemaName)` is called (default: `"public"` schema):

```
inspectSchema("public")
    |
    +-- Lists all tables and views
    |     via information_schema.tables
    |
    +-- For each table/view, retrieves:
    |     - Column names, types, nullability, defaults
    |     - Primary keys (via table_constraints + key_column_usage)
    |     - Foreign keys (with referenced table/column)
    |
    +-- Lists all functions
    |     via information_schema.routines
    |     - Name, return type, language, security definer status
    |
    +-- Returns SchemaInfo:
          { schemaName, tables[], views[], functions[] }
```

### Schema types

```typescript
interface SchemaInfo {
  schemaName: string;
  tables: TableInfo[];
  views: TableInfo[];
  functions: FunctionInfo[];
}

interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  rowCountEstimate: number | null;
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  isView: boolean;
}

interface ColumnInfo {
  name: string;
  type: string;         // PostgreSQL data type
  isNullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  maxLength: number | null;
  comment: string | null;
}
```

## Query Execution

### Basic Query

```typescript
const result = await client.query<MyRow>("SELECT * FROM users WHERE active = $1", [true]);
// result: { rows, rowCount, columns, durationMs, truncated }
```

### Query Result Shape

```typescript
interface QueryResult<T> {
  rows: T[];           // Result rows
  rowCount: number;    // Number of rows returned
  columns: string[];   // Column names
  durationMs: number;  // Execution time
  truncated: boolean;  // True if result hit the row limit
}
```

### How Queries Are Executed

1. The query is first checked by the write guard (see Safety Guards below)
2. A row limit is injected if not already present
3. The query is sent to Supabase via the `thinkora_exec_sql` RPC function
4. If the RPC function does not exist, a PostgREST fallback is attempted for simple SELECT queries
5. Results are returned with timing and truncation metadata

## Safety Guards

The Supabase MCP client enforces multiple layers of safety to prevent accidental or malicious data modification.

### Read-Only Default

By default, all write operations are blocked. The client scans queries for dangerous SQL keywords:

| Blocked Keywords |
|---|
| `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE` |
| `TRUNCATE`, `GRANT`, `REVOKE`, `EXECUTE`, `CALL` |

If any of these keywords appear at the start of a statement or after a semicolon, the query is rejected with a `WRITE_NOT_ALLOWED` error.

### Row Limit Enforcement

All SELECT queries have an automatic `LIMIT` clause injected if one is not already present. Default limit: **1000 rows**. This prevents accidentally fetching millions of rows.

```sql
-- User writes:
SELECT * FROM large_table

-- Client transforms to:
SELECT * FROM large_table LIMIT 1000
```

### Query Timeout

Each query has a configurable timeout (default: 30 seconds). If a query exceeds this duration, it is cancelled and a `TIMEOUT` error is returned.

### Additional SQL Guards (from `@thinkora/security`)

The `packages/security/src/sql-guards.ts` module provides an extra layer of protection:

- `isSafeQuery(sql)` -- checks for dangerous patterns including `UNION`, `INTO OUTFILE`, `LOAD_FILE`, `xp_cmdshell`, `INFORMATION_SCHEMA`, SQL comments (`--`, `/*`), and statement terminators (`;`)
- `validateQueryReadOnly(sql)` -- ensures the query starts with `SELECT` and contains no write keywords
- `sanitizeInput(input)` -- escapes SQL-special characters for logging/display

## Read-Only Defaults

The safety-first design philosophy:

| Setting | Default | Description |
|---|---|---|
| `allowWrites` | `false` | Write operations are blocked |
| `rowLimit` | `1000` | Maximum rows returned per query |
| `timeoutMs` | `30000` | Query timeout in milliseconds |

### Enabling Writes (Advanced)

Writes can be enabled explicitly for admin use cases:

```typescript
client.setAllowWrites(true);  // Use with extreme caution
```

This is never done automatically by the agent. Write enablement requires explicit admin action and is logged in the audit trail.

## Edge Functions

The client can invoke Supabase Edge Functions:

```typescript
const result = await client.invokeFunction("my-function", { key: "value" });
// result: { toolName, arguments, result, durationMs, status, error }
```

## Configuration Methods

The client provides runtime configuration methods:

```typescript
client.setTimeout(60000);       // Increase timeout to 60s
client.setLimit(500);           // Reduce row limit to 500
client.setAllowWrites(false);   // Ensure read-only mode
```

## Troubleshooting

### "Client not connected" error

The `connect()` method must be called before any other operation.

**Fix:** Ensure the connector initialization calls `connect()` and that `SUPABASE_MCP_URL` and `SUPABASE_MCP_ACCESS_TOKEN` are correctly set.

### Connection succeeds but queries fail

The `thinkora_exec_sql` RPC function may not be deployed in the target database. The client falls back to PostgREST for simple queries, but complex queries will fail.

**Fix:** Deploy the `thinkora_exec_sql` function to the target database, or use only simple `SELECT ... FROM table` queries.

### "Write operation not allowed" error

A query contains a write keyword (INSERT, UPDATE, DELETE, etc.) and writes are disabled.

**Fix:** If the write is intentional and authorized, use `setAllowWrites(true)` before executing the query. Otherwise, rephrase as a read-only query.

### Query timeout

A query took longer than the configured timeout.

**Fix:** Optimize the query (add indexes, reduce result set). Increase timeout with `setTimeout()` if the query is expected to be slow.

### PostgREST fallback limitations

When the SQL RPC function is not available, only simple `SELECT` queries with identifiable table names work via the PostgREST fallback. Joins, subqueries, and aggregations may not be supported.

**Fix:** Deploy the `thinkora_exec_sql` RPC function for full SQL support.

### Schema introspection returns empty results

The access token may lack permission to read `information_schema`.

**Fix:** Use the service role key or a token with sufficient database privileges.

### Rate limiting from Supabase

Supabase projects have API rate limits. If you hit them:

**Fix:** Reduce query frequency, batch operations, or upgrade your Supabase plan.
