/**
 * @thinkora/security — Re-export all public API.
 */

export { encrypt, decrypt, hashSecret, generateKey } from "./encryption";

export {
  Permission,
  hasPermission,
  requirePermission,
  getDefaultPermissions,
  type PermissionUser,
} from "./permissions";

export {
  isSafeQuery,
  sanitizeInput,
  validateQueryReadOnly,
  DANGEROUS_PATTERNS,
} from "./sql-guards";

export {
  validateUpload,
  type UploadFile,
  type ValidationResult,
} from "./upload-validation";

export {
  AuditAction,
  createAuditEntry,
  formatAuditLog,
  type AuditEntry,
} from "./audit";
