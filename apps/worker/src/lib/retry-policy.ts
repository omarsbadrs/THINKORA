// ---------------------------------------------------------------------------
// @thinkora/worker — Retry policies
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configurable retry policy for job processors. */
export interface RetryPolicy {
  /** Maximum number of retry attempts (default 3). */
  maxRetries: number;
  /** Initial delay in milliseconds before the first retry (default 1000). */
  initialDelay: number;
  /** Maximum delay in milliseconds between retries (default 30000). */
  maxDelay: number;
  /** Multiplier applied to the delay on each successive attempt (default 2). */
  backoffMultiplier: number;
}

/** Errors that should never be retried. */
const NON_RETRYABLE_ERRORS = [
  "INVALID_INPUT",
  "FILE_NOT_FOUND",
  "UNSUPPORTED_FORMAT",
  "PERMISSION_DENIED",
  "AUTH_ERROR",
];

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Default retry policy used by job runners. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30_000,
  backoffMultiplier: 2,
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Computes the delay before the next retry attempt using exponential backoff.
 *
 * delay = min(initialDelay * backoffMultiplier^attempt, maxDelay)
 *
 * A small jitter (up to 10%) is added to avoid thundering-herd effects.
 */
export function getRetryDelay(attempt: number, policy: RetryPolicy): number {
  const baseDelay =
    policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt);
  const clampedDelay = Math.min(baseDelay, policy.maxDelay);

  // Add jitter: +0% to +10%
  const jitter = clampedDelay * Math.random() * 0.1;
  return Math.round(clampedDelay + jitter);
}

/**
 * Determines whether a failed job should be retried.
 *
 * Returns false when:
 * - The attempt count has reached or exceeded maxRetries.
 * - The error is classified as non-retryable (e.g., invalid input).
 */
export function shouldRetry(
  error: unknown,
  attempt: number,
  maxRetries: number
): boolean {
  // Budget exhausted
  if (attempt >= maxRetries) {
    return false;
  }

  // Check for non-retryable error codes
  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    if (code && NON_RETRYABLE_ERRORS.includes(code)) {
      return false;
    }

    // Also check the message for known non-retryable patterns
    const msg = error.message.toLowerCase();
    if (
      msg.includes("not found") ||
      msg.includes("unsupported") ||
      msg.includes("invalid") ||
      msg.includes("permission denied")
    ) {
      return false;
    }
  }

  return true;
}
