import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContradictionEvalCase {
  id: string;
  name: string;
  query: string;
  sourceA: { source: string; claim: string; date: string };
  sourceB: { source: string; claim: string; date: string };
  expectedBehavior: string;
  expectedFields: string[];
  expectedResolution: 'flag_both' | 'prefer_newer' | 'request_clarification';
}

// ---------------------------------------------------------------------------
// Eval Cases
// ---------------------------------------------------------------------------

const contradictionCases: ContradictionEvalCase[] = [
  {
    id: 'contra-conflict-001',
    name: 'Conflicting data between Notion and Supabase',
    query: 'What is the current pricing for the Pro plan?',
    sourceA: {
      source: 'notion',
      claim: 'Pro plan costs $29/month',
      date: '2026-02-15T00:00:00Z',
    },
    sourceB: {
      source: 'supabase',
      claim: 'Pro plan costs $39/month',
      date: '2026-03-01T00:00:00Z',
    },
    expectedBehavior: 'conflicting_data',
    expectedFields: [
      'contradictionDetected',
      'sourceAClaim',
      'sourceBClaim',
      'confidenceA',
      'confidenceB',
      'resolution',
      'explanation',
    ],
    expectedResolution: 'flag_both',
  },
  {
    id: 'contra-outdated-002',
    name: 'Outdated information in uploaded file vs newer database record',
    query: 'How many employees does the company have?',
    sourceA: {
      source: 'files',
      claim: 'Company has 150 employees as of Q3 2025',
      date: '2025-09-30T00:00:00Z',
    },
    sourceB: {
      source: 'supabase',
      claim: 'Current employee count is 187',
      date: '2026-03-20T00:00:00Z',
    },
    expectedBehavior: 'outdated_info',
    expectedFields: [
      'contradictionDetected',
      'staleSource',
      'freshSource',
      'staleDelta',
      'resolution',
      'explanation',
    ],
    expectedResolution: 'prefer_newer',
  },
  {
    id: 'contra-ambiguous-003',
    name: 'Ambiguous results across multiple Notion pages',
    query: 'What is the launch date for Feature X?',
    sourceA: {
      source: 'notion',
      claim: 'Feature X launches April 15, 2026',
      date: '2026-03-10T00:00:00Z',
    },
    sourceB: {
      source: 'notion',
      claim: 'Feature X target is end of Q2 2026',
      date: '2026-03-12T00:00:00Z',
    },
    expectedBehavior: 'ambiguous_results',
    expectedFields: [
      'contradictionDetected',
      'ambiguityType',
      'possibleInterpretations',
      'resolution',
      'clarificationQuestion',
    ],
    expectedResolution: 'request_clarification',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Contradiction Detection Eval Cases', () => {
  describe('case definitions', () => {
    it('should have exactly 3 test cases', () => {
      expect(contradictionCases).toHaveLength(3);
    });

    it('should have unique case IDs', () => {
      const ids = contradictionCases.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should all have source A and source B with claims and dates', () => {
      for (const c of contradictionCases) {
        expect(c.sourceA.claim).toBeTruthy();
        expect(c.sourceA.date).toBeTruthy();
        expect(c.sourceB.claim).toBeTruthy();
        expect(c.sourceB.date).toBeTruthy();
      }
    });

    it('should all expect contradictionDetected in output', () => {
      for (const c of contradictionCases) {
        expect(c.expectedFields).toContain('contradictionDetected');
      }
    });
  });

  describe('conflicting data case', () => {
    const conflictCase = contradictionCases.find((c) => c.expectedBehavior === 'conflicting_data')!;

    it('should involve different sources', () => {
      expect(conflictCase.sourceA.source).not.toBe(conflictCase.sourceB.source);
    });

    it('should flag both sources without picking a winner', () => {
      expect(conflictCase.expectedResolution).toBe('flag_both');
    });

    it('should expect claims from both sources', () => {
      expect(conflictCase.expectedFields).toContain('sourceAClaim');
      expect(conflictCase.expectedFields).toContain('sourceBClaim');
    });

    it('should expect confidence scores for each source', () => {
      expect(conflictCase.expectedFields).toContain('confidenceA');
      expect(conflictCase.expectedFields).toContain('confidenceB');
    });
  });

  describe('outdated info case', () => {
    const outdatedCase = contradictionCases.find((c) => c.expectedBehavior === 'outdated_info')!;

    it('should have a meaningfully older source date for source A', () => {
      const dateA = new Date(outdatedCase.sourceA.date).getTime();
      const dateB = new Date(outdatedCase.sourceB.date).getTime();
      expect(dateB - dateA).toBeGreaterThan(30 * 24 * 60 * 60 * 1000); // > 30 days
    });

    it('should prefer the newer source', () => {
      expect(outdatedCase.expectedResolution).toBe('prefer_newer');
    });

    it('should identify stale and fresh sources', () => {
      expect(outdatedCase.expectedFields).toContain('staleSource');
      expect(outdatedCase.expectedFields).toContain('freshSource');
    });
  });

  describe('ambiguous results case', () => {
    const ambiguousCase = contradictionCases.find(
      (c) => c.expectedBehavior === 'ambiguous_results',
    )!;

    it('should request clarification from the user', () => {
      expect(ambiguousCase.expectedResolution).toBe('request_clarification');
    });

    it('should expect a clarification question', () => {
      expect(ambiguousCase.expectedFields).toContain('clarificationQuestion');
    });

    it('should list possible interpretations', () => {
      expect(ambiguousCase.expectedFields).toContain('possibleInterpretations');
    });

    it('should come from the same source type to show intra-source ambiguity', () => {
      expect(ambiguousCase.sourceA.source).toBe(ambiguousCase.sourceB.source);
    });
  });
});

export { contradictionCases };
export type { ContradictionEvalCase };
