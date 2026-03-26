/**
 * Citation building — maps segments of an LLM answer back to the
 * source chunks that support them.
 */

import type { SearchResult } from "../retrieval/semantic-search";
import type { Citation } from "./types";

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Tokenise text into lowercase words for overlap comparison.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
}

/**
 * Compute the fraction of `subset` tokens that appear in `superset`.
 */
function tokenOverlap(subset: string[], superset: Set<string>): number {
  if (subset.length === 0) return 0;
  let hits = 0;
  for (const t of subset) {
    if (superset.has(t)) hits++;
  }
  return hits / subset.length;
}

/**
 * Split an answer into meaningful segments (sentences or short
 * paragraphs) for per-segment citation matching.
 */
function splitAnswer(answer: string): string[] {
  // Split on sentence-ending punctuation or newlines.
  return answer
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Build citations linking answer text back to source chunks.
 *
 * Strategy:
 * 1. Split the answer into sentence-level segments.
 * 2. For each source chunk, check token overlap with each segment.
 * 3. If overlap exceeds a threshold, create a citation.
 * 4. Deduplicate by sourceId and return sorted by relevance.
 */
export function buildCitations(
  answer: string,
  sources: SearchResult[]
): Citation[] {
  if (!answer || sources.length === 0) return [];

  const segments = splitAnswer(answer);
  const citationMap = new Map<string, Citation>();

  for (const source of sources) {
    const sourceTokens = new Set(tokenize(source.content));

    let bestOverlap = 0;
    let bestText = "";

    for (const segment of segments) {
      const segTokens = tokenize(segment);
      const overlap = tokenOverlap(segTokens, sourceTokens);

      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestText = segment;
      }
    }

    // Only cite if there is meaningful overlap.
    const OVERLAP_THRESHOLD = 0.15;
    if (bestOverlap < OVERLAP_THRESHOLD) continue;

    const existing = citationMap.get(source.fileId);

    // Keep the citation with the highest relevance per source file.
    if (!existing || bestOverlap > existing.relevanceScore) {
      const meta = source.metadata ?? {};

      citationMap.set(source.fileId, {
        sourceId: source.fileId,
        sourceName: source.fileName || "Unknown",
        sourceType: (meta.sourceType as string) ?? "document",
        text: bestText,
        relevanceScore: Math.round(bestOverlap * 1000) / 1000,
        ...(meta.pageNumber != null && {
          pageNumber: meta.pageNumber as number,
        }),
        ...(meta.sectionTitle != null && {
          sectionTitle: meta.sectionTitle as string,
        }),
      });
    }
  }

  return Array.from(citationMap.values()).sort(
    (a, b) => b.relevanceScore - a.relevanceScore
  );
}
