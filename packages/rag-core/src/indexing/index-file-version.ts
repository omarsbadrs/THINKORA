/**
 * Version-aware document indexing — deletes stale chunks from the
 * previous version and indexes the new one.
 */

import type { ChunksRepo } from "@thinkora/db";
import type { ParseResult } from "@thinkora/parsers";
import { indexDocument, type IndexResult } from "./index-document";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface IndexFileVersionParams {
  /** Thinkora file ID. */
  fileId: string;
  /** New version number being indexed. */
  version: number;
  /** Output of one of the @thinkora/parsers. */
  parsedResult: ParseResult;
  /** Database access — needs bulkCreate and deleteByFileId on chunks. */
  db: {
    chunks: Pick<ChunksRepo, "bulkCreate" | "deleteByFileId">;
  };
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Re-index a file for a new version.
 *
 * Steps:
 * 1. Delete all existing chunks for the file (previous version).
 * 2. Run the standard indexing pipeline on the new parsed content.
 *
 * The `version` is recorded in each chunk's metadata so downstream
 * consumers can verify freshness.
 */
export async function indexFileVersion(
  params: IndexFileVersionParams
): Promise<IndexResult> {
  const { fileId, version, parsedResult, db } = params;

  // ── 1. Remove old chunks ─────────────────────────────────────────
  await db.chunks.deleteByFileId(fileId);

  // ── 2. Inject version into metadata for every section ────────────
  const enrichedResult: ParseResult = {
    ...parsedResult,
    metadata: {
      ...parsedResult.metadata,
      version,
    },
  };

  // ── 3. Index with standard pipeline ──────────────────────────────
  return indexDocument({
    fileId,
    parsedResult: enrichedResult,
    db,
  });
}
