/**
 * Semantic search — embeds a query and retrieves the most relevant
 * chunks via vector similarity.
 */

import type { ChunksRepo, VectorSearchResult } from "@thinkora/db";
import { embedText } from "../embeddings/embed";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  chunkId: string;
  content: string;
  score: number;
  fileId: string;
  fileName: string;
  metadata: Record<string, unknown>;
  position: number;
}

export interface SemanticSearchOptions {
  /** Maximum results to return (default 10). */
  limit?: number;
  /** Minimum similarity threshold 0-1 (default 0.7). */
  threshold?: number;
  /** Restrict to specific file IDs. */
  fileIds?: string[];
  /** Restrict to specific source types (checked in metadata). */
  sourceTypes?: string[];
}

export interface SemanticSearchDeps {
  chunks: Pick<ChunksRepo, "vectorSearch">;
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Perform semantic search: embed the query then retrieve the closest
 * chunks from the vector store.
 */
export async function semanticSearch(
  query: string,
  options: SemanticSearchOptions = {},
  db: SemanticSearchDeps
): Promise<SearchResult[]> {
  const {
    limit = 10,
    threshold = 0.7,
    fileIds,
    sourceTypes,
  } = options;

  // ── 1. Embed query ───────────────────────────────────────────────
  const queryEmbedding = await embedText(query);

  // ── 2. Vector search ─────────────────────────────────────────────
  const raw: VectorSearchResult[] = await db.chunks.vectorSearch({
    embedding: queryEmbedding,
    limit,
    threshold,
    fileIds,
  });

  // ── 3. Map to SearchResult ───────────────────────────────────────
  let results: SearchResult[] = raw.map((r) => ({
    chunkId: r.id,
    content: r.content,
    score: r.similarity,
    fileId: r.file_id,
    fileName:
      (r.metadata as Record<string, unknown>)?.fileName as string ?? "",
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    position: r.position,
  }));

  // ── 4. Optional source type filter ───────────────────────────────
  if (sourceTypes && sourceTypes.length > 0) {
    const allowed = new Set(sourceTypes);
    results = results.filter((r) => {
      const type = r.metadata.sourceType as string | undefined;
      return type != null && allowed.has(type);
    });
  }

  return results;
}
