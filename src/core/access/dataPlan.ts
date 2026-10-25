import { custodyScope, canUseExpenseInvoices, expenseScope } from './policy';
import { can, type Principal } from './principal';

/**
 * What each person's browser is allowed to download, as plain data (no Firebase imports, so it is
 * unit-tested and the same descriptions are replayed against the Firestore rules in the emulator).
 *
 * Firestore rules are not filters: a query must itself be provably inside what the rules allow, or the
 * whole query fails. So an employee never asks for "all expenses"; they ask for "expenses where
 * userId is me". Sorting is done in the browser because an equality filter plus a server sort would
 * need a composite index per collection.
 */

export type DataKey =
  | 'clients'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'expenseInvoices'
  | 'standaloneDebts'
  | 'debtParties'
  | 'workers'
  | 'userBalances'
  | 'letters'
  | 'projectPhases'
  | 'boqItems'
  | 'siteReports'
  | 'paymentMilestones'
  | 'workerAttendance'
  | 'fundTransactions';

export interface WhereSpec {
  field: string;
  op: '==' | '!=';
  value: string | null;
}

/** One Firestore query: every where-clause in the list applies. An empty list is the whole collection. */
export type QuerySpec = readonly WhereSpec[];

export interface SourceDef {
  collection: string;
  sort: { field: string; dir: 'asc' | 'desc' };
}

export const SOURCES: Record<DataKey, SourceDef> = {
  clients: { collection: 'clients', sort: { field: 'createdAt', dir: 'desc' } },
  invoices: { collection: 'invoices', sort: { field: 'createdAt', dir: 'desc' } },
  payments: { collection: 'payments', sort: { field: 'createdAt', dir: 'desc' } },
  expenses: { collection: 'expenses', sort: { field: 'date', dir: 'desc' } },
  expenseInvoices: { collection: 'expense_invoices', sort: { field: 'createdAt', dir: 'desc' } },
  standaloneDebts: { collection: 'standalone_debts', sort: { field: 'date', dir: 'desc' } },
  debtParties: { collection: 'debt_parties', sort: { field: 'name', dir: 'asc' } },
  workers: { collection: 'workers', sort: { field: 'createdAt', dir: 'desc' } },
  userBalances: { collection: 'user_balances', sort: { field: 'date', dir: 'desc' } },
  letters: { collection: 'letters', sort: { field: 'createdAt', dir: 'desc' } },
  projectPhases: { collection: 'project_phases', sort: { field: 'order', dir: 'asc' } },
  boqItems: { collection: 'boq_items', sort: { field: 'createdAt', dir: 'desc' } },
  siteReports: { collection: 'site_reports', sort: { field: 'reportDate', dir: 'desc' } },
  paymentMilestones: { collection: 'payment_milestones', sort: { field: 'order', dir: 'asc' } },
  workerAttendance: { collection: 'worker_attendance', sort: { field: 'date', dir: 'desc' } },
  fundTransactions: { collection: 'global_fund_transactions', sort: { field: 'createdAt', dir: 'desc' } },
};

export const DATA_KEYS = Object.keys(SOURCES) as DataKey[];

const WHOLE: QuerySpec = [];
const mine = (p: Principal, field = 'userId'): QuerySpec => [{ field, op: '==', value: p.id }];
const workerPayments: QuerySpec = [{ field: 'workerId', op: '!=', value: null }];

/** The queries to subscribe to for one data set. An empty list means: do not subscribe at all. */
export function queriesFor(p: Principal | null | undefined, key: DataKey): QuerySpec[] {
  if (!p) return [];
  const whole = (allowed: boolean): QuerySpec[] => (allowed ? [WHOLE] : []);

  switch (key) {
    case 'clients':
      return whole(can(p, 'clients.view'));
    case 'invoices':
      return whole(can(p, 'invoices.view'));
    case 'payments':
      return whole(can(p, 'payments.view'));
    case 'expenses': {
      const scope = expenseScope(p);
      if (scope === 'all') return [WHOLE];
      const queries: QuerySpec[] = scope === 'own' ? [mine(p)] : [];
      // Whoever views workers also receives every payment made to a worker (exact balances).
      if (can(p, 'workers.view')) queries.push(workerPayments);
      return queries;
    }
    case 'expenseInvoices':
      return whole(canUseExpenseInvoices(p));
    case 'standaloneDebts':
    case 'debtParties':
      return whole(can(p, 'debts.view'));
    case 'workers':
      return whole(can(p, 'workers.view'));
    case 'userBalances':
    case 'fundTransactions': {
      const scope = custodyScope(p);
      return scope === 'all' ? [WHOLE] : scope === 'own' ? [mine(p)] : [];
    }
    case 'letters':
      return whole(can(p, 'letters.view'));
    case 'paymentMilestones':
      return whole(can(p, 'payments.view'));
    case 'workerAttendance':
      return whole(can(p, 'workers.view'));
    case 'projectPhases':
    case 'boqItems':
    case 'siteReports':
      return whole(can(p, 'projects.view'));
  }
}

export function planFor(p: Principal | null | undefined): Record<DataKey, QuerySpec[]> {
  return Object.fromEntries(DATA_KEYS.map((key) => [key, queriesFor(p, key)])) as Record<DataKey, QuerySpec[]>;
}

/** Same plan with a stable text form, to tell whether two principals need different subscriptions. */
export function planSignature(p: Principal | null | undefined): string {
  return JSON.stringify(planFor(p));
}

/* ── helpers the stores use on whatever arrives ─────────────────────────── */

/** Union of several result sets, newest definition of an id wins. */
export function mergeById<T extends { id: string }>(lists: readonly (readonly T[])[]): T[] {
  const map = new Map<string, T>();
  for (const list of lists) for (const item of list) map.set(item.id, item);
  return [...map.values()];
}

/** Sorts by one field the way the old server-side orderBy did, with records missing the field last. */
export function sortRecords<T>(records: readonly T[], sort: SourceDef['sort']): T[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...records].sort((a, b) => {
    const x = (a as Record<string, unknown>)[sort.field];
    const y = (b as Record<string, unknown>)[sort.field];
    const xm = x === undefined || x === null;
    const ym = y === undefined || y === null;
    if (xm || ym) return xm === ym ? 0 : xm ? 1 : -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    return String(x).localeCompare(String(y)) * dir;
  });
}
