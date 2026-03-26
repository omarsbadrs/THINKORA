/**
 * Encryption utilities — AES-256-GCM encrypt / decrypt, SHA-256 hashing,
 * and key generation using the Node.js `crypto` module.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

// ---------------------------------------------------------------------------
// Encrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt `plaintext` with a hex-encoded 32-byte `key` using AES-256-GCM.
 *
 * Returns a single string: `iv:authTag:ciphertext` (all hex-encoded).
 */
export function encrypt(plaintext: string, key: string): string {
  const keyBuf = Buffer.from(key, "hex");
  if (keyBuf.length !== 32) {
    throw new Error("Encryption key must be exactly 32 bytes (64 hex chars).");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuf, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

// ---------------------------------------------------------------------------
// Decrypt
// ---------------------------------------------------------------------------

/**
 * Decrypt a string produced by `encrypt` using the same hex-encoded key.
 */
export function decrypt(ciphertext: string, key: string): string {
  const keyBuf = Buffer.from(key, "hex");
  if (keyBuf.length !== 32) {
    throw new Error("Encryption key must be exactly 32 bytes (64 hex chars).");
  }

  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format. Expected iv:authTag:data.");
  }

  const [ivHex, authTagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, keyBuf, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * Return the hex-encoded SHA-256 digest of `secret`.
 */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random 32-byte hex string suitable for use as
 * an AES-256 key.
 */
export function generateKey(): string {
  return randomBytes(32).toString("hex");
}
