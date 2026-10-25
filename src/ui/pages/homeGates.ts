import { can, canAccessModule, expenseScope, isAdmin, type AppModule, type Principal, type Scope } from '../../core/access';

/**
 * What Home may show a person, decided from their permissions alone (pure, so it is unit-tested).
 *
 * The data store only holds what the person may download, so a figure computed from a partial set
 * would look right and be wrong ("0 collected" for someone who simply cannot read payments). Every
 * figure therefore needs the permission that governs ALL the data it is made of; without it the
 * figure is not drawn at all.
 */
export type HomeStatKey = 'outstanding' | 'debts' | 'custody' | 'overdueInvoices' | 'workers';

export interface HomeGates {
  /** Payments received: the "التحصيل" card and the income line. Needs the payments and the business figures. */
  income: boolean;
  /**
   * Expenses: everyone's, only the person's own ("مصروفاتي"), or none. Drives the expenses card, the
   * daily average and the expense line. The personal version needs no business-figures permission.
   */
  expenses: Scope;
  /** Income minus expense: needs both complete (every payment AND every expense) and the business figures. */
  net: boolean;

  /** Which cells of the stat grid may be drawn, in display order (at most four). */
  cells: HomeStatKey[];
  /** Whose custody balance the stat grid and the card show: the pooled fund, the person's own, or none. */
  custodyKind: 'pooled' | 'own' | null;

  /** Attention list sources. */
  overdueInvoices: boolean;
  /** What is left on an overdue invoice (needs the payments); otherwise the item has no amount. */
  overdueInvoiceAmounts: boolean;
  overdueDebts: boolean;
  /** The person's own custody: needs their deposits AND their own expenses to be exact. */
  custody: boolean;
  /** Expenses waiting for approval: for whoever may decide them. */
  approvals: boolean;
  /** Their own expenses that were sent back: for anyone who records expenses. */
  corrections: boolean;
  /** Phase budgets against spending: needs the phases (projects) and every expense. */
  budgets: boolean;
  /** Agreed instalments that are late: needs the payments that cover them. */
  schedule: boolean;
  /** The manager is reminded to keep a backup copy. */
  backup: boolean;
  /** Price rises: needs every expense. */
  prices: boolean;

  /** The pooled fund balance next to the custody shortcut belongs to whoever manages custody. */
  pooledFund: boolean;

  /** Quick actions: only what the person may actually do. */
  newInvoice: boolean;
  newExpense: boolean;
  newPayment: boolean;
}

export function homeGates(p: Principal | null | undefined): HomeGates {
  const scope = expenseScope(p);
  const payments = can(p, 'payments.view');
  const invoices = can(p, 'invoices.view');
  const reports = can(p, 'reports.view');
  const ownCustody = can(p, 'custody.view.own') && scope !== 'none';
  const custodyKind = can(p, 'custody.manage') ? 'pooled' : ownCustody ? 'own' : null;

  const cells: HomeStatKey[] = [];
  if (invoices && payments) cells.push('outstanding');
  if (can(p, 'debts.view')) cells.push('debts');
  // A person's OWN custody has its own card on Home; the grid cell is for the pooled fund only.
  if (custodyKind === 'pooled') cells.push('custody');
  if (invoices) cells.push('overdueInvoices');
  else if (can(p, 'workers.view')) cells.push('workers');

  return {
    income: payments && reports,
    expenses: scope,
    net: payments && scope === 'all' && reports,
    cells,
    custodyKind,
    overdueInvoices: invoices,
    overdueInvoiceAmounts: invoices && payments,
    overdueDebts: can(p, 'debts.view'),
    custody: ownCustody,
    approvals: can(p, 'expenses.edit.all'),
    corrections: can(p, 'expenses.create'),
    budgets: can(p, 'projects.view') && scope === 'all',
    schedule: payments,
    backup: isAdmin(p),
    prices: scope === 'all',
    pooledFund: can(p, 'custody.manage'),
    newInvoice: can(p, 'invoices.manage'),
    newExpense: can(p, 'expenses.create'),
    newPayment: can(p, 'payments.manage'),
  };
}

/** What the dashboard draws, from the gates alone (so loading and loaded agree). */
export interface DashboardPlan {
  kpis: ('income' | 'expenses' | 'net' | 'average')[];
  cells: HomeStatKey[];
  chart: boolean;
}

/** `ownCustody`: whether the person's own custody balance is known (their custody was ever funded). */
export function planDashboard(gates: HomeGates, ownCustody: boolean): DashboardPlan {
  const kpis: DashboardPlan['kpis'] = [];
  if (gates.income) kpis.push('income');
  if (gates.expenses !== 'none') kpis.push('expenses');
  if (gates.net) kpis.push('net');
  if (gates.expenses !== 'none') kpis.push('average');
  const cells = gates.cells.filter((c) => c !== 'custody' || gates.custodyKind === 'pooled' || ownCustody);
  return { kpis, cells, chart: gates.income || gates.expenses !== 'none' };
}

/** The area of the app a path belongs to; `'admin'` for admin-only pages, `null` for pages anyone signed in may open. */
function areaOfPath(path: string): AppModule | 'admin' | null | undefined {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (clean === '/') return null;
  if (clean === '/users' || clean.startsWith('/settings/')) return 'admin';
  const first = clean.split('/')[1];
  const modules: Record<string, AppModule> = {
    clients: 'clients',
    workers: 'workers',
    invoices: 'invoices',
    payments: 'payments',
    suppliers: 'expenses',
    receivables: 'payments',
    debts: 'debts',
    expenses: 'expenses',
    fund: 'balances',
    letters: 'letters',
  };
  return modules[first];
}

/**
 * May this person open this path? Used to keep the "recently visited" shortcuts honest: the history
 * lives in the browser and may predate a change of permissions (or another person on the same device).
 * Unknown paths are not offered.
 */
export function canOpenPath(p: Principal | null | undefined, path: string): boolean {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (clean === '/invoices/new') return can(p, 'invoices.manage');
  if (clean === '/expenses/invoices') return can(p, 'expenses.view.all');
  const area = areaOfPath(path);
  if (area === undefined) return false;
  if (area === null) return !!p;
  if (area === 'admin') return isAdmin(p);
  return canAccessModule(p, area);
}
