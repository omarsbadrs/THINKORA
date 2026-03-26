// ---------------------------------------------------------------------------
// @thinkora/agent-skills — Research Synthesis Skill
// ---------------------------------------------------------------------------

import type {
  AgentContext,
  SkillDefinition,
  SkillHandler,
} from "@thinkora/agent-core";

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

export const ResearchSynthesisDefinition: SkillDefinition = {
  id: "research-synthesis",
  name: "Research Synthesis",
  description:
    "Combines results from multiple data sources, cross-references findings, " +
    "identifies agreements and contradictions, and builds a comprehensive synthesis.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Original user query" },
      retrievedChunks: {
        type: "array",
        description: "Retrieved chunks from all sources",
      },
    },
    required: ["query"],
  },
  outputSchema: {
    type: "object",
    properties: {
      synthesis: { type: "string" },
      agreements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            claim: { type: "string" },
            supportedBy: { type: "array", items: { type: "string" } },
          },
        },
      },
      contradictions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic: { type: "string" },
            sourceA: { type: "string" },
            claimA: { type: "string" },
            sourceB: { type: "string" },
            claimB: { type: "string" },
          },
        },
      },
      gaps: { type: "array", items: { type: "string" } },
      confidenceLevel: { type: "string", enum: ["high", "medium", "low"] },
      sourcesCrossReferenced: { type: "number" },
    },
  },
  toolDependencies: [],
  failureModes: [
    "Cross-referencing may miss subtle contradictions",
    "Synthesis quality depends on the quality and quantity of retrieved chunks",
    "May not detect sarcasm or domain-specific disagreements",
  ],
  observabilityMetadata: {
    category: "synthesis",
    costTier: "none",
    typicalLatencyMs: 50,
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

interface Agreement {
  claim: string;
  supportedBy: string[];
}

interface Contradiction {
  topic: string;
  sourceA: string;
  claimA: string;
  sourceB: string;
  claimB: string;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const ResearchSynthesisHandler: SkillHandler = async (
  input: unknown,
  _context: AgentContext,
): Promise<unknown> => {
  const { query, retrievedChunks = [] } = input as {
    query: string;
    retrievedChunks?: RetrievedChunk[];
  };

  if (retrievedChunks.length === 0) {
    return {
      synthesis: "No source data available for synthesis.",
      agreements: [],
      contradictions: [],
      gaps: ["No data was retrieved from any source"],
      confidenceLevel: "low",
      sourcesCrossReferenced: 0,
    };
  }

  // --- Group chunks by source ---
  const bySource = new Map<string, RetrievedChunk[]>();
  for (const chunk of retrievedChunks) {
    const key = chunk.source;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key)!.push(chunk);
  }

  const sourceNames = Array.from(bySource.keys());

  // --- Extract key phrases from each source ---
  const sourcePhrases = new Map<string, Set<string>>();
  for (const [source, chunks] of bySource) {
    const phrases = new Set<string>();
    for (const chunk of chunks) {
      for (const phrase of extractKeyPhrases(chunk.text)) {
        phrases.add(phrase);
      }
    }
    sourcePhrases.set(source, phrases);
  }

  // --- Find agreements (phrases appearing in 2+ sources) ---
  const agreements: Agreement[] = [];
  const allPhrases = new Set<string>();
  for (const phrases of sourcePhrases.values()) {
    for (const p of phrases) allPhrases.add(p);
  }

  for (const phrase of allPhrases) {
    const supportedBy: string[] = [];
    for (const [source, phrases] of sourcePhrases) {
      if (phrases.has(phrase)) supportedBy.push(source);
    }
    if (supportedBy.length >= 2) {
      agreements.push({ claim: phrase, supportedBy });
    }
  }

  // --- Find potential contradictions ---
  const contradictions: Contradiction[] = findContradictions(bySource);

  // --- Identify gaps ---
  const gaps = identifyGaps(query, bySource);

  // --- Determine confidence ---
  let confidenceLevel: "high" | "medium" | "low";
  if (sourceNames.length >= 3 && agreements.length > 0 && contradictions.length === 0) {
    confidenceLevel = "high";
  } else if (sourceNames.length >= 2 || agreements.length > 0) {
    confidenceLevel = "medium";
  } else {
    confidenceLevel = "low";
  }

  // --- Build synthesis text ---
  const synthesisLines: string[] = [];
  synthesisLines.push(
    `Synthesized information from ${sourceNames.length} source(s): ${sourceNames.join(", ")}.`,
  );

  if (agreements.length > 0) {
    synthesisLines.push(
      `\nKey agreements across sources (${agreements.length}):`,
    );
    for (const a of agreements.slice(0, 5)) {
      synthesisLines.push(
        `- "${a.claim}" (supported by: ${a.supportedBy.join(", ")})`,
      );
    }
  }

  if (contradictions.length > 0) {
    synthesisLines.push(
      `\nPotential contradictions (${contradictions.length}):`,
    );
    for (const c of contradictions.slice(0, 3)) {
      synthesisLines.push(
        `- On "${c.topic}": ${c.sourceA} says "${c.claimA}" vs. ${c.sourceB} says "${c.claimB}"`,
      );
    }
  }

  if (gaps.length > 0) {
    synthesisLines.push(`\nInformation gaps: ${gaps.join("; ")}`);
  }

  return {
    synthesis: synthesisLines.join("\n"),
    agreements,
    contradictions,
    gaps,
    confidenceLevel,
    sourcesCrossReferenced: sourceNames.length,
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract key phrases from text.
 * Simple heuristic: sentences containing important nouns and verbs.
 */
function extractKeyPhrases(text: string): string[] {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 15);
  // Return sentences that are likely to be substantive claims
  return sentences
    .filter((s) => s.split(/\s+/).length >= 4)
    .map((s) => s.slice(0, 100))
    .slice(0, 10);
}

/**
 * Look for numerical contradictions across sources.
 * If two sources mention the same metric with different values, flag it.
 */
function findContradictions(
  bySource: Map<string, RetrievedChunk[]>,
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const sources = Array.from(bySource.entries());

  // Compare pairs of sources
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const [srcA, chunksA] = sources[i];
      const [srcB, chunksB] = sources[j];

      // Look for numeric claims
      const numsA = extractNumbers(chunksA);
      const numsB = extractNumbers(chunksB);

      // If both mention a keyword context with different numbers, it is
      // a potential contradiction
      for (const [contextA, valueA] of numsA) {
        for (const [contextB, valueB] of numsB) {
          if (
            contextA === contextB &&
            Math.abs(valueA - valueB) > 0.01 * Math.max(Math.abs(valueA), Math.abs(valueB))
          ) {
            contradictions.push({
              topic: contextA,
              sourceA: srcA,
              claimA: `${valueA}`,
              sourceB: srcB,
              claimB: `${valueB}`,
            });
          }
        }
      }
    }
  }

  return contradictions.slice(0, 5);
}

function extractNumbers(chunks: RetrievedChunk[]): [string, number][] {
  const results: [string, number][] = [];
  const pattern = /(\w+)\s+(?:is|are|was|were|=|:)\s+([\d,.]+)/gi;

  for (const chunk of chunks) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(chunk.text)) !== null) {
      const context = match[1].toLowerCase();
      const value = parseFloat(match[2].replace(/,/g, ""));
      if (!isNaN(value)) {
        results.push([context, value]);
      }
    }
  }

  return results;
}

function identifyGaps(
  query: string,
  bySource: Map<string, RetrievedChunk[]>,
): string[] {
  const gaps: string[] = [];
  const allText = Array.from(bySource.values())
    .flat()
    .map((c) => c.text.toLowerCase())
    .join(" ");

  // Extract important terms from the query
  const queryTerms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);

  for (const term of queryTerms) {
    if (!allText.includes(term)) {
      gaps.push(`No sources contain information about "${term}"`);
    }
  }

  if (bySource.size === 1) {
    gaps.push("Only one source contributed data — cross-validation is not possible");
  }

  return gaps;
}
