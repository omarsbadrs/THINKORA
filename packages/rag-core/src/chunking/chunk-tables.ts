/**
 * Table-aware chunking — turns structured table data into chunks that
 * preserve header context so each row is independently meaningful.
 */

import type { Chunk } from "./chunk-text";

// Re-use the parser TableData type inline so this package can stay
// lightweight when imported without @thinkora/parsers at runtime.
export interface TableData {
  headers: string[];
  rows: string[][];
  sheetName?: string;
  pageNumber?: number;
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format a single row as a human-readable key-value string using the
 * table headers, e.g.:
 *   "Name: Alice | Age: 30 | Role: Engineer"
 */
function formatRow(headers: string[], row: string[]): string {
  return headers
    .map((h, i) => `${h}: ${row[i] ?? ""}`)
    .join(" | ");
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Convert a single table into chunks — one chunk per row.
 *
 * Each chunk's content includes the header context so the embedding
 * captures full meaning.  Metadata records the sheet name and page
 * number when available.
 */
export function chunkTable(table: TableData): Chunk[] {
  const { headers, rows, sheetName, pageNumber } = table;

  if (!rows.length) return [];

  const headerLine = `Headers: ${headers.join(" | ")}`;

  return rows.map((row, idx) => {
    const rowContent = formatRow(headers, row);
    const content = `${headerLine}\n${rowContent}`;

    return {
      content,
      position: idx,
      tokenCount: estimateTokens(content),
      metadata: {
        type: "table-row",
        rowIndex: idx,
        ...(sheetName != null && { sheetName }),
        ...(pageNumber != null && { pageNumber }),
      },
    };
  });
}

/**
 * Chunk a multi-sheet spreadsheet.  Each sheet is chunked independently
 * and the resulting chunks are concatenated with positions renumbered
 * so they form a continuous sequence.
 */
export function chunkSpreadsheet(tables: TableData[]): Chunk[] {
  const allChunks: Chunk[] = [];
  let globalPosition = 0;

  for (const table of tables) {
    const tableChunks = chunkTable(table);
    for (const chunk of tableChunks) {
      allChunks.push({
        ...chunk,
        position: globalPosition,
      });
      globalPosition++;
    }
  }

  return allChunks;
}
