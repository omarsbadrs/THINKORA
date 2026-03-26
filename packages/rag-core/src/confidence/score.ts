/**
 * Confidence scoring — produces a multi-dimensional confidence score
 * reflecting how well an answer is supported by retrieved sources.
 */

import type { SearchResult } from "../retrieval/semantic-search";
import type { Citation } from "../citations/types";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface ConfidenceScore {
  /** Aggregate confidence 0-1. */
  overall: number;
  /** Quality of the retrieved sources (count and relevance). */
  sourceQuality: number;
  /** Fraction of the answer covered by citations. */
  citationCoverage: number;
  /** Token overlap between query and answer. */
  answerRelevance: number;
}

export interface ComputeConfidenceParams {
  query: string;
  answer: string;
  sources: SearchResult[];
  citations: Citation[];
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 2)
  );
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Compute a confidence score for a RAG answer.
 *
 * Factors:
 *
 * - **sourceQuality** — based on the number of sources (more is
 *   better, up to a cap) and their average similarity score.
 * - **citationCoverage** — fraction of answer sentences that have a
 *   corresponding citation.
 * - **answerRelevance** — token overlap between the original query
 *   and the generated answer.
 * - **overall** — weighted combination of the three sub-scores.
 */
export function computeConfidence(
  params: ComputeConfidenceParams
): ConfidenceScore {
  const { query, answer, sources, citations } = params;

  // ── Source quality ───────────────────────────────────────────────
  // More sources = higher confidence, with diminishing returns.
  const sourceCountScore = clamp(sources.length / 5); // cap at 5 sources
  const avgRelevance =
    sources.length > 0
      ? sources.reduce((s, r) => s + r.score, 0) / sources.length
      : 0;
  const sourceQuality = clamp(sourceCountScore * 0.4 + avgRelevance * 0.6);

  // ── Citation coverage ────────────────────────────────────────────
  // What fraction of the answer's sentences are cited?
  const answerSentences = answer
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((s) => s.trim().length > 10);

  let citedSentences = 0;
  if (answerSentences.length > 0 && citations.length > 0) {
    const citedTexts = new Set(citations.map((c) => c.text));
    for (const sentence of answerSentences) {
      const trimmed = sentence.trim();
      if (citedTexts.has(trimmed)) {
        citedSentences++;
      } else {
        // Check partial match.
        const sentenceTokens = tokenize(trimmed);
        for (const ct of citedTexts) {
          const citTokens = tokenize(ct);
          let overlap = 0;
          for (const t of sentenceTokens) {
            if (citTokens.has(t)) overlap++;
          }
          if (sentenceTokens.size > 0 && overlap / sentenceTokens.size > 0.4) {
            citedSentences++;
            break;
          }
        }
      }
    }
  }

  const citationCoverage =
    answerSentences.length > 0
      ? clamp(citedSentences / answerSentences.length)
      : 0;

  // ── Answer relevance ─────────────────────────────────────────────
  const queryTokens = tokenize(query);
  const answerTokens = tokenize(answer);
  let queryHits = 0;
  for (const qt of queryTokens) {
    if (answerTokens.has(qt)) queryHits++;
  }
  const answerRelevance =
    queryTokens.size > 0 ? clamp(queryHits / queryTokens.size) : 0;

  // ── Overall ──────────────────────────────────────────────────────
  const overall = clamp(
    sourceQuality * 0.4 + citationCoverage * 0.35 + answerRelevance * 0.25
  );

  return {
    overall: round(overall),
    sourceQuality: round(sourceQuality),
    citationCoverage: round(citationCoverage),
    answerRelevance: round(answerRelevance),
  };
}

function round(n: number, decimals = 3): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
