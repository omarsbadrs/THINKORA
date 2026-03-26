/**
 * Permission system — Role-based access control for Thinkora.
 */

// ---------------------------------------------------------------------------
// Permission enum
// ---------------------------------------------------------------------------

export enum Permission {
  READ = "READ",
  WRITE = "WRITE",
  DELETE = "DELETE",
  ADMIN = "ADMIN",
  MANAGE_CONNECTORS = "MANAGE_CONNECTORS",
  MANAGE_MODELS = "MANAGE_MODELS",
}

// ---------------------------------------------------------------------------
// User shape (minimal)
// ---------------------------------------------------------------------------

export interface PermissionUser {
  id: string;
  role: string;
  permissions?: Permission[];
}

// ---------------------------------------------------------------------------
// Role → default permissions mapping
// ---------------------------------------------------------------------------

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    Permission.READ,
    Permission.WRITE,
    Permission.DELETE,
    Permission.ADMIN,
    Permission.MANAGE_CONNECTORS,
    Permission.MANAGE_MODELS,
  ],
  editor: [
    Permission.READ,
    Permission.WRITE,
    Permission.MANAGE_CONNECTORS,
  ],
  viewer: [Permission.READ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the default set of permissions for a given role name.
 */
export function getDefaultPermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role.toLowerCase()] ?? [Permission.READ];
}

/**
 * Resolve the effective permission set for a user:
 * explicit `user.permissions` if present, otherwise defaults for their role.
 */
function resolvePermissions(user: PermissionUser): Permission[] {
  return user.permissions ?? getDefaultPermissions(user.role);
}

/**
 * Check whether a user holds a specific permission.
 */
export function hasPermission(
  user: PermissionUser,
  permission: Permission,
): boolean {
  return resolvePermissions(user).includes(permission);
}

/**
 * Assert that a user holds a specific permission. Throws if denied.
 */
export function requirePermission(
  user: PermissionUser,
  permission: Permission,
): void {
  if (!hasPermission(user, permission)) {
    throw new Error(
      `Permission denied: user ${user.id} (role=${user.role}) lacks ${permission}`,
    );
  }
}
