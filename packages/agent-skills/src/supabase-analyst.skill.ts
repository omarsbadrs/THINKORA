// ---------------------------------------------------------------------------
// @thinkora/agent-skills — Supabase Analyst Skill
// ---------------------------------------------------------------------------

import type {
  AgentContext,
  SkillDefinition,
  SkillHandler,
} from "@thinkora/agent-core";

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

export const SupabaseAnalystDefinition: SkillDefinition = {
  id: "supabase-analyst",
  name: "Supabase Analyst",
  description:
    "Generates safe read-only SQL from natural language, executes queries " +
    "against Supabase, explains results in natural language, and returns " +
    "data tables with explanations.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Natural-language question about the database" },
      retrievedChunks: {
        type: "array",
        description: "Pre-retrieved chunks (may include schema info)",
      },
    },
    required: ["query"],
  },
  outputSchema: {
    type: "object",
    properties: {
      generatedSql: { type: "string" },
      isSafe: { type: "boolean" },
      explanation: { type: "string" },
      columns: { type: "array", items: { type: "string" } },
      rows: { type: "array", items: { type: "array" } },
      rowCount: { type: "number" },
      warnings: { type: "array", items: { type: "string" } },
    },
  },
  toolDependencies: ["query_database"],
  failureModes: [
    "Natural language to SQL translation may produce incorrect queries",
    "Query may time out on large datasets",
    "Dangerous mutation queries must be blocked",
    "Schema may have changed since last sync",
  ],
  observabilityMetadata: {
    category: "analysis",
    costTier: "low",
    typicalLatencyMs: 3000,
    externalDependency: "supabase-mcp",
  },
};

// ---------------------------------------------------------------------------
// SQL safety
// ---------------------------------------------------------------------------

/** Dangerous keywords that indicate a mutation — must be blocked. */
const DANGEROUS_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i,
  /;\s*--/,  // comment injection
  /;\s*\w/,  // chained statements
];

function isSafeSql(sql: string): { safe: boolean; reason?: string } {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sql)) {
      return {
        safe: false,
        reason: `SQL contains potentially dangerous pattern: ${pattern.source}`,
      };
    }
  }
  return { safe: true };
}

// ---------------------------------------------------------------------------
// Naive NL-to-SQL (rule-based placeholder)
// ---------------------------------------------------------------------------

/**
 * Very basic rule-based SQL generator.
 * In production this would be replaced by an LLM call with schema context.
 */
function generateSql(query: string): string {
  const lower = query.toLowerCase();

  // Detect aggregation intent
  if (lower.match(/\b(count|how many)\b/)) {
    const table = extractTableName(lower);
    return `SELECT count(*) AS total FROM ${table} LIMIT 100`;
  }
  if (lower.match(/\b(average|avg|mean)\b/)) {
    const table = extractTableName(lower);
    return `SELECT * FROM ${table} LIMIT 100`;
  }
  if (lower.match(/\b(latest|recent|newest)\b/)) {
    const table = extractTableName(lower);
    return `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 20`;
  }

  // Default: select everything with a safe limit
  const table = extractTableName(lower);
  return `SELECT * FROM ${table} LIMIT 50`;
}

function extractTableName(text: string): string {
  // Try to find common table references
  const tablePatterns = [
    /\bfrom\s+(\w+)/i,
    /\bin\s+(?:the\s+)?(\w+)\s+table/i,
    /\b(users|files|conversations|messages|models|connectors|workspaces)\b/i,
  ];

  for (const pattern of tablePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "unknown_table";
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const SupabaseAnalystHandler: SkillHandler = async (
  input: unknown,
  _context: AgentContext,
): Promise<unknown> => {
  const { query } = input as { query: string };

  // --- 1. Generate SQL from natural language ---
  const generatedSql = generateSql(query);

  // --- 2. Safety check ---
  const safetyCheck = isSafeSql(generatedSql);
  if (!safetyCheck.safe) {
    return {
      generatedSql,
      isSafe: false,
      explanation: `Query was blocked: ${safetyCheck.reason}`,
      columns: [],
      rows: [],
      rowCount: 0,
      warnings: [safetyCheck.reason!],
    };
  }

  // --- 3. Return the plan (actual execution happens via tool runtime) ---
  // The orchestrator will call `query_database` with this SQL.
  // This skill produces the SQL and analysis plan; execution is deferred.
  return {
    generatedSql,
    isSafe: true,
    explanation:
      `Generated SQL to answer: "${truncate(query, 100)}". ` +
      `The query will retrieve data from the database for analysis.`,
    columns: [],
    rows: [],
    rowCount: 0,
    warnings: [
      "SQL was generated from natural language and may need review",
      "Results are limited to prevent excessive data transfer",
    ],
  };
};

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}
