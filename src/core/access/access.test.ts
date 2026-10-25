import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_TEMPLATES,
  buildPrincipal,
  can,
  canAccessModule,
  canDeleteExpense,
  canEditExpense,
  canListExpense,
  canSeeWorkerPayment,
  canViewDirectory,
  custodyScope,
  dependentsOf,
  expenseScope,
  isAdmin,
  mergeById,
  normalizePermissions,
  normalizeRole,
  planFor,
  queriesFor,
  resolvePermissions,
  sortRecords,
  togglePermission,
  type Permission,
} from '.';

const employee = (permissions?: unknown, id = 'u-emp') => buildPrincipal({ id, role: 'employee', permissions })!;
const admin = () => buildPrincipal({ id: 'u-admin', role: 'admin' })!;

describe('catalog', () => {
  it('has unique ids and every prerequisite exists', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(PERMISSIONS.length);
    for (const def of PERMISSIONS) for (const dep of def.requires) expect(ALL_PERMISSIONS).toContain(dep);
  });

  it('closes a list under its prerequisites, drops unknowns and duplicates', () => {
    expect(normalizePermissions(['payments.delete', 'nonsense', 'payments.delete'])).toEqual([
      'clients.view', 'payments.view', 'payments.manage', 'payments.delete',
    ]);
    expect(normalizePermissions('not a list')).toEqual([]);
    expect(normalizePermissions(['workers.manage'])).toEqual(['clients.view', 'expenses.create', 'workers.view', 'workers.manage']);
    // custody needs expenses (the balance is deposits minus the person's expenses); managing it needs everyone's
    expect(normalizePermissions(['custody.view.own'])).toEqual(['clients.view', 'expenses.create', 'custody.view.own']);
    expect(normalizePermissions(['custody.manage'])).toEqual(['clients.view', 'expenses.create', 'expenses.view.all', 'custody.view.own', 'custody.manage']);
    // anything that shows client names needs the client list
    expect(normalizePermissions(['invoices.view'])).toEqual(['clients.view', 'invoices.view']);
  });

  it('removing a permission removes what depends on it, adding one adds what it needs', () => {
    expect(dependentsOf('invoices.view')).toEqual(expect.arrayContaining(['invoices.manage', 'invoices.delete']));
    expect(togglePermission(['clients.view', 'invoices.view', 'invoices.manage', 'invoices.delete'], 'invoices.manage', false)).toEqual(['clients.view', 'invoices.view']);
    // deleting a client deletes everything that hangs from them, so it needs the right to delete all of it
    const withDelete = togglePermission([], 'clients.delete', true);
    for (const p of ['clients.manage', 'invoices.delete', 'payments.delete', 'debts.delete', 'expenses.delete.all', 'workers.manage', 'projects.manage', 'letters.manage', 'custody.manage'] as const) {
      expect(withDelete).toContain(p);
    }
    expect(togglePermission(withDelete, 'payments.delete', false)).not.toContain('clients.delete');
  });

  it('every template and the default set are already consistent', () => {
    for (const t of PERMISSION_TEMPLATES) expect(normalizePermissions(t.permissions)).toEqual(normalizePermissions([...t.permissions]));
    expect(normalizePermissions(DEFAULT_EMPLOYEE_PERMISSIONS)).toEqual([...DEFAULT_EMPLOYEE_PERMISSIONS].sort((a, b) => ALL_PERMISSIONS.indexOf(a) - ALL_PERMISSIONS.indexOf(b)));
    for (const t of PERMISSION_TEMPLATES) {
      const stored = normalizePermissions(t.permissions);
      expect(stored.length).toBeGreaterThanOrEqual(t.permissions.length - 0);
    }
  });
});

describe('principal', () => {
  it('maps legacy roles: no role is the owner, unknown roles are employees', () => {
    expect(normalizeRole(undefined)).toBe('admin');
    expect(normalizeRole('')).toBe('admin');
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('employee')).toBe('employee');
    expect(normalizeRole('accountant')).toBe('employee');
  });

  it('gives admins everything and ignores whatever list they carry', () => {
    const a = buildPrincipal({ id: 'a', role: 'admin', permissions: [] })!;
    expect([...a.permissions].sort()).toEqual([...ALL_PERMISSIONS].sort());
    expect(isAdmin(a)).toBe(true);
  });

  it('gives an employee with no stored list the default set, and one with a list exactly that list', () => {
    expect(resolvePermissions('employee', undefined)).toEqual([...DEFAULT_EMPLOYEE_PERMISSIONS]);
    expect(resolvePermissions('employee', ['debts.view'])).toEqual(['debts.view']);
    expect(resolvePermissions('employee', [])).toEqual([]);
  });

  it('has no principal without an id', () => {
    expect(buildPrincipal(null)).toBeNull();
    expect(buildPrincipal({ id: '', role: 'admin' })).toBeNull();
    expect(can(null, 'clients.view')).toBe(false);
  });
});

describe('modules', () => {
  it('opens an area when the person holds any of its permissions', () => {
    const field = employee();
    expect(canAccessModule(field, 'expenses')).toBe(true);
    expect(canAccessModule(field, 'clients')).toBe(true);
    expect(canAccessModule(field, 'balances')).toBe(true);
    expect(canAccessModule(field, 'payments')).toBe(false);
    expect(canAccessModule(field, 'users')).toBe(false);
    expect(canAccessModule(admin(), 'users')).toBe(true);
    expect(canAccessModule(null, 'clients')).toBe(false);
  });
});

describe('expense policy', () => {
  const mine = { userId: 'u-emp', isClosed: false };
  const theirs = { userId: 'u-other', isClosed: false };
  const legacy: { userId?: string; isClosed?: boolean } = { isClosed: false };

  it('scopes: all, own or none', () => {
    expect(expenseScope(admin())).toBe('all');
    expect(expenseScope(employee())).toBe('own');
    expect(expenseScope(employee(['expenses.view.all']))).toBe('all');
    expect(expenseScope(employee(['clients.view']))).toBe('none');
  });

  it('lists only own expenses for a field employee, everything for a viewer', () => {
    const field = employee();
    expect(canListExpense(field, mine)).toBe(true);
    expect(canListExpense(field, theirs)).toBe(false);
    expect(canListExpense(field, legacy)).toBe(false); // no owner id, nobody can prove it is theirs
    expect(canListExpense(employee(['expenses.view.all']), theirs)).toBe(true);
    expect(canListExpense(employee(['clients.view']), mine)).toBe(false);
  });

  it('lets an employee edit and delete only their own open expenses', () => {
    const field = employee();
    expect(canEditExpense(field, mine)).toBe(true);
    expect(canEditExpense(field, theirs)).toBe(false);
    expect(canEditExpense(field, { ...mine, isClosed: true })).toBe(false);
    expect(canDeleteExpense(field, mine)).toBe(true);
    expect(canDeleteExpense(field, theirs)).toBe(false);
  });

  it('keeps view-all, edit-all and delete-all separate, and nobody edits a closed expense', () => {
    const viewer = employee(['expenses.view.all']);
    expect(canEditExpense(viewer, theirs)).toBe(false);
    const accountant = employee(['expenses.edit.all']);
    expect(canEditExpense(accountant, theirs)).toBe(true);
    expect(canDeleteExpense(accountant, theirs)).toBe(false);
    const boss = employee(['expenses.delete.all']);
    expect(canDeleteExpense(boss, theirs)).toBe(true);
    expect(canDeleteExpense(admin(), { ...theirs, isClosed: true })).toBe(false);
    expect(canEditExpense(admin(), { ...theirs, isClosed: true })).toBe(false);
  });

  it('shows worker payments to whoever may view workers', () => {
    expect(canSeeWorkerPayment(employee(['workers.view']), { workerId: 'w1' })).toBe(true);
    expect(canSeeWorkerPayment(employee(['workers.view']), {})).toBe(false);
    expect(canSeeWorkerPayment(employee(), { workerId: 'w1' })).toBe(false);
  });

  it('reads the directory only with a reason to', () => {
    expect(canViewDirectory(employee())).toBe(false);
    expect(canViewDirectory(employee(['expenses.view.all']))).toBe(true);
    expect(canViewDirectory(employee(['custody.manage']))).toBe(true);
    expect(canViewDirectory(admin())).toBe(true);
  });

  it('scopes custody', () => {
    expect(custodyScope(employee())).toBe('own');
    expect(custodyScope(employee(['custody.manage']))).toBe('all');
    expect(custodyScope(employee(['clients.view']))).toBe('none');
  });
});

describe('data plan', () => {
  it('lets an admin download everything with plain collection queries', () => {
    const plan = planFor(admin());
    for (const queries of Object.values(plan)) expect(queries).toEqual([[]]);
  });

  it('gives a field employee clients plus only their own expenses and custody', () => {
    const plan = planFor(employee());
    expect(plan.clients).toEqual([[]]);
    expect(plan.expenses).toEqual([[{ field: 'userId', op: '==', value: 'u-emp' }]]);
    expect(plan.userBalances).toEqual([[{ field: 'userId', op: '==', value: 'u-emp' }]]);
    expect(plan.fundTransactions).toEqual([[{ field: 'userId', op: '==', value: 'u-emp' }]]);
    for (const key of ['invoices', 'payments', 'expenseInvoices', 'standaloneDebts', 'debtParties', 'workers', 'letters', 'projectPhases', 'boqItems', 'siteReports'] as const) {
      expect(plan[key]).toEqual([]);
    }
  });

  it('adds the worker-payments query for people who view workers', () => {
    const supervisor = employee(['expenses.create', 'workers.view']);
    expect(queriesFor(supervisor, 'expenses')).toEqual([
      [{ field: 'userId', op: '==', value: 'u-emp' }],
      [{ field: 'workerId', op: '!=', value: null }],
    ]);
    // a viewer of workers with no expense permission still gets the worker payments
    expect(queriesFor(employee(['workers.view']), 'expenses')).toEqual([[{ field: 'workerId', op: '!=', value: null }]]);
    // someone who sees all expenses needs no extra query
    expect(queriesFor(employee(['expenses.view.all', 'workers.view']), 'expenses')).toEqual([[]]);
  });

  it('subscribes to nothing for a signed-out visitor', () => {
    for (const queries of Object.values(planFor(null))) expect(queries).toEqual([]);
  });

  it('merges result sets and sorts like the old server-side orderBy', () => {
    expect(mergeById([[{ id: 'a', v: 1 }], [{ id: 'a', v: 2 }, { id: 'b', v: 3 }]]).map((x) => `${x.id}${x.v}`)).toEqual(['a2', 'b3']);
    const rows = [{ id: '1', date: '2026-01-02' }, { id: '2' }, { id: '3', date: '2026-03-01' }];
    expect(sortRecords(rows, { field: 'date', dir: 'desc' }).map((r) => r.id)).toEqual(['3', '1', '2']);
    expect(sortRecords(rows, { field: 'date', dir: 'asc' }).map((r) => r.id)).toEqual(['1', '3', '2']);
    expect(sortRecords([{ order: 2 }, { order: 1 }], { field: 'order', dir: 'asc' })).toEqual([{ order: 1 }, { order: 2 }]);
  });
});

describe('type safety of the catalog', () => {
  it('only exposes known permission ids', () => {
    const id: Permission = 'payments.manage';
    expect(ALL_PERMISSIONS).toContain(id);
  });
});
