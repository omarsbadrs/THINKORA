import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EvalCase {
  id: string;
  name: string;
  query: string;
  expectedSource: 'notion';
  expectedBehavior: string;
  expectedFields: string[];
  timeout?: number;
}

// ---------------------------------------------------------------------------
// Eval Cases
// ---------------------------------------------------------------------------

const notionOnlyCases: EvalCase[] = [
  {
    id: 'notion-search-001',
    name: 'Search for a page by title',
    query: 'Find the product roadmap document in Notion',
    expectedSource: 'notion',
    expectedBehavior: 'search',
    expectedFields: ['title', 'url', 'lastEdited'],
  },
  {
    id: 'notion-page-002',
    name: 'Retrieve full page content',
    query: 'Show me the contents of the Q1 planning page',
    expectedSource: 'notion',
    expectedBehavior: 'page_retrieval',
    expectedFields: ['content', 'blocks', 'metadata'],
  },
  {
    id: 'notion-db-003',
    name: 'Query a Notion database with filters',
    query: 'List all tasks assigned to Alice that are in progress',
    expectedSource: 'notion',
    expectedBehavior: 'database_query',
    expectedFields: ['rows', 'schema', 'filterApplied'],
  },
  {
    id: 'notion-error-004',
    name: 'Handle missing or inaccessible page gracefully',
    query: 'Get the page with ID abc-nonexistent-123',
    expectedSource: 'notion',
    expectedBehavior: 'error_handling',
    expectedFields: ['error', 'errorCode', 'suggestion'],
  },
  {
    id: 'notion-pagination-005',
    name: 'Paginate through large database results',
    query: 'Show all items from the bug tracker database',
    expectedSource: 'notion',
    expectedBehavior: 'pagination',
    expectedFields: ['rows', 'hasMore', 'nextCursor', 'totalCount'],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Notion-Only Eval Cases', () => {
  describe('case definitions', () => {
    it('should have exactly 5 test cases', () => {
      expect(notionOnlyCases).toHaveLength(5);
    });

    it('should have unique case IDs', () => {
      const ids = notionOnlyCases.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should all target the notion source', () => {
      for (const c of notionOnlyCases) {
        expect(c.expectedSource).toBe('notion');
      }
    });
  });

  describe('search case', () => {
    const searchCase = notionOnlyCases.find((c) => c.expectedBehavior === 'search')!;

    it('should define a search query', () => {
      expect(searchCase).toBeDefined();
      expect(searchCase.query).toContain('Find');
    });

    it('should expect title and url in results', () => {
      expect(searchCase.expectedFields).toContain('title');
      expect(searchCase.expectedFields).toContain('url');
    });
  });

  describe('page retrieval case', () => {
    const pageCase = notionOnlyCases.find((c) => c.expectedBehavior === 'page_retrieval')!;

    it('should expect content and blocks in results', () => {
      expect(pageCase.expectedFields).toContain('content');
      expect(pageCase.expectedFields).toContain('blocks');
    });

    it('should have a query referencing specific page content', () => {
      expect(pageCase.query.length).toBeGreaterThan(10);
    });
  });

  describe('database query case', () => {
    const dbCase = notionOnlyCases.find((c) => c.expectedBehavior === 'database_query')!;

    it('should expect rows and schema in results', () => {
      expect(dbCase.expectedFields).toContain('rows');
      expect(dbCase.expectedFields).toContain('schema');
    });

    it('should include filter criteria in the query', () => {
      expect(dbCase.query).toMatch(/assigned|filter|in progress/i);
    });
  });

  describe('error handling case', () => {
    const errorCase = notionOnlyCases.find((c) => c.expectedBehavior === 'error_handling')!;

    it('should expect error fields in response', () => {
      expect(errorCase.expectedFields).toContain('error');
      expect(errorCase.expectedFields).toContain('errorCode');
    });

    it('should expect a suggestion for recovery', () => {
      expect(errorCase.expectedFields).toContain('suggestion');
    });
  });

  describe('pagination case', () => {
    const paginationCase = notionOnlyCases.find((c) => c.expectedBehavior === 'pagination')!;

    it('should expect pagination fields in results', () => {
      expect(paginationCase.expectedFields).toContain('hasMore');
      expect(paginationCase.expectedFields).toContain('nextCursor');
      expect(paginationCase.expectedFields).toContain('totalCount');
    });
  });
});

export { notionOnlyCases };
export type { EvalCase };
