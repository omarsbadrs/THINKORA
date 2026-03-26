// ---------------------------------------------------------------------------
// @thinkora/worker — Reprocess file job
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import { ChunksRepo } from "@thinkora/db";
import { createJobRunner } from "../lib/job-runner.js";
import {
  updateJobStatus,
  updateFileStatus,
  JobStatus,
} from "../lib/job-status.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReprocessFileData {
  fileId: string;
  jobId: string;
  userId: string;
  fileName: string;
  mimeType?: string;
  storageKey: string;
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

/**
 * Creates the reprocess-file job processor.
 *
 * Pipeline:
 * 1. Delete existing chunks for the file
 * 2. Delete existing parsed artifacts
 * 3. Re-run the full ingestion pipeline (delegates to the file-ingest logic)
 */
export function createReprocessFileJob(
  db: SupabaseClient | null,
  ingestProcessor: (data: Record<string, unknown>) => Promise<unknown>
) {
  return createJobRunner(
    "reprocess-file",
    async (data: Record<string, unknown>) => {
      const input = data as unknown as ReprocessFileData;

      if (!db) {
        console.log(
          `[reprocess-file] (demo) Would reprocess file ${input.fileId}`
        );
        return { status: "demo", fileId: input.fileId };
      }

      // ── 1. Mark as processing ────────────────────────────────────
      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "cleaning",
        progress: 0,
      });

      await updateFileStatus(db, input.fileId, "processing");

      // ── 2. Delete existing chunks ────────────────────────────────
      const chunksRepo = new ChunksRepo(db);
      await chunksRepo.deleteByFileId(input.fileId);

      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "cleaning",
        progress: 10,
      });

      // ── 3. Delete existing parsed artifacts ──────────────────────
      await db
        .from("parsed_artifacts")
        .delete()
        .eq("file_id", input.fileId);

      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "re-ingesting",
        progress: 20,
      });

      // ── 4. Re-run full ingestion pipeline ────────────────────────
      // Delegate to the ingest processor which handles downloading,
      // parsing, chunking, embedding, and indexing.
      const result = await ingestProcessor({
        fileId: input.fileId,
        jobId: input.jobId,
        userId: input.userId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        storageKey: input.storageKey,
      });

      return result;
    }
  );
}
