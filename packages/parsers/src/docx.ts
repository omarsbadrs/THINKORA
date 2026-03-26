/**
 * DOCX parser using mammoth.
 * Converts DOCX to HTML, extracts text and heading structure.
 */

import mammoth from "mammoth";
import { BaseParser, ParseResult, Section } from "./base";

export class DocxParser extends BaseParser {
  constructor() {
    super("DocxParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const mammothResult = await mammoth.convertToHtml({ buffer });

      // Collect any mammoth warnings
      if (mammothResult.messages && mammothResult.messages.length > 0) {
        for (const msg of mammothResult.messages) {
          result.warnings.push(`mammoth: ${msg.message}`);
        }
      }

      const html = mammothResult.value;

      // Extract raw text by stripping all HTML tags
      result.rawText = stripHtmlTags(html);

      // Extract sections from headings
      result.sections = extractSectionsFromHtml(html);

      // If no headings found, fall back to paragraph splitting
      if (result.sections.length === 0 && result.rawText.trim().length > 0) {
        const paragraphs = result.rawText
          .split(/\n\s*\n/)
          .filter((p) => p.trim().length > 0);

        result.sections = paragraphs.map((para, index) => ({
          title: `Paragraph ${index + 1}`,
          content: para.trim(),
          level: 1,
        }));
      }

      // Extract metadata using mammoth's raw text extractor
      const rawResult = await mammoth.extractRawText({ buffer });
      result.metadata = {
        format: "docx",
        htmlLength: html.length,
        textLength: rawResult.value.length,
      };

      // Set confidence
      if (result.rawText.trim().length === 0) {
        result.parserConfidence = 0.3;
        result.warnings.push("No text content extracted from DOCX.");
      } else {
        result.parserConfidence = 0.85;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse DOCX: ${message}`, fileName);
    }

    return result;
  }
}

/**
 * Strips HTML tags and decodes common entities, returning plain text.
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extracts sections from HTML headings (h1-h6).
 */
function extractSectionsFromHtml(html: string): Section[] {
  const sections: Section[] = [];
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let match: RegExpExecArray | null;

  // Split HTML by headings to get content between headings
  const parts = html.split(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/i);

  const headings: Array<{ level: number; title: string }> = [];
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1], 10),
      title: stripHtmlTags(match[2]),
    });
  }

  for (let i = 0; i < headings.length; i++) {
    const contentPart = parts[i + 1] ?? "";
    const content = stripHtmlTags(contentPart).trim();

    sections.push({
      title: headings[i].title.trim(),
      content,
      level: headings[i].level,
    });
  }

  return sections;
}
