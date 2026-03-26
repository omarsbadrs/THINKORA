/**
 * CSV parser using csv-parse.
 * Extracts headers and rows as TableData.
 */

import { parse } from "csv-parse/sync";
import { BaseParser, ParseResult, TableData } from "./base";

export class CsvParser extends BaseParser {
  constructor() {
    super("CsvParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const text = buffer.toString("utf-8");
      result.rawText = text;

      // Detect delimiter
      const delimiter = this.detectDelimiter(text);

      // Parse CSV
      const records: string[][] = parse(text, {
        delimiter,
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
      });

      if (records.length === 0) {
        result.warnings.push("CSV file is empty or contains no parseable rows.");
        result.parserConfidence = 0.3;
        return result;
      }

      // First row is headers
      const headers = records[0];
      const rows = records.slice(1);

      const tableData: TableData = {
        headers,
        rows,
      };

      result.tables.push(tableData);

      // Create a text summary as the primary section
      result.sections.push({
        title: "CSV Data",
        content: `${headers.length} columns, ${rows.length} rows.\nColumns: ${headers.join(", ")}`,
        level: 1,
      });

      result.metadata = {
        format: "csv",
        delimiter,
        columnCount: headers.length,
        rowCount: rows.length,
        columns: headers,
      };

      result.parserConfidence = 0.9;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse CSV: ${message}`, fileName);
    }

    return result;
  }

  /**
   * Attempts to detect the delimiter used in the CSV content.
   */
  private detectDelimiter(text: string): string {
    const firstLine = text.split("\n")[0] ?? "";
    const candidates = [",", "\t", ";", "|"];
    let bestDelimiter = ",";
    let maxCount = 0;

    for (const delim of candidates) {
      const count = (firstLine.match(new RegExp(this.escapeRegex(delim), "g")) ?? []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delim;
      }
    }

    return bestDelimiter;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
