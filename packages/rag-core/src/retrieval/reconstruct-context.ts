/**
 * Context reconstruction — assembles a coherent context string from
 * search results, optionally expanding with adjacent chunks.
 */

import type { SearchResult } from "./semantic-search";
import type { Chunk } from "../chunking/chunk-text";
import { getAdjacentChunks } from "../chunking/adjacency";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface SourceSummary {
  fileId: string;
  fileName: string;
  chunksUsed: number;
  averageScore: number;
}

export interface ReconstructedContext {
  /** The assembled context text ready for the LLM prompt. */
  contextText: string;
  /** Per-source statistics for attribution. */
  sourceSummary: SourceSummary[];
  /** Total estimated tokens in the context text. */
  totalTokens: number;
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Reconstruct a coherent context block from search results.
 *
 * - Groups results by source file.
 * - Within each file, orders chunks by position.
 * - Optionally expands each result with its adjacent chunks for
 *   better coherence (when `allChunks` is provided, keyed by fileId).
 * - Builds per-source attribution summaries.
 */
export function reconstructContext(
  results: SearchResult[],
  allChunks?: Map<string, Chunk[]>
): ReconstructedContext {
  if (results.length === 0) {
    return { contextText: "", sourceSummary: [], totalTokens: 0 };
  }

  // ── Group by file ────────────────────────────────────────────────
  const byFile = new Map<string, SearchResult[]>();

  for (const r of results) {
    const group = byFile.get(r.fileId) ?? [];
    group.push(r);
    byFile.set(r.fileId, group);
  }

  // ── Build context blocks, one per source ─────────────────────────
  const blocks: string[] = [];
  const summaries: SourceSummary[] = [];

  for (const [fileId, fileResults] of byFile) {
    // Sort by position within the file.
    fileResults.sort((a, b) => a.position - b.position);

    const fileName = fileResults[0]?.fileName ?? fileId;

    // Collect content — expand with adjacent chunks if available.
    const seenPositions = new Set<number>();
    const orderedContent: { position: number; content: string }[] = [];

    for (const r of fileResults) {
      if (allChunks && allChunks.has(fileId)) {
        const adjacent = getAdjacentChunks(
          allChunks.get(fileId)!,
          r.position,
          1 // one neighbour each side
        );
        for (const adj of adjacent) {
          if (!seenPositions.has(adj.position)) {
            seenPositions.add(adj.position);
            orderedContent.push({
              position: adj.position,
              content: adj.content,
            });
          }
        }
      } else {
        if (!seenPositions.has(r.position)) {
          seenPositions.add(r.position);
          orderedContent.push({ position: r.position, content: r.content });
        }
      }
    }

    // Sort by position for natural reading order.
    orderedContent.sort((a, b) => a.position - b.position);

    const block = [
      `--- Source: ${fileName} ---`,
      ...orderedContent.map((c) => c.content),
    ].join("\n\n");

    blocks.push(block);

    // Source summary.
    const totalScore = fileResults.reduce((s, r) => s + r.score, 0);
    summaries.push({
      fileId,
      fileName,
      chunksUsed: orderedContent.length,
      averageScore:
        fileResults.length > 0 ? totalScore / fileResults.length : 0,
    });
  }

  const contextText = blocks.join("\n\n");

  return {
    contextText,
    sourceSummary: summaries,
    totalTokens: estimateTokens(contextText),
  };
}
