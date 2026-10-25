import { buildDashboard, type Dashboard } from '../../core/finance/dashboardSeries';
import { sumMoney } from '../../core/finance/money';
import { buildWorkerLedger, summarizeWorkerLedgers } from '../../core/finance/workerLedger';
import { getInvoicePaymentSummary } from '../../core/finance/invoicePayments';
import type { Expense, Invoice, Payment, StandaloneDebt, Worker } from '../../types';
import { findOverdueInvoices } from '../../core/finance/overdueInvoices';
import type { HomeGates } from './homeGates';

export interface HomeStats {
  /** Daily series and period comparisons. A series the person may not see is all zeros: check the gate first. */
  dashboard: Dashboard;
  /** What is left on unpaid invoices; null when the payments are not available. */
  outstanding: number | null;
  /** Remaining on every debt; null without the debts. */
  debtsRemaining: number | null;
  overdueInvoices: number | null;
  /** Still owed to workers (positive balances); null without the workers. */
  workersOwed: number | null;
}

interface HomeData {
  payments: readonly Payment[];
  /** Already narrowed to what the person may list (`access.listableExpenses`). */
  listableExpenses: readonly Expense[];
  /** Every expense in the store: worker balances count every payment made to the worker. */
  allExpenses: readonly Expense[];
  invoices: readonly Invoice[];
  debts: readonly StandaloneDebt[];
  workers: readonly Worker[];
  /** Today, local `YYYY-MM-DD`. */
  endDay: string;
  days: number;
  now?: Date;
}

/**
 * The numbers behind Home's dashboard. Anything the person's permissions do not cover is `null` or
 * simply not read (income is `[]` without the payments), never a zero that looks like a fact.
 */
export function computeHomeStats(gates: HomeGates, data: HomeData): HomeStats {
  const dashboard = buildDashboard({
    income: gates.income ? data.payments.map((p) => ({ date: p.paymentDate, amount: p.amount })) : [],
    expense: gates.expenses !== 'none' ? data.listableExpenses.map((e) => ({ date: e.date, amount: e.amount })) : [],
    endDay: data.endDay,
    days: data.days,
  });

  const has = (key: HomeGates['cells'][number]) => gates.cells.includes(key);

  const outstanding = has('outstanding')
    ? sumMoney(
        data.invoices
          .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
          .map((i) => getInvoicePaymentSummary(i, data.payments as Payment[]).remaining),
      )
    : null;

  const overdueInvoices = has('overdueInvoices')
    ? findOverdueInvoices(data.invoices, data.payments, gates.overdueInvoiceAmounts, data.now).length
    : null;

  const debtsRemaining = has('debts') ? sumMoney(data.debts.map((d) => d.remainingAmount)) : null;

  const workersOwed = has('workers')
    ? summarizeWorkerLedgers(data.workers.map((w) => buildWorkerLedger(w, data.allExpenses as Expense[]))).owed
    : null;

  return { dashboard, outstanding, debtsRemaining, overdueInvoices, workersOwed };
}

/**
 * Daily values folded into blocks of `size` days (newest block is always whole), so a long period still
 * fits a small bar chart. Sums are exact.
 */
export function bucketSums(values: readonly number[], size: number): number[] {
  if (size <= 1) return [...values];
  const out: number[] = [];
  for (let end = values.length; end > 0; end -= size) out.unshift(sumMoney(values.slice(Math.max(0, end - size), end)));
  return out;
}
