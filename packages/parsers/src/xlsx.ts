/**
 * XLSX/XLS parser using xlsx (SheetJS).
 * Reads all sheets and extracts each as TableData with headers from the first row.
 */

import * as XLSX from "xlsx";
import { BaseParser, ParseResult, TableData } from "./base";

export class XlsxParser extends BaseParser {
  constructor() {
    super("XlsxParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        result.warnings.push("Workbook contains no sheets.");
        result.parserConfidence = 0.3;
        return result;
      }

      const allText: string[] = [];

      for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        // Convert sheet to array of arrays
        const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        });

        if (data.length === 0) {
          result.warnings.push(`Sheet "${sheetName}" is empty.`);
          continue;
        }

        // First row as headers
        const headers = data[0].map((cell) => String(cell ?? ""));
        const rows = data.slice(1).map((row) =>
          row.map((cell) => String(cell ?? ""))
        );

        // Filter out completely empty rows
        const nonEmptyRows = rows.filter((row) =>
          row.some((cell) => cell.trim().length > 0)
        );

        const tableData: TableData = {
          headers,
          rows: nonEmptyRows,
          sheetName,
        };

        result.tables.push(tableData);

        // Build text representation
        const sheetText = [
          `[Sheet: ${sheetName}]`,
          headers.join("\t"),
          ...nonEmptyRows.map((row) => row.join("\t")),
        ].join("\n");

        allText.push(sheetText);

        // Add a section per sheet
        result.sections.push({
          title: sheetName,
          content: `${headers.length} columns, ${nonEmptyRows.length} rows.\nColumns: ${headers.join(", ")}`,
          level: 1,
        });
      }

      result.rawText = allText.join("\n\n");

      result.metadata = {
        format: "xlsx",
        sheetCount: sheetNames.length,
        sheetNames,
        totalTables: result.tables.length,
      };

      result.parserConfidence = 0.9;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse spreadsheet: ${message}`, fileName);
    }

    return result;
  }
}
