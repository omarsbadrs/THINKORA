import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EvalScore {
  relevance: number;
  citationCoverage: number;
  accuracy: number;
  overall: number;
}

interface EvalResult {
  caseId: string;
  relevanceScore: number;
  citationScore: number;
  accuracyScore: number;
}

// ---------------------------------------------------------------------------
// Scoring Functions
// ---------------------------------------------------------------------------

/**
 * Score how relevant the actual output is to the expected output.
 * Uses token overlap as a simplified relevance metric.
 * Returns a value between 0 and 1.
 */
function scoreRelevance(expected: string, actual: string): number {
  if (!expected || !actual) return 0;

  const expectedTokens = new Set(
    expected
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
  const actualTokens = new Set(
    actual
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );

  if (expectedTokens.size === 0) return 0;

  let matches = 0;
  for (const token of expectedTokens) {
    if (actualTokens.has(token)) matches++;
  }

  return Math.min(1, matches / expectedTokens.size);
}

/**
 * Score how well the citations cover the expected sources.
 * Returns a value between 0 and 1.
 */
function scoreCitationCoverage(citations: string[], expectedSources: string[]): number {
  if (expectedSources.length === 0) return 1;
  if (citations.length === 0) return 0;

  const citationSet = new Set(citations.map((c) => c.toLowerCase()));
  let covered = 0;

  for (const source of expectedSources) {
    const sourceLower = source.toLowerCase();
    for (const citation of citationSet) {
      if (citation.includes(sourceLower) || sourceLower.includes(citation)) {
        covered++;
        break;
      }
    }
  }

  return covered / expectedSources.length;
}

/**
 * Score the accuracy of structured output against expected values.
 * Compares key presence and value matching.
 * Returns a value between 0 and 1.
 */
function scoreAccuracy(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
): number {
  const expectedKeys = Object.keys(expected);
  if (expectedKeys.length === 0) return 1;

  let score = 0;
  for (const key of expectedKeys) {
    if (!(key in actual)) continue;

    if (typeof expected[key] === 'string' && typeof actual[key] === 'string') {
      // Fuzzy string comparison
      const e = (expected[key] as string).toLowerCase();
      const a = (actual[key] as string).toLowerCase();
      score += e === a ? 1 : a.includes(e) || e.includes(a) ? 0.5 : 0;
    } else if (typeof expected[key] === 'number' && typeof actual[key] === 'number') {
      // Numeric comparison with tolerance
      const e = expected[key] as number;
      const a = actual[key] as number;
      if (e === 0 && a === 0) {
        score += 1;
      } else if (e === 0) {
        score += 0;
      } else {
        const diff = Math.abs(e - a) / Math.abs(e);
        score += diff < 0.01 ? 1 : diff < 0.1 ? 0.8 : diff < 0.25 ? 0.5 : 0;
      }
    } else if (typeof expected[key] === 'boolean') {
      score += expected[key] === actual[key] ? 1 : 0;
    } else {
      // Deep equality fallback
      score += JSON.stringify(expected[key]) === JSON.stringify(actual[key]) ? 1 : 0.25;
    }
  }

  return score / expectedKeys.length;
}

/**
 * Compute a composite eval score from an array of individual results.
 */
function computeEvalScore(results: EvalResult[]): EvalScore {
  if (results.length === 0) {
    return { relevance: 0, citationCoverage: 0, accuracy: 0, overall: 0 };
  }

  const relevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;
  const citationCoverage =
    results.reduce((sum, r) => sum + r.citationScore, 0) / results.length;
  const accuracy = results.reduce((sum, r) => sum + r.accuracyScore, 0) / results.length;

  // Weighted overall: relevance 30%, citation coverage 30%, accuracy 40%
  const overall = relevance * 0.3 + citationCoverage * 0.3 + accuracy * 0.4;

  return {
    relevance: Math.round(relevance * 1000) / 1000,
    citationCoverage: Math.round(citationCoverage * 1000) / 1000,
    accuracy: Math.round(accuracy * 1000) / 1000,
    overall: Math.round(overall * 1000) / 1000,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Scoring Utilities', () => {
  describe('scoreRelevance', () => {
    it('should return 1.0 for identical strings', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      expect(scoreRelevance(text, text)).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      const score = scoreRelevance(
        'quantum physics theoretical framework',
        'baking chocolate cake recipe instructions',
      );
      expect(score).toBe(0);
    });

    it('should return a partial score for overlapping content', () => {
      const score = scoreRelevance(
        'The product roadmap includes three phases',
        'The roadmap has three development phases planned',
      );
      expect(score).toBeGreaterThan(0.3);
      expect(score).toBeLessThan(1);
    });

    it('should return 0 when expected is empty', () => {
      expect(scoreRelevance('', 'some output')).toBe(0);
    });

    it('should return 0 when actual is empty', () => {
      expect(scoreRelevance('expected output', '')).toBe(0);
    });

    it('should be case-insensitive', () => {
      const a = scoreRelevance('Hello World Test', 'hello world test');
      expect(a).toBe(1);
    });
  });

  describe('scoreCitationCoverage', () => {
    it('should return 1.0 when all sources are cited', () => {
      const score = scoreCitationCoverage(
        ['notion-page-123', 'supabase-query', 'file-doc.pdf'],
        ['notion', 'supabase', 'file'],
      );
      expect(score).toBe(1);
    });

    it('should return 0 when no sources are cited', () => {
      const score = scoreCitationCoverage([], ['notion', 'supabase']);
      expect(score).toBe(0);
    });

    it('should return partial score for partial coverage', () => {
      const score = scoreCitationCoverage(
        ['notion-page-123'],
        ['notion', 'supabase'],
      );
      expect(score).toBe(0.5);
    });

    it('should return 1.0 when no sources are expected', () => {
      const score = scoreCitationCoverage(['some-citation'], []);
      expect(score).toBe(1);
    });

    it('should handle case-insensitive matching', () => {
      const score = scoreCitationCoverage(['NOTION-page'], ['notion']);
      expect(score).toBe(1);
    });
  });

  describe('scoreAccuracy', () => {
    it('should return 1.0 for identical objects', () => {
      const obj = { name: 'test', count: 42, active: true };
      expect(scoreAccuracy(obj, obj)).toBe(1);
    });

    it('should return 0 for completely missing keys', () => {
      const expected = { name: 'test', count: 42 };
      const actual = { other: 'value', different: 99 };
      expect(scoreAccuracy(expected, actual as Record<string, unknown>)).toBe(0);
    });

    it('should give partial credit for partial string match', () => {
      const expected = { status: 'active' };
      const actual = { status: 'currently active and running' };
      const score = scoreAccuracy(expected, actual);
      expect(score).toBe(0.5);
    });

    it('should score numeric values with tolerance', () => {
      const expected = { revenue: 1000 };
      const actual = { revenue: 1005 };
      const score = scoreAccuracy(expected, actual);
      expect(score).toBeGreaterThanOrEqual(0.8);
    });

    it('should score boolean values exactly', () => {
      expect(scoreAccuracy({ flag: true }, { flag: true })).toBe(1);
      expect(scoreAccuracy({ flag: true }, { flag: false })).toBe(0);
    });

    it('should return 1.0 for empty expected object', () => {
      expect(scoreAccuracy({}, { any: 'value' })).toBe(1);
    });
  });

  describe('computeEvalScore', () => {
    it('should compute weighted average of all scores', () => {
      const results: EvalResult[] = [
        { caseId: 'case-1', relevanceScore: 1.0, citationScore: 1.0, accuracyScore: 1.0 },
      ];
      const score = computeEvalScore(results);
      expect(score.overall).toBe(1);
      expect(score.relevance).toBe(1);
      expect(score.citationCoverage).toBe(1);
      expect(score.accuracy).toBe(1);
    });

    it('should return all zeros for empty results', () => {
      const score = computeEvalScore([]);
      expect(score.overall).toBe(0);
      expect(score.relevance).toBe(0);
      expect(score.citationCoverage).toBe(0);
      expect(score.accuracy).toBe(0);
    });

    it('should average across multiple results', () => {
      const results: EvalResult[] = [
        { caseId: 'case-1', relevanceScore: 0.8, citationScore: 0.6, accuracyScore: 1.0 },
        { caseId: 'case-2', relevanceScore: 0.6, citationScore: 0.4, accuracyScore: 0.8 },
      ];
      const score = computeEvalScore(results);
      expect(score.relevance).toBe(0.7);
      expect(score.citationCoverage).toBe(0.5);
      expect(score.accuracy).toBe(0.9);
    });

    it('should weight accuracy at 40%, relevance at 30%, citations at 30%', () => {
      const results: EvalResult[] = [
        { caseId: 'case-1', relevanceScore: 1.0, citationScore: 0.0, accuracyScore: 0.0 },
      ];
      const score = computeEvalScore(results);
      expect(score.overall).toBeCloseTo(0.3, 2);
    });

    it('should round scores to 3 decimal places', () => {
      const results: EvalResult[] = [
        { caseId: 'case-1', relevanceScore: 0.3333, citationScore: 0.6666, accuracyScore: 0.9999 },
      ];
      const score = computeEvalScore(results);
      expect(String(score.relevance).split('.')[1]?.length || 0).toBeLessThanOrEqual(3);
    });
  });
});

export { scoreRelevance, scoreCitationCoverage, scoreAccuracy, computeEvalScore };
export type { EvalScore, EvalResult };
