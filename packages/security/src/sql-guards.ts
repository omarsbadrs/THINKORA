/**
 * SQL injection prevention — Query validation and input sanitisation.
 *
 * These guards are designed as an additional safety net. They are not a
 * substitute for parameterised queries, but they catch accidental or
 * malicious raw SQL interpolation.
 */

// ---------------------------------------------------------------------------
// Dangerous patterns
// ---------------------------------------------------------------------------

/**
 * SQL keywords / statements that should never appear in user-supplied input
 * that is interpolated into queries.
 */
export const DANGEROUS_PATTERNS: string[] = [
  "DROP",
  "DELETE",
  "ALTER",
  "TRUNCATE",
  "INSERT",
  "UPDATE",
  "GRANT",
  "REVOKE",
  "EXEC",
  "EXECUTE",
  "CREATE",
  "UNION",
  "INTO OUTFILE",
  "LOAD_FILE",
  "xp_cmdshell",
  "INFORMATION_SCHEMA",
  "--",
  "/*",
  "*/",
  ";",
];

/**
 * Pre-compiled regex: matches any of the dangerous keywords as whole words
 * (case-insensitive), plus the comment / statement-terminator patterns.
 */
const DANGEROUS_RE = new RegExp(
  DANGEROUS_PATTERNS.map((p) => {
    // For multi-char symbolic patterns, escape regex specials
    if (/^[a-zA-Z_\s]+$/.test(p)) {
      return `\\b${p}\\b`;
    }
    return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("|"),
  "i",
);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the query string does not contain any obviously
 * dangerous patterns.  This is a heuristic check — it is not a SQL parser.
 */
export function isSafeQuery(sql: string): boolean {
  return !DANGEROUS_RE.test(sql);
}

/**
 * Returns `true` only when the query is a read-only SELECT statement
 * (no write keywords, no sub-statements).
 */
export function validateQueryReadOnly(sql: string): boolean {
  const trimmed = sql.trim();

  // Must start with SELECT (case-insensitive)
  if (!/^SELECT\b/i.test(trimmed)) {
    return false;
  }

  // Must not contain write/DDL keywords
  const writeKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "GRANT",
    "REVOKE",
    "EXEC",
    "EXECUTE",
  ];
  const writeRe = new RegExp(
    writeKeywords.map((k) => `\\b${k}\\b`).join("|"),
    "i",
  );

  return !writeRe.test(trimmed);
}

// ---------------------------------------------------------------------------
// Sanitisation
// ---------------------------------------------------------------------------

/**
 * Escape characters that are meaningful in SQL string literals.
 *
 * This is intended for display/logging purposes. Always use parameterised
 * queries for actual database operations.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/"/g, '\\"')
    .replace(/\x00/g, "") // null bytes
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "\\Z"); // Ctrl+Z (EOF on Windows)
}
