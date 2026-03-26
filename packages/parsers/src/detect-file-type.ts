/**
 * Detects the parser type for a given file based on extension and optional MIME type.
 */

export type FileType =
  | "pdf"
  | "docx"
  | "txt"
  | "md"
  | "csv"
  | "xlsx"
  | "json"
  | "html"
  | "xml"
  | "code"
  | "image"
  | "archive"
  | "unknown";

const EXTENSION_MAP: Record<string, FileType> = {
  // Documents
  ".pdf": "pdf",
  ".docx": "docx",
  ".txt": "txt",
  ".text": "txt",
  ".log": "txt",
  ".md": "md",
  ".markdown": "md",
  ".mdx": "md",

  // Data
  ".csv": "csv",
  ".tsv": "csv",
  ".xlsx": "xlsx",
  ".xls": "xlsx",

  // Structured
  ".json": "json",
  ".jsonl": "json",
  ".jsonc": "json",
  ".html": "html",
  ".htm": "html",
  ".xml": "xml",
  ".xhtml": "xml",
  ".svg": "xml",

  // Code
  ".js": "code",
  ".jsx": "code",
  ".ts": "code",
  ".tsx": "code",
  ".py": "code",
  ".rb": "code",
  ".java": "code",
  ".c": "code",
  ".cpp": "code",
  ".h": "code",
  ".hpp": "code",
  ".cs": "code",
  ".go": "code",
  ".rs": "code",
  ".swift": "code",
  ".kt": "code",
  ".scala": "code",
  ".php": "code",
  ".sh": "code",
  ".bash": "code",
  ".zsh": "code",
  ".ps1": "code",
  ".sql": "code",
  ".r": "code",
  ".lua": "code",
  ".perl": "code",
  ".pl": "code",
  ".yaml": "code",
  ".yml": "code",
  ".toml": "code",
  ".ini": "code",
  ".cfg": "code",
  ".conf": "code",
  ".env": "code",
  ".dockerfile": "code",
  ".makefile": "code",
  ".cmake": "code",
  ".gradle": "code",
  ".vue": "code",
  ".svelte": "code",

  // Images
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".gif": "image",
  ".bmp": "image",
  ".tiff": "image",
  ".tif": "image",
  ".webp": "image",
  ".ico": "image",

  // Archives
  ".zip": "archive",
  ".tar": "archive",
  ".gz": "archive",
  ".tgz": "archive",
  ".bz2": "archive",
  ".7z": "archive",
  ".rar": "archive",
  ".xz": "archive",
};

const MIME_TYPE_MAP: Record<string, FileType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xlsx",
  "application/json": "json",
  "text/html": "html",
  "application/xml": "xml",
  "text/xml": "xml",
  "image/png": "image",
  "image/jpeg": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/bmp": "image",
  "image/tiff": "image",
  "application/zip": "archive",
  "application/x-tar": "archive",
  "application/gzip": "archive",
  "application/x-7z-compressed": "archive",
  "application/x-rar-compressed": "archive",
};

/**
 * Detects the parser type for a given file.
 * Uses extension as primary detection, falls back to MIME type.
 */
export function detectFileType(fileName: string, mimeType?: string): FileType {
  // Extract extension from file name
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot !== -1) {
    const ext = fileName.slice(lastDot).toLowerCase();
    const typeFromExt = EXTENSION_MAP[ext];
    if (typeFromExt) {
      return typeFromExt;
    }
  }

  // Handle special file names without extensions
  const baseName = fileName.split("/").pop()?.split("\\").pop()?.toLowerCase() ?? "";
  if (baseName === "dockerfile" || baseName === "makefile" || baseName === "cmakelists.txt") {
    return "code";
  }

  // Fall back to MIME type
  if (mimeType) {
    const normalizedMime = mimeType.toLowerCase().split(";")[0].trim();
    const typeFromMime = MIME_TYPE_MAP[normalizedMime];
    if (typeFromMime) {
      return typeFromMime;
    }

    // Generic MIME type checks
    if (normalizedMime.startsWith("text/")) {
      return "txt";
    }
    if (normalizedMime.startsWith("image/")) {
      return "image";
    }
  }

  return "unknown";
}
