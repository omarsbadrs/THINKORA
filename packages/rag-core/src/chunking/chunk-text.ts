/**
 * Text chunking — splits raw text into overlapping chunks suitable for
 * embedding and retrieval.
 */

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface Chunk {
  /** The textual content of this chunk. */
  content: string;
  /** Zero-based ordinal position within the source document. */
  position: number;
  /** Estimated token count (text.length / 4). */
  tokenCount: number;
  /** Arbitrary metadata attached to this chunk. */
  metadata: Record<string, unknown>;
}

export interface ChunkTextOptions {
  /** Maximum tokens per chunk (default 512). */
  maxTokens?: number;
  /** Number of overlapping tokens between consecutive chunks (default 50). */
  overlap?: number;
  /** Primary split strategy (default "paragraph"). */
  splitBy?: "paragraph" | "sentence" | "token";
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

/** Cheap token estimate: ~4 characters per token. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into paragraphs (double-newline separated). Empty paragraphs
 * are discarded.
 */
function splitByParagraph(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Split text into sentences.  Handles common abbreviations and decimal
 * numbers to avoid spurious splits.
 */
function splitBySentence(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace / EOL.
  const raw = text.split(/(?<=[.!?])\s+/);
  return raw.map((s) => s.trim()).filter(Boolean);
}

/**
 * Split text into fixed-size token windows (each token ~4 chars).
 */
function splitByToken(text: string, maxTokens: number): string[] {
  const charChunk = maxTokens * 4;
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += charChunk) {
    const slice = text.slice(i, i + charChunk).trim();
    if (slice) parts.push(slice);
  }
  return parts;
}

// ────────────────────────────────────────────────────────────────────
// Core
// ────────────────────────────────────────────────────────────────────

/**
 * Merge an array of small text segments into chunks that do not exceed
 * `maxTokens`, adding `overlap` tokens of trailing context from the
 * previous chunk to the beginning of the next.
 */
function mergeSegments(
  segments: string[],
  maxTokens: number,
  overlap: number
): Chunk[] {
  const chunks: Chunk[] = [];
  let buffer = "";
  let position = 0;

  const flush = () => {
    const content = buffer.trim();
    if (!content) return;
    chunks.push({
      content,
      position,
      tokenCount: estimateTokens(content),
      metadata: {},
    });
    position++;
  };

  for (const segment of segments) {
    const segTokens = estimateTokens(segment);

    // If a single segment exceeds maxTokens, split it by token windows.
    if (segTokens > maxTokens) {
      flush(); // flush current buffer first

      const subParts = splitByToken(segment, maxTokens);
      for (const sub of subParts) {
        buffer = sub;
        flush();
      }

      // Prepare overlap for next chunk.
      const lastContent = chunks[chunks.length - 1]?.content ?? "";
      const overlapChars = overlap * 4;
      buffer = lastContent.slice(-overlapChars);
      continue;
    }

    const combined = buffer ? `${buffer} ${segment}` : segment;

    if (estimateTokens(combined) > maxTokens) {
      flush();

      // Carry overlap from previous chunk.
      const overlapChars = overlap * 4;
      const tail = buffer
        ? buffer
        : chunks.length > 0
          ? chunks[chunks.length - 1].content
          : "";
      const overlapText = tail.slice(-overlapChars);
      buffer = overlapText ? `${overlapText} ${segment}` : segment;
    } else {
      buffer = combined;
    }
  }

  flush();
  return chunks;
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Chunk a block of text into overlapping segments for embedding.
 *
 * Default strategy: split by paragraph first; if any paragraph exceeds
 * `maxTokens` it is further split by sentence; if a sentence still
 * exceeds it, a raw token-window split is used.
 */
export function chunkText(text: string, options: ChunkTextOptions = {}): Chunk[] {
  const { maxTokens = 512, overlap = 50, splitBy = "paragraph" } = options;

  if (!text || !text.trim()) return [];

  let segments: string[];

  switch (splitBy) {
    case "sentence":
      segments = splitBySentence(text);
      break;

    case "token":
      segments = splitByToken(text, maxTokens);
      break;

    case "paragraph":
    default: {
      // Split paragraphs, then further split any oversized paragraph by
      // sentence so we get natural boundaries.
      const paragraphs = splitByParagraph(text);
      segments = [];
      for (const para of paragraphs) {
        if (estimateTokens(para) > maxTokens) {
          const sentences = splitBySentence(para);
          segments.push(...sentences);
        } else {
          segments.push(para);
        }
      }
      break;
    }
  }

  return mergeSegments(segments, maxTokens, overlap);
}
