/**
 * XML parser.
 * Performs basic XML text extraction and identifies element structure.
 */

import { BaseParser, ParseResult, Section } from "./base";

export class XmlParser extends BaseParser {
  constructor() {
    super("XmlParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const text = buffer.toString("utf-8");
      result.rawText = this.stripXmlTags(text);

      // Identify root element
      const rootMatch = text.match(/<([a-zA-Z_][\w.-]*)\b/);
      const rootElement = rootMatch ? rootMatch[1] : "unknown";

      // Extract XML declaration info
      const declMatch = text.match(/<\?xml\s+([^?]*)\?>/);
      if (declMatch) {
        const versionMatch = declMatch[1].match(/version="([^"]+)"/);
        const encodingMatch = declMatch[1].match(/encoding="([^"]+)"/);
        if (versionMatch) result.metadata.xmlVersion = versionMatch[1];
        if (encodingMatch) result.metadata.encoding = encodingMatch[1];
      }

      // Identify top-level child elements as sections
      result.sections = this.extractTopLevelElements(text, rootElement);

      // Identify unique element names for structure analysis
      const elementNames = new Set<string>();
      const elementRegex = /<([a-zA-Z_][\w.-]*)\b/g;
      let match: RegExpExecArray | null;
      while ((match = elementRegex.exec(text)) !== null) {
        elementNames.add(match[1]);
      }

      // Count element occurrences
      const elementCounts: Record<string, number> = {};
      for (const name of elementNames) {
        const countRegex = new RegExp(`<${this.escapeRegex(name)}[\\s>]`, "g");
        const matches = text.match(countRegex);
        elementCounts[name] = matches ? matches.length : 0;
      }

      result.metadata = {
        ...result.metadata,
        format: "xml",
        rootElement,
        elementNames: Array.from(elementNames),
        elementCounts,
        characterCount: text.length,
        textContentLength: result.rawText.length,
      };

      // Check for namespaces
      const nsRegex = /xmlns(?::(\w+))?="([^"]+)"/g;
      const namespaces: Record<string, string> = {};
      let nsMatch: RegExpExecArray | null;
      while ((nsMatch = nsRegex.exec(text)) !== null) {
        const prefix = nsMatch[1] ?? "default";
        namespaces[prefix] = nsMatch[2];
      }
      if (Object.keys(namespaces).length > 0) {
        result.metadata.namespaces = namespaces;
      }

      result.parserConfidence = result.rawText.trim().length > 0 ? 0.8 : 0.4;

      if (result.rawText.trim().length === 0) {
        result.warnings.push("No text content found in XML document.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse XML: ${message}`, fileName);
    }

    return result;
  }

  /**
   * Strips all XML/HTML tags, returning only text content.
   */
  private stripXmlTags(xml: string): string {
    return xml
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") // Preserve CDATA content
      .replace(/<!--[\s\S]*?-->/g, "") // Remove comments
      .replace(/<\?[\s\S]*?\?>/g, "") // Remove processing instructions
      .replace(/<[^>]+>/g, " ") // Remove tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Extracts direct children of the root element as sections.
   */
  private extractTopLevelElements(xml: string, rootElement: string): Section[] {
    const sections: Section[] = [];

    // Remove XML declaration and comments
    const cleaned = xml
      .replace(/<\?[\s\S]*?\?>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim();

    // Try to find children of root element
    const rootOpenRegex = new RegExp(
      `<${this.escapeRegex(rootElement)}[^>]*>([\\s\\S]*)</${this.escapeRegex(rootElement)}>`,
      "i"
    );
    const rootMatch = cleaned.match(rootOpenRegex);
    if (!rootMatch) {
      // Self-closing root or malformed; return entire content as one section
      if (this.stripXmlTags(cleaned).trim()) {
        sections.push({
          title: rootElement,
          content: this.stripXmlTags(cleaned),
          level: 1,
        });
      }
      return sections;
    }

    const innerContent = rootMatch[1];

    // Match top-level child elements (non-greedy, non-nested approach)
    const childRegex = /<([a-zA-Z_][\w.-]*)\b[^>]*>([\s\S]*?)<\/\1>/g;
    let childMatch: RegExpExecArray | null;
    const seen = new Set<number>();

    while ((childMatch = childRegex.exec(innerContent)) !== null) {
      // Avoid nested matches by checking if this start position is inside a previously matched range
      if (seen.has(childMatch.index)) continue;
      seen.add(childMatch.index);

      const elementName = childMatch[1];
      const elementContent = this.stripXmlTags(childMatch[2]).trim();

      if (elementContent.length > 0) {
        sections.push({
          title: elementName,
          content: elementContent,
          level: 1,
        });
      }
    }

    // Also handle self-closing elements with attributes as sections
    const selfClosingRegex = /<([a-zA-Z_][\w.-]*)\b([^>]*?)\/>/g;
    let selfMatch: RegExpExecArray | null;
    while ((selfMatch = selfClosingRegex.exec(innerContent)) !== null) {
      const attrs = selfMatch[2].trim();
      if (attrs) {
        sections.push({
          title: selfMatch[1],
          content: `Attributes: ${attrs}`,
          level: 1,
        });
      }
    }

    return sections;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
