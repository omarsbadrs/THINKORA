/**
 * Archive parser.
 * Lists archive contents and warns that extraction is not yet supported.
 */

import { BaseParser, ParseResult } from "./base";

const ARCHIVE_EXTENSIONS: Record<string, string> = {
  ".zip": "ZIP",
  ".tar": "TAR",
  ".gz": "GZIP",
  ".tgz": "TAR+GZIP",
  ".bz2": "BZIP2",
  ".7z": "7-Zip",
  ".rar": "RAR",
  ".xz": "XZ",
};

export class ArchiveParser extends BaseParser {
  constructor() {
    super("ArchiveParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const ext = this.getExtension(fileName);
      const archiveType = ARCHIVE_EXTENSIONS[ext] ?? "Unknown";

      // Detect archive type from magic bytes
      const detectedType = this.detectArchiveType(buffer);

      result.rawText = `[Archive: ${fileName}]`;

      result.sections.push({
        title: "Archive File",
        content: `Archive type: ${detectedType ?? archiveType}\nFile size: ${this.formatFileSize(buffer.length)}\n\nArchive extraction and content listing is not yet supported.`,
        level: 1,
      });

      // For ZIP files, attempt to list the central directory entries
      if (detectedType === "ZIP" || ext === ".zip") {
        const entries = this.listZipEntries(buffer);
        if (entries.length > 0) {
          result.sections.push({
            title: "Archive Contents",
            content: entries.map((e) => `  ${e}`).join("\n"),
            level: 2,
          });
          result.metadata.entries = entries;
          result.metadata.entryCount = entries.length;
        }
      }

      result.metadata = {
        ...result.metadata,
        format: "archive",
        archiveType: detectedType ?? archiveType,
        extension: ext,
        fileSize: buffer.length,
        fileSizeHuman: this.formatFileSize(buffer.length),
      };

      result.warnings.push(
        "Archive extraction is not yet supported. Only file listing is available for ZIP archives."
      );

      result.unsupportedRegions.push("archive-content-extraction");
      result.parserConfidence = 0.3;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse archive: ${message}`, fileName);
    }

    return result;
  }

  private getExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    return lastDot !== -1 ? fileName.slice(lastDot).toLowerCase() : "";
  }

  /**
   * Detects archive type from magic bytes.
   */
  private detectArchiveType(buffer: Buffer): string | null {
    if (buffer.length < 4) return null;

    // ZIP: PK\x03\x04
    if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
      return "ZIP";
    }

    // GZIP: \x1f\x8b
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
      return "GZIP";
    }

    // 7z: 7z\xbc\xaf\x27\x1c
    if (
      buffer.length >= 6 &&
      buffer[0] === 0x37 &&
      buffer[1] === 0x7a &&
      buffer[2] === 0xbc &&
      buffer[3] === 0xaf &&
      buffer[4] === 0x27 &&
      buffer[5] === 0x1c
    ) {
      return "7-Zip";
    }

    // RAR: Rar!\x1a\x07
    if (
      buffer.length >= 6 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x61 &&
      buffer[2] === 0x72 &&
      buffer[3] === 0x21 &&
      buffer[4] === 0x1a &&
      buffer[5] === 0x07
    ) {
      return "RAR";
    }

    // BZ2: BZ
    if (buffer[0] === 0x42 && buffer[1] === 0x5a) {
      return "BZIP2";
    }

    // XZ: \xfd7zXZ\x00
    if (
      buffer.length >= 6 &&
      buffer[0] === 0xfd &&
      buffer[1] === 0x37 &&
      buffer[2] === 0x7a &&
      buffer[3] === 0x58 &&
      buffer[4] === 0x5a &&
      buffer[5] === 0x00
    ) {
      return "XZ";
    }

    return null;
  }

  /**
   * Attempts to list file entries from a ZIP archive by reading the central directory.
   */
  private listZipEntries(buffer: Buffer): string[] {
    const entries: string[] = [];

    try {
      // Find End of Central Directory record (EOCD)
      // Signature: PK\x05\x06
      let eocdOffset = -1;
      for (let i = buffer.length - 22; i >= 0 && i >= buffer.length - 65557; i--) {
        if (
          buffer[i] === 0x50 &&
          buffer[i + 1] === 0x4b &&
          buffer[i + 2] === 0x05 &&
          buffer[i + 3] === 0x06
        ) {
          eocdOffset = i;
          break;
        }
      }

      if (eocdOffset === -1) return entries;

      const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
      const cdEntries = buffer.readUInt16LE(eocdOffset + 10);

      let offset = cdOffset;
      for (let i = 0; i < cdEntries && offset < buffer.length - 46; i++) {
        // Central directory file header signature: PK\x01\x02
        if (
          buffer[offset] !== 0x50 ||
          buffer[offset + 1] !== 0x4b ||
          buffer[offset + 2] !== 0x01 ||
          buffer[offset + 3] !== 0x02
        ) {
          break;
        }

        const nameLen = buffer.readUInt16LE(offset + 28);
        const extraLen = buffer.readUInt16LE(offset + 30);
        const commentLen = buffer.readUInt16LE(offset + 32);
        const compSize = buffer.readUInt32LE(offset + 20);
        const uncompSize = buffer.readUInt32LE(offset + 24);

        if (offset + 46 + nameLen <= buffer.length) {
          const name = buffer.toString("utf-8", offset + 46, offset + 46 + nameLen);
          entries.push(
            `${name} (${this.formatFileSize(uncompSize)}, compressed: ${this.formatFileSize(compSize)})`
          );
        }

        offset += 46 + nameLen + extraLen + commentLen;
      }
    } catch {
      // If we fail to parse the ZIP structure, just return empty
    }

    return entries;
  }

  private formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }
}
