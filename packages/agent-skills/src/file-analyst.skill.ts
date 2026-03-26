// ---------------------------------------------------------------------------
// @thinkora/agent-skills — File Analyst Skill
// ---------------------------------------------------------------------------

import type {
  AgentContext,
  SkillDefinition,
  SkillHandler,
} from "@thinkora/agent-core";

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

export const FileAnalystDefinition: SkillDefinition = {
  id: "file-analyst",
  name: "File Analyst",
  description:
    "Analyzes uploaded file content. Summarizes documents, extracts key " +
    "information, and compares across multiple files.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "User question about the files" },
      retrievedChunks: {
        type: "array",
        description: "Pre-retrieved chunks from file sources",
      },
      fileIds: {
        type: "array",
        items: { type: "string" },
        description: "Specific file IDs to analyze (optional)",
      },
    },
    required: ["query"],
  },
  outputSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      keyFindings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fileName: { type: "string" },
            finding: { type: "string" },
            confidence: { type: "number" },
          },
        },
      },
      comparison: {
        type: "object",
        nullable: true,
        properties: {
          similarities: { type: "array", items: { type: "string" } },
          differences: { type: "array", items: { type: "string" } },
        },
      },
      metadata: {
        type: "object",
        properties: {
          filesAnalyzed: { type: "number" },
          totalChunks: { type: "number" },
        },
      },
    },
  },
  toolDependencies: ["search_files"],
  failureModes: [
    "File content may not be fully parsed (e.g. scanned PDFs without OCR)",
    "Very large files may have incomplete chunk coverage",
    "Comparison across many files may lose nuance",
  ],
  observabilityMetadata: {
    category: "analysis",
    costTier: "low",
    typicalLatencyMs: 1500,
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

interface KeyFinding {
  fileName: string;
  finding: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const FileAnalystHandler: SkillHandler = async (
  input: unknown,
  _context: AgentContext,
): Promise<unknown> => {
  const { query, retrievedChunks = [] } = input as {
    query: string;
    retrievedChunks?: RetrievedChunk[];
  };

  // Filter to file-sourced chunks
  const fileChunks = retrievedChunks.filter(
    (c) =>
      c.source === "files" ||
      c.source === "file" ||
      (!c.source.includes("notion") && !c.source.includes("supabase")),
  );

  if (fileChunks.length === 0) {
    return {
      summary: "No file content was found matching the query.",
      keyFindings: [],
      comparison: null,
      metadata: { filesAnalyzed: 0, totalChunks: 0 },
    };
  }

  // --- Group chunks by file ---
  const byFile = new Map<string, RetrievedChunk[]>();
  for (const chunk of fileChunks) {
    const key = chunk.sourceName;
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key)!.push(chunk);
  }

  // --- Extract key findings per file ---
  const keyFindings: KeyFinding[] = [];
  for (const [fileName, chunks] of byFile) {
    // Take the top-scoring chunk from each file as the key finding
    const sorted = [...chunks].sort(
      (a, b) => b.relevanceScore - a.relevanceScore,
    );
    const topChunk = sorted[0];
    keyFindings.push({
      fileName,
      finding: truncate(topChunk.text, 300),
      confidence: topChunk.relevanceScore,
    });
  }

  keyFindings.sort((a, b) => b.confidence - a.confidence);

  // --- Comparison (if multiple files) ---
  let comparison: { similarities: string[]; differences: string[] } | null = null;
  const fileNames = Array.from(byFile.keys());
  if (fileNames.length > 1) {
    comparison = buildComparison(byFile, query);
  }

  // --- Summary ---
  const summary =
    `Analyzed ${fileNames.length} file(s) with ${fileChunks.length} relevant chunk(s) ` +
    `for query: "${truncate(query, 80)}".\n\n` +
    keyFindings
      .slice(0, 5)
      .map((f, i) => `${i + 1}. **${f.fileName}**: ${truncate(f.finding, 120)}`)
      .join("\n");

  return {
    summary,
    keyFindings,
    comparison,
    metadata: {
      filesAnalyzed: fileNames.length,
      totalChunks: fileChunks.length,
    },
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

/**
 * Naive comparison: look for overlapping keywords between file groups.
 * A production implementation would delegate to an LLM.
 */
function buildComparison(
  byFile: Map<string, RetrievedChunk[]>,
  _query: string,
): { similarities: string[]; differences: string[] } {
  const similarities: string[] = [];
  const differences: string[] = [];

  const fileKeywords = new Map<string, Set<string>>();
  for (const [name, chunks] of byFile) {
    const words = new Set<string>();
    for (const c of chunks) {
      for (const w of c.text.toLowerCase().split(/\W+/)) {
        if (w.length > 4) words.add(w);
      }
    }
    fileKeywords.set(name, words);
  }

  const files = Array.from(fileKeywords.entries());
  if (files.length >= 2) {
    const [nameA, wordsA] = files[0];
    const [nameB, wordsB] = files[1];

    const shared = new Set([...wordsA].filter((w) => wordsB.has(w)));
    const onlyA = new Set([...wordsA].filter((w) => !wordsB.has(w)));
    const onlyB = new Set([...wordsB].filter((w) => !wordsA.has(w)));

    if (shared.size > 0) {
      similarities.push(
        `Both "${nameA}" and "${nameB}" discuss: ${Array.from(shared).slice(0, 10).join(", ")}`,
      );
    }
    if (onlyA.size > 0) {
      differences.push(
        `"${nameA}" uniquely covers: ${Array.from(onlyA).slice(0, 8).join(", ")}`,
      );
    }
    if (onlyB.size > 0) {
      differences.push(
        `"${nameB}" uniquely covers: ${Array.from(onlyB).slice(0, 8).join(", ")}`,
      );
    }
  }

  return { similarities, differences };
}
