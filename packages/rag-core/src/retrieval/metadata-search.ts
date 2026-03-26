/**
 * Metadata-based search — filters chunks by file metadata without
 * generating an embedding.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchResult } from "./semantic-search";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface MetadataFilters {
  /** Filter by MIME type or general file type (e.g. "pdf", "docx"). */
  fileType?: string;
  /** Created/updated date range. */
  dateRange?: { from?: string; to?: string };
  /** Tags to match (any). */
  tags?: string[];
  /** Substring match on file name. */
  fileName?: string;
}

export interface MetadataSearchDeps {
  client: SupabaseClient;
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Search chunks purely by file/chunk metadata.
 *
 * Joins `chunks` with `files` to apply filters on file-level fields
 * such as name and MIME type.
 */
export async function metadataSearch(
  filters: MetadataFilters,
  db: MetadataSearchDeps
): Promise<SearchResult[]> {
  // We query files first, then fetch their chunks.
  let fileQuery = db.client
    .from("files")
    .select("id, name, mime_type, metadata, created_at");

  if (filters.fileType) {
    fileQuery = fileQuery.ilike("mime_type", `%${filters.fileType}%`);
  }

  if (filters.fileName) {
    fileQuery = fileQuery.ilike("name", `%${filters.fileName}%`);
  }

  if (filters.dateRange?.from) {
    fileQuery = fileQuery.gte("created_at", filters.dateRange.from);
  }

  if (filters.dateRange?.to) {
    fileQuery = fileQuery.lte("created_at", filters.dateRange.to);
  }

  const { data: files, error: fileError } = await fileQuery;
  if (fileError) throw fileError;
  if (!files || files.length === 0) return [];

  // Optionally filter by tags stored in file metadata.
  let matchedFiles = files;
  if (filters.tags && filters.tags.length > 0) {
    const tagSet = new Set(filters.tags.map((t) => t.toLowerCase()));
    matchedFiles = files.filter((f) => {
      const meta = (f.metadata ?? {}) as Record<string, unknown>;
      const fileTags = (meta.tags ?? []) as string[];
      return fileTags.some((t) => tagSet.has(t.toLowerCase()));
    });
  }

  if (matchedFiles.length === 0) return [];

  const fileIds = matchedFiles.map((f) => f.id as string);
  const fileMap = new Map(
    matchedFiles.map((f) => [f.id as string, f])
  );

  // Fetch chunks for matched files.
  const { data: chunks, error: chunkError } = await db.client
    .from("chunks")
    .select("*")
    .in("file_id", fileIds)
    .order("position", { ascending: true })
    .limit(200);

  if (chunkError) throw chunkError;
  if (!chunks) return [];

  return chunks.map((c) => {
    const file = fileMap.get(c.file_id as string);
    return {
      chunkId: c.id as string,
      content: c.content as string,
      score: 1, // metadata matches are unscored; weight handled in hybrid
      fileId: c.file_id as string,
      fileName: (file?.name ?? "") as string,
      metadata: (c.metadata ?? {}) as Record<string, unknown>,
      position: c.position as number,
    };
  });
}
