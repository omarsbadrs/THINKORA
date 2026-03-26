// ---------------------------------------------------------------------------
// @thinkora/agent-skills — Spreadsheet Analyst Skill
// ---------------------------------------------------------------------------

import type {
  AgentContext,
  SkillDefinition,
  SkillHandler,
} from "@thinkora/agent-core";

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

export const SpreadsheetAnalystDefinition: SkillDefinition = {
  id: "spreadsheet-analyst",
  name: "Spreadsheet Analyst",
  description:
    "Specialized for CSV/XLSX data. Performs column analysis, statistical " +
    "summaries, pattern detection, and data quality assessment.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Question about the spreadsheet data" },
      retrievedChunks: {
        type: "array",
        description: "Pre-retrieved spreadsheet data chunks",
      },
    },
    required: ["query"],
  },
  outputSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      columns: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string" },
            nonNull: { type: "number" },
            unique: { type: "number" },
            sample: { type: "array", items: { type: "string" } },
          },
        },
      },
      statistics: {
        type: "object",
        properties: {
          rowCount: { type: "number" },
          columnCount: { type: "number" },
          numericSummaries: { type: "object" },
        },
      },
      patterns: { type: "array", items: { type: "string" } },
      dataQuality: {
        type: "object",
        properties: {
          score: { type: "number" },
          issues: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  toolDependencies: ["search_files"],
  failureModes: [
    "Large spreadsheets may only be partially analyzed",
    "Non-standard date/number formats may be misclassified",
    "Merged cells in XLSX files may cause parsing issues",
  ],
  observabilityMetadata: {
    category: "analysis",
    costTier: "low",
    typicalLatencyMs: 1000,
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RetrievedChunk {
  text: string;
  source: string;
  sourceId: string;
  sourceName: string;
  relevanceScore: number;
}

interface ColumnInfo {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "mixed";
  nonNull: number;
  unique: number;
  sample: string[];
}

interface NumericSummary {
  min: number;
  max: number;
  mean: number;
  median: number;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const SpreadsheetAnalystHandler: SkillHandler = async (
  input: unknown,
  _context: AgentContext,
): Promise<unknown> => {
  const { query, retrievedChunks = [] } = input as {
    query: string;
    retrievedChunks?: RetrievedChunk[];
  };

  // Filter to spreadsheet-like chunks
  const sheetChunks = retrievedChunks.filter(
    (c) =>
      c.sourceName.match(/\.(csv|xlsx|xls|tsv)$/i) ||
      c.text.includes("\t") ||
      c.text.includes(","),
  );

  if (sheetChunks.length === 0) {
    return {
      summary: "No spreadsheet data was found matching the query.",
      columns: [],
      statistics: { rowCount: 0, columnCount: 0, numericSummaries: {} },
      patterns: [],
      dataQuality: { score: 0, issues: ["No data available"] },
    };
  }

  // --- Parse tabular data from chunks ---
  const rows = parseTabularData(sheetChunks);
  if (rows.length === 0) {
    return {
      summary: "Spreadsheet data was found but could not be parsed into rows.",
      columns: [],
      statistics: { rowCount: 0, columnCount: 0, numericSummaries: {} },
      patterns: [],
      dataQuality: { score: 0.2, issues: ["Data could not be parsed"] },
    };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // --- Column analysis ---
  const columns: ColumnInfo[] = headers.map((header, colIdx) => {
    const values = dataRows.map((r) => r[colIdx] ?? "").filter((v) => v !== "");
    return {
      name: header,
      type: inferColumnType(values),
      nonNull: values.length,
      unique: new Set(values).size,
      sample: values.slice(0, 5),
    };
  });

  // --- Numeric summaries ---
  const numericSummaries: Record<string, NumericSummary> = {};
  for (const col of columns) {
    if (col.type === "number") {
      const nums = dataRows
        .map((r) => parseFloat(r[headers.indexOf(col.name)] ?? ""))
        .filter((n) => !isNaN(n));
      if (nums.length > 0) {
        nums.sort((a, b) => a - b);
        numericSummaries[col.name] = {
          min: nums[0],
          max: nums[nums.length - 1],
          mean: nums.reduce((s, n) => s + n, 0) / nums.length,
          median: nums[Math.floor(nums.length / 2)],
        };
      }
    }
  }

  // --- Pattern detection ---
  const patterns = detectPatterns(columns, dataRows, headers);

  // --- Data quality assessment ---
  const dataQuality = assessQuality(columns, dataRows);

  // --- Summary ---
  const summary =
    `Analyzed spreadsheet with ${dataRows.length} rows and ${columns.length} columns.\n` +
    `Columns: ${columns.map((c) => `${c.name} (${c.type})`).join(", ")}.\n` +
    (patterns.length > 0 ? `Patterns detected: ${patterns.join("; ")}.` : "");

  return {
    summary,
    columns,
    statistics: {
      rowCount: dataRows.length,
      columnCount: columns.length,
      numericSummaries,
    },
    patterns,
    dataQuality,
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTabularData(chunks: RetrievedChunk[]): string[][] {
  const allRows: string[][] = [];

  for (const chunk of chunks) {
    const lines = chunk.text.split("\n").filter((l) => l.trim().length > 0);
    for (const line of lines) {
      // Try tab-separated first, then comma-separated
      const cells = line.includes("\t")
        ? line.split("\t").map((c) => c.trim())
        : line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cells.length > 1) {
        allRows.push(cells);
      }
    }
  }

  return allRows;
}

function inferColumnType(values: string[]): "string" | "number" | "date" | "boolean" | "mixed" {
  if (values.length === 0) return "string";

  let numCount = 0;
  let dateCount = 0;
  let boolCount = 0;

  for (const v of values) {
    if (!isNaN(Number(v)) && v.trim() !== "") numCount++;
    else if (v.match(/^\d{4}-\d{2}-\d{2}/) || v.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)) dateCount++;
    else if (["true", "false", "yes", "no", "0", "1"].includes(v.toLowerCase())) boolCount++;
  }

  const threshold = values.length * 0.8;
  if (numCount >= threshold) return "number";
  if (dateCount >= threshold) return "date";
  if (boolCount >= threshold) return "boolean";
  if (numCount + dateCount + boolCount > threshold) return "mixed";
  return "string";
}

function detectPatterns(
  columns: ColumnInfo[],
  dataRows: string[][],
  headers: string[],
): string[] {
  const patterns: string[] = [];

  // Detect columns with very low cardinality (likely categorical)
  for (const col of columns) {
    if (col.type === "string" && col.unique <= 10 && col.nonNull > 10) {
      patterns.push(`"${col.name}" appears to be categorical (${col.unique} unique values)`);
    }
  }

  // Detect columns with many nulls
  for (const col of columns) {
    const totalRows = dataRows.length;
    const nullRate = 1 - col.nonNull / totalRows;
    if (nullRate > 0.3) {
      patterns.push(
        `"${col.name}" has ${Math.round(nullRate * 100)}% missing values`,
      );
    }
  }

  // Detect potential ID columns
  for (const col of columns) {
    if (col.unique === col.nonNull && col.nonNull > 5) {
      patterns.push(`"${col.name}" may be a unique identifier column`);
    }
  }

  return patterns;
}

function assessQuality(
  columns: ColumnInfo[],
  dataRows: string[][],
): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 1.0;

  const totalRows = dataRows.length;

  // Check for missing data
  for (const col of columns) {
    const nullRate = 1 - col.nonNull / totalRows;
    if (nullRate > 0.5) {
      issues.push(`Column "${col.name}" is more than 50% empty`);
      score -= 0.1;
    }
  }

  // Check for duplicate rows
  const rowStrings = dataRows.map((r) => r.join("|"));
  const uniqueRows = new Set(rowStrings).size;
  if (uniqueRows < totalRows) {
    const dupRate = 1 - uniqueRows / totalRows;
    issues.push(`${Math.round(dupRate * 100)}% duplicate rows detected`);
    score -= 0.15;
  }

  // Check for very short dataset
  if (totalRows < 5) {
    issues.push("Very small dataset — analysis may not be statistically meaningful");
    score -= 0.1;
  }

  if (issues.length === 0) {
    issues.push("No significant quality issues detected");
  }

  return { score: Math.max(0, Math.round(score * 100) / 100), issues };
}
