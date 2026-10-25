import dayjs from 'dayjs';
import type { Invoice, Payment } from '../../types';
import { deriveInvoiceStatus, sumInvoicePayments } from './invoicePayments';
import { subtractMoney } from './money';

export interface OverdueInvoice {
  inv: Invoice;
  /** What is left on it; undefined when the payments are not available. */
  remaining: number | undefined;
  days: number;
}

/**
 * Invoices past their due date that are not settled, oldest first. Without the payments the stored
 * status is all there is to go on, and no amount is quoted.
 */
export function findOverdueInvoices(
  invoices: readonly Invoice[],
  payments: readonly Payment[],
  withAmounts: boolean,
  now?: Date,
): OverdueInvoice[] {
  const today = dayjs(now).startOf('day');
  return invoices
    .filter((inv) => {
      if (inv.status === 'paid' || inv.status === 'cancelled') return false;
      if (!dayjs(inv.dueDate).isBefore(today, 'day')) return false;
      if (!withAmounts) return true;
      return deriveInvoiceStatus(inv, sumInvoicePayments(payments as Payment[], inv.id)) !== 'paid';
    })
    .map((inv) => ({
      inv,
      remaining: withAmounts ? Math.max(0, subtractMoney(inv.total, sumInvoicePayments(payments as Payment[], inv.id))) : undefined,
      days: today.diff(dayjs(inv.dueDate).startOf('day'), 'day'),
    }))
    .sort((a, b) => b.days - a.days);
}
