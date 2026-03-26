/**
 * Document indexing pipeline — takes a parsed file, chunks it, embeds
 * the chunks, and persists them to the database.
 */

import type { ChunksRepo } from "@thinkora/db";
import type { ParseResult, TableData } from "@thinkora/parsers";
import { chunkText, type Chunk } from "../chunking/chunk-text";
import { chunkTable } from "../chunking/chunk-tables";
import { batchEmbed } from "../embeddings/batch-embed";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface IndexDocumentParams {
  /** Thinkora file ID. */
  fileId: string;
  /** Output of one of the @thinkora/parsers. */
  parsedResult: ParseResult;
  /** Database access — only the chunks repository is required. */
  db: {
    chunks: Pick<ChunksRepo, "bulkCreate">;
  };
}

export interface IndexResult {
  /** Number of chunks created and stored. */
  chunksCreated: number;
  /** Total estimated tokens across all chunks. */
  tokensUsed: number;
  /** Wall-clock milliseconds elapsed. */
  duration: number;
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Full indexing pipeline for a single document.
 *
 * 1. Chunk the raw text (paragraph/sentence splitting).
 * 2. Chunk any tables found by the parser.
 * 3. Embed all chunks in batch.
 * 4. Persist to the database.
 */
export async function indexDocument(
  params: IndexDocumentParams
): Promise<IndexResult> {
  const start = Date.now();
  const { fileId, parsedResult, db } = params;

  // ── 1. Build chunks ──────────────────────────────────────────────
  const textChunks = chunkText(parsedResult.rawText);

  const tableChunks: Chunk[] = [];
  for (const table of parsedResult.tables) {
    const tChunks = chunkTable(table as TableData);
    // Offset positions so they don't collide with text chunks.
    for (const tc of tChunks) {
      tableChunks.push({
        ...tc,
        position: textChunks.length + tableChunks.length,
      });
    }
  }

  const allChunks = [...textChunks, ...tableChunks];

  if (allChunks.length === 0) {
    return { chunksCreated: 0, tokensUsed: 0, duration: Date.now() - start };
  }

  // ── 2. Embed ─────────────────────────────────────────────────────
  const texts = allChunks.map((c) => c.content);
  const embeddings = await batchEmbed(texts);

  // ── 3. Persist ───────────────────────────────────────────────────
  const inserts = allChunks.map((chunk, i) => ({
    file_id: fileId,
    content: chunk.content,
    embedding: embeddings[i],
    position: chunk.position,
    token_count: chunk.tokenCount,
    metadata: chunk.metadata as Record<string, unknown>,
  }));

  await db.chunks.bulkCreate(inserts);

  // ── 4. Result ────────────────────────────────────────────────────
  const tokensUsed = allChunks.reduce((sum, c) => sum + c.tokenCount, 0);

  return {
    chunksCreated: allChunks.length,
    tokensUsed,
    duration: Date.now() - start,
  };
}
