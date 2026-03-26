/**
 * Plain text parser.
 * Splits text by double newlines to create sections.
 */

import { BaseParser, ParseResult } from "./base";

export class TxtParser extends BaseParser {
  constructor() {
    super("TxtParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const text = buffer.toString("utf-8");
      result.rawText = text;

      // Split by double newlines to create sections
      const blocks = text.split(/\n\s*\n/).filter((block) => block.trim().length > 0);

      if (blocks.length > 0) {
        result.sections = blocks.map((block, index) => {
          const trimmed = block.trim();
          // Use the first line as the title if it's short enough
          const lines = trimmed.split("\n");
          const firstLine = lines[0].trim();
          const isShortTitle = firstLine.length <= 100 && lines.length > 1;

          return {
            title: isShortTitle ? firstLine : `Section ${index + 1}`,
            content: isShortTitle ? lines.slice(1).join("\n").trim() : trimmed,
            level: 1,
          };
        });
      }

      result.metadata = {
        format: "txt",
        encoding: "utf-8",
        characterCount: text.length,
        lineCount: text.split("\n").length,
      };

      result.parserConfidence = text.trim().length > 0 ? 0.95 : 0.5;

      if (text.trim().length === 0) {
        result.warnings.push("File is empty or contains only whitespace.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse text file: ${message}`, fileName);
    }

    return result;
  }
}
