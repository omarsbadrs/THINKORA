/**
 * Batch embedding — processes multiple texts with configurable batch
 * size, rate limiting, and retry logic.
 */

import { embedText, type EmbeddingConfig } from "./embed";

// ────────────────────────────────────────────────────────────────────
// Defaults
// ────────────────────────────────────────────────────────────────────

const DEFAULT_BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Sleep for `ms` milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Embed a single text with exponential-backoff retry on transient
 * failures (429, 5xx, network errors).
 */
async function embedWithRetry(
  text: string,
  model: string | undefined,
  retries: number = MAX_RETRIES
): Promise<number[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await embedText(text, { model });
    } catch (err: unknown) {
      lastError = err;

      const isRetryable =
        err instanceof Error &&
        (/429|5\d{2}/.test(err.message) ||
          err.message.includes("fetch") ||
          err.message.includes("network"));

      if (!isRetryable || attempt === retries) break;

      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      await sleep(backoff);
    }
  }

  throw lastError;
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Embed an array of texts in configurable batches.
 *
 * Each text is embedded individually (most embedding APIs accept
 * batch input, but routing through `embedText` keeps the demo-mode
 * fallback working).  Texts within a batch are processed concurrently;
 * successive batches are sequential to avoid overwhelming the API.
 *
 * @returns An array of embedding vectors in the same order as `texts`.
 */
export async function batchEmbed(
  texts: string[],
  options: EmbeddingConfig = {}
): Promise<number[][]> {
  const { model, batchSize = DEFAULT_BATCH_SIZE } = options;

  if (texts.length === 0) return [];

  const results: number[][] = new Array(texts.length);

  for (let start = 0; start < texts.length; start += batchSize) {
    const end = Math.min(start + batchSize, texts.length);
    const batch = texts.slice(start, end);

    const batchResults = await Promise.all(
      batch.map((text) => embedWithRetry(text, model))
    );

    for (let i = 0; i < batchResults.length; i++) {
      results[start + i] = batchResults[i];
    }
  }

  return results;
}
