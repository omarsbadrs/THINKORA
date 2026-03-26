import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EvalCase {
  id: string;
  name: string;
  query: string;
  expectedFields: string[];
}

interface EvalSuite {
  name: string;
  cases: EvalCase[];
}

interface EvalCaseResult {
  caseId: string;
  caseName: string;
  passed: boolean;
  score: number;
  durationMs: number;
  error?: string;
}

interface EvalReport {
  suiteName: string;
  totalCases: number;
  passed: number;
  failed: number;
  scores: {
    mean: number;
    min: number;
    max: number;
    median: number;
  };
  duration: number;
  results: EvalCaseResult[];
  timestamp: string;
}

interface RunOptions {
  concurrency?: number;
  timeout?: number;
  verbose?: boolean;
  filter?: (caseItem: EvalCase) => boolean;
}

// ---------------------------------------------------------------------------
// Eval Runner
// ---------------------------------------------------------------------------

/**
 * Run a single eval case and return its result.
 */
async function runSingleCase(
  evalCase: EvalCase,
  timeout: number,
): Promise<EvalCaseResult> {
  const start = Date.now();

  try {
    // Simulate case evaluation with timeout
    await Promise.race([
      new Promise<void>((resolve) => {
        // Validate that the case is well-formed
        if (!evalCase.id) throw new Error('Case is missing an id');
        if (!evalCase.query) throw new Error('Case is missing a query');
        if (!evalCase.expectedFields || evalCase.expectedFields.length === 0) {
          throw new Error('Case is missing expected fields');
        }
        resolve();
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout),
      ),
    ]);

    const durationMs = Date.now() - start;

    return {
      caseId: evalCase.id,
      caseName: evalCase.name,
      passed: true,
      score: 1.0,
      durationMs,
    };
  } catch (err) {
    return {
      caseId: evalCase.id,
      caseName: evalCase.name,
      passed: false,
      score: 0,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Run a full eval suite and return a report.
 */
async function runEvalSuite(
  suite: EvalSuite,
  options: RunOptions = {},
): Promise<EvalReport> {
  const { concurrency = 5, timeout = 30_000, filter } = options;
  const start = Date.now();

  let cases = suite.cases;
  if (filter) {
    cases = cases.filter(filter);
  }

  // Run cases with concurrency control
  const results: EvalCaseResult[] = [];
  for (let i = 0; i < cases.length; i += concurrency) {
    const batch = cases.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((c) => runSingleCase(c, timeout)),
    );
    results.push(...batchResults);
  }

  // Compute aggregate scores
  const scores = results.map((r) => r.score);
  const sortedScores = [...scores].sort((a, b) => a - b);

  const mean = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : 0;

  const median = scores.length > 0
    ? scores.length % 2 === 0
      ? (sortedScores[scores.length / 2 - 1] + sortedScores[scores.length / 2]) / 2
      : sortedScores[Math.floor(scores.length / 2)]
    : 0;

  return {
    suiteName: suite.name,
    totalCases: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    scores: {
      mean: Math.round(mean * 1000) / 1000,
      min: scores.length > 0 ? Math.min(...scores) : 0,
      max: scores.length > 0 ? Math.max(...scores) : 0,
      median: Math.round(median * 1000) / 1000,
    },
    duration: Date.now() - start,
    results,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Eval Runner', () => {
  const mockSuite: EvalSuite = {
    name: 'Test Suite',
    cases: [
      { id: 'tc-001', name: 'Test Case 1', query: 'What is X?', expectedFields: ['answer'] },
      { id: 'tc-002', name: 'Test Case 2', query: 'Explain Y', expectedFields: ['explanation', 'examples'] },
      { id: 'tc-003', name: 'Test Case 3', query: 'Compare A and B', expectedFields: ['comparison'] },
    ],
  };

  describe('runEvalSuite', () => {
    it('should run all cases and return a report', async () => {
      const report = await runEvalSuite(mockSuite);

      expect(report.suiteName).toBe('Test Suite');
      expect(report.totalCases).toBe(3);
      expect(report.results).toHaveLength(3);
    });

    it('should report correct passed/failed counts', async () => {
      const report = await runEvalSuite(mockSuite);

      expect(report.passed).toBe(3);
      expect(report.failed).toBe(0);
      expect(report.passed + report.failed).toBe(report.totalCases);
    });

    it('should compute score statistics', async () => {
      const report = await runEvalSuite(mockSuite);

      expect(report.scores.mean).toBeGreaterThanOrEqual(0);
      expect(report.scores.mean).toBeLessThanOrEqual(1);
      expect(report.scores.min).toBeLessThanOrEqual(report.scores.max);
      expect(report.scores.median).toBeGreaterThanOrEqual(report.scores.min);
      expect(report.scores.median).toBeLessThanOrEqual(report.scores.max);
    });

    it('should record total duration', async () => {
      const report = await runEvalSuite(mockSuite);

      expect(report.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include a timestamp', async () => {
      const report = await runEvalSuite(mockSuite);

      expect(report.timestamp).toBeTruthy();
      expect(new Date(report.timestamp).getTime()).not.toBeNaN();
    });

    it('should respect the filter option', async () => {
      const report = await runEvalSuite(mockSuite, {
        filter: (c) => c.id === 'tc-001',
      });

      expect(report.totalCases).toBe(1);
      expect(report.results[0].caseId).toBe('tc-001');
    });

    it('should handle concurrency option', async () => {
      const report = await runEvalSuite(mockSuite, { concurrency: 1 });

      expect(report.totalCases).toBe(3);
      expect(report.passed).toBe(3);
    });
  });

  describe('runSingleCase', () => {
    it('should pass for well-formed cases', async () => {
      const result = await runSingleCase(
        { id: 'tc-ok', name: 'OK Case', query: 'test query', expectedFields: ['field'] },
        5000,
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('should fail for cases missing an id', async () => {
      const result = await runSingleCase(
        { id: '', name: 'Bad Case', query: 'test', expectedFields: ['field'] },
        5000,
      );

      expect(result.passed).toBe(false);
      expect(result.error).toContain('missing');
    });

    it('should fail for cases missing a query', async () => {
      const result = await runSingleCase(
        { id: 'tc-bad', name: 'Bad Case', query: '', expectedFields: ['field'] },
        5000,
      );

      expect(result.passed).toBe(false);
      expect(result.error).toContain('missing');
    });

    it('should fail for cases with no expected fields', async () => {
      const result = await runSingleCase(
        { id: 'tc-bad', name: 'Bad Case', query: 'test', expectedFields: [] },
        5000,
      );

      expect(result.passed).toBe(false);
      expect(result.error).toContain('expected fields');
    });

    it('should record duration', async () => {
      const result = await runSingleCase(
        { id: 'tc-ok', name: 'OK', query: 'test', expectedFields: ['f'] },
        5000,
      );

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle an empty suite', async () => {
      const report = await runEvalSuite({ name: 'Empty', cases: [] });

      expect(report.totalCases).toBe(0);
      expect(report.passed).toBe(0);
      expect(report.failed).toBe(0);
      expect(report.scores.mean).toBe(0);
    });

    it('should handle a suite where all cases are filtered out', async () => {
      const report = await runEvalSuite(mockSuite, {
        filter: () => false,
      });

      expect(report.totalCases).toBe(0);
    });

    it('should produce a valid EvalReport shape', async () => {
      const report = await runEvalSuite(mockSuite);

      expect(report).toHaveProperty('suiteName');
      expect(report).toHaveProperty('totalCases');
      expect(report).toHaveProperty('passed');
      expect(report).toHaveProperty('failed');
      expect(report).toHaveProperty('scores');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('timestamp');
      expect(report.scores).toHaveProperty('mean');
      expect(report.scores).toHaveProperty('min');
      expect(report.scores).toHaveProperty('max');
      expect(report.scores).toHaveProperty('median');
    });
  });
});

export { runEvalSuite, runSingleCase };
export type { EvalSuite, EvalCase, EvalCaseResult, EvalReport, RunOptions };
