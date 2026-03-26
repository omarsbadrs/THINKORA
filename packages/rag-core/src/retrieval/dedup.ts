/**
 * Deduplication — removes near-duplicate search results using Jaccard
 * similarity on token sets.
 */

import type { SearchResult } from "./semantic-search";

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Tokenise content into a set of lowercase alphanumeric words.
 */
function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 1)
  );
}

/**
 * Jaccard similarity between two sets: |A ∩ B| / |A ∪ B|.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Remove near-duplicate results.
 *
 * Results whose content has a Jaccard token-set similarity above
 * `threshold` (default 0.85) to an already-accepted result are
 * discarded.  The first (highest-scored) occurrence is kept.
 *
 * @param results   Ordered search results (highest score first).
 * @param threshold Jaccard similarity above which a result is
 *                  considered a duplicate (default 0.85).
 */
export function deduplicateResults(
  results: SearchResult[],
  threshold = 0.85
): SearchResult[] {
  if (results.length <= 1) return results;

  const kept: SearchResult[] = [];
  const keptTokenSets: Set<string>[] = [];

  for (const result of results) {
    const tokens = tokenSet(result.content);

    const isDuplicate = keptTokenSets.some(
      (existing) => jaccardSimilarity(tokens, existing) >= threshold
    );

    if (!isDuplicate) {
      kept.push(result);
      keptTokenSets.push(tokens);
    }
  }

  return kept;
}
