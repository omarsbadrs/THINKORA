/**
 * Request tracing — Lightweight in-process trace / span collection.
 *
 * This is intentionally simple and runtime-only. For production distributed
 * tracing, the spans collected here can be exported to an OpenTelemetry
 * backend.
 */

import { randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Span {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface Trace {
  /** Unique trace identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** High-resolution start time (ms since epoch). */
  startTime: number;
  /** Collected spans. */
  spans: Span[];
  /** Add a sub-span that is immediately started and ended. */
  addSpan(name: string, metadata?: Record<string, unknown>): Span;
  /** End the trace and return its total duration in milliseconds. */
  end(): number;
}

// ---------------------------------------------------------------------------
// Trace factory
// ---------------------------------------------------------------------------

/**
 * Start a new trace.
 */
export function startTrace(
  name: string,
  metadata?: Record<string, unknown>,
): Trace {
  const id = randomBytes(16).toString("hex");
  const startTime = Date.now();
  const spans: Span[] = [];

  let endTime: number | null = null;

  const trace: Trace = {
    id,
    name,
    startTime,
    spans,

    addSpan(spanName: string, spanMeta?: Record<string, unknown>): Span {
      const spanStart = Date.now();
      const span: Span = {
        name: spanName,
        startTime: spanStart,
        endTime: spanStart, // will be updated
        duration: 0,
        metadata: spanMeta,
      };
      spans.push(span);
      return span;
    },

    end(): number {
      endTime = Date.now();
      const duration = endTime - startTime;

      // Auto-close any spans that haven't been ended yet
      for (const span of spans) {
        if (span.duration === 0) {
          span.endTime = endTime;
          span.duration = span.endTime - span.startTime;
        }
      }

      return duration;
    },
  };

  // If metadata was provided, record it as the first span
  if (metadata && Object.keys(metadata).length > 0) {
    trace.addSpan(`${name}:init`, metadata);
  }

  return trace;
}

// ---------------------------------------------------------------------------
// Async wrapper
// ---------------------------------------------------------------------------

/**
 * Execute an async function wrapped in a trace. The trace is automatically
 * started before and ended after the function completes (or throws).
 *
 * Returns the result of `fn` along with the completed trace.
 */
export async function traceAsync<T>(
  name: string,
  fn: (trace: Trace) => Promise<T>,
): Promise<{ result: T; trace: Trace; durationMs: number }> {
  const trace = startTrace(name);
  try {
    const result = await fn(trace);
    const durationMs = trace.end();
    return { result, trace, durationMs };
  } catch (err) {
    trace.end();
    throw err;
  }
}
