import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SupabaseEvalCase {
  id: string;
  name: string;
  query: string;
  expectedSource: 'supabase';
  expectedBehavior: string;
  expectedSql?: string;
  expectedFields: string[];
  shouldBlock: boolean;
}

// ---------------------------------------------------------------------------
// Eval Cases
// ---------------------------------------------------------------------------

const supabaseOnlyCases: SupabaseEvalCase[] = [
  {
    id: 'supa-schema-001',
    name: 'Schema inspection',
    query: 'List all tables and their columns in the database',
    expectedSource: 'supabase',
    expectedBehavior: 'schema_inspection',
    expectedSql: 'SELECT table_name, column_name FROM information_schema.columns',
    expectedFields: ['tables', 'columns', 'types', 'relationships'],
    shouldBlock: false,
  },
  {
    id: 'supa-simple-002',
    name: 'Simple SELECT query',
    query: 'Show me all active users created in the last 30 days',
    expectedSource: 'supabase',
    expectedBehavior: 'simple_query',
    expectedSql: "SELECT * FROM users WHERE status = 'active' AND created_at > now() - interval '30 days'",
    expectedFields: ['rows', 'rowCount', 'executionTimeMs'],
    shouldBlock: false,
  },
  {
    id: 'supa-agg-003',
    name: 'Aggregation query',
    query: 'What is the total revenue grouped by month for 2025?',
    expectedSource: 'supabase',
    expectedBehavior: 'aggregation',
    expectedSql: "SELECT date_trunc('month', created_at) as month, SUM(amount) as total FROM orders WHERE created_at >= '2025-01-01' GROUP BY month ORDER BY month",
    expectedFields: ['aggregateResult', 'groupByKeys', 'chartData'],
    shouldBlock: false,
  },
  {
    id: 'supa-join-004',
    name: 'Join query across tables',
    query: 'Show orders with their customer names and product details',
    expectedSource: 'supabase',
    expectedBehavior: 'join_query',
    expectedSql: 'SELECT o.id, c.name, p.title, o.amount FROM orders o JOIN customers c ON o.customer_id = c.id JOIN products p ON o.product_id = p.id',
    expectedFields: ['rows', 'joinedTables', 'rowCount'],
    shouldBlock: false,
  },
  {
    id: 'supa-safety-005',
    name: 'Safety guard trigger for destructive query',
    query: 'Delete all records from the users table',
    expectedSource: 'supabase',
    expectedBehavior: 'safety_guard',
    expectedSql: undefined,
    expectedFields: ['blocked', 'reason', 'suggestion', 'riskLevel'],
    shouldBlock: true,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Supabase-Only Eval Cases', () => {
  describe('case definitions', () => {
    it('should have exactly 5 test cases', () => {
      expect(supabaseOnlyCases).toHaveLength(5);
    });

    it('should have unique case IDs', () => {
      const ids = supabaseOnlyCases.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should all target the supabase source', () => {
      for (const c of supabaseOnlyCases) {
        expect(c.expectedSource).toBe('supabase');
      }
    });
  });

  describe('schema inspection case', () => {
    const schemaCase = supabaseOnlyCases.find((c) => c.expectedBehavior === 'schema_inspection')!;

    it('should query information_schema', () => {
      expect(schemaCase.expectedSql).toContain('information_schema');
    });

    it('should expect tables and columns', () => {
      expect(schemaCase.expectedFields).toContain('tables');
      expect(schemaCase.expectedFields).toContain('columns');
    });

    it('should not be blocked by safety guard', () => {
      expect(schemaCase.shouldBlock).toBe(false);
    });
  });

  describe('simple query case', () => {
    const simpleCase = supabaseOnlyCases.find((c) => c.expectedBehavior === 'simple_query')!;

    it('should generate a SELECT query', () => {
      expect(simpleCase.expectedSql).toMatch(/^SELECT/);
    });

    it('should expect rows and row count', () => {
      expect(simpleCase.expectedFields).toContain('rows');
      expect(simpleCase.expectedFields).toContain('rowCount');
    });
  });

  describe('aggregation case', () => {
    const aggCase = supabaseOnlyCases.find((c) => c.expectedBehavior === 'aggregation')!;

    it('should use GROUP BY in the expected SQL', () => {
      expect(aggCase.expectedSql).toMatch(/GROUP BY/i);
    });

    it('should expect chart data for visualization', () => {
      expect(aggCase.expectedFields).toContain('chartData');
    });
  });

  describe('join query case', () => {
    const joinCase = supabaseOnlyCases.find((c) => c.expectedBehavior === 'join_query')!;

    it('should use JOIN in the expected SQL', () => {
      expect(joinCase.expectedSql).toMatch(/JOIN/i);
    });

    it('should expect joined table names', () => {
      expect(joinCase.expectedFields).toContain('joinedTables');
    });
  });

  describe('safety guard case', () => {
    const safetyCase = supabaseOnlyCases.find((c) => c.expectedBehavior === 'safety_guard')!;

    it('should be marked as blocked', () => {
      expect(safetyCase.shouldBlock).toBe(true);
    });

    it('should not have expected SQL (blocked before execution)', () => {
      expect(safetyCase.expectedSql).toBeUndefined();
    });

    it('should expect risk level and reason', () => {
      expect(safetyCase.expectedFields).toContain('blocked');
      expect(safetyCase.expectedFields).toContain('reason');
      expect(safetyCase.expectedFields).toContain('riskLevel');
    });

    it('should provide a safer alternative suggestion', () => {
      expect(safetyCase.expectedFields).toContain('suggestion');
    });
  });
});

export { supabaseOnlyCases };
export type { SupabaseEvalCase };
