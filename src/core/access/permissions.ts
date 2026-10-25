/**
 * The permission catalog: the single list of things a person can be allowed to do.
 *
 * Rules of the model (the Firestore rules in firestore.rules mirror every one of these):
 *  - An admin can do everything. Admin-only powers (users, settings, audit log) are not permissions.
 *  - An employee can do exactly what their `permissions` list grants, nothing else.
 *  - Permissions come in a ladder per area: view < manage < delete. Granting a higher rung always
 *    includes the rungs below it (see `requires`), so a stored list is always self-consistent.
 *  - Expenses are owned: `expenses.create` lets someone record, edit and delete THEIR OWN expenses
 *    and see them; seeing everyone's needs `expenses.view.all`.
 */

export type PermissionGroup =
  | 'clients'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'debts'
  | 'workers'
  | 'custody'
  | 'letters'
  | 'projects'
  | 'reports';

export type Permission =
  | 'clients.view' | 'clients.manage' | 'clients.delete'
  | 'invoices.view' | 'invoices.manage' | 'invoices.delete'
  | 'payments.view' | 'payments.manage' | 'payments.delete'
  | 'expenses.create' | 'expenses.view.all' | 'expenses.edit.all' | 'expenses.delete.all'
  | 'debts.view' | 'debts.manage' | 'debts.delete'
  | 'workers.view' | 'workers.manage'
  | 'custody.view.own' | 'custody.manage'
  | 'letters.view' | 'letters.manage'
  | 'projects.view' | 'projects.manage'
  | 'reports.view';

export interface PermissionDef {
  id: Permission;
  group: PermissionGroup;
  label: string;
  hint: string;
  /** Permissions this one cannot work without. They are added automatically. */
  requires: Permission[];
}

export const PERMISSION_GROUPS: { id: PermissionGroup; label: string }[] = [
  { id: 'clients', label: 'العملاء' },
  { id: 'invoices', label: 'الفواتير' },
  { id: 'payments', label: 'المدفوعات' },
  { id: 'expenses', label: 'المصروفات' },
  { id: 'debts', label: 'الديون' },
  { id: 'workers', label: 'العمال' },
  { id: 'custody', label: 'العهدة' },
  { id: 'letters', label: 'الرسائل' },
  { id: 'projects', label: 'متابعة المشاريع' },
  { id: 'reports', label: 'التقارير' },
];

export const PERMISSIONS: readonly PermissionDef[] = [
  { id: 'clients.view', group: 'clients', label: 'عرض العملاء', hint: 'قائمة العملاء وملفاتهم', requires: [] },
  { id: 'clients.manage', group: 'clients', label: 'إضافة العملاء وتعديلهم', hint: 'إنشاء عميل وتعديل بياناته', requires: ['clients.view'] },
  {
    id: 'clients.delete',
    group: 'clients',
    label: 'حذف العملاء',
    hint: 'يحذف العميل وكل ما يخصه (فواتير، مدفوعات، مصروفات، ديون، عمال، عهد)، لذلك يحتاج حق حذف كل ذلك',
    requires: [
      'clients.manage', 'invoices.delete', 'payments.delete', 'debts.delete', 'expenses.delete.all',
      'workers.manage', 'projects.manage', 'letters.manage', 'custody.manage',
    ],
  },

  { id: 'invoices.view', group: 'invoices', label: 'عرض الفواتير', hint: 'قائمة الفواتير وتفاصيلها', requires: ['clients.view'] },
  { id: 'invoices.manage', group: 'invoices', label: 'إنشاء الفواتير وتعديلها', hint: 'إنشاء فاتورة وتغيير حالتها', requires: ['invoices.view'] },
  { id: 'invoices.delete', group: 'invoices', label: 'حذف الفواتير', hint: 'حذف فاتورة نهائياً', requires: ['invoices.manage'] },

  { id: 'payments.view', group: 'payments', label: 'عرض المدفوعات', hint: 'ما استُلم من العملاء', requires: ['clients.view'] },
  { id: 'payments.manage', group: 'payments', label: 'تسجيل المدفوعات وتعديلها', hint: 'إضافة دفعة وتعديلها', requires: ['payments.view'] },
  { id: 'payments.delete', group: 'payments', label: 'حذف المدفوعات', hint: 'حذف دفعة نهائياً', requires: ['payments.manage'] },

  { id: 'expenses.create', group: 'expenses', label: 'تسجيل مصروفاته', hint: 'يسجّل مصروفات ويعدّلها ويحذفها ويراها، لكن مصروفاته هو فقط', requires: ['clients.view'] },
  { id: 'expenses.view.all', group: 'expenses', label: 'عرض مصروفات الجميع', hint: 'يرى مصروفات كل المستخدمين والإدارة، ويفتح فواتير المصروفات', requires: ['clients.view'] },
  { id: 'expenses.edit.all', group: 'expenses', label: 'تعديل مصروفات الجميع', hint: 'يعدّل أي مصروف ويجمعه في فاتورة مصروفات', requires: ['expenses.view.all', 'expenses.create'] },
  { id: 'expenses.delete.all', group: 'expenses', label: 'حذف مصروفات الجميع', hint: 'يحذف أي مصروف غير مغلق', requires: ['expenses.edit.all'] },

  { id: 'debts.view', group: 'debts', label: 'عرض الديون', hint: 'ديون العملاء والموردين', requires: [] },
  { id: 'debts.manage', group: 'debts', label: 'تسجيل الديون وسدادها', hint: 'إضافة دين وتعديله وتسجيل السداد', requires: ['debts.view'] },
  { id: 'debts.delete', group: 'debts', label: 'حذف الديون', hint: 'حذف دين نهائياً', requires: ['debts.manage'] },

  { id: 'workers.view', group: 'workers', label: 'عرض العمال ودفعاتهم', hint: 'يرى كل دفعات كل عامل ليعرف المتبقي له بدقة', requires: ['clients.view'] },
  { id: 'workers.manage', group: 'workers', label: 'إدارة العمال وصرف دفعاتهم', hint: 'إضافة عامل وتعديل اتفاقه وصرف دفعة له', requires: ['workers.view', 'expenses.create'] },

  { id: 'custody.view.own', group: 'custody', label: 'عرض عهدته', hint: 'يرى عهدته ومصروفاته منها (رصيده = ما استلمه ناقص مصروفاته)', requires: ['expenses.create'] },
  { id: 'custody.manage', group: 'custody', label: 'إدارة العهد', hint: 'يرى عهد الجميع ويمنحها ويعدّلها (يحتاج رؤية مصروفات الجميع ليحسب أرصدتهم)', requires: ['custody.view.own', 'expenses.view.all'] },

  { id: 'letters.view', group: 'letters', label: 'عرض الرسائل', hint: 'الخطابات والعروض والمستخلصات', requires: [] },
  { id: 'letters.manage', group: 'letters', label: 'إنشاء الرسائل وتعديلها', hint: 'كتابة رسالة وحذفها', requires: ['letters.view'] },

  { id: 'projects.view', group: 'projects', label: 'عرض متابعة المشاريع', hint: 'المراحل وجدول الكميات وتقارير الموقع', requires: ['clients.view'] },
  { id: 'projects.manage', group: 'projects', label: 'إدارة متابعة المشاريع', hint: 'إضافة مرحلة أو بند أو تقرير وتعديلها', requires: ['projects.view'] },

  { id: 'reports.view', group: 'reports', label: 'عرض أرقام الأعمال', hint: 'الأرقام الإجمالية في الرئيسية', requires: [] },
];

const BY_ID = new Map<Permission, PermissionDef>(PERMISSIONS.map((p) => [p.id, p]));

export const ALL_PERMISSIONS: readonly Permission[] = PERMISSIONS.map((p) => p.id);

export const isPermission = (value: unknown): value is Permission => typeof value === 'string' && BY_ID.has(value as Permission);

export const permissionDef = (id: Permission): PermissionDef => BY_ID.get(id)!;

/** Keeps only known permissions, adds whatever each one requires, removes duplicates, catalog order. */
export function normalizePermissions(raw: unknown): Permission[] {
  const wanted = new Set<Permission>();
  const add = (id: Permission) => {
    if (wanted.has(id)) return;
    wanted.add(id);
    BY_ID.get(id)!.requires.forEach(add);
  };
  if (Array.isArray(raw)) raw.filter(isPermission).forEach(add);
  return ALL_PERMISSIONS.filter((id) => wanted.has(id));
}

/** Everything that depends on `id` (so removing `id` must remove these too). */
export function dependentsOf(id: Permission): Permission[] {
  const out = new Set<Permission>();
  const visit = (target: Permission) => {
    for (const def of PERMISSIONS) {
      if (def.requires.includes(target) && !out.has(def.id)) {
        out.add(def.id);
        visit(def.id);
      }
    }
  };
  visit(id);
  return [...out];
}

/** Turns one permission on or off, keeping the set consistent in both directions. */
export function togglePermission(current: readonly Permission[], id: Permission, on: boolean): Permission[] {
  const set = new Set<Permission>(current);
  if (on) {
    set.add(id);
    return normalizePermissions([...set]);
  }
  set.delete(id);
  dependentsOf(id).forEach((dep) => set.delete(dep));
  return normalizePermissions([...set]);
}

/**
 * What an employee gets when nothing else was set. Kept in step with `defaultPermissions()` in
 * firestore.rules (a test compares the two), so a legacy account behaves the same on both sides.
 */
export const DEFAULT_EMPLOYEE_PERMISSIONS: readonly Permission[] = ['clients.view', 'expenses.create', 'custody.view.own'];

export interface PermissionTemplate {
  id: string;
  label: string;
  description: string;
  permissions: readonly Permission[];
}

/** One-tap starting points in the user editor. Always editable afterwards. */
export const PERMISSION_TEMPLATES: readonly PermissionTemplate[] = [
  {
    id: 'field',
    label: 'موظف ميداني',
    description: 'يسجّل مصروفاته ويرى عهدته وعملاءه فقط',
    permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
  },
  {
    id: 'supervisor',
    label: 'مشرف مشروع',
    description: 'الميداني، مع العمال ودفعاتهم ومتابعة المشروع',
    permissions: [...DEFAULT_EMPLOYEE_PERMISSIONS, 'workers.view', 'workers.manage', 'projects.view', 'projects.manage'],
  },
  {
    id: 'accountant',
    label: 'محاسب',
    description: 'الفواتير والمدفوعات والديون وكل المصروفات، دون حذف',
    permissions: [
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
      'clients.manage',
      'invoices.view', 'invoices.manage',
      'payments.view', 'payments.manage',
      'expenses.view.all', 'expenses.edit.all',
      'debts.view', 'debts.manage',
      'letters.view', 'letters.manage',
      'reports.view',
    ],
  },
  {
    id: 'viewer',
    label: 'مشاهد',
    description: 'يطّلع على كل شيء دون أن يعدّل',
    permissions: [
      'clients.view', 'invoices.view', 'payments.view', 'expenses.view.all', 'debts.view',
      'workers.view', 'letters.view', 'projects.view', 'reports.view',
    ],
  },
];
