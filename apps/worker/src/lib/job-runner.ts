// ---------------------------------------------------------------------------
// @thinkora/worker — Job runner utilities
// ---------------------------------------------------------------------------

import {
  type RetryPolicy,
  DEFAULT_RETRY_POLICY,
  getRetryDelay,
  shouldRetry,
} from "./retry-policy.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Data shape for a job in the queue. */
export interface JobPayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
  attempt?: number;
}

/** Result returned by a job processor. */
export interface JobResult {
  success: boolean;
  duration: number;
  output?: unknown;
  error?: string;
}

/** A function that processes a single job. */
export type JobProcessor = (job: JobPayload) => Promise<JobResult>;

/** Handler registered with the job runner. */
export interface RegisteredProcessor {
  type: string;
  processor: JobProcessor;
  retryPolicy: RetryPolicy;
}

// ---------------------------------------------------------------------------
// In-memory queue (demo mode / no Redis)
// ---------------------------------------------------------------------------

/** A simple in-memory queue for demo and testing environments. */
export class InMemoryQueue {
  private readonly queue: JobPayload[] = [];
  private readonly processors = new Map<string, RegisteredProcessor>();
  private processing = false;
  private _closed = false;

  /** Register a processor for a job type. */
  register(
    type: string,
    processor: JobProcessor,
    retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY
  ): void {
    this.processors.set(type, { type, processor, retryPolicy });
  }

  /** Enqueue a job for processing. */
  async add(job: JobPayload): Promise<void> {
    if (this._closed) {
      throw new Error("Queue is closed");
    }
    this.queue.push({ ...job, attempt: job.attempt ?? 0 });
    // Process on next tick if not already running
    if (!this.processing) {
      this.processNext();
    }
  }

  /** Process jobs until the queue is empty. */
  private async processNext(): Promise<void> {
    if (this._closed) return;
    this.processing = true;

    while (this.queue.length > 0 && !this._closed) {
      const job = this.queue.shift()!;
      const registered = this.processors.get(job.type);

      if (!registered) {
        console.error(
          `[InMemoryQueue] No processor registered for job type "${job.type}"`
        );
        continue;
      }

      const startTime = Date.now();
      try {
        const result = await registered.processor(job);
        const duration = Date.now() - startTime;
        console.log(
          `[InMemoryQueue] Job ${job.id} (${job.type}) completed in ${duration}ms`,
          result.success ? "OK" : "FAILED"
        );

        if (!result.success && shouldRetry(null, job.attempt ?? 0, registered.retryPolicy.maxRetries)) {
          const nextAttempt = (job.attempt ?? 0) + 1;
          const delay = getRetryDelay(nextAttempt, registered.retryPolicy);
          console.log(
            `[InMemoryQueue] Retrying job ${job.id} (attempt ${nextAttempt}) in ${delay}ms`
          );
          setTimeout(() => {
            this.add({ ...job, attempt: nextAttempt }).catch(() => {});
          }, delay);
        }
      } catch (err) {
        const duration = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `[InMemoryQueue] Job ${job.id} (${job.type}) threw after ${duration}ms:`,
          errorMsg
        );

        if (shouldRetry(err, job.attempt ?? 0, registered.retryPolicy.maxRetries)) {
          const nextAttempt = (job.attempt ?? 0) + 1;
          const delay = getRetryDelay(nextAttempt, registered.retryPolicy);
          setTimeout(() => {
            this.add({ ...job, attempt: nextAttempt }).catch(() => {});
          }, delay);
        }
      }
    }

    this.processing = false;
  }

  /** Number of jobs currently waiting in the queue. */
  get size(): number {
    return this.queue.length;
  }

  /** Gracefully close the queue (no new jobs accepted). */
  close(): void {
    this._closed = true;
  }

  get closed(): boolean {
    return this._closed;
  }
}

// ---------------------------------------------------------------------------
// Job runner factory
// ---------------------------------------------------------------------------

/**
 * Creates a wrapped job processor that adds:
 * - Timing / duration measurement
 * - Structured logging
 * - Error catching and normalization
 *
 * The returned processor can be registered with BullMQ or InMemoryQueue.
 */
export function createJobRunner(
  jobType: string,
  processor: (data: Record<string, unknown>) => Promise<unknown>
): JobProcessor {
  return async (job: JobPayload): Promise<JobResult> => {
    const start = Date.now();
    console.log(`[job-runner] Starting ${jobType} job ${job.id}`);

    try {
      const output = await processor(job.data);
      const duration = Date.now() - start;

      console.log(
        `[job-runner] Completed ${jobType} job ${job.id} in ${duration}ms`
      );

      return { success: true, duration, output };
    } catch (err) {
      const duration = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);

      console.error(
        `[job-runner] Failed ${jobType} job ${job.id} after ${duration}ms:`,
        errorMsg
      );

      return { success: false, duration, error: errorMsg };
    }
  };
}
