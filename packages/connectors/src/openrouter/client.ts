// ---------------------------------------------------------------------------
// OpenRouter Client
// ---------------------------------------------------------------------------

import type {
  OpenRouterConfig,
  OpenRouterModel,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
} from "./types";

/** Normalized error thrown by the OpenRouter client. */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number | null = null,
    public readonly retryable: boolean = false,
    public readonly requestId: string | null = null,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/** Default configuration values. */
const DEFAULTS = {
  baseUrl: "https://openrouter.ai/api/v1",
  timeoutMs: 60_000,
  maxRetries: 3,
} as const;

/** Initial backoff in milliseconds for retry logic. */
const INITIAL_BACKOFF_MS = 1000;

/**
 * Client for the OpenRouter API, which provides an OpenAI-compatible
 * interface to dozens of LLM providers.
 *
 * Features:
 * - OpenAI-compatible chat completions (blocking and streaming)
 * - Model catalog retrieval
 * - Automatic retry with exponential backoff
 * - Request tracing via X-Request-Id
 * - Configurable timeout
 */
export class OpenRouterClient {
  private readonly config: Required<
    Pick<OpenRouterConfig, "apiKey" | "baseUrl" | "timeoutMs" | "maxRetries">
  > & Pick<OpenRouterConfig, "siteName" | "siteUrl">;

  constructor(config: OpenRouterConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? DEFAULTS.baseUrl,
      siteName: config.siteName,
      siteUrl: config.siteUrl,
      timeoutMs: config.timeoutMs ?? DEFAULTS.timeoutMs,
      maxRetries: config.maxRetries ?? DEFAULTS.maxRetries,
    };
  }

  // -----------------------------------------------------------------------
  // Chat Completions
  // -----------------------------------------------------------------------

  /** Sends a blocking chat completion request and returns the full response. */
  async chatCompletion(
    params: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    const body = { ...params, stream: false };
    const requestId = this.generateRequestId();

    const response = await this.fetchWithRetry(
      "/chat/completions",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      requestId,
    );

    const data = (await response.json()) as ChatCompletionResponse;
    return data;
  }

  /**
   * Sends a streaming chat completion request.
   * Yields `StreamChunk` objects as they arrive from the server.
   */
  async *streamChatCompletion(
    params: ChatCompletionRequest,
  ): AsyncGenerator<StreamChunk, void, undefined> {
    const body = { ...params, stream: true };
    const requestId = this.generateRequestId();

    const response = await this.fetchWithRetry(
      "/chat/completions",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      requestId,
    );

    if (!response.body) {
      throw new OpenRouterError(
        "Streaming response has no body",
        "STREAM_ERROR",
        null,
        false,
        requestId,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split("\n");
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed || trimmed.startsWith(":")) continue;

          if (trimmed === "data: [DONE]") return;

          if (trimmed.startsWith("data: ")) {
            const json = trimmed.slice(6);
            try {
              const chunk = JSON.parse(json) as StreamChunk;
              yield chunk;
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
          try {
            const chunk = JSON.parse(trimmed.slice(6)) as StreamChunk;
            yield chunk;
          } catch {
            // Skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // -----------------------------------------------------------------------
  // Models
  // -----------------------------------------------------------------------

  /** Fetches the full model catalog from OpenRouter. */
  async getModels(): Promise<OpenRouterModel[]> {
    const requestId = this.generateRequestId();
    const response = await this.fetchWithRetry(
      "/models",
      { method: "GET" },
      requestId,
    );

    const data = (await response.json()) as { data: OpenRouterModel[] };
    return data.data;
  }

  // -----------------------------------------------------------------------
  // HTTP layer with retry
  // -----------------------------------------------------------------------

  /**
   * Performs a fetch with automatic retry on transient failures.
   * Uses exponential backoff with jitter.
   */
  private async fetchWithRetry(
    path: string,
    init: RequestInit,
    requestId: string,
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = this.buildHeaders(requestId);

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeoutMs,
        );

        const response = await fetch(url, {
          ...init,
          headers: {
            ...headers,
            ...(init.headers as Record<string, string> | undefined),
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok || response.status === 200) {
          return response;
        }

        // Non-retryable client errors (except 429)
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          const body = await response.text();
          throw new OpenRouterError(
            `OpenRouter API error (${response.status}): ${body}`,
            "API_ERROR",
            response.status,
            false,
            requestId,
          );
        }

        // Retryable: 429, 5xx
        lastError = new OpenRouterError(
          `OpenRouter API error (${response.status})`,
          response.status === 429 ? "RATE_LIMITED" : "SERVER_ERROR",
          response.status,
          true,
          requestId,
        );

        if (attempt < this.config.maxRetries) {
          const backoff = this.calculateBackoff(attempt);
          await this.sleep(backoff);
        }
      } catch (error: unknown) {
        lastError = error;

        // Don't retry non-retryable errors
        if (error instanceof OpenRouterError && !error.retryable) {
          throw error;
        }

        // Handle timeout (AbortError)
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          lastError = new OpenRouterError(
            `Request timed out after ${this.config.timeoutMs}ms`,
            "TIMEOUT",
            null,
            true,
            requestId,
          );
        }

        if (attempt < this.config.maxRetries) {
          const backoff = this.calculateBackoff(attempt);
          await this.sleep(backoff);
        }
      }
    }

    // All retries exhausted
    if (lastError instanceof OpenRouterError) {
      throw lastError;
    }

    throw new OpenRouterError(
      `Request failed after ${this.config.maxRetries} retries: ${lastError}`,
      "MAX_RETRIES_EXCEEDED",
      null,
      false,
      requestId,
    );
  }

  /** Builds the standard headers for OpenRouter requests. */
  private buildHeaders(requestId: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
      "X-Request-Id": requestId,
    };

    if (this.config.siteUrl) {
      headers["HTTP-Referer"] = this.config.siteUrl;
    }
    if (this.config.siteName) {
      headers["X-Title"] = this.config.siteName;
    }

    return headers;
  }

  /** Generates a unique request ID for tracing. */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `thinkora-${timestamp}-${random}`;
  }

  /**
   * Calculates exponential backoff with jitter.
   * Formula: min(baseDelay * 2^attempt + jitter, 30s)
   */
  private calculateBackoff(attempt: number): number {
    const base = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
    const jitter = Math.random() * INITIAL_BACKOFF_MS;
    return Math.min(base + jitter, 30_000);
  }

  /** Promise-based sleep. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
