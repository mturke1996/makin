import { buildOverviewTrend, localDay, allocateShares, type OverviewTrend } from '../../../core/finance/clientAnalytics';
import { fromMilli, sumMoney, toMilli } from '../../../core/finance/money';
import type { Expense, Payment } from '../../../types';

/** How many of the latest records the little bars under the average card draw. */
const RECENT = 12;

const byDateDesc = <T,>(rows: readonly T[], day: (row: T) => string, stamp: (row: T) => string) =>
  [...rows].sort((a, b) => day(b).localeCompare(day(a)) || stamp(b).localeCompare(stamp(a)));

export interface PaymentsSummary {
  total: number;
  /** What came in this month, how many payments that was, and the change against the same days of last month. */
  month: { amount: number; count: number };
  count: number;
  average: number;
  largest: number;
  /** The latest payment (by its date, then by when it was recorded). */
  last: Payment | undefined;
  /** The latest amounts, oldest first, for the bars. */
  recent: number[];
  trend: OverviewTrend;
}

/** Everything the payments page's figures say, from the payments it lists. Money in exact thousandths. */
export function summarizePayments(payments: readonly Payment[], today: string = localDay()): PaymentsSummary {
  const trend = buildOverviewTrend({ payments, expenses: [], today });
  const newest = byDateDesc(payments, (p) => String(p.paymentDate ?? ''), (p) => String(p.createdAt ?? ''));
  const month = today.slice(0, 7);
  const inMonth = payments.filter((p) => String(p.paymentDate ?? '').slice(0, 7) === month);
  const total = sumMoney(payments.map((p) => p.amount));
  return {
    total,
    month: { amount: sumMoney(inMonth.map((p) => p.amount)), count: inMonth.length },
    count: payments.length,
    average: payments.length ? fromMilli(Math.round(toMilli(total) / payments.length)) : 0,
    largest: payments.reduce((max, p) => Math.max(max, p.amount), 0),
    last: newest[0],
    recent: newest.slice(0, RECENT).map((p) => p.amount).reverse(),
    trend,
  };
}

export interface ExpensesSummary {
  total: number;
  month: { amount: number; count: number };
  count: number;
  average: number;
  /** What waits for approval, in dinars and records. */
  pending: { amount: number; count: number };
  /** The biggest category, with its whole-number share among the rows shown (the shares add up to 100). */
  top: { key: string; label: string; amount: number; share: number } | null;
  recent: number[];
  trend: OverviewTrend;
}

/** The same for expenses. `labelOf` names a category; `isPending` says which expenses wait for approval. */
export function summarizeExpenses(
  expenses: readonly Expense[],
  labelOf: (category: string) => string,
  isPending: (expense: Expense) => boolean,
  today: string = localDay(),
): ExpensesSummary {
  const trend = buildOverviewTrend({ payments: [], expenses, today });
  const newest = byDateDesc(expenses, (e) => String(e.date ?? ''), (e) => String(e.createdAt ?? ''));
  const month = today.slice(0, 7);
  const inMonth = expenses.filter((e) => String(e.date ?? '').slice(0, 7) === month);
  const total = sumMoney(expenses.map((e) => e.amount));
  const waiting = expenses.filter(isPending);

  const perCategory = new Map<string, number>();
  for (const e of expenses) perCategory.set(e.category, (perCategory.get(e.category) ?? 0) + toMilli(e.amount));
  const ranked = [...perCategory.entries()].sort((a, b) => b[1] - a[1]);
  const shares = allocateShares(ranked.map(([, milli]) => fromMilli(milli)));

  return {
    total,
    month: { amount: sumMoney(inMonth.map((e) => e.amount)), count: inMonth.length },
    count: expenses.length,
    average: expenses.length ? fromMilli(Math.round(toMilli(total) / expenses.length)) : 0,
    pending: { amount: sumMoney(waiting.map((e) => e.amount)), count: waiting.length },
    top: ranked.length ? { key: ranked[0][0], label: labelOf(ranked[0][0]), amount: fromMilli(ranked[0][1]), share: shares[0] } : null,
    recent: newest.slice(0, RECENT).map((e) => e.amount).reverse(),
    trend,
  };
}
