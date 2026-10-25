import { ALL_PERMISSIONS, DEFAULT_EMPLOYEE_PERMISSIONS, normalizePermissions, type Permission } from './permissions';

export type Role = 'admin' | 'employee';

/** Who is asking: the signed-in person, reduced to what access decisions need. */
export interface Principal {
  id: string;
  role: Role;
  /** Admins carry every permission, so `can()` never needs a special case. */
  permissions: ReadonlySet<Permission>;
}

export interface PrincipalSource {
  id?: string | null;
  role?: string | null;
  permissions?: unknown;
}

/**
 * Legacy accounts: a profile document with no role is the original owner and counts as admin
 * (the Firestore rules do the same), anything else that is not 'admin' is an employee.
 */
export function normalizeRole(raw?: string | null): Role {
  if (raw == null || raw === '') return 'admin';
  return raw === 'admin' ? 'admin' : 'employee';
}

/** The permissions a stored profile resolves to. A profile with no list gets the default employee set. */
export function resolvePermissions(role: Role, stored: unknown): Permission[] {
  if (role === 'admin') return [...ALL_PERMISSIONS];
  return Array.isArray(stored) ? normalizePermissions(stored) : [...DEFAULT_EMPLOYEE_PERMISSIONS];
}

export function buildPrincipal(source: PrincipalSource | null | undefined): Principal | null {
  if (!source?.id) return null;
  const role = normalizeRole(source.role);
  return { id: source.id, role, permissions: new Set(resolvePermissions(role, source.permissions)) };
}

export const isAdmin = (p: Principal | null | undefined): boolean => p?.role === 'admin';

export const can = (p: Principal | null | undefined, permission: Permission): boolean => !!p && p.permissions.has(permission);

export const canAny = (p: Principal | null | undefined, permissions: readonly Permission[]): boolean =>
  permissions.some((permission) => can(p, permission));

export const canAll = (p: Principal | null | undefined, permissions: readonly Permission[]): boolean =>
  permissions.every((permission) => can(p, permission));
