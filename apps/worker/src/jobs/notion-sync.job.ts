// ---------------------------------------------------------------------------
// @thinkora/worker — Notion sync job
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  NotionMCPClient,
  mapPageToDocument,
  type NotionConfig,
  type RetrievalDocument,
} from "@thinkora/connectors";
import { chunkText } from "@thinkora/rag-core";
import { indexDocument } from "@thinkora/rag-core";
import { ChunksRepo } from "@thinkora/db";
import { createJobRunner } from "../lib/job-runner.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotionSyncData {
  connectorId: string;
  userId: string;
  config: NotionConfig;
  syncJobId: string;
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

/**
 * Creates the Notion sync job processor.
 *
 * Pipeline:
 * 1. Initialize Notion MCP client
 * 2. Fetch pages from Notion workspace
 * 3. Map each page to a RetrievalDocument
 * 4. Chunk and index each document
 * 5. Update connector sync status
 */
export function createNotionSyncJob(db: SupabaseClient | null) {
  return createJobRunner(
    "notion-sync",
    async (data: Record<string, unknown>) => {
      const input = data as unknown as NotionSyncData;

      if (!db) {
        console.log(
          `[notion-sync] (demo) Would sync connector ${input.connectorId}`
        );
        return { status: "demo", connectorId: input.connectorId };
      }

      // ── 1. Update sync job status ───────────────────────────────
      await db
        .from("connector_sync_jobs")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
        })
        .eq("id", input.syncJobId);

      try {
        // ── 2. Initialize Notion client ─────────────────────────────
        const notionClient = new NotionMCPClient(input.config);

        // ── 3. Fetch pages ──────────────────────────────────────────
        const searchResult = await notionClient.search({
          query: "",
          limit: 100,
        });

        const pages = searchResult.pages;
        const totalPages = pages.length;
        let processedCount = 0;

        // Update total count
        await db
          .from("connector_sync_jobs")
          .update({ documents_total: totalPages })
          .eq("id", input.syncJobId);

        // ── 4. Process each page ────────────────────────────────────
        const chunksRepo = new ChunksRepo(db);

        for (const page of pages) {
          try {
            // Fetch blocks for the page
            const blocks = await notionClient.getBlocks(page.id);

            // Map to retrieval document
            const doc = mapPageToDocument(page, blocks);

            // Create a pseudo parse result for indexDocument
            const parseResult = {
              rawText: doc.content,
              sections: [
                {
                  title: doc.title,
                  content: doc.content,
                  level: 1,
                },
              ],
              tables: [],
              metadata: doc.metadata,
              warnings: [],
              parserConfidence: 0.9,
              unsupportedRegions: [],
            };

            // Create or look up a file record for this Notion page
            const notionFileId = `notion-${page.id}`;

            // Upsert file record
            const { data: fileData } = await db
              .from("files")
              .upsert(
                {
                  id: notionFileId,
                  user_id: input.userId,
                  name: doc.title,
                  mime_type: "text/markdown",
                  status: "processing",
                  metadata: {
                    source: "notion",
                    notionPageId: page.id,
                    lastModified: doc.lastModified,
                  },
                },
                { onConflict: "id" }
              )
              .select()
              .single();

            // Delete old chunks for this page
            await chunksRepo.deleteByFileId(notionFileId);

            // Index the document
            await indexDocument({
              fileId: notionFileId,
              parsedResult: parseResult,
              db: { chunks: chunksRepo },
            });

            // Update file status
            await db
              .from("files")
              .update({
                status: "processed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", notionFileId);

            processedCount++;

            // Update sync progress
            await db
              .from("connector_sync_jobs")
              .update({ documents_processed: processedCount })
              .eq("id", input.syncJobId);
          } catch (pageErr) {
            console.error(
              `[notion-sync] Failed to process page ${page.id}:`,
              pageErr instanceof Error ? pageErr.message : String(pageErr)
            );
            // Continue with remaining pages
          }
        }

        // ── 5. Update connector and sync job status ─────────────────
        await db
          .from("connector_sync_jobs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            documents_processed: processedCount,
          })
          .eq("id", input.syncJobId);

        await db
          .from("connector_accounts")
          .update({
            last_sync: new Date().toISOString(),
            documents_count: processedCount,
            status: "connected",
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.connectorId);

        return {
          connectorId: input.connectorId,
          pagesProcessed: processedCount,
          totalPages,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        // Mark sync job as failed
        await db
          .from("connector_sync_jobs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error: errorMsg,
          })
          .eq("id", input.syncJobId);

        // Update connector status
        await db
          .from("connector_accounts")
          .update({
            status: "error",
            error_message: errorMsg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.connectorId);

        throw err;
      }
    }
  );
}
