// ---------------------------------------------------------------------------
// @thinkora/agent-skills — Retrieval Planner Skill
// ---------------------------------------------------------------------------

import type {
  AgentContext,
  SkillDefinition,
  SkillHandler,
} from "@thinkora/agent-core";

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

export const RetrievalPlannerDefinition: SkillDefinition = {
  id: "retrieval-planner",
  name: "Retrieval Planner",
  description:
    "Breaks user queries into sub-queries and plans which data sources " +
    "to search (files, notion, supabase). Returns an ordered retrieval plan.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The user query to decompose" },
      availableSources: {
        type: "array",
        items: { type: "string" },
        description: "Data sources available for retrieval",
      },
    },
    required: ["query", "availableSources"],
  },
  outputSchema: {
    type: "object",
    properties: {
      subQueries: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            intent: { type: "string" },
          },
        },
      },
      sourcePlan: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source: { type: "string" },
            queries: { type: "array", items: { type: "string" } },
            priority: { type: "number" },
          },
        },
      },
    },
  },
  toolDependencies: [],
  failureModes: [
    "Query decomposition may miss nuances in complex multi-part questions",
    "Source plan may not be optimal when query is ambiguous",
  ],
  observabilityMetadata: {
    category: "planning",
    costTier: "none",
    typicalLatencyMs: 5,
  },
};

// ---------------------------------------------------------------------------
// Intent keywords for source routing
// ---------------------------------------------------------------------------

const SOURCE_SIGNALS: Record<string, string[]> = {
  files: [
    "file", "upload", "document", "pdf", "attachment", "csv", "xlsx",
    "spreadsheet", "image", "report file",
  ],
  notion: [
    "notion", "page", "wiki", "knowledge base", "workspace doc",
    "meeting notes", "project plan",
  ],
  supabase: [
    "database", "sql", "table", "query", "supabase", "row", "record",
    "count", "aggregate", "analytics", "metric",
  ],
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const RetrievalPlannerHandler: SkillHandler = async (
  input: unknown,
  _context: AgentContext,
): Promise<unknown> => {
  const { query, availableSources } = input as {
    query: string;
    availableSources: string[];
  };

  const lowerQuery = query.toLowerCase();

  // --- 1. Decompose query into sub-queries ---
  const subQueries = decomposeQuery(query);

  // --- 2. Score each available source ---
  interface SourceScore {
    source: string;
    score: number;
    matchedQueries: string[];
  }

  const scored: SourceScore[] = availableSources.map((source) => {
    const signals = SOURCE_SIGNALS[source] ?? [];
    let score = 0;
    const matchedQueries: string[] = [];

    for (const sub of subQueries) {
      const subLower = sub.text.toLowerCase();
      for (const signal of signals) {
        if (subLower.includes(signal) || lowerQuery.includes(signal)) {
          score++;
          if (!matchedQueries.includes(sub.text)) {
            matchedQueries.push(sub.text);
          }
        }
      }
    }

    // Give a baseline score so that all sources get at least searched
    // when the query is generic
    if (score === 0) {
      score = 0.1;
      matchedQueries.push(query);
    }

    return { source, score, matchedQueries };
  });

  // --- 3. Sort by score descending and build plan ---
  scored.sort((a, b) => b.score - a.score);

  const sourcePlan = scored.map((s, idx) => ({
    source: s.source,
    queries: s.matchedQueries,
    priority: idx + 1,
  }));

  return { subQueries, sourcePlan };
};

// ---------------------------------------------------------------------------
// Query decomposition (rule-based)
// ---------------------------------------------------------------------------

function decomposeQuery(query: string): { text: string; intent: string }[] {
  const results: { text: string; intent: string }[] = [];

  // Split on common conjunctions / separators
  const parts = query
    .split(/(?:\band\b|\balso\b|,\s*|\.\s+|\?\s+|;\s*)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 3);

  if (parts.length <= 1) {
    // Single query — classify its intent
    results.push({ text: query, intent: classifyIntent(query) });
  } else {
    for (const part of parts) {
      results.push({ text: part, intent: classifyIntent(part) });
    }
  }

  return results;
}

function classifyIntent(text: string): string {
  const lower = text.toLowerCase();
  if (lower.match(/\b(compare|versus|vs|differ)\b/)) return "comparison";
  if (lower.match(/\b(how many|count|total|sum|average)\b/)) return "aggregation";
  if (lower.match(/\b(summarize|summary|overview|brief)\b/)) return "summarization";
  if (lower.match(/\b(find|search|where|which|look)\b/)) return "lookup";
  if (lower.match(/\b(explain|why|how|what)\b/)) return "explanation";
  return "general";
}
