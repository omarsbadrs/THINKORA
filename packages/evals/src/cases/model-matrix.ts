import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModelMatrixEvalCase {
  id: string;
  name: string;
  query: string;
  routingMode: 'auto' | 'manual' | 'cost-optimized' | 'quality-optimized';
  expectedBehavior: string;
  expectedModel?: string;
  fallbackModels?: string[];
  maxCostPerRequest?: number;
  constraints: Record<string, unknown>;
  expectedFields: string[];
}

// ---------------------------------------------------------------------------
// Eval Cases
// ---------------------------------------------------------------------------

const modelMatrixCases: ModelMatrixEvalCase[] = [
  {
    id: 'model-auto-001',
    name: 'Auto routing selects optimal model for task',
    query: 'Analyze this complex legal document and extract key clauses',
    routingMode: 'auto',
    expectedBehavior: 'auto_routing',
    expectedModel: 'anthropic/claude-sonnet-4',
    constraints: {
      taskType: 'analysis',
      complexity: 'high',
      contextLength: 'long',
    },
    expectedFields: ['selectedModel', 'routingReason', 'alternativeModels', 'confidenceScore'],
  },
  {
    id: 'model-fast-002',
    name: 'Fast mode routes to lowest-latency model',
    query: 'What is 2+2?',
    routingMode: 'cost-optimized',
    expectedBehavior: 'fast_mode',
    expectedModel: 'google/gemini-2.0-flash',
    constraints: {
      taskType: 'simple_qa',
      complexity: 'low',
      latencyPriority: 'high',
    },
    expectedFields: ['selectedModel', 'estimatedLatencyMs', 'estimatedCost', 'routingReason'],
  },
  {
    id: 'model-quality-003',
    name: 'Quality mode routes to highest-scoring model',
    query: 'Write a comprehensive technical architecture document for a distributed system',
    routingMode: 'quality-optimized',
    expectedBehavior: 'quality_mode',
    expectedModel: 'anthropic/claude-sonnet-4',
    constraints: {
      taskType: 'creative',
      complexity: 'high',
      qualityPriority: 'highest',
    },
    expectedFields: ['selectedModel', 'qualityScore', 'estimatedCost', 'routingReason'],
  },
  {
    id: 'model-fallback-004',
    name: 'Fallback to secondary model when primary is unavailable',
    query: 'Summarize these meeting notes',
    routingMode: 'auto',
    expectedBehavior: 'fallback',
    expectedModel: 'openai/gpt-4o',
    fallbackModels: ['openai/gpt-4o', 'google/gemini-2.0-flash', 'meta/llama-3.3-70b'],
    constraints: {
      primaryUnavailable: true,
      failureReason: 'rate_limited',
    },
    expectedFields: [
      'selectedModel',
      'fallbackTriggered',
      'primaryFailureReason',
      'fallbackChain',
      'attemptCount',
    ],
  },
  {
    id: 'model-cost-005',
    name: 'Cost ceiling enforced: reject or downgrade if too expensive',
    query: 'Process this 200-page document in detail',
    routingMode: 'auto',
    expectedBehavior: 'cost_ceiling',
    expectedModel: 'google/gemini-2.0-flash',
    maxCostPerRequest: 0.005,
    constraints: {
      estimatedTokens: 50000,
      costCeiling: 0.005,
    },
    expectedFields: [
      'selectedModel',
      'estimatedCost',
      'costCeiling',
      'costCeilingEnforced',
      'originalModel',
      'downgradedTo',
    ],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Model Matrix Eval Cases', () => {
  describe('case definitions', () => {
    it('should have exactly 5 test cases', () => {
      expect(modelMatrixCases).toHaveLength(5);
    });

    it('should have unique case IDs', () => {
      const ids = modelMatrixCases.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should all have an expected model', () => {
      for (const c of modelMatrixCases) {
        expect(c.expectedModel).toBeTruthy();
      }
    });

    it('should all have constraints defined', () => {
      for (const c of modelMatrixCases) {
        expect(Object.keys(c.constraints).length).toBeGreaterThan(0);
      }
    });
  });

  describe('auto routing case', () => {
    const autoCase = modelMatrixCases.find((c) => c.expectedBehavior === 'auto_routing')!;

    it('should use auto routing mode', () => {
      expect(autoCase.routingMode).toBe('auto');
    });

    it('should select a high-quality model for complex analysis', () => {
      expect(autoCase.expectedModel).toBe('anthropic/claude-sonnet-4');
    });

    it('should provide routing reason and alternatives', () => {
      expect(autoCase.expectedFields).toContain('routingReason');
      expect(autoCase.expectedFields).toContain('alternativeModels');
    });

    it('should specify high complexity constraint', () => {
      expect(autoCase.constraints.complexity).toBe('high');
    });
  });

  describe('fast mode case', () => {
    const fastCase = modelMatrixCases.find((c) => c.expectedBehavior === 'fast_mode')!;

    it('should use cost-optimized routing mode', () => {
      expect(fastCase.routingMode).toBe('cost-optimized');
    });

    it('should select the flash/fast model', () => {
      expect(fastCase.expectedModel).toContain('flash');
    });

    it('should expect latency estimate in output', () => {
      expect(fastCase.expectedFields).toContain('estimatedLatencyMs');
    });

    it('should have low complexity constraint', () => {
      expect(fastCase.constraints.complexity).toBe('low');
    });
  });

  describe('quality mode case', () => {
    const qualityCase = modelMatrixCases.find((c) => c.expectedBehavior === 'quality_mode')!;

    it('should use quality-optimized routing mode', () => {
      expect(qualityCase.routingMode).toBe('quality-optimized');
    });

    it('should expect quality score in output', () => {
      expect(qualityCase.expectedFields).toContain('qualityScore');
    });

    it('should prioritize quality over cost', () => {
      expect(qualityCase.constraints.qualityPriority).toBe('highest');
    });
  });

  describe('fallback case', () => {
    const fallbackCase = modelMatrixCases.find((c) => c.expectedBehavior === 'fallback')!;

    it('should define a fallback chain of models', () => {
      expect(fallbackCase.fallbackModels).toBeDefined();
      expect(fallbackCase.fallbackModels!.length).toBeGreaterThanOrEqual(2);
    });

    it('should indicate primary is unavailable', () => {
      expect(fallbackCase.constraints.primaryUnavailable).toBe(true);
    });

    it('should track fallback trigger and attempt count', () => {
      expect(fallbackCase.expectedFields).toContain('fallbackTriggered');
      expect(fallbackCase.expectedFields).toContain('attemptCount');
    });

    it('should record the primary failure reason', () => {
      expect(fallbackCase.expectedFields).toContain('primaryFailureReason');
    });
  });

  describe('cost ceiling case', () => {
    const costCase = modelMatrixCases.find((c) => c.expectedBehavior === 'cost_ceiling')!;

    it('should have a max cost per request defined', () => {
      expect(costCase.maxCostPerRequest).toBeDefined();
      expect(costCase.maxCostPerRequest).toBeGreaterThan(0);
    });

    it('should track cost ceiling enforcement', () => {
      expect(costCase.expectedFields).toContain('costCeilingEnforced');
      expect(costCase.expectedFields).toContain('costCeiling');
    });

    it('should indicate the original model and what it was downgraded to', () => {
      expect(costCase.expectedFields).toContain('originalModel');
      expect(costCase.expectedFields).toContain('downgradedTo');
    });

    it('should select a cheaper model to stay within budget', () => {
      expect(costCase.expectedModel).toContain('flash');
    });
  });
});

export { modelMatrixCases };
export type { ModelMatrixEvalCase };
