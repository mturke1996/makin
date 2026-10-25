import dayjs from 'dayjs';
import { deriveDebtStatus } from '../../../core/finance/invoicePayments';
import type { StandaloneDebt } from '../../../types';
import { toMilli } from './moneyUtils';

export type DebtStatus = ReturnType<typeof deriveDebtStatus>;

export const DEBT_STATUS_LABEL: Record<DebtStatus, string> = {
  unpaid: 'غير مسدد',
  partially_paid: 'مسدد جزئياً',
  paid: 'مسدد',
  overdue: 'متأخر',
};

export interface DebtState {
  status: DebtStatus;
  paid: number;
  remaining: number;
  /** Paid share, 0-100. */
  pct: number;
  overdueDays: number;
}

/** Derived from amounts and due date (the stored status can be stale). */
export function getDebtState(debt: StandaloneDebt): DebtState {
  const amountM = toMilli(debt.amount);
  const paidM = Math.min(amountM, toMilli(debt.paidAmount || 0));
  const remaining = Math.max(0, amountM - paidM) / 1000;
  const status = deriveDebtStatus(debt.amount, paidM / 1000, debt.dueDate);
  const overdueDays =
    status === 'overdue' && debt.dueDate ? Math.max(1, dayjs().startOf('day').diff(dayjs(debt.dueDate).startOf('day'), 'day')) : 0;
  return {
    status,
    paid: paidM / 1000,
    remaining,
    pct: amountM > 0 ? (paidM / amountM) * 100 : 0,
    overdueDays,
  };
}

/** Overdue first, then soonest due date, paid last. */
export function compareDebts(a: StandaloneDebt, b: StandaloneDebt): number {
  const sa = getDebtState(a);
  const sb = getDebtState(b);
  const rank = (s: DebtState) => (s.status === 'paid' ? 2 : s.status === 'overdue' ? 0 : 1);
  if (rank(sa) !== rank(sb)) return rank(sa) - rank(sb);
  const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
  const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
  if (da !== db) return da - db;
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}
