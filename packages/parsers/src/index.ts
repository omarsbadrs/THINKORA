/**
 * @thinkora/parsers — Entry point.
 * Factory function for obtaining the right parser and re-exports of all types.
 */

// Types and base class
export {
  BaseParser,
  ParseResult,
  ParserError,
  Section,
  TableData,
} from "./base";

// File type detection
export { detectFileType, FileType } from "./detect-file-type";

// Normalization
export { normalizeParseResult, NormalizedDocument } from "./normalize";

// Individual parsers
export { PdfParser } from "./pdf";
export { DocxParser } from "./docx";
export { TxtParser } from "./txt";
export { MdParser } from "./md";
export { CsvParser } from "./csv";
export { XlsxParser } from "./xlsx";
export { JsonParser } from "./json";
export { HtmlParser } from "./html";
export { XmlParser } from "./xml";
export { CodeParser } from "./code";
export { ImageParser } from "./image";
export { ArchiveParser } from "./archive";

// Parser imports for factory
import { BaseParser } from "./base";
import { FileType } from "./detect-file-type";
import { PdfParser } from "./pdf";
import { DocxParser } from "./docx";
import { TxtParser } from "./txt";
import { MdParser } from "./md";
import { CsvParser } from "./csv";
import { XlsxParser } from "./xlsx";
import { JsonParser } from "./json";
import { HtmlParser } from "./html";
import { XmlParser } from "./xml";
import { CodeParser } from "./code";
import { ImageParser } from "./image";
import { ArchiveParser } from "./archive";

/**
 * Factory function that returns the appropriate parser for a given file type.
 *
 * @param fileType - The detected file type (from detectFileType or a known string).
 * @returns An instance of the matching BaseParser subclass.
 * @throws Error if the file type is "unknown" or unsupported.
 *
 * @example
 * ```ts
 * import { getParser, detectFileType } from "@thinkora/parsers";
 *
 * const fileType = detectFileType("report.pdf");
 * const parser = getParser(fileType);
 * const result = await parser.parse(buffer, "report.pdf");
 * ```
 */
export function getParser(fileType: FileType): BaseParser {
  switch (fileType) {
    case "pdf":
      return new PdfParser();
    case "docx":
      return new DocxParser();
    case "txt":
      return new TxtParser();
    case "md":
      return new MdParser();
    case "csv":
      return new CsvParser();
    case "xlsx":
      return new XlsxParser();
    case "json":
      return new JsonParser();
    case "html":
      return new HtmlParser();
    case "xml":
      return new XmlParser();
    case "code":
      return new CodeParser();
    case "image":
      return new ImageParser();
    case "archive":
      return new ArchiveParser();
    case "unknown":
      throw new Error(
        `Cannot create parser for unknown file type. Use detectFileType() to identify the file first, or ensure the file has a recognized extension.`
      );
    default: {
      // Exhaustive check — TypeScript will error if a FileType case is missing
      const _exhaustive: never = fileType;
      throw new Error(`Unhandled file type: ${_exhaustive}`);
    }
  }
}
