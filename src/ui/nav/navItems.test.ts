import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  PERMISSION_TEMPLATES,
  buildPrincipal,
  can,
  canAccessModule,
  canUseExpenseInvoices,
  isAdmin,
  type Permission,
} from '../../core/access';
import {
  BOTTOM_NAV_MAX,
  SIDEBAR_NAV,
  activeNavPath,
  bottomNavItems,
  isNavItemVisible,
  visibleNavGroups,
  type NavAccess,
} from './navItems';

/** Same shape as `useAccess()`, built from the pure rules so the test needs no React. */
function accessFor(role: 'admin' | 'employee', permissions?: readonly Permission[]): NavAccess {
  const p = buildPrincipal({ id: 'u', role, permissions });
  return {
    isAdmin: isAdmin(p),
    can: (permission) => can(p, permission),
    canAccessModule: (module) => canAccessModule(p, module),
    canUseExpenseInvoices: canUseExpenseInvoices(p),
  };
}

const ids = (items: { id: string }[]) => items.map((i) => i.id);
const sidebarIds = (access: NavAccess) => visibleNavGroups(access).flatMap((g) => ids(g.items));
const template = (id: string) => PERMISSION_TEMPLATES.find((t) => t.id === id)!.permissions;

const admin = accessFor('admin');
const salem = accessFor('employee'); // no stored list: the default employee
const ali = accessFor('employee', template('supervisor'));
const fatima = accessFor('employee', template('accountant'));
const viewer = accessFor('employee', template('viewer'));
const nobody = accessFor('employee', []);

describe('sidebar and drawer visibility', () => {
  it('shows an admin every destination', () => {
    expect(sidebarIds(admin)).toEqual(ids(SIDEBAR_NAV));
  });

  it('shows the default employee only clients, expenses and custody', () => {
    expect(sidebarIds(salem)).toEqual(['home', 'clients', 'expenses', 'fund']);
  });

  it('keeps settings, audit and users away from every employee, whatever they hold', () => {
    const everything = accessFor('employee', ALL_PERMISSIONS);
    for (const access of [salem, ali, fatima, viewer, nobody, everything]) {
      const shown = sidebarIds(access);
      expect(shown).not.toContain('settings');
      expect(shown).not.toContain('audit');
      expect(shown).not.toContain('users');
    }
  });

  it('follows the supervisor and accountant permission sets', () => {
    expect(sidebarIds(ali)).toEqual(['home', 'clients', 'workers', 'expenses', 'fund']);
    expect(sidebarIds(fatima)).toEqual([
      'home',
      'clients',
      'invoices',
      'new-invoice',
      'payments',
      'receivables',
      'expenses',
      'expense-invoices',
      'suppliers',
      'fund',
      'debts',
      'letters',
    ]);
  });

  it('needs invoices.manage for "new invoice" and expenses.view.all for expense invoices', () => {
    expect(sidebarIds(viewer)).toContain('invoices');
    expect(sidebarIds(viewer)).not.toContain('new-invoice');
    expect(sidebarIds(viewer)).toContain('expense-invoices');
    expect(sidebarIds(salem)).not.toContain('expense-invoices');
  });

  it('lists the suppliers only for whoever sees every expense', () => {
    for (const access of [admin, fatima, viewer]) expect(sidebarIds(access)).toContain('suppliers');
    for (const access of [salem, ali, nobody]) expect(sidebarIds(access)).not.toContain('suppliers');
  });

  it('lists the receivables for whoever sees payments, and for nobody else', () => {
    expect(sidebarIds(admin)).toContain('receivables');
    expect(sidebarIds(fatima)).toContain('receivables');
    expect(sidebarIds(viewer)).toContain('receivables');
    expect(sidebarIds(salem)).not.toContain('receivables');
    expect(sidebarIds(ali)).not.toContain('receivables');
    expect(sidebarIds(nobody)).not.toContain('receivables');
  });

  it('drops a group when nothing in it is left', () => {
    expect(visibleNavGroups(nobody).map((g) => g.def.key)).toEqual(['overview']);
    expect(visibleNavGroups(salem).map((g) => g.def.key)).toEqual(['overview', 'spending']);
  });

  it('never lists a destination the person cannot open', () => {
    for (const access of [admin, salem, ali, fatima, viewer, nobody]) {
      for (const item of SIDEBAR_NAV.filter((i) => isNavItemVisible(i, access))) {
        if (item.module) expect(access.canAccessModule(item.module)).toBe(true);
        if (item.adminOnly) expect(access.isAdmin).toBe(true);
      }
    }
  });
});

describe('mobile bottom bar', () => {
  const bar = (access: NavAccess) => ids(bottomNavItems(access));

  it('is the standard five for an admin', () => {
    expect(bar(admin)).toEqual(['home', 'clients', 'payments', 'expenses', 'fund']);
  });

  it('shows an employee only the destinations they may open', () => {
    expect(bar(salem)).toEqual(['home', 'clients', 'expenses', 'fund']);
    expect(bar(ali)).toEqual(['home', 'clients', 'expenses', 'fund']);
  });

  it('keeps the accountant on the standard five', () => {
    expect(bar(fatima)).toEqual(['home', 'clients', 'payments', 'expenses', 'fund']);
  });

  it('tops up with debts and letters when a standard destination is missing', () => {
    const noPayments = accessFor('employee', [...template('accountant')].filter((p) => !p.startsWith('payments.')));
    expect(bar(noPayments)).toEqual(['home', 'clients', 'invoices', 'expenses', 'fund']);
    const noFund = accessFor('employee', ['clients.view', 'invoices.view', 'payments.view', 'debts.view', 'letters.view', 'expenses.create']);
    expect(bar(noFund)).toEqual(['home', 'clients', 'invoices', 'payments', 'expenses']);
  });

  it('is never longer than five and never lists a locked item', () => {
    for (const access of [admin, salem, ali, fatima, viewer, nobody, accessFor('employee', ALL_PERMISSIONS)]) {
      const items = bottomNavItems(access);
      expect(items.length).toBeLessThanOrEqual(BOTTOM_NAV_MAX);
      expect(items.every((item) => isNavItemVisible(item, access))).toBe(true);
      expect(new Set(items).size).toBe(items.length);
      expect(items[0].id).toBe('home');
    }
  });

  it('shrinks to Home alone when nothing else is allowed (the bar then adds a menu button)', () => {
    expect(bar(nobody)).toEqual(['home']);
  });

  it('gives a viewer a full bar without the custody tab they do not hold', () => {
    expect(bar(viewer)).toEqual(['home', 'clients', 'invoices', 'payments', 'expenses']);
  });
});

describe('active destination', () => {
  it('highlights the most specific destination', () => {
    expect(activeNavPath('/expenses/invoices', SIDEBAR_NAV)).toBe('/expenses/invoices');
    expect(activeNavPath('/expenses', SIDEBAR_NAV)).toBe('/expenses');
    expect(activeNavPath('/invoices/new', SIDEBAR_NAV)).toBe('/invoices/new');
    expect(activeNavPath('/invoices/i1', SIDEBAR_NAV)).toBe('/invoices');
    expect(activeNavPath('/', SIDEBAR_NAV)).toBe('/');
  });

  it('defaults hold: the default employee set is what Salem gets', () => {
    expect(DEFAULT_EMPLOYEE_PERMISSIONS).toEqual(['clients.view', 'expenses.create', 'custody.view.own']);
  });
});
