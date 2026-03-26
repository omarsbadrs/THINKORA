import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpreadsheetEvalCase {
  id: string;
  name: string;
  query: string;
  expectedBehavior: string;
  inputSchema: {
    columns: string[];
    rowCount: number;
    sampleData: Record<string, unknown>[];
  };
  expectedFields: string[];
  expectedAnalysisType: string;
}

// ---------------------------------------------------------------------------
// Eval Cases
// ---------------------------------------------------------------------------

const spreadsheetCases: SpreadsheetEvalCase[] = [
  {
    id: 'sheet-columns-001',
    name: 'Column analysis and type inference',
    query: 'Describe the structure and data types of each column in this spreadsheet',
    expectedBehavior: 'column_analysis',
    inputSchema: {
      columns: ['id', 'name', 'email', 'signup_date', 'plan', 'mrr'],
      rowCount: 1200,
      sampleData: [
        { id: 1, name: 'Alice', email: 'alice@example.com', signup_date: '2025-01-15', plan: 'pro', mrr: 49.99 },
        { id: 2, name: 'Bob', email: 'bob@test.co', signup_date: '2025-03-22', plan: 'free', mrr: 0 },
      ],
    },
    expectedFields: ['columnName', 'inferredType', 'nullCount', 'uniqueCount', 'sampleValues'],
    expectedAnalysisType: 'structural',
  },
  {
    id: 'sheet-stats-002',
    name: 'Statistical summary generation',
    query: 'Generate statistical summary for the revenue and user count columns',
    expectedBehavior: 'statistical_summary',
    inputSchema: {
      columns: ['month', 'revenue', 'user_count', 'churn_rate', 'nps_score'],
      rowCount: 24,
      sampleData: [
        { month: '2024-01', revenue: 45000, user_count: 1200, churn_rate: 0.032, nps_score: 72 },
        { month: '2024-02', revenue: 48500, user_count: 1350, churn_rate: 0.028, nps_score: 75 },
      ],
    },
    expectedFields: ['mean', 'median', 'stddev', 'min', 'max', 'percentiles', 'histogram'],
    expectedAnalysisType: 'statistical',
  },
  {
    id: 'sheet-pattern-003',
    name: 'Pattern detection and trend analysis',
    query: 'Identify any trends or patterns in the monthly sales data',
    expectedBehavior: 'pattern_detection',
    inputSchema: {
      columns: ['date', 'region', 'product', 'units_sold', 'revenue'],
      rowCount: 365,
      sampleData: [
        { date: '2025-01-01', region: 'US-East', product: 'Widget A', units_sold: 150, revenue: 7500 },
        { date: '2025-01-02', region: 'US-West', product: 'Widget B', units_sold: 89, revenue: 5340 },
      ],
    },
    expectedFields: ['trends', 'seasonality', 'outliers', 'correlations', 'growthRate'],
    expectedAnalysisType: 'analytical',
  },
  {
    id: 'sheet-quality-004',
    name: 'Data quality assessment',
    query: 'Assess the data quality of this spreadsheet and flag issues',
    expectedBehavior: 'data_quality',
    inputSchema: {
      columns: ['customer_id', 'name', 'email', 'phone', 'country', 'last_purchase'],
      rowCount: 5000,
      sampleData: [
        { customer_id: 'C001', name: 'Jane Smith', email: 'jane@test.com', phone: '+1-555-0123', country: 'US', last_purchase: '2025-11-03' },
        { customer_id: 'C002', name: '', email: 'invalid-email', phone: null, country: 'XX', last_purchase: '2099-01-01' },
      ],
    },
    expectedFields: ['qualityScore', 'missingValues', 'invalidFormats', 'duplicates', 'anomalies', 'recommendations'],
    expectedAnalysisType: 'quality',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Spreadsheet Eval Cases', () => {
  describe('case definitions', () => {
    it('should have exactly 4 test cases', () => {
      expect(spreadsheetCases).toHaveLength(4);
    });

    it('should have unique case IDs', () => {
      const ids = spreadsheetCases.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should all have input schemas with columns and sample data', () => {
      for (const c of spreadsheetCases) {
        expect(c.inputSchema.columns.length).toBeGreaterThan(0);
        expect(c.inputSchema.sampleData.length).toBeGreaterThan(0);
        expect(c.inputSchema.rowCount).toBeGreaterThan(0);
      }
    });

    it('should have distinct analysis types', () => {
      const types = spreadsheetCases.map((c) => c.expectedAnalysisType);
      expect(new Set(types).size).toBe(types.length);
    });
  });

  describe('column analysis case', () => {
    const colCase = spreadsheetCases.find((c) => c.expectedBehavior === 'column_analysis')!;

    it('should expect type inference for each column', () => {
      expect(colCase.expectedFields).toContain('inferredType');
      expect(colCase.expectedFields).toContain('columnName');
    });

    it('should expect null and unique counts', () => {
      expect(colCase.expectedFields).toContain('nullCount');
      expect(colCase.expectedFields).toContain('uniqueCount');
    });

    it('should have sample data that matches declared columns', () => {
      const sampleKeys = Object.keys(colCase.inputSchema.sampleData[0]);
      for (const key of sampleKeys) {
        expect(colCase.inputSchema.columns).toContain(key);
      }
    });
  });

  describe('statistical summary case', () => {
    const statsCase = spreadsheetCases.find((c) => c.expectedBehavior === 'statistical_summary')!;

    it('should expect common statistical measures', () => {
      expect(statsCase.expectedFields).toContain('mean');
      expect(statsCase.expectedFields).toContain('median');
      expect(statsCase.expectedFields).toContain('stddev');
      expect(statsCase.expectedFields).toContain('min');
      expect(statsCase.expectedFields).toContain('max');
    });

    it('should expect percentiles and histogram', () => {
      expect(statsCase.expectedFields).toContain('percentiles');
      expect(statsCase.expectedFields).toContain('histogram');
    });

    it('should have numeric columns in sample data', () => {
      const sample = statsCase.inputSchema.sampleData[0];
      const numericValues = Object.values(sample).filter((v) => typeof v === 'number');
      expect(numericValues.length).toBeGreaterThan(0);
    });
  });

  describe('pattern detection case', () => {
    const patternCase = spreadsheetCases.find((c) => c.expectedBehavior === 'pattern_detection')!;

    it('should expect trend and seasonality analysis', () => {
      expect(patternCase.expectedFields).toContain('trends');
      expect(patternCase.expectedFields).toContain('seasonality');
    });

    it('should expect outlier detection', () => {
      expect(patternCase.expectedFields).toContain('outliers');
    });

    it('should have sufficient row count for pattern analysis', () => {
      expect(patternCase.inputSchema.rowCount).toBeGreaterThanOrEqual(30);
    });
  });

  describe('data quality case', () => {
    const qualityCase = spreadsheetCases.find((c) => c.expectedBehavior === 'data_quality')!;

    it('should expect a quality score', () => {
      expect(qualityCase.expectedFields).toContain('qualityScore');
    });

    it('should detect common data issues', () => {
      expect(qualityCase.expectedFields).toContain('missingValues');
      expect(qualityCase.expectedFields).toContain('invalidFormats');
      expect(qualityCase.expectedFields).toContain('duplicates');
    });

    it('should provide recommendations', () => {
      expect(qualityCase.expectedFields).toContain('recommendations');
    });

    it('should have sample data with intentional quality issues', () => {
      const badSample = qualityCase.inputSchema.sampleData[1];
      // The second sample row has empty name, invalid email, null phone, bad country, future date
      expect(badSample.name).toBe('');
      expect(badSample.phone).toBeNull();
    });
  });
});

export { spreadsheetCases };
export type { SpreadsheetEvalCase };
