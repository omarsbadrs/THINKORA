/**
 * Markdown parser using marked.
 * Extracts heading-based sections, code blocks, and tables.
 */

import { marked, Token, Tokens } from "marked";
import { BaseParser, ParseResult, Section, TableData } from "./base";

export class MdParser extends BaseParser {
  constructor() {
    super("MdParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const text = buffer.toString("utf-8");
      result.rawText = text;

      // Use marked lexer to tokenize the markdown
      const tokens = marked.lexer(text);

      // Extract sections based on headings
      result.sections = this.extractSections(tokens);

      // Extract tables
      result.tables = this.extractTables(tokens);

      // Extract code blocks as unsupported regions (for reference)
      const codeBlocks = this.extractCodeBlocks(tokens);
      if (codeBlocks.length > 0) {
        result.metadata.codeBlocks = codeBlocks;
      }

      result.metadata = {
        ...result.metadata,
        format: "markdown",
        headingCount: result.sections.filter((s) => s.title !== "").length,
        tableCount: result.tables.length,
        characterCount: text.length,
        lineCount: text.split("\n").length,
      };

      result.parserConfidence = text.trim().length > 0 ? 0.9 : 0.5;

      if (text.trim().length === 0) {
        result.warnings.push("Markdown file is empty.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse Markdown: ${message}`, fileName);
    }

    return result;
  }

  private extractSections(tokens: Token[]): Section[] {
    const sections: Section[] = [];
    let currentSection: Section | null = null;

    for (const token of tokens) {
      if (token.type === "heading") {
        const heading = token as Tokens.Heading;
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: heading.text,
          content: "",
          level: heading.depth,
        };
      } else {
        const textContent = this.tokenToText(token);
        if (currentSection) {
          currentSection.content += (currentSection.content ? "\n" : "") + textContent;
        } else {
          // Content before first heading
          if (textContent.trim()) {
            currentSection = {
              title: "",
              content: textContent,
              level: 0,
            };
          }
        }
      }
    }

    // Push last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private extractTables(tokens: Token[]): TableData[] {
    const tables: TableData[] = [];

    for (const token of tokens) {
      if (token.type === "table") {
        const tableToken = token as Tokens.Table;
        const headers = tableToken.header.map((cell) => cell.text);
        const rows = tableToken.rows.map((row) => row.map((cell) => cell.text));

        tables.push({ headers, rows });
      }
    }

    return tables;
  }

  private extractCodeBlocks(tokens: Token[]): Array<{ lang: string; code: string }> {
    const codeBlocks: Array<{ lang: string; code: string }> = [];

    for (const token of tokens) {
      if (token.type === "code") {
        const codeToken = token as Tokens.Code;
        codeBlocks.push({
          lang: codeToken.lang ?? "unknown",
          code: codeToken.text,
        });
      }
    }

    return codeBlocks;
  }

  private tokenToText(token: Token): string {
    switch (token.type) {
      case "paragraph":
        return (token as Tokens.Paragraph).text;
      case "text":
        return (token as Tokens.Text).text;
      case "code":
        return `[Code: ${(token as Tokens.Code).lang ?? "unknown"}]\n${(token as Tokens.Code).text}`;
      case "blockquote":
        return `> ${(token as Tokens.Blockquote).text}`;
      case "list": {
        const list = token as Tokens.List;
        return list.items.map((item) => `- ${item.text}`).join("\n");
      }
      case "space":
        return "";
      case "hr":
        return "---";
      case "html":
        return (token as Tokens.HTML).text;
      default:
        if ("text" in token && typeof (token as Record<string, unknown>).text === "string") {
          return (token as { text: string }).text;
        }
        return "";
    }
  }
}
