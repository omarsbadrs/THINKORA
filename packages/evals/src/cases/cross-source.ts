import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrossSourceEvalCase {
  id: string;
  name: string;
  query: string;
  expectedSources: string[];
  expectedBehavior: string;
  expectedSteps: string[];
  expectedFields: string[];
  mergeStrategy: 'union' | 'intersection' | 'prioritized';
}

// ---------------------------------------------------------------------------
// Eval Cases
// ---------------------------------------------------------------------------

const crossSourceCases: CrossSourceEvalCase[] = [
  {
    id: 'cross-file-notion-001',
    name: 'File + Notion: corroborate document with wiki',
    query: 'Compare the uploaded project proposal PDF with the Notion project spec page',
    expectedSources: ['files', 'notion'],
    expectedBehavior: 'file_notion_cross',
    expectedSteps: [
      'retrieve_file_content',
      'search_notion_page',
      'retrieve_notion_content',
      'compare_and_synthesize',
    ],
    expectedFields: ['comparison', 'discrepancies', 'citations', 'synthesizedSummary'],
    mergeStrategy: 'union',
  },
  {
    id: 'cross-notion-supa-002',
    name: 'Notion + Supabase: verify wiki data against database',
    query: 'Check if the pricing listed on the Notion pricing page matches the prices in the products table',
    expectedSources: ['notion', 'supabase'],
    expectedBehavior: 'notion_supabase_cross',
    expectedSteps: [
      'search_notion_page',
      'extract_pricing_data',
      'query_supabase_products',
      'compare_values',
    ],
    expectedFields: ['matches', 'mismatches', 'notionData', 'supabaseData', 'recommendation'],
    mergeStrategy: 'intersection',
  },
  {
    id: 'cross-all-003',
    name: 'All sources: comprehensive research across files, Notion, and Supabase',
    query: 'Give me a complete picture of Project Alpha including uploaded docs, Notion pages, and database records',
    expectedSources: ['files', 'notion', 'supabase'],
    expectedBehavior: 'all_sources_cross',
    expectedSteps: [
      'search_files',
      'search_notion',
      'query_supabase',
      'deduplicate',
      'synthesize_response',
    ],
    expectedFields: [
      'fileResults',
      'notionResults',
      'supabaseResults',
      'synthesizedSummary',
      'citations',
      'confidence',
    ],
    mergeStrategy: 'prioritized',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Cross-Source Eval Cases', () => {
  describe('case definitions', () => {
    it('should have exactly 3 test cases', () => {
      expect(crossSourceCases).toHaveLength(3);
    });

    it('should have unique case IDs', () => {
      const ids = crossSourceCases.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should each reference at least 2 sources', () => {
      for (const c of crossSourceCases) {
        expect(c.expectedSources.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('file + notion case', () => {
    const fileNotionCase = crossSourceCases.find((c) => c.expectedBehavior === 'file_notion_cross')!;

    it('should target files and notion', () => {
      expect(fileNotionCase.expectedSources).toContain('files');
      expect(fileNotionCase.expectedSources).toContain('notion');
    });

    it('should include compare and synthesize step', () => {
      expect(fileNotionCase.expectedSteps).toContain('compare_and_synthesize');
    });

    it('should expect discrepancies in output', () => {
      expect(fileNotionCase.expectedFields).toContain('discrepancies');
    });

    it('should use union merge strategy', () => {
      expect(fileNotionCase.mergeStrategy).toBe('union');
    });
  });

  describe('notion + supabase case', () => {
    const notionSupaCase = crossSourceCases.find(
      (c) => c.expectedBehavior === 'notion_supabase_cross',
    )!;

    it('should target notion and supabase', () => {
      expect(notionSupaCase.expectedSources).toContain('notion');
      expect(notionSupaCase.expectedSources).toContain('supabase');
    });

    it('should include value comparison step', () => {
      expect(notionSupaCase.expectedSteps).toContain('compare_values');
    });

    it('should expect matches and mismatches', () => {
      expect(notionSupaCase.expectedFields).toContain('matches');
      expect(notionSupaCase.expectedFields).toContain('mismatches');
    });

    it('should use intersection merge strategy', () => {
      expect(notionSupaCase.mergeStrategy).toBe('intersection');
    });
  });

  describe('all sources case', () => {
    const allCase = crossSourceCases.find((c) => c.expectedBehavior === 'all_sources_cross')!;

    it('should target all three sources', () => {
      expect(allCase.expectedSources).toContain('files');
      expect(allCase.expectedSources).toContain('notion');
      expect(allCase.expectedSources).toContain('supabase');
      expect(allCase.expectedSources).toHaveLength(3);
    });

    it('should include a deduplication step', () => {
      expect(allCase.expectedSteps).toContain('deduplicate');
    });

    it('should expect results from each source', () => {
      expect(allCase.expectedFields).toContain('fileResults');
      expect(allCase.expectedFields).toContain('notionResults');
      expect(allCase.expectedFields).toContain('supabaseResults');
    });

    it('should use prioritized merge strategy', () => {
      expect(allCase.mergeStrategy).toBe('prioritized');
    });

    it('should expect confidence score', () => {
      expect(allCase.expectedFields).toContain('confidence');
    });
  });
});

export { crossSourceCases };
export type { CrossSourceEvalCase };
