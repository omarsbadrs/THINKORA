/**
 * Embedding functions — wraps an embedding API (OpenRouter-compatible)
 * with a demo mode that returns deterministic mock embeddings.
 */

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface EmbeddingConfig {
  /** Model identifier (default "openai/text-embedding-3-small"). */
  model?: string;
  /** Embedding vector dimensions (default 1536). */
  dimensions?: number;
  /** Maximum texts per batch request (default 100). */
  batchSize?: number;
}

export interface EmbedTextOptions {
  /** Model identifier override. */
  model?: string;
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "openai/text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1536;

/**
 * Simple string hash (djb2) normalised to [0, 1].
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) / 2147483647; // normalise to 0..1
}

/**
 * Produce a deterministic mock embedding vector of the given
 * dimensionality, seeded by the input text.
 *
 * The vector is L2-normalised so it behaves like a real unit embedding.
 */
function mockEmbedding(text: string, dimensions: number): number[] {
  const seed = hashString(text);
  const vec: number[] = [];
  let s = seed;

  for (let i = 0; i < dimensions; i++) {
    // Simple LCG PRNG seeded from the text hash.
    s = (s * 1103515245 + 12345) % 2147483648;
    vec.push((s / 2147483648) * 2 - 1); // range [-1, 1]
  }

  // L2 normalise.
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  }

  return vec;
}

/**
 * Determine whether the runtime should use demo mode.
 *
 * Demo mode is active when no `OPENROUTER_API_KEY` (or `OPENAI_API_KEY`)
 * environment variable is set.
 */
function isDemoMode(): boolean {
  return (
    !process.env.OPENROUTER_API_KEY &&
    !process.env.OPENAI_API_KEY
  );
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Embed a single text string.
 *
 * In demo mode (no API key configured) a deterministic mock embedding
 * based on a hash of the text is returned, which is useful for local
 * development and tests.
 */
export async function embedText(
  text: string,
  options: EmbedTextOptions = {}
): Promise<number[]> {
  const model = options.model ?? DEFAULT_MODEL;
  const dimensions = DEFAULT_DIMENSIONS;

  // ── Demo / offline mode ──────────────────────────────────────────
  if (isDemoMode()) {
    return mockEmbedding(text, dimensions);
  }

  // ── Real API call (OpenRouter-compatible) ────────────────────────
  const apiKey =
    process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;

  const baseUrl =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://thinkora.app",
      "X-Title": "Thinkora",
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Embedding API error (${response.status}): ${body}`
    );
  }

  const json = (await response.json()) as {
    data: { embedding: number[] }[];
  };

  return json.data[0].embedding;
}
