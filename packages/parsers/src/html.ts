/**
 * HTML parser using jsdom.
 * Strips tags to extract text, extracts headings as sections, and extracts tables.
 */

import { JSDOM } from "jsdom";
import { BaseParser, ParseResult, Section, TableData } from "./base";

export class HtmlParser extends BaseParser {
  constructor() {
    super("HtmlParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const text = buffer.toString("utf-8");
      const dom = new JSDOM(text);
      const document = dom.window.document;

      // Extract raw text from body
      const body = document.body;
      result.rawText = body ? body.textContent?.trim() ?? "" : "";

      // Extract title
      const titleEl = document.querySelector("title");
      if (titleEl) {
        result.metadata.title = titleEl.textContent?.trim() ?? "";
      }

      // Extract meta tags
      const metaTags = document.querySelectorAll("meta");
      metaTags.forEach((meta) => {
        const name =
          meta.getAttribute("name") ??
          meta.getAttribute("property") ??
          meta.getAttribute("http-equiv");
        const content = meta.getAttribute("content");
        if (name && content) {
          result.metadata[`meta:${name}`] = content;
        }
      });

      // Extract sections from headings
      result.sections = this.extractSections(document);

      // If no headings, create sections from paragraphs
      if (result.sections.length === 0 && result.rawText.length > 0) {
        const paragraphs = document.querySelectorAll("p");
        if (paragraphs.length > 0) {
          paragraphs.forEach((p, index) => {
            const content = p.textContent?.trim() ?? "";
            if (content.length > 0) {
              result.sections.push({
                title: `Paragraph ${index + 1}`,
                content,
                level: 1,
              });
            }
          });
        } else {
          result.sections.push({
            title: "Content",
            content: result.rawText,
            level: 1,
          });
        }
      }

      // Extract tables
      result.tables = this.extractTables(document);

      result.metadata = {
        ...result.metadata,
        format: "html",
        characterCount: text.length,
        textLength: result.rawText.length,
        headingCount: result.sections.length,
        tableCount: result.tables.length,
      };

      result.parserConfidence = result.rawText.length > 0 ? 0.85 : 0.3;

      if (result.rawText.length === 0) {
        result.warnings.push("No text content found in HTML document.");
      }

      // Clean up
      dom.window.close();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse HTML: ${message}`, fileName);
    }

    return result;
  }

  private extractSections(document: Document): Section[] {
    const sections: Section[] = [];
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1), 10);
      const title = heading.textContent?.trim() ?? "";

      // Collect content until the next heading of same or higher level
      let content = "";
      let sibling = heading.nextElementSibling;
      while (sibling) {
        if (/^H[1-6]$/.test(sibling.tagName)) {
          const siblingLevel = parseInt(sibling.tagName.charAt(1), 10);
          if (siblingLevel <= level) break;
        }
        content += (sibling.textContent?.trim() ?? "") + "\n";
        sibling = sibling.nextElementSibling;
      }

      sections.push({
        title,
        content: content.trim(),
        level,
      });
    });

    return sections;
  }

  private extractTables(document: Document): TableData[] {
    const tables: TableData[] = [];
    const tableElements = document.querySelectorAll("table");

    tableElements.forEach((table) => {
      const headers: string[] = [];
      const rows: string[][] = [];

      // Extract headers from thead or first tr
      const thead = table.querySelector("thead");
      if (thead) {
        const ths = thead.querySelectorAll("th, td");
        ths.forEach((th) => {
          headers.push(th.textContent?.trim() ?? "");
        });
      }

      // Extract rows from tbody or all tr elements
      const tbody = table.querySelector("tbody") ?? table;
      const trs = tbody.querySelectorAll("tr");

      trs.forEach((tr, rowIndex) => {
        const cells: string[] = [];
        const tds = tr.querySelectorAll("td, th");

        // If no thead was found, use first row as headers
        if (headers.length === 0 && rowIndex === 0) {
          tds.forEach((td) => {
            headers.push(td.textContent?.trim() ?? "");
          });
          return;
        }

        tds.forEach((td) => {
          cells.push(td.textContent?.trim() ?? "");
        });

        if (cells.length > 0) {
          rows.push(cells);
        }
      });

      if (headers.length > 0 || rows.length > 0) {
        tables.push({ headers, rows });
      }
    });

    return tables;
  }
}
