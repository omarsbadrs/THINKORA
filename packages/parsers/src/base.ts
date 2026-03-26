/**
 * Base parser interface, types, and abstract class for all file parsers.
 */

export interface Section {
  title: string;
  content: string;
  level: number;
  pageNumber?: number;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  sheetName?: string;
  pageNumber?: number;
}

export interface ParseResult {
  rawText: string;
  sections: Section[];
  tables: TableData[];
  metadata: Record<string, unknown>;
  warnings: string[];
  parserConfidence: number;
  unsupportedRegions: string[];
  pageCount?: number;
}

export class ParserError extends Error {
  public readonly parserName: string;
  public readonly fileName: string;

  constructor(message: string, parserName: string, fileName: string) {
    super(message);
    this.name = "ParserError";
    this.parserName = parserName;
    this.fileName = fileName;
    Object.setPrototypeOf(this, ParserError.prototype);
  }
}

export abstract class BaseParser {
  protected readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract parse(buffer: Buffer, fileName: string): Promise<ParseResult>;

  protected createEmptyResult(): ParseResult {
    return {
      rawText: "",
      sections: [],
      tables: [],
      metadata: {},
      warnings: [],
      parserConfidence: 0,
      unsupportedRegions: [],
    };
  }

  protected createError(message: string, fileName: string): ParserError {
    return new ParserError(message, this.name, fileName);
  }
}
