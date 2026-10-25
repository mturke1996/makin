import {
  ALL_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  PERMISSION_TEMPLATES,
  expenseScope,
  normalizePermissions,
  permissionDef,
  togglePermission,
  type Permission,
  type PermissionTemplate,
  type Role,
  type Scope,
} from '../../../core/access';

/**
 * Pure helpers behind the users screen: how an account's access reads in one line, which template a
 * set of permissions equals, and what a single switch changed. No React, no Firebase.
 */

/** "3 صلاحيات", with the Arabic number forms (1, 2, 3-10, 11+). */
export function permissionCountLabel(count: number): string {
  if (count <= 0) return 'بلا صلاحيات';
  if (count === 1) return 'صلاحية واحدة';
  if (count === 2) return 'صلاحيتان';
  return count <= 10 ? `${count} صلاحيات` : `${count} صلاحية`;
}

/** The template whose permissions equal this set exactly (order and duplicates do not matter). */
export function matchTemplate(permissions: unknown): PermissionTemplate | null {
  const selected = normalizePermissions(permissions);
  return (
    PERMISSION_TEMPLATES.find((template) => {
      const wanted = normalizePermissions(template.permissions);
      return wanted.length === selected.length && wanted.every((id, i) => id === selected[i]);
    }) ?? null
  );
}

/** What a set of permissions lets an employee see in the expense lists. */
export function expenseVisibility(permissions: unknown): Scope {
  return expenseScope({ id: 'preview', role: 'employee', permissions: new Set(normalizePermissions(permissions)) });
}

export const EXPENSE_VISIBILITY_LABEL: Record<Scope, string> = {
  all: 'يرى مصروفات الجميع',
  own: 'يرى مصروفاته فقط',
  none: 'لا يرى المصروفات',
};

export type AccessKind = 'admin' | 'default' | 'template' | 'custom' | 'none';

export interface AccessDescription {
  kind: AccessKind;
  /** One short line: "كل الصلاحيات", "الافتراضي", the template name, or "7 صلاحيات". */
  label: string;
  count: number;
  permissions: Permission[];
  template: PermissionTemplate | null;
  expenses: Scope;
}

/**
 * How an account's access reads at a glance. `stored` is the `permissions` field of the profile:
 * a profile without a list gets the default employee set (and says so), an admin has everything.
 */
export function describeAccess(role: Role, stored: unknown): AccessDescription {
  if (role === 'admin') {
    return {
      kind: 'admin',
      label: 'كل الصلاحيات',
      count: ALL_PERMISSIONS.length,
      permissions: [...ALL_PERMISSIONS],
      template: null,
      expenses: 'all',
    };
  }
  if (!Array.isArray(stored)) {
    const permissions = [...DEFAULT_EMPLOYEE_PERMISSIONS];
    return {
      kind: 'default',
      label: 'الافتراضي',
      count: permissions.length,
      permissions,
      template: matchTemplate(permissions),
      expenses: expenseVisibility(permissions),
    };
  }
  const permissions = normalizePermissions(stored);
  const template = matchTemplate(permissions);
  const kind: AccessKind = template ? 'template' : permissions.length === 0 ? 'none' : 'custom';
  return {
    kind,
    label: template ? template.label : permissionCountLabel(permissions.length),
    count: permissions.length,
    permissions,
    template,
    expenses: expenseVisibility(permissions),
  };
}

/** "«أ»", "«أ» و«ب»", "«أ»، «ب» و«ج»". */
function quotedList(ids: readonly Permission[]): string {
  const names = ids.map((id) => `«${permissionDef(id).label}»`);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join('، ')} و${names[names.length - 1]}`;
}

export interface ToggleResult {
  next: Permission[];
  /** Other permissions the switch turned on (prerequisites) or off (dependents). */
  alsoChanged: Permission[];
  /** Helper text for the person editing, or null when only the tapped switch moved. */
  note: string | null;
}

/** Flips one permission through `togglePermission` and explains any knock-on change. */
export function applyToggle(current: readonly Permission[], id: Permission, on: boolean): ToggleResult {
  const before = new Set(current);
  const next = togglePermission(current, id, on);
  const after = new Set(next);
  const alsoChanged = on
    ? next.filter((p) => p !== id && !before.has(p))
    : [...before].filter((p) => p !== id && !after.has(p));
  const label = permissionDef(id).label;
  let note: string | null = null;
  if (alsoChanged.length > 0) {
    note = on
      ? `تفعيل «${label}» فعّل ${quotedList(alsoChanged)} تلقائياً`
      : `إيقاف «${label}» أوقف ${quotedList(alsoChanged)} أيضاً`;
  }
  return { next, alsoChanged, note };
}
