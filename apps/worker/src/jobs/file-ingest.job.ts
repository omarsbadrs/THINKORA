// ---------------------------------------------------------------------------
// @thinkora/worker — File ingestion job
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import { detectFileType, getParser, normalizeParseResult } from "@thinkora/parsers";
import { indexDocument } from "@thinkora/rag-core";
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

export interface FileIngestData {
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
 * Creates the file ingestion job processor.
 *
 * Pipeline:
 * 1. Download file from storage
 * 2. Detect file type
 * 3. Parse with appropriate parser
 * 4. Normalize result
 * 5. Persist parsed artifacts
 * 6. Chunk text and tables
 * 7. Embed chunks
 * 8. Index in database
 * 9. Update file status to "processed"
 */
export function createFileIngestJob(db: SupabaseClient | null) {
  return createJobRunner(
    "file-ingest",
    async (data: Record<string, unknown>) => {
      const input = data as unknown as FileIngestData;

      if (!db) {
        console.log(
          `[file-ingest] (demo) Would process file ${input.fileId} (${input.fileName})`
        );
        return { status: "demo", fileId: input.fileId };
      }

      // ── 1. Update status to running ──────────────────────────────
      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "downloading",
        progress: 0,
      });

      // ── 2. Download file from Supabase storage ───────────────────
      const { data: fileBlob, error: downloadError } = await db.storage
        .from("uploads")
        .download(input.storageKey);

      if (downloadError || !fileBlob) {
        await updateJobStatus(db, input.jobId, JobStatus.Failed, {
          stage: "downloading",
          error: downloadError?.message ?? "File not found in storage",
        });
        await updateFileStatus(db, input.fileId, "failed");
        throw new Error(
          `Failed to download file: ${downloadError?.message ?? "Not found"}`
        );
      }

      const buffer = Buffer.from(await fileBlob.arrayBuffer());

      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "detecting",
        progress: 10,
      });

      // ── 3. Detect file type ──────────────────────────────────────
      const fileType = detectFileType(input.fileName, input.mimeType);

      if (fileType === "unknown") {
        await updateJobStatus(db, input.jobId, JobStatus.Failed, {
          stage: "detecting",
          error: `Unsupported file type for "${input.fileName}"`,
        });
        await updateFileStatus(db, input.fileId, "failed");
        throw Object.assign(
          new Error(`Unsupported file type: ${input.fileName}`),
          { code: "UNSUPPORTED_FORMAT" }
        );
      }

      // ── 4. Parse ─────────────────────────────────────────────────
      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "parsing",
        progress: 20,
      });

      const parser = getParser(fileType);
      const parseResult = await parser.parse(buffer, input.fileName);

      // ── 5. Normalize ─────────────────────────────────────────────
      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "normalizing",
        progress: 40,
      });

      const normalized = normalizeParseResult(parseResult);

      // ── 6. Persist parsed artifacts ──────────────────────────────
      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "storing_artifacts",
        progress: 50,
      });

      // Store the full text as a parsed artifact
      await db.from("parsed_artifacts").insert({
        file_id: input.fileId,
        artifact_type: "full_text",
        content: normalized.text,
        metadata: {
          wordCount: normalized.wordCount,
          sectionCount: normalized.sectionCount,
          tableCount: normalized.tableCount,
          confidence: normalized.confidence,
          pageCount: normalized.pageCount,
          warnings: normalized.warnings,
        },
      });

      // Store each section as an artifact
      for (const section of normalized.sections) {
        await db.from("parsed_artifacts").insert({
          file_id: input.fileId,
          artifact_type: "section",
          content: section.content,
          metadata: { title: section.title, level: section.level },
          section_title: section.title,
        });
      }

      // ── 7. Chunk, embed, and index ─────────────────────────────
      // indexDocument handles chunking, embedding, and DB persistence
      // as a single pipeline step.
      await updateJobStatus(db, input.jobId, JobStatus.Running, {
        stage: "indexing",
        progress: 65,
      });

      const chunksRepo = new ChunksRepo(db);

      const indexResult = await indexDocument({
        fileId: input.fileId,
        parsedResult: parseResult,
        db: { chunks: chunksRepo },
      });

      // ── 8. Mark as processed ─────────────────────────────────────
      await updateJobStatus(db, input.jobId, JobStatus.Completed, {
        stage: "completed",
        progress: 100,
        metadata: {
          chunksCreated: indexResult.chunksCreated,
          tokensUsed: indexResult.tokensUsed,
          indexDuration: indexResult.duration,
        },
      });

      await updateFileStatus(db, input.fileId, "processed");

      return {
        fileId: input.fileId,
        chunksCreated: indexResult.chunksCreated,
        tokensUsed: indexResult.tokensUsed,
      };
    }
  );
}
