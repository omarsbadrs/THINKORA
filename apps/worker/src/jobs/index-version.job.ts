// ---------------------------------------------------------------------------
// @thinkora/worker — Version indexing job
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import { detectFileType, getParser, normalizeParseResult } from "@thinkora/parsers";
import { indexFileVersion } from "@thinkora/rag-core";
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

export interface IndexVersionData {
  fileId: string;
  jobId: string;
  userId: string;
  fileName: string;
  mimeType?: string;
  storageKey: string;
  version: number;
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

/**
 * Creates the version indexing job processor.
 *
 * Pipeline:
 * 1. Download the new file version from storage
 * 2. Parse the file
 * 3. Clean up old version chunks (handled by indexFileVersion)
 * 4. Index the new version
 * 5. Update file record with new version
 */
export function createIndexVersionJob(db: SupabaseClient | null) {
  return createJobRunner(
    "index-version",
    async (data: Record<string, unknown>) => {
      const input = data as unknown as IndexVersionData;

      if (!db) {
        console.log(
          `[index-version] (demo) Would index version ${input.version} of file ${input.fileId}`
        );
        return { status: "demo", fileId: input.fileId, version: input.version };
      }

      // ── 1. Update status ─────────────────────────────────────────
      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "downloading",
        progress: 0,
      });

      await updateFileStatus(db, input.fileId, "processing");

      // ── 2. Download file from storage ────────────────────────────
      const { data: fileBlob, error: downloadError } = await db.storage
        .from("uploads")
        .download(input.storageKey);

      if (downloadError || !fileBlob) {
        const errorMsg = downloadError?.message ?? "File version not found";
        await updateJobStatus(db, input.jobId, JobStatus.Failed, {
          stage: "downloading",
          error: errorMsg,
        });
        await updateFileStatus(db, input.fileId, "failed");
        throw new Error(`Failed to download file version: ${errorMsg}`);
      }

      const buffer = Buffer.from(await fileBlob.arrayBuffer());

      // ── 3. Detect and parse ──────────────────────────────────────
      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "parsing",
        progress: 20,
      });

      const fileType = detectFileType(input.fileName, input.mimeType);
      if (fileType === "unknown") {
        await updateJobStatus(db, input.jobId, JobStatus.Failed, {
          stage: "parsing",
          error: `Unsupported file type: ${input.fileName}`,
        });
        await updateFileStatus(db, input.fileId, "failed");
        throw Object.assign(
          new Error(`Unsupported file type: ${input.fileName}`),
          { code: "UNSUPPORTED_FORMAT" }
        );
      }

      const parser = getParser(fileType);
      const parseResult = await parser.parse(buffer, input.fileName);

      // ── 4. Index new version (deletes old chunks internally) ─────
      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "indexing",
        progress: 50,
      });

      const chunksRepo = new ChunksRepo(db);
      const indexResult = await indexFileVersion({
        fileId: input.fileId,
        version: input.version,
        parsedResult: parseResult,
        db: { chunks: chunksRepo },
      });

      // ── 5. Update file record ────────────────────────────────────
      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "finalizing",
        progress: 90,
      });

      await db
        .from("files")
        .update({
          version: input.version,
          status: "processed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.fileId);

      // Re-generate parsed artifacts for the new version
      const normalized = normalizeParseResult(parseResult);

      // Delete old artifacts
      await db
        .from("parsed_artifacts")
        .delete()
        .eq("file_id", input.fileId);

      // Store new full text artifact
      await db.from("parsed_artifacts").insert({
        file_id: input.fileId,
        artifact_type: "full_text",
        content: normalized.text,
        metadata: {
          version: input.version,
          wordCount: normalized.wordCount,
          sectionCount: normalized.sectionCount,
          tableCount: normalized.tableCount,
          confidence: normalized.confidence,
        },
      });

      await updateJobStatus(db, input.jobId, JobStatus.Completed, {
        stage: "completed",
        progress: 100,
        metadata: {
          version: input.version,
          chunksCreated: indexResult.chunksCreated,
          tokensUsed: indexResult.tokensUsed,
        },
      });

      return {
        fileId: input.fileId,
        version: input.version,
        chunksCreated: indexResult.chunksCreated,
        tokensUsed: indexResult.tokensUsed,
      };
    }
  );
}
