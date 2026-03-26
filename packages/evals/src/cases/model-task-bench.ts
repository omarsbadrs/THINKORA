import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskType = 'chat' | 'code' | 'analysis' | 'creative' | 'extraction';

interface ModelProfile {
  id: string;
  name: string;
  provider: string;
  scores: Record<TaskType, number>;
  costPer1kTokens: number;
  avgLatencyMs: number;
}

interface ModelTaskBenchCase {
  id: string;
  name: string;
  taskType: TaskType;
  samplePrompt: string;
  models: ModelProfile[];
  expectedBestModel: string;
  expectedRanking: string[];
  minimumAcceptableScore: number;
}

// ---------------------------------------------------------------------------
// Model profiles used across benchmarks
// ---------------------------------------------------------------------------

const modelProfiles: ModelProfile[] = [
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    scores: { chat: 0.92, code: 0.94, analysis: 0.95, creative: 0.88, extraction: 0.91 },
    costPer1kTokens: 0.003,
    avgLatencyMs: 1800,
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    scores: { chat: 0.90, code: 0.91, analysis: 0.89, creative: 0.93, extraction: 0.88 },
    costPer1kTokens: 0.005,
    avgLatencyMs: 2100,
  },
  {
    id: 'google/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    scores: { chat: 0.82, code: 0.80, analysis: 0.78, creative: 0.75, extraction: 0.85 },
    costPer1kTokens: 0.0001,
    avgLatencyMs: 890,
  },
  {
    id: 'meta/llama-3.3-70b',
    name: 'Llama 3.3 70B',
    provider: 'meta',
    scores: { chat: 0.78, code: 0.82, analysis: 0.74, creative: 0.70, extraction: 0.76 },
    costPer1kTokens: 0.0008,
    avgLatencyMs: 1200,
  },
];

// ---------------------------------------------------------------------------
// Eval Cases
// ---------------------------------------------------------------------------

const modelTaskBenchCases: ModelTaskBenchCase[] = [
  {
    id: 'bench-chat-001',
    name: 'Chat task: conversational fluency',
    taskType: 'chat',
    samplePrompt: 'Explain quantum computing to a 10-year-old in a friendly way',
    models: modelProfiles,
    expectedBestModel: 'anthropic/claude-sonnet-4',
    expectedRanking: [
      'anthropic/claude-sonnet-4',
      'openai/gpt-4o',
      'google/gemini-2.0-flash',
      'meta/llama-3.3-70b',
    ],
    minimumAcceptableScore: 0.75,
  },
  {
    id: 'bench-code-002',
    name: 'Code task: implementation generation',
    taskType: 'code',
    samplePrompt: 'Write a TypeScript function that implements a trie data structure with insert, search, and autocomplete',
    models: modelProfiles,
    expectedBestModel: 'anthropic/claude-sonnet-4',
    expectedRanking: [
      'anthropic/claude-sonnet-4',
      'openai/gpt-4o',
      'meta/llama-3.3-70b',
      'google/gemini-2.0-flash',
    ],
    minimumAcceptableScore: 0.78,
  },
  {
    id: 'bench-analysis-003',
    name: 'Analysis task: data interpretation',
    taskType: 'analysis',
    samplePrompt: 'Analyze the following quarterly financial data and identify trends, risks, and opportunities',
    models: modelProfiles,
    expectedBestModel: 'anthropic/claude-sonnet-4',
    expectedRanking: [
      'anthropic/claude-sonnet-4',
      'openai/gpt-4o',
      'google/gemini-2.0-flash',
      'meta/llama-3.3-70b',
    ],
    minimumAcceptableScore: 0.72,
  },
  {
    id: 'bench-creative-004',
    name: 'Creative task: content generation',
    taskType: 'creative',
    samplePrompt: 'Write a compelling product description for an AI-powered note-taking app',
    models: modelProfiles,
    expectedBestModel: 'openai/gpt-4o',
    expectedRanking: [
      'openai/gpt-4o',
      'anthropic/claude-sonnet-4',
      'google/gemini-2.0-flash',
      'meta/llama-3.3-70b',
    ],
    minimumAcceptableScore: 0.70,
  },
  {
    id: 'bench-extraction-005',
    name: 'Extraction task: structured data extraction',
    taskType: 'extraction',
    samplePrompt: 'Extract all dates, names, and monetary amounts from this contract document into JSON',
    models: modelProfiles,
    expectedBestModel: 'anthropic/claude-sonnet-4',
    expectedRanking: [
      'anthropic/claude-sonnet-4',
      'openai/gpt-4o',
      'google/gemini-2.0-flash',
      'meta/llama-3.3-70b',
    ],
    minimumAcceptableScore: 0.75,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Model-Task Benchmark Eval Cases', () => {
  describe('case definitions', () => {
    it('should cover all 5 task types', () => {
      const taskTypes = modelTaskBenchCases.map((c) => c.taskType);
      expect(taskTypes).toContain('chat');
      expect(taskTypes).toContain('code');
      expect(taskTypes).toContain('analysis');
      expect(taskTypes).toContain('creative');
      expect(taskTypes).toContain('extraction');
    });

    it('should have unique case IDs', () => {
      const ids = modelTaskBenchCases.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should each include all 4 model profiles', () => {
      for (const c of modelTaskBenchCases) {
        expect(c.models).toHaveLength(4);
      }
    });
  });

  describe('model suitability scoring', () => {
    it('should rank the expected best model first for each task', () => {
      for (const c of modelTaskBenchCases) {
        const bestModel = c.models.reduce((best, model) =>
          model.scores[c.taskType] > best.scores[c.taskType] ? model : best,
        );
        expect(bestModel.id).toBe(c.expectedBestModel);
      }
    });

    it('should produce correct rankings based on task scores', () => {
      for (const c of modelTaskBenchCases) {
        const sorted = [...c.models].sort(
          (a, b) => b.scores[c.taskType] - a.scores[c.taskType],
        );
        const rankedIds = sorted.map((m) => m.id);
        expect(rankedIds).toEqual(c.expectedRanking);
      }
    });

    it('should have all models above minimum acceptable score for chat', () => {
      const chatCase = modelTaskBenchCases.find((c) => c.taskType === 'chat')!;
      for (const model of chatCase.models) {
        expect(model.scores.chat).toBeGreaterThanOrEqual(chatCase.minimumAcceptableScore);
      }
    });

    it('should ensure minimum acceptable scores are between 0 and 1', () => {
      for (const c of modelTaskBenchCases) {
        expect(c.minimumAcceptableScore).toBeGreaterThan(0);
        expect(c.minimumAcceptableScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('cost-quality tradeoffs', () => {
    it('should have Gemini Flash as the cheapest model', () => {
      const cheapest = modelProfiles.reduce((min, m) =>
        m.costPer1kTokens < min.costPer1kTokens ? m : min,
      );
      expect(cheapest.id).toBe('google/gemini-2.0-flash');
    });

    it('should have Gemini Flash as the fastest model', () => {
      const fastest = modelProfiles.reduce((min, m) =>
        m.avgLatencyMs < min.avgLatencyMs ? m : min,
      );
      expect(fastest.id).toBe('google/gemini-2.0-flash');
    });

    it('should show GPT-4o as best for creative tasks despite higher cost', () => {
      const creativeCase = modelTaskBenchCases.find((c) => c.taskType === 'creative')!;
      expect(creativeCase.expectedBestModel).toBe('openai/gpt-4o');
    });

    it('should have all model scores between 0 and 1', () => {
      for (const model of modelProfiles) {
        for (const score of Object.values(model.scores)) {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('model profiles consistency', () => {
    it('should all have positive cost and latency values', () => {
      for (const model of modelProfiles) {
        expect(model.costPer1kTokens).toBeGreaterThan(0);
        expect(model.avgLatencyMs).toBeGreaterThan(0);
      }
    });

    it('should have unique model IDs', () => {
      const ids = modelProfiles.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should all have scores for every task type', () => {
      const taskTypes: TaskType[] = ['chat', 'code', 'analysis', 'creative', 'extraction'];
      for (const model of modelProfiles) {
        for (const task of taskTypes) {
          expect(model.scores[task]).toBeDefined();
        }
      }
    });
  });
});

export { modelTaskBenchCases, modelProfiles };
export type { ModelTaskBenchCase, ModelProfile, TaskType };
