/**
 * PDF parser using pdf-parse.
 * Extracts text content, attempts page splitting, and collects metadata.
 */

import pdfParse from "pdf-parse";
import { BaseParser, ParseResult, Section } from "./base";

export class PdfParser extends BaseParser {
  constructor() {
    super("PdfParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const data = await pdfParse(buffer);

      result.rawText = data.text;
      result.pageCount = data.numpages;

      // Extract metadata
      result.metadata = {
        title: data.info?.Title ?? undefined,
        author: data.info?.Author ?? undefined,
        subject: data.info?.Subject ?? undefined,
        creator: data.info?.Creator ?? undefined,
        producer: data.info?.Producer ?? undefined,
        pages: data.numpages,
        pdfVersion: data.version ?? undefined,
      };

      // Clean undefined values from metadata
      for (const key of Object.keys(result.metadata)) {
        if (result.metadata[key] === undefined) {
          delete result.metadata[key];
        }
      }

      // Attempt to split text by page markers
      // pdf-parse sometimes inserts form feed characters between pages
      const pages = data.text.split(/\f/);

      if (pages.length > 1) {
        result.sections = pages
          .map((pageText: string, index: number): Section | null => {
            const trimmed = pageText.trim();
            if (!trimmed) return null;
            return {
              title: `Page ${index + 1}`,
              content: trimmed,
              level: 1,
              pageNumber: index + 1,
            };
          })
          .filter((s: Section | null): s is Section => s !== null);
      } else {
        // No page markers found; split by double newlines as paragraphs
        const paragraphs = data.text.split(/\n\s*\n/).filter((p: string) => p.trim());
        if (paragraphs.length > 0) {
          result.sections = paragraphs.map((para: string, index: number): Section => ({
            title: `Section ${index + 1}`,
            content: para.trim(),
            level: 1,
            pageNumber: 1,
          }));
        }
      }

      // Confidence based on text extraction quality
      if (result.rawText.trim().length === 0) {
        result.parserConfidence = 0.2;
        result.warnings.push(
          "No text content extracted. The PDF may be image-based and require OCR."
        );
      } else if (result.rawText.length < 50) {
        result.parserConfidence = 0.5;
        result.warnings.push("Very little text extracted. Content may be incomplete.");
      } else {
        result.parserConfidence = 0.9;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse PDF: ${message}`, fileName);
    }

    return result;
  }
}
