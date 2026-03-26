// ---------------------------------------------------------------------------
// @thinkora/worker — Main worker entry point
// ---------------------------------------------------------------------------

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServerClient, isDemoMode } from "@thinkora/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { InMemoryQueue, type JobPayload, type RegisteredProcessor } from "./lib/job-runner.js";
import { DEFAULT_RETRY_POLICY } from "./lib/retry-policy.js";

// Job factories
import { createFileIngestJob } from "./jobs/file-ingest.job.js";
import { createReprocessFileJob } from "./jobs/reprocess-file.job.js";
import { createNotionSyncJob } from "./jobs/notion-sync.job.js";
import { createConnectorHealthJob } from "./jobs/connector-health.job.js";
import { createGenerateSummaryJob } from "./jobs/generate-summary.job.js";
import { createIndexVersionJob } from "./jobs/index-version.job.js";
import { createModelSyncJob } from "./jobs/model-sync.job.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HEALTH_PORT = parseInt(process.env.WORKER_HEALTH_PORT ?? "4100", 10);
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const WORKER_CONCURRENCY = parseInt(
  process.env.WORKER_CONCURRENCY ?? "5",
  10
);

// ---------------------------------------------------------------------------
// Worker bootstrap
// ---------------------------------------------------------------------------

interface WorkerContext {
  db: SupabaseClient | null;
  queue: InMemoryQueue | BullMQAdapter;
  healthServer: ReturnType<typeof createServer>;
}

/**
 * BullMQ adapter that wraps the real BullMQ Worker+Queue when Redis is
 * available. Falls back to InMemoryQueue for demo mode.
 */
class BullMQAdapter {
  private worker: unknown = null;
  private bullQueue: unknown = null;
  private processors = new Map<string, RegisteredProcessor["processor"]>();
  private _closed = false;

  async init(redisUrl: string, concurrency: number): Promise<void> {
    try {
      // Dynamic import so the worker still boots when bullmq isn't installed
      const { Worker, Queue } = await import("bullmq");
      const IORedis = (await import("ioredis")).default;

      const connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      this.bullQueue = new Queue("thinkora-jobs", { connection });

      this.worker = new Worker(
        "thinkora-jobs",
        async (job: { name: string; id?: string; data: Record<string, unknown>; attemptsMade: number }) => {
          const processor = this.processors.get(job.name);
          if (!processor) {
            throw new Error(`No processor for job type "${job.name}"`);
          }

          const payload: JobPayload = {
            id: job.id ?? "",
            type: job.name,
            data: job.data,
            attempt: job.attemptsMade,
          };

          const result = await processor(payload);
          if (!result.success) {
            throw new Error(result.error ?? "Job failed");
          }
          return result;
        },
        {
          connection,
          concurrency,
        }
      );

      console.log(
        `[worker] Connected to Redis at ${redisUrl} (concurrency: ${concurrency})`
      );
    } catch (err) {
      console.error(
        "[worker] Failed to connect to Redis, falling back to in-memory queue:",
        err instanceof Error ? err.message : String(err)
      );
      throw err;
    }
  }

  register(type: string, processor: RegisteredProcessor["processor"]): void {
    this.processors.set(type, processor);
  }

  async add(job: JobPayload): Promise<void> {
    if (this.bullQueue) {
      const q = this.bullQueue as { add: (name: string, data: unknown, opts?: unknown) => Promise<void> };
      await q.add(job.type, job.data, {
        jobId: job.id,
        attempts: DEFAULT_RETRY_POLICY.maxRetries,
        backoff: {
          type: "exponential",
          delay: DEFAULT_RETRY_POLICY.initialDelay,
        },
      });
    }
  }

  async close(): Promise<void> {
    this._closed = true;
    if (this.worker) {
      const w = this.worker as { close: () => Promise<void> };
      await w.close();
    }
    if (this.bullQueue) {
      const q = this.bullQueue as { close: () => Promise<void> };
      await q.close();
    }
  }

  get closed(): boolean {
    return this._closed;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<WorkerContext> {
  console.log("[worker] Starting Thinkora worker...");

  // ── 1. Database connection ─────────────────────────────────────
  let db: SupabaseClient | null = null;
  try {
    db = createServerClient();
    const demoMode = isDemoMode();
    console.log(
      `[worker] Database: ${demoMode ? "demo mode (local Supabase)" : "connected"}`
    );
  } catch (err) {
    console.warn(
      "[worker] Database unavailable, running in demo mode:",
      err instanceof Error ? err.message : String(err)
    );
  }

  // ── 2. Queue setup ─────────────────────────────────────────────
  let queue: InMemoryQueue | BullMQAdapter;
  let useInMemory = false;

  // Try Redis/BullMQ first
  if (process.env.REDIS_URL || !isDemoMode()) {
    const adapter = new BullMQAdapter();
    try {
      await adapter.init(REDIS_URL, WORKER_CONCURRENCY);
      queue = adapter;
    } catch {
      useInMemory = true;
      queue = new InMemoryQueue();
    }
  } else {
    useInMemory = true;
    queue = new InMemoryQueue();
  }

  if (useInMemory) {
    console.log("[worker] Using in-memory queue (demo mode)");
  }

  // ── 3. Register job processors ─────────────────────────────────
  const fileIngestProcessor = createFileIngestJob(db);
  const notionSyncProcessor = createNotionSyncJob(db);
  const connectorHealthProcessor = createConnectorHealthJob(db);
  const generateSummaryProcessor = createGenerateSummaryJob(db);
  const indexVersionProcessor = createIndexVersionJob(db);
  const modelSyncProcessor = createModelSyncJob(db);

  // The reprocess job needs a reference to the ingest processor's
  // inner logic so it can delegate after cleaning up old data.
  const fileIngestInner = async (data: Record<string, unknown>) => {
    const result = await fileIngestProcessor({
      id: (data.jobId as string) ?? "reprocess",
      type: "file-ingest",
      data,
    });
    return result.output;
  };
  const reprocessFileProcessor = createReprocessFileJob(db, fileIngestInner);

  if (queue instanceof InMemoryQueue) {
    queue.register("file-ingest", fileIngestProcessor);
    queue.register("reprocess-file", reprocessFileProcessor);
    queue.register("notion-sync", notionSyncProcessor);
    queue.register("connector-health", connectorHealthProcessor);
    queue.register("generate-summary", generateSummaryProcessor);
    queue.register("index-version", indexVersionProcessor);
    queue.register("model-sync", modelSyncProcessor);
  } else {
    queue.register("file-ingest", fileIngestProcessor);
    queue.register("reprocess-file", reprocessFileProcessor);
    queue.register("notion-sync", notionSyncProcessor);
    queue.register("connector-health", connectorHealthProcessor);
    queue.register("generate-summary", generateSummaryProcessor);
    queue.register("index-version", indexVersionProcessor);
    queue.register("model-sync", modelSyncProcessor);
  }

  console.log("[worker] Registered job processors:", [
    "file-ingest",
    "reprocess-file",
    "notion-sync",
    "connector-health",
    "generate-summary",
    "index-version",
    "model-sync",
  ]);

  // ── 4. Health check HTTP server ────────────────────────────────
  const healthServer = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      if (req.url === "/health" || req.url === "/") {
        const isHealthy = !queue.closed;
        const statusCode = isHealthy ? 200 : 503;

        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: isHealthy ? "healthy" : "unhealthy",
            queue: useInMemory ? "in-memory" : "bullmq",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          })
        );
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    }
  );

  healthServer.listen(HEALTH_PORT, () => {
    console.log(`[worker] Health check endpoint: http://0.0.0.0:${HEALTH_PORT}/health`);
  });

  // ── 5. Graceful shutdown ───────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`[worker] Received ${signal}, shutting down gracefully...`);

    // Stop accepting new jobs
    if (queue instanceof InMemoryQueue) {
      queue.close();
    } else {
      await queue.close();
    }

    // Close health check server
    healthServer.close();

    console.log("[worker] Shutdown complete");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    console.error("[worker] Unhandled rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("[worker] Uncaught exception:", err);
    shutdown("uncaughtException");
  });

  console.log("[worker] Ready and waiting for jobs");

  return { db, queue, healthServer };
}

// ── Run ──────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error("[worker] Fatal startup error:", err);
  process.exit(1);
});
