/**
 * Image parser.
 * Extracts metadata (dimensions from buffer header) and provides an OCR placeholder.
 */

import { BaseParser, ParseResult } from "./base";

interface ImageDimensions {
  width: number;
  height: number;
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

export class ImageParser extends BaseParser {
  constructor() {
    super("ImageParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const ext = this.getExtension(fileName);
      const mimeType = IMAGE_EXTENSIONS[ext] ?? "image/unknown";

      // Extract dimensions from buffer header
      const dimensions = this.extractDimensions(buffer, ext);

      result.metadata = {
        format: "image",
        mimeType,
        extension: ext,
        fileSize: buffer.length,
        fileSizeHuman: this.formatFileSize(buffer.length),
      };

      if (dimensions) {
        result.metadata.width = dimensions.width;
        result.metadata.height = dimensions.height;
        result.metadata.aspectRatio = +(dimensions.width / dimensions.height).toFixed(3);
      }

      result.sections.push({
        title: "Image File",
        content: dimensions
          ? `Image: ${dimensions.width}x${dimensions.height} pixels, ${mimeType}, ${this.formatFileSize(buffer.length)}`
          : `Image: ${mimeType}, ${this.formatFileSize(buffer.length)}`,
        level: 1,
      });

      result.rawText = `[Image: ${fileName}]`;

      // OCR placeholder
      const ocrEnabled = process.env.OCR_ENABLED === "true";
      if (ocrEnabled) {
        result.warnings.push(
          "OCR processing is enabled but not yet implemented. Text extraction from images will be available in a future update."
        );
        result.unsupportedRegions.push("ocr-text-extraction");
      } else {
        result.warnings.push(
          "OCR not configured. Set OCR_ENABLED=true to enable text extraction from images."
        );
      }

      result.parserConfidence = 0.4; // Low confidence since we can't extract text content
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse image: ${message}`, fileName);
    }

    return result;
  }

  private getExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    return lastDot !== -1 ? fileName.slice(lastDot).toLowerCase() : "";
  }

  /**
   * Extracts image dimensions by reading format-specific header bytes.
   */
  private extractDimensions(buffer: Buffer, ext: string): ImageDimensions | null {
    try {
      switch (ext) {
        case ".png":
          return this.getPngDimensions(buffer);
        case ".jpg":
        case ".jpeg":
          return this.getJpegDimensions(buffer);
        case ".gif":
          return this.getGifDimensions(buffer);
        case ".bmp":
          return this.getBmpDimensions(buffer);
        case ".webp":
          return this.getWebpDimensions(buffer);
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  private getPngDimensions(buffer: Buffer): ImageDimensions | null {
    // PNG: width at byte 16 (4 bytes BE), height at byte 20 (4 bytes BE)
    if (buffer.length < 24) return null;
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50) return null; // PNG magic

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  private getJpegDimensions(buffer: Buffer): ImageDimensions | null {
    // JPEG: search for SOF0 marker (0xFF 0xC0) or SOF2 (0xFF 0xC2)
    if (buffer.length < 4) return null;
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null; // JPEG magic

    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }

      const marker = buffer[offset + 1];

      // SOF markers: C0, C1, C2, C3 (most common is C0)
      if (marker >= 0xc0 && marker <= 0xc3) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }

      // Skip marker segment
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
      } else {
        const segLen = buffer.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      }
    }

    return null;
  }

  private getGifDimensions(buffer: Buffer): ImageDimensions | null {
    // GIF: width at byte 6 (2 bytes LE), height at byte 8 (2 bytes LE)
    if (buffer.length < 10) return null;
    const magic = buffer.toString("ascii", 0, 3);
    if (magic !== "GIF") return null;

    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    return { width, height };
  }

  private getBmpDimensions(buffer: Buffer): ImageDimensions | null {
    // BMP: width at byte 18 (4 bytes LE), height at byte 22 (4 bytes LE)
    if (buffer.length < 26) return null;
    if (buffer[0] !== 0x42 || buffer[1] !== 0x4d) return null; // BM magic

    const width = buffer.readInt32LE(18);
    const height = Math.abs(buffer.readInt32LE(22)); // height can be negative
    return { width, height };
  }

  private getWebpDimensions(buffer: Buffer): ImageDimensions | null {
    // WebP: RIFF header, then VP8 chunk
    if (buffer.length < 30) return null;
    const riff = buffer.toString("ascii", 0, 4);
    const webp = buffer.toString("ascii", 8, 12);
    if (riff !== "RIFF" || webp !== "WEBP") return null;

    const format = buffer.toString("ascii", 12, 16);

    if (format === "VP8 " && buffer.length >= 30) {
      // Lossy WebP
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }

    if (format === "VP8L" && buffer.length >= 25) {
      // Lossless WebP
      const bits = buffer.readUInt32LE(21);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >> 14) & 0x3fff) + 1;
      return { width, height };
    }

    if (format === "VP8X" && buffer.length >= 30) {
      // Extended WebP
      const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
      const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
      return { width, height };
    }

    return null;
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
