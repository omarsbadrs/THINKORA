// ---------------------------------------------------------------------------
// @thinkora/agent-skills — Citation Builder Skill
// ---------------------------------------------------------------------------

import type {
  AgentContext,
  SkillDefinition,
  SkillHandler,
} from "@thinkora/agent-core";

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

export const CitationBuilderDefinition: SkillDefinition = {
  id: "citation-builder",
  name: "Citation Builder",
  description:
    "Builds proper citations from retrieved sources. Maps answer segments " +
    "to their originating sources and computes citation coverage.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Original user query" },
      retrievedChunks: {
        type: "array",
        description: "Retrieved chunks to generate citations from",
      },
      answerText: {
        type: "string",
        description: "Generated answer text to map citations against (optional)",
      },
    },
    required: ["query"],
  },
  outputSchema: {
    type: "object",
    properties: {
      citations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "number" },
            sourceType: { type: "string" },
            sourceName: { type: "string" },
            sourceId: { type: "string" },
            excerpt: { type: "string" },
            relevanceScore: { type: "number" },
            pageNumber: { type: "number", nullable: true },
            sectionTitle: { type: "string", nullable: true },
          },
        },
      },
      coverage: {
        type: "object",
        properties: {
          totalSources: { type: "number" },
          citedSources: { type: "number" },
          coverageRatio: { type: "number" },
        },
      },
      sourceBreakdown: {
        type: "object",
        description: "Count of citations by source type",
      },
    },
  },
  toolDependencies: [],
  failureModes: [
    "Citation mapping may be imprecise when answer text is not provided",
    "Very short chunks may produce low-quality citations",
    "Duplicate sources may inflate citation count",
  ],
  observabilityMetadata: {
    category: "citation",
    costTier: "none",
    typicalLatencyMs: 10,
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
  pageNumber?: number;
  sectionTitle?: string;
}

interface FormattedCitation {
  index: number;
  sourceType: string;
  sourceName: string;
  sourceId: string;
  excerpt: string;
  relevanceScore: number;
  pageNumber: number | null;
  sectionTitle: string | null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const CitationBuilderHandler: SkillHandler = async (
  input: unknown,
  _context: AgentContext,
): Promise<unknown> => {
  const { query, retrievedChunks = [], answerText } = input as {
    query: string;
    retrievedChunks?: RetrievedChunk[];
    answerText?: string;
  };

  if (retrievedChunks.length === 0) {
    return {
      citations: [],
      coverage: { totalSources: 0, citedSources: 0, coverageRatio: 0 },
      sourceBreakdown: {},
    };
  }

  // --- Deduplicate chunks by sourceId ---
  const seen = new Set<string>();
  const uniqueChunks: RetrievedChunk[] = [];
  for (const chunk of retrievedChunks) {
    const key = `${chunk.sourceId}:${chunk.sectionTitle ?? ""}:${chunk.text.slice(0, 50)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueChunks.push(chunk);
    }
  }

  // --- Sort by relevance ---
  uniqueChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // --- Build citations ---
  const citations: FormattedCitation[] = uniqueChunks.map((chunk, idx) => ({
    index: idx + 1,
    sourceType: inferSourceType(chunk.source),
    sourceName: chunk.sourceName,
    sourceId: chunk.sourceId,
    excerpt: truncate(chunk.text, 200),
    relevanceScore: chunk.relevanceScore,
    pageNumber: chunk.pageNumber ?? null,
    sectionTitle: chunk.sectionTitle ?? null,
  }));

  // --- Compute coverage ---
  const totalSources = new Set(uniqueChunks.map((c) => c.sourceId)).size;
  let citedSources = totalSources;

  // If answer text is provided, check which sources are actually referenced
  if (answerText) {
    const referencedSourceIds = new Set<string>();
    for (const chunk of uniqueChunks) {
      // Check if any significant words from the chunk appear in the answer
      const significantWords = chunk.text
        .split(/\W+/)
        .filter((w) => w.length > 5)
        .slice(0, 5);
      const answerLower = answerText.toLowerCase();
      const hasOverlap = significantWords.some((w) =>
        answerLower.includes(w.toLowerCase()),
      );
      if (hasOverlap) {
        referencedSourceIds.add(chunk.sourceId);
      }
    }
    citedSources = referencedSourceIds.size;
  }

  const coverageRatio =
    totalSources > 0
      ? Math.round((citedSources / totalSources) * 100) / 100
      : 0;

  // --- Source breakdown ---
  const sourceBreakdown: Record<string, number> = {};
  for (const cite of citations) {
    sourceBreakdown[cite.sourceType] =
      (sourceBreakdown[cite.sourceType] ?? 0) + 1;
  }

  return {
    citations,
    coverage: { totalSources, citedSources, coverageRatio },
    sourceBreakdown,
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferSourceType(source: string): string {
  if (source.includes("notion")) return "notion";
  if (source.includes("supabase") || source.includes("database")) return "supabase";
  if (source.includes("web")) return "web";
  return "file";
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}
