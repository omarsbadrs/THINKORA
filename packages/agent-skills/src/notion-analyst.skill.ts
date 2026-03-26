// ---------------------------------------------------------------------------
// @thinkora/agent-skills — Notion Analyst Skill
// ---------------------------------------------------------------------------

import type {
  AgentContext,
  SkillDefinition,
  SkillHandler,
} from "@thinkora/agent-core";

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

export const NotionAnalystDefinition: SkillDefinition = {
  id: "notion-analyst",
  name: "Notion Analyst",
  description:
    "Searches and analyzes Notion content. Summarizes page and database " +
    "results. Returns structured findings with citations.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Natural-language query" },
      retrievedChunks: {
        type: "array",
        description: "Pre-retrieved chunks from Notion sources",
      },
    },
    required: ["query"],
  },
  outputSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            sourcePageId: { type: "string" },
            relevance: { type: "number" },
          },
        },
      },
      suggestedPages: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
  toolDependencies: ["search_notion"],
  failureModes: [
    "Notion API may be temporarily unavailable",
    "Large Notion databases may return truncated results",
    "Page content may exceed context window when pages are very long",
  ],
  observabilityMetadata: {
    category: "analysis",
    costTier: "low",
    typicalLatencyMs: 2000,
    externalDependency: "notion-mcp",
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RetrievedChunk {
  text: string;
  source: string;
  sourceId: string;
  sourceName: string;
  relevanceScore: number;
  sectionTitle?: string;
}

interface Finding {
  title: string;
  content: string;
  sourcePageId: string;
  relevance: number;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const NotionAnalystHandler: SkillHandler = async (
  input: unknown,
  _context: AgentContext,
): Promise<unknown> => {
  const { query, retrievedChunks = [] } = input as {
    query: string;
    retrievedChunks?: RetrievedChunk[];
  };

  // Filter to Notion-sourced chunks
  const notionChunks = retrievedChunks.filter(
    (c) => c.source === "notion" || c.source.includes("notion"),
  );

  if (notionChunks.length === 0) {
    return {
      summary: "No Notion content was found matching the query.",
      findings: [],
      suggestedPages: [],
    };
  }

  // --- Build structured findings from chunks ---
  const findings: Finding[] = notionChunks.map((chunk) => ({
    title: chunk.sectionTitle ?? chunk.sourceName,
    content: chunk.text,
    sourcePageId: chunk.sourceId,
    relevance: chunk.relevanceScore,
  }));

  // Sort by relevance descending
  findings.sort((a, b) => b.relevance - a.relevance);

  // --- Generate summary ---
  const topFindings = findings.slice(0, 5);
  const summaryParts = topFindings.map(
    (f, i) => `${i + 1}. **${f.title}**: ${truncate(f.content, 150)}`,
  );

  const summary =
    `Found ${findings.length} relevant Notion result(s) for "${truncate(query, 80)}".\n\n` +
    `Key findings:\n${summaryParts.join("\n")}`;

  // --- Suggest related pages ---
  const suggestedPages = Array.from(
    new Set(findings.map((f) => f.sourcePageId)),
  );

  return { summary, findings, suggestedPages };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}
