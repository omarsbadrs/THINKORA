/**
 * Upload validation — File upload security checks.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadFile {
  name: string;
  size: number;
  type: string; // MIME type
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** 50 MB default max. */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Allowlisted MIME types. */
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/** Allowlisted file extensions (lowercase, with leading dot). */
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".docx",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
]);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate an incoming file upload against size, MIME type, extension, and
 * filename safety rules.
 */
export function validateUpload(file: UploadFile): ValidationResult {
  const errors: string[] = [];

  // 1. Size check
  if (file.size > MAX_FILE_SIZE) {
    errors.push(
      `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the ${MAX_FILE_SIZE / 1024 / 1024} MB limit.`,
    );
  }
  if (file.size === 0) {
    errors.push("File is empty.");
  }

  // 2. MIME type check
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    errors.push(`MIME type "${file.type}" is not allowed.`);
  }

  // 3. Extension check
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    errors.push(`File extension "${ext}" is not allowed.`);
  }

  // 4. Double extension detection (e.g. "report.pdf.exe")
  if (hasDoubleExtension(file.name)) {
    errors.push(
      "Filename contains a double extension, which may indicate a disguised file.",
    );
  }

  // 5. Null bytes in filename
  if (file.name.includes("\0")) {
    errors.push("Filename contains null bytes.");
  }

  // 6. Path traversal characters
  if (/[/\\]/.test(file.name)) {
    errors.push("Filename contains path separator characters.");
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

function hasDoubleExtension(filename: string): boolean {
  // Strip the final extension and check if the remainder still has one
  const withoutFinal = filename.slice(0, filename.lastIndexOf("."));
  return withoutFinal.includes(".");
}
