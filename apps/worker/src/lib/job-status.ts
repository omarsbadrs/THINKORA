// ---------------------------------------------------------------------------
// @thinkora/worker — Job status management
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Possible states for a background job. */
export enum JobStatus {
  Pending = "pending",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
  Retrying = "retrying",
}

/** Optional details attached to a status update. */
export interface JobStatusDetails {
  /** Current processing stage (e.g. "parsing", "embedding"). */
  stage?: string;
  /** Progress percentage 0-100. */
  progress?: number;
  /** Error message when status is Failed. */
  error?: string;
  /** Retry count. */
  retryCount?: number;
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Updates the status of a file processing job in the database.
 *
 * If the database client is null (demo mode), the update is logged to
 * the console instead.
 */
export async function updateJobStatus(
  db: SupabaseClient | null,
  jobId: string,
  status: JobStatus,
  details?: JobStatusDetails
): Promise<void> {
  if (!db) {
    console.log(
      `[job-status] (demo) ${jobId}: ${status}`,
      details ? JSON.stringify(details) : ""
    );
    return;
  }

  const updates: Record<string, unknown> = {
    status,
  };

  if (details?.stage !== undefined) {
    updates.stage = details.stage;
  }
  if (details?.progress !== undefined) {
    updates.progress = details.progress;
  }
  if (details?.error !== undefined) {
    updates.error = details.error;
  }
  if (details?.retryCount !== undefined) {
    updates.retry_count = details.retryCount;
  }

  // Set timestamps based on status transitions
  if (status === JobStatus.Running) {
    updates.started_at = new Date().toISOString();
  }
  if (status === JobStatus.Completed || status === JobStatus.Failed) {
    updates.completed_at = new Date().toISOString();
  }

  try {
    const { error } = await db
      .from("file_processing_jobs")
      .update(updates)
      .eq("id", jobId);

    if (error) {
      console.error(
        `[job-status] Failed to update job ${jobId} to ${status}:`,
        error.message
      );
    }
  } catch (err) {
    console.error(
      `[job-status] Exception updating job ${jobId}:`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Updates the status of the parent file record.
 * Typically called when processing finishes or fails.
 */
export async function updateFileStatus(
  db: SupabaseClient | null,
  fileId: string,
  status: string
): Promise<void> {
  if (!db) {
    console.log(`[job-status] (demo) file ${fileId}: ${status}`);
    return;
  }

  try {
    const { error } = await db
      .from("files")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", fileId);

    if (error) {
      console.error(
        `[job-status] Failed to update file ${fileId} status:`,
        error.message
      );
    }
  } catch (err) {
    console.error(
      `[job-status] Exception updating file ${fileId}:`,
      err instanceof Error ? err.message : String(err)
    );
  }
}
