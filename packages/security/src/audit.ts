/**
 * Audit logging — Structured audit trail for security-relevant actions.
 */

// ---------------------------------------------------------------------------
// Audit action enum
// ---------------------------------------------------------------------------

export enum AuditAction {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  FILE_UPLOAD = "FILE_UPLOAD",
  FILE_DELETE = "FILE_DELETE",
  CONNECTOR_CONNECT = "CONNECTOR_CONNECT",
  CONNECTOR_DISCONNECT = "CONNECTOR_DISCONNECT",
  MODEL_SWITCH = "MODEL_SWITCH",
  MEMORY_EXPORT = "MEMORY_EXPORT",
  MEMORY_CLEAR = "MEMORY_CLEAR",
  PERMISSION_CHANGE = "PERMISSION_CHANGE",
  SETTINGS_UPDATE = "SETTINGS_UPDATE",
  API_KEY_ROTATE = "API_KEY_ROTATE",
  QUERY_EXECUTE = "QUERY_EXECUTE",
}

// ---------------------------------------------------------------------------
// Audit entry type
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _counter = 0;

/**
 * Create a fully-populated audit log entry.  The caller is responsible for
 * persisting it (e.g. inserting into a `audit_log` table).
 */
export function createAuditEntry(params: {
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): AuditEntry {
  _counter += 1;
  return {
    id: `audit-${Date.now()}-${_counter}`,
    timestamp: new Date().toISOString(),
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    metadata: params.metadata,
    ipAddress: params.ipAddress,
  };
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

/**
 * Format an audit entry as a single human-readable log line.
 *
 * Example output:
 *   [2026-03-26T12:00:00Z] LOGIN user=u-001 resource=session/s-001 ip=127.0.0.1
 */
export function formatAuditLog(entry: AuditEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    entry.action,
    `user=${entry.userId}`,
    `resource=${entry.resourceType}/${entry.resourceId}`,
  ];

  if (entry.ipAddress) {
    parts.push(`ip=${entry.ipAddress}`);
  }

  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    parts.push(`meta=${JSON.stringify(entry.metadata)}`);
  }

  return parts.join(" ");
}
