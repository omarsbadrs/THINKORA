/**
 * Chunks repository — vector search and CRUD for document chunks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChunkRow, ChunkInsert } from "../schema";

export interface VectorSearchParams {
  /** The query embedding vector (1536 dimensions) */
  embedding: number[];
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum cosine similarity threshold (0-1) */
  threshold?: number;
  /** Optional file IDs to restrict search to */
  fileIds?: string[];
}

export interface VectorSearchResult extends ChunkRow {
  similarity: number;
}

export class ChunksRepo {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Perform vector similarity search against chunk embeddings.
   *
   * Uses the pgvector `<=>` cosine distance operator via an RPC function.
   * Falls back to a direct query if the RPC is not available.
   */
  async vectorSearch(
    params: VectorSearchParams
  ): Promise<VectorSearchResult[]> {
    const { embedding, limit = 10, threshold = 0.7, fileIds } = params;

    // Try RPC approach first (requires a stored function `match_chunks`)
    const { data, error } = await this.client.rpc("match_chunks", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
      filter_file_ids: fileIds ?? null,
    });

    if (error) {
      // If the RPC function doesn't exist, fall back to a raw query approach.
      // This uses PostgREST's limited vector support — for production, create
      // the `match_chunks` function in a migration.
      console.warn(
        "[@thinkora/db] match_chunks RPC not found, using fallback query. " +
          "Consider creating the RPC function for better performance.",
        error.message
      );

      return this.vectorSearchFallback(params);
    }

    return (data ?? []) as VectorSearchResult[];
  }

  /**
   * Fallback vector search: fetches chunks with embeddings and computes
   * similarity in-memory. Only suitable for small datasets.
   */
  private async vectorSearchFallback(
    params: VectorSearchParams
  ): Promise<VectorSearchResult[]> {
    const { embedding, limit = 10, threshold = 0.7, fileIds } = params;

    let query = this.client
      .from("chunks")
      .select("*")
      .not("embedding", "is", null);

    if (fileIds && fileIds.length > 0) {
      query = query.in("file_id", fileIds);
    }

    const { data, error } = await query.limit(500);

    if (error) throw error;

    const chunks = (data ?? []) as ChunkRow[];

    // Compute cosine similarity in-memory
    const results: VectorSearchResult[] = chunks
      .map((chunk) => {
        const sim = cosineSimilarity(embedding, chunk.embedding ?? []);
        return { ...chunk, similarity: sim };
      })
      .filter((r) => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  }

  /**
   * Create a single chunk.
   */
  async create(input: ChunkInsert): Promise<ChunkRow> {
    const { data, error } = await this.client
      .from("chunks")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as ChunkRow;
  }

  /**
   * Bulk-create chunks (e.g., after processing a file).
   */
  async bulkCreate(inputs: ChunkInsert[]): Promise<ChunkRow[]> {
    if (inputs.length === 0) return [];

    const { data, error } = await this.client
      .from("chunks")
      .insert(inputs)
      .select();

    if (error) throw error;
    return (data ?? []) as ChunkRow[];
  }

  /**
   * Get all chunks for a given file, ordered by position.
   */
  async getByFileId(fileId: string): Promise<ChunkRow[]> {
    const { data, error } = await this.client
      .from("chunks")
      .select("*")
      .eq("file_id", fileId)
      .order("position", { ascending: true });

    if (error) throw error;
    return (data ?? []) as ChunkRow[];
  }

  /**
   * Delete all chunks for a given file.
   */
  async deleteByFileId(fileId: string): Promise<void> {
    const { error } = await this.client
      .from("chunks")
      .delete()
      .eq("file_id", fileId);

    if (error) throw error;
  }
}

// ============================================================
// Helper: cosine similarity
// ============================================================

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
