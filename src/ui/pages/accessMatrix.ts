import type { Permission, PermissionGroup, PermissionTemplate } from '../../core/access/permissions';

/** How far a template reaches inside one area: nothing, look only, change, or delete too. */
export type AccessLevel = 'none' | 'view' | 'manage' | 'delete';

export interface TemplateLevel {
  level: AccessLevel;
  /** Short word for a table cell. Empty when the template has nothing in this area. */
  label: string;
}

type Rung = readonly [permission: Permission, label: string, level: Exclude<AccessLevel, 'none'>];

/**
 * Per area, the permissions from the highest rung to the lowest, with the short word that names
 * the reach. The first rung a template holds wins, because every rung includes the ones below it.
 * A test checks that every permission of the catalog is listed here, so a new one cannot be forgotten.
 */
export const LEVEL_RUNGS: Record<PermissionGroup, readonly Rung[]> = {
  clients: [['clients.delete', 'حذف', 'delete'], ['clients.manage', 'تعديل', 'manage'], ['clients.view', 'عرض', 'view']],
  invoices: [['invoices.delete', 'حذف', 'delete'], ['invoices.manage', 'تعديل', 'manage'], ['invoices.view', 'عرض', 'view']],
  payments: [['payments.delete', 'حذف', 'delete'], ['payments.manage', 'تعديل', 'manage'], ['payments.view', 'عرض', 'view']],
  debts: [['debts.delete', 'حذف', 'delete'], ['debts.manage', 'تعديل', 'manage'], ['debts.view', 'عرض', 'view']],
  expenses: [
    ['expenses.delete.all', 'حذف الكل', 'delete'],
    ['expenses.edit.all', 'تعديل الكل', 'manage'],
    ['expenses.view.all', 'عرض الكل', 'view'],
    ['expenses.create', 'مصروفاته فقط', 'view'],
  ],
  workers: [['workers.manage', 'إدارة', 'manage'], ['workers.view', 'عرض', 'view']],
  custody: [['custody.manage', 'عهد الجميع', 'manage'], ['custody.view.own', 'عهدته فقط', 'view']],
  letters: [['letters.manage', 'تعديل', 'manage'], ['letters.view', 'عرض', 'view']],
  projects: [['projects.manage', 'تعديل', 'manage'], ['projects.view', 'عرض', 'view']],
  reports: [['reports.view', 'عرض', 'view']],
};

/** What a template grants in one area. */
export function templateLevel(permissions: readonly Permission[], group: PermissionGroup): TemplateLevel {
  const held = new Set(permissions);
  for (const [permission, label, level] of LEVEL_RUNGS[group]) {
    if (held.has(permission)) return { level, label };
  }
  return { level: 'none', label: '' };
}

/** One row per area, one cell per template: the read-only table in the settings screen. */
export function templateMatrix(
  groups: readonly { id: PermissionGroup; label: string }[],
  templates: readonly PermissionTemplate[]
): { id: PermissionGroup; label: string; cells: TemplateLevel[] }[] {
  return groups.map((group) => ({
    id: group.id,
    label: group.label,
    cells: templates.map((template) => templateLevel(template.permissions, group.id)),
  }));
}

/** Every permission of the catalog appears in exactly one rung list (used by the test). */
export function rungPermissions(): Permission[] {
  return Object.values(LEVEL_RUNGS).flatMap((rungs) => rungs.map(([permission]) => permission));
}

