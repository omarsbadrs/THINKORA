/**
 * Hybrid search — combines semantic vector search with metadata
 * filtering, merges results, and re-ranks.
 */

import type { ChunksRepo } from "@thinkora/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  semanticSearch,
  type SearchResult,
  type SemanticSearchOptions,
} from "./semantic-search";
import { metadataSearch, type MetadataFilters } from "./metadata-search";
import { deduplicateResults } from "./dedup";
import { rerankResults } from "./rerank";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface HybridSearchOptions extends SemanticSearchOptions {
  /** Metadata filters applied alongside semantic search. */
  metadataFilters?: MetadataFilters;
  /** Weight for semantic results (default 0.7). */
  semanticWeight?: number;
  /** Weight for metadata results (default 0.3). */
  metadataWeight?: number;
  /** Final top-K to return after merging (default same as limit). */
  topK?: number;
}

export interface HybridSearchDeps {
  chunks: Pick<ChunksRepo, "vectorSearch">;
  client: SupabaseClient;
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Merge two result sets, combining scores where the same chunk appears
 * in both.  Results are weighted by their respective weights.
 */
function mergeResults(
  semanticResults: SearchResult[],
  metaResults: SearchResult[],
  semanticWeight: number,
  metadataWeight: number
): SearchResult[] {
  const merged = new Map<string, SearchResult>();

  for (const r of semanticResults) {
    merged.set(r.chunkId, {
      ...r,
      score: r.score * semanticWeight,
    });
  }

  for (const r of metaResults) {
    const existing = merged.get(r.chunkId);
    if (existing) {
      // Chunk appeared in both — combine scores.
      existing.score += r.score * metadataWeight;
    } else {
      merged.set(r.chunkId, {
        ...r,
        score: r.score * metadataWeight,
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.score - a.score);
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Run both semantic and metadata searches, merge results with
 * configurable weighting, de-duplicate, and re-rank.
 */
export async function hybridSearch(
  query: string,
  options: HybridSearchOptions = {},
  db: HybridSearchDeps
): Promise<SearchResult[]> {
  const {
    semanticWeight = 0.7,
    metadataWeight = 0.3,
    metadataFilters,
    topK,
    ...semanticOptions
  } = options;

  // Run both searches in parallel.
  const [semResults, metaResults] = await Promise.all([
    semanticSearch(query, semanticOptions, { chunks: db.chunks }),
    metadataFilters
      ? metadataSearch(metadataFilters, { client: db.client })
      : Promise.resolve([] as SearchResult[]),
  ]);

  // Merge and weight.
  let combined = mergeResults(
    semResults,
    metaResults,
    semanticWeight,
    metadataWeight
  );

  // De-duplicate near-identical chunks.
  combined = deduplicateResults(combined);

  // Re-rank with keyword overlap and diversity signals.
  combined = rerankResults(query, combined, {
    topK: topK ?? options.limit ?? 10,
  });

  return combined;
}
