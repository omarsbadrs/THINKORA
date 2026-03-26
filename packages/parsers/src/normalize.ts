/**
 * Normalization utilities for parse results.
 * Cleans whitespace, deduplicates sections, validates structure,
 * and ensures consistent format.
 */

import { ParseResult, Section, TableData } from "./base";

export interface NormalizedDocument {
  text: string;
  sections: Section[];
  tables: TableData[];
  metadata: Record<string, unknown>;
  warnings: string[];
  confidence: number;
  unsupportedRegions: string[];
  pageCount?: number;
  wordCount: number;
  sectionCount: number;
  tableCount: number;
}

/**
 * Normalizes a ParseResult into a clean, consistent NormalizedDocument.
 */
export function normalizeParseResult(result: ParseResult): NormalizedDocument {
  // Clean and normalize raw text
  const text = cleanWhitespace(result.rawText);

  // Deduplicate and clean sections
  const sections = deduplicateSections(
    result.sections.map((section) => ({
      ...section,
      title: cleanWhitespace(section.title),
      content: cleanWhitespace(section.content),
    }))
  ).filter((section) => section.title.length > 0 || section.content.length > 0);

  // Clean tables
  const tables = result.tables
    .map((table) => cleanTable(table))
    .filter((table) => table.headers.length > 0 || table.rows.length > 0);

  // Validate and clean metadata
  const metadata = cleanMetadata(result.metadata);

  // Deduplicate warnings
  const warnings = [...new Set(result.warnings)];

  // Deduplicate unsupported regions
  const unsupportedRegions = [...new Set(result.unsupportedRegions)];

  // Compute word count from the normalized text
  const wordCount = countWords(text);

  // Clamp confidence to [0, 1]
  const confidence = Math.max(0, Math.min(1, result.parserConfidence));

  return {
    text,
    sections,
    tables,
    metadata,
    warnings,
    confidence,
    unsupportedRegions,
    pageCount: result.pageCount,
    wordCount,
    sectionCount: sections.length,
    tableCount: tables.length,
  };
}

/**
 * Cleans excessive whitespace while preserving intentional structure.
 */
function cleanWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\r/g, "\n")
    .replace(/\t/g, "  ") // Tabs to spaces
    .replace(/[ \t]+$/gm, "") // Trailing whitespace per line
    .replace(/^\s+$/gm, "") // Lines that are only whitespace
    .replace(/\n{4,}/g, "\n\n\n") // Max 3 consecutive newlines
    .replace(/^ +/gm, (match) => match) // Preserve leading indentation
    .trim();
}

/**
 * Deduplicates sections by title and content.
 * Merges sections with identical titles by combining their content.
 */
function deduplicateSections(sections: Section[]): Section[] {
  const seen = new Map<string, Section>();
  const result: Section[] = [];

  for (const section of sections) {
    const key = `${section.level}:${section.title}`;
    const existing = seen.get(key);

    if (existing) {
      // If same title and level, check if content is genuinely different
      if (
        existing.content !== section.content &&
        !existing.content.includes(section.content)
      ) {
        // Merge content
        existing.content =
          existing.content + "\n\n" + section.content;
      }
      // Otherwise skip duplicate
    } else {
      const clone = { ...section };
      seen.set(key, clone);
      result.push(clone);
    }
  }

  return result;
}

/**
 * Cleans a table by trimming cell values and ensuring consistent column counts.
 */
function cleanTable(table: TableData): TableData {
  const headers = table.headers.map((h) => h.trim());
  const columnCount = headers.length;

  const rows = table.rows.map((row) => {
    const cleaned = row.map((cell) => cell.trim());
    // Pad or truncate to match header count
    if (columnCount > 0) {
      while (cleaned.length < columnCount) {
        cleaned.push("");
      }
      if (cleaned.length > columnCount) {
        cleaned.length = columnCount;
      }
    }
    return cleaned;
  });

  // Remove completely empty rows
  const nonEmptyRows = rows.filter((row) =>
    row.some((cell) => cell.length > 0)
  );

  return {
    headers,
    rows: nonEmptyRows,
    sheetName: table.sheetName,
    pageNumber: table.pageNumber,
  };
}

/**
 * Validates and cleans metadata, removing undefined/null values
 * and ensuring all values are serializable.
 */
function cleanMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;

    if (typeof value === "function") continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      // Recursively clean nested objects
      cleaned[key] = cleanMetadata(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Counts words in a text string.
 */
function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}
