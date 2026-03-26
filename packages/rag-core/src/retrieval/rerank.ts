/**
 * Result re-ranking — adjusts scores based on keyword overlap,
 * positional diversity, and source diversity.
 */

import type { SearchResult } from "./semantic-search";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface RerankOptions {
  /** Number of results to keep (default 10). */
  topK?: number;
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Tokenise a string into lowercase alphanumeric words.
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 1)
  );
}

/**
 * Fraction of query tokens that appear in the chunk content.
 */
function keywordOverlap(queryTokens: Set<string>, content: string): number {
  if (queryTokens.size === 0) return 0;
  const contentTokens = tokenize(content);
  let hits = 0;
  for (const qt of queryTokens) {
    if (contentTokens.has(qt)) hits++;
  }
  return hits / queryTokens.size;
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Re-rank search results using lightweight heuristics:
 *
 * 1. **Keyword overlap** — boosts chunks that contain query terms.
 * 2. **Position diversity** — penalises clusters of chunks at the
 *    same position (favours spread across the document).
 * 3. **Source diversity** — penalises seeing too many chunks from the
 *    same file so results span multiple sources.
 *
 * Returns the top K results sorted by adjusted score.
 */
export function rerankResults(
  query: string,
  results: SearchResult[],
  options: RerankOptions = {}
): SearchResult[] {
  const { topK = 10 } = options;

  if (results.length === 0) return [];

  const queryTokens = tokenize(query);

  // Track how many results we have already seen per file and per
  // position bucket (groups of 5 positions).
  const fileCount = new Map<string, number>();
  const positionBucket = new Map<number, number>();

  // Score and sort.
  const scored = results
    .map((r) => {
      // Keyword overlap boost (max +0.2).
      const kwBoost = keywordOverlap(queryTokens, r.content) * 0.2;

      // Source diversity penalty.
      const fCount = fileCount.get(r.fileId) ?? 0;
      fileCount.set(r.fileId, fCount + 1);
      const sourcePenalty = fCount * 0.05;

      // Position diversity penalty.
      const bucket = Math.floor(r.position / 5);
      const pCount = positionBucket.get(bucket) ?? 0;
      positionBucket.set(bucket, pCount + 1);
      const positionPenalty = pCount * 0.03;

      const adjustedScore =
        r.score + kwBoost - sourcePenalty - positionPenalty;

      return { ...r, score: Math.max(0, adjustedScore) };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}
