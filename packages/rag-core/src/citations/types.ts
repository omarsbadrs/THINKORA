/**
 * Citation types — shared between rag-core and ui-contracts.
 */

export interface Citation {
  /** ID of the source file or chunk. */
  sourceId: string;
  /** Human-readable source name (file name). */
  sourceName: string;
  /** Type of source (e.g. "pdf", "docx", "spreadsheet", "webpage"). */
  sourceType: string;
  /** The cited text excerpt from the source. */
  text: string;
  /** How relevant this citation is to the answer (0-1). */
  relevanceScore: number;
  /** Page number within the source, if applicable. */
  pageNumber?: number;
  /** Section or heading title within the source, if applicable. */
  sectionTitle?: string;
}
