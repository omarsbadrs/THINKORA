/**
 * JSON parser.
 * Parses JSON content, extracts top-level keys as sections, and formats structured content.
 */

import { BaseParser, ParseResult, Section, TableData } from "./base";

export class JsonParser extends BaseParser {
  constructor() {
    super("JsonParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const text = buffer.toString("utf-8");
      result.rawText = text;

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Try JSONL (newline-delimited JSON)
        const lines = text.split("\n").filter((l) => l.trim().length > 0);
        const records: unknown[] = [];
        for (const line of lines) {
          try {
            records.push(JSON.parse(line));
          } catch {
            result.warnings.push(`Skipped unparseable JSONL line: ${line.slice(0, 80)}...`);
          }
        }

        if (records.length === 0) {
          throw this.createError("Invalid JSON content", fileName);
        }

        parsed = records;
        result.metadata.format = "jsonl";
      }

      if (Array.isArray(parsed)) {
        // Array at top level
        result.sections.push({
          title: "JSON Array",
          content: `Array with ${parsed.length} items`,
          level: 1,
        });

        // If array of objects with consistent keys, create a table
        const tableData = this.arrayToTable(parsed);
        if (tableData) {
          result.tables.push(tableData);
        }

        // Show first few items as sections
        const previewCount = Math.min(parsed.length, 10);
        for (let i = 0; i < previewCount; i++) {
          result.sections.push({
            title: `Item ${i + 1}`,
            content: this.formatValue(parsed[i], 0),
            level: 2,
          });
        }

        if (parsed.length > previewCount) {
          result.sections.push({
            title: "Truncated",
            content: `${parsed.length - previewCount} more items not shown.`,
            level: 2,
          });
        }

        result.metadata = {
          ...result.metadata,
          type: "array",
          itemCount: parsed.length,
        };
      } else if (parsed !== null && typeof parsed === "object") {
        // Object at top level
        const obj = parsed as Record<string, unknown>;
        const keys = Object.keys(obj);

        result.sections = keys.map((key): Section => ({
          title: key,
          content: this.formatValue(obj[key], 0),
          level: 1,
        }));

        result.metadata = {
          ...result.metadata,
          type: "object",
          topLevelKeys: keys,
          keyCount: keys.length,
        };
      } else {
        // Primitive value
        result.sections.push({
          title: "Value",
          content: String(parsed),
          level: 1,
        });

        result.metadata = {
          ...result.metadata,
          type: typeof parsed,
        };
      }

      if (!result.metadata.format) {
        result.metadata.format = "json";
      }
      result.metadata.characterCount = text.length;

      result.parserConfidence = 0.95;
    } catch (err) {
      if (err instanceof Error && err.name === "ParserError") {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse JSON: ${message}`, fileName);
    }

    return result;
  }

  /**
   * Converts an array of objects with consistent keys into a TableData.
   */
  private arrayToTable(arr: unknown[]): TableData | null {
    if (arr.length === 0) return null;

    // Check if all items are objects with the same keys
    const objects = arr.filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object" && !Array.isArray(item)
    );

    if (objects.length < arr.length * 0.8) return null; // At least 80% must be objects

    // Collect all unique keys
    const keySet = new Set<string>();
    for (const obj of objects) {
      for (const key of Object.keys(obj)) {
        keySet.add(key);
      }
    }

    const headers = Array.from(keySet);
    if (headers.length === 0 || headers.length > 50) return null;

    const rows = objects.map((obj) =>
      headers.map((key) => {
        const val = obj[key];
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      })
    );

    return { headers, rows };
  }

  /**
   * Formats a JSON value as a readable string with indentation.
   */
  private formatValue(value: unknown, depth: number): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    switch (typeof value) {
      case "string":
        return value.length > 500 ? value.slice(0, 500) + "..." : value;
      case "number":
      case "boolean":
        return String(value);
      case "object": {
        if (Array.isArray(value)) {
          if (value.length === 0) return "[]";
          if (depth >= 2) return `[Array: ${value.length} items]`;
          return value
            .slice(0, 5)
            .map((item) => `  ${this.formatValue(item, depth + 1)}`)
            .join("\n");
        }

        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj);
        if (keys.length === 0) return "{}";
        if (depth >= 2) return `{Object: ${keys.length} keys}`;

        return keys
          .slice(0, 20)
          .map((key) => `  ${key}: ${this.formatValue(obj[key], depth + 1)}`)
          .join("\n");
      }
      default:
        return String(value);
    }
  }
}
