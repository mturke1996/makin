import { canAny, isAdmin, type Principal } from './principal';
import type { Permission } from './permissions';

/** The areas of the app a person can open from the navigation. */
export type AppModule =
  | 'stats'
  | 'clients'
  | 'invoices'
  | 'payments'
  | 'debts'
  | 'expenses'
  | 'users'
  | 'workers'
  | 'balances'
  | 'letters'
  | 'projects';

/** An area opens when the person holds ANY of these. `null` means admins only. */
export const MODULE_ACCESS: Record<AppModule, readonly Permission[] | null> = {
  stats: ['reports.view'],
  clients: ['clients.view'],
  invoices: ['invoices.view'],
  payments: ['payments.view'],
  debts: ['debts.view'],
  expenses: ['expenses.create', 'expenses.view.all'],
  users: null,
  workers: ['workers.view'],
  balances: ['custody.view.own', 'custody.manage'],
  letters: ['letters.view'],
  projects: ['projects.view'],
};

export function canAccessModule(p: Principal | null | undefined, module: AppModule): boolean {
  if (!p) return false;
  const needed = MODULE_ACCESS[module];
  return needed === null ? isAdmin(p) : canAny(p, needed);
}

/** Pages that are not a module: settings and the audit log are for admins. */
export const ADMIN_ONLY_PATHS: readonly string[] = ['/settings/branding', '/settings/audit'];

/** The permission that lets someone change data in an area (used by generic components). */
export const MODULE_MANAGE: Partial<Record<AppModule, Permission>> = {
  clients: 'clients.manage',
  invoices: 'invoices.manage',
  payments: 'payments.manage',
  debts: 'debts.manage',
  workers: 'workers.manage',
  letters: 'letters.manage',
  projects: 'projects.manage',
  balances: 'custody.manage',
  expenses: 'expenses.create',
};

/** The permission that lets someone delete in an area. */
export const MODULE_DELETE: Partial<Record<AppModule, Permission>> = {
  clients: 'clients.delete',
  invoices: 'invoices.delete',
  payments: 'payments.delete',
  debts: 'debts.delete',
  expenses: 'expenses.delete.all',
  workers: 'workers.manage',
  letters: 'letters.manage',
  projects: 'projects.manage',
  balances: 'custody.manage',
};
