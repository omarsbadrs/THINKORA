// ---------------------------------------------------------------------------
// Upload storage utilities (Supabase Storage)
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";

/** Error thrown by storage upload operations. */
export class StorageUploadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "StorageUploadError";
  }
}

/** Validation result for an upload. */
export interface UploadValidation {
  valid: boolean;
  errors: string[];
}

/** Default maximum upload size in megabytes. */
const DEFAULT_MAX_SIZE_MB = 50;

/** Allowed MIME type prefixes for upload validation. */
const ALLOWED_MIME_PREFIXES = [
  "text/",
  "application/pdf",
  "application/json",
  "application/xml",
  "application/vnd.openxmlformats",
  "application/vnd.ms-",
  "application/msword",
  "image/",
  "audio/",
  "video/",
  "application/zip",
  "application/gzip",
  "application/x-tar",
  "application/csv",
];

/**
 * Validates a file before uploading.
 *
 * Checks:
 * - File size does not exceed the maximum
 * - File is not empty
 * - Content type is in the allowed list (if provided)
 */
export function validateUpload(
  file: Blob | File,
  maxSizeMb: number = DEFAULT_MAX_SIZE_MB,
  contentType?: string,
): UploadValidation {
  const errors: string[] = [];

  // Size check
  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    errors.push(
      `File size ${formatBytes(file.size)} exceeds maximum of ${maxSizeMb}MB`,
    );
  }

  // Empty check
  if (file.size === 0) {
    errors.push("File is empty");
  }

  // Content type check
  const mime = contentType ?? (file instanceof File ? file.type : undefined);
  if (mime && !isAllowedMimeType(mime)) {
    errors.push(`Content type "${mime}" is not allowed`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Uploads a file to Supabase Storage.
 *
 * @param supabase    - An authenticated Supabase client.
 * @param bucket      - The storage bucket name.
 * @param key         - The object key (path within the bucket).
 * @param file        - The file blob to upload.
 * @param contentType - MIME type of the file.
 * @returns The storage key of the uploaded file.
 */
export async function uploadToStorage(
  supabase: SupabaseClient,
  bucket: string,
  key: string,
  file: Blob | File,
  contentType: string,
): Promise<string> {
  // Validate first
  const validation = validateUpload(file, DEFAULT_MAX_SIZE_MB, contentType);
  if (!validation.valid) {
    throw new StorageUploadError(
      `Upload validation failed: ${validation.errors.join("; ")}`,
      "VALIDATION_FAILED",
    );
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(key, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    // Handle duplicate key — attempt upsert
    if (error.message?.includes("already exists") || error.message?.includes("Duplicate")) {
      const { data: upsertData, error: upsertError } = await supabase.storage
        .from(bucket)
        .upload(key, file, {
          contentType,
          upsert: true,
        });

      if (upsertError) {
        throw new StorageUploadError(
          `Upload failed (upsert): ${upsertError.message}`,
          "UPLOAD_FAILED",
        );
      }

      return upsertData.path;
    }

    throw new StorageUploadError(
      `Upload failed: ${error.message}`,
      "UPLOAD_FAILED",
    );
  }

  return data.path;
}

/**
 * Generates a signed download URL for a stored file.
 *
 * @param supabase  - An authenticated Supabase client.
 * @param bucket    - The storage bucket name.
 * @param key       - The object key.
 * @param expiresIn - URL expiration in seconds (default 3600 = 1 hour).
 * @returns A signed URL string.
 */
export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(key, expiresIn);

  if (error) {
    throw new StorageUploadError(
      `Failed to generate signed URL: ${error.message}`,
      "SIGNED_URL_FAILED",
    );
  }

  return data.signedUrl;
}

/**
 * Deletes a file from Supabase Storage.
 *
 * @param supabase - An authenticated Supabase client.
 * @param bucket   - The storage bucket name.
 * @param key      - The object key to delete.
 */
export async function deleteFromStorage(
  supabase: SupabaseClient,
  bucket: string,
  key: string,
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([key]);

  if (error) {
    throw new StorageUploadError(
      `Failed to delete file: ${error.message}`,
      "DELETE_FAILED",
    );
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Checks whether a MIME type is in the allowed list. */
function isAllowedMimeType(mime: string): boolean {
  const lower = mime.toLowerCase();
  return ALLOWED_MIME_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/** Formats a byte count into a human-readable string. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
