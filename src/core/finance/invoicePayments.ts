import dayjs from 'dayjs';
import type { Invoice, Payment } from '../../types';
import { subtractMoney, sumMoney, toMilli } from './money';

/** مجموع المدفوعات المسجّلة على فاتورة */
export function sumInvoicePayments(payments: Payment[], invoiceId: string): number {
  if (!invoiceId) return 0;
  return sumMoney(payments.filter((p) => p.invoiceId === invoiceId).map((p) => p.amount));
}

export type InvoicePaymentSummary = {
  paid: number;
  remaining: number;
  progressPct: number;
};

export function getInvoicePaymentSummary(
  invoice: Invoice,
  payments: Payment[]
): InvoicePaymentSummary {
  const paid = sumInvoicePayments(payments, invoice.id);
  const remaining = Math.max(0, subtractMoney(invoice.total, paid));
  const progressPct =
    invoice.total > 0 ? Math.min(100, Math.round((paid / invoice.total) * 100)) : 0;
  return { paid, remaining, progressPct };
}

/** يشتق حالة الفاتورة من المدفوعات (مع احترام الملغاة والمسودة) */
export function deriveInvoiceStatus(
  invoice: Invoice,
  paidTotal: number
): Invoice['status'] {
  if (invoice.status === 'cancelled') return 'cancelled';

  // Compare in thousandths: 100.1 + 12.3 is 112.39999999999999 in floats and would never reach 112.4.
  if (toMilli(paidTotal) >= toMilli(invoice.total) && invoice.total > 0) return 'paid';
  if (paidTotal > 0) return 'partially_paid';

  if (invoice.status === 'draft') return 'draft';

  if (dayjs(invoice.dueDate).isBefore(dayjs(), 'day')) return 'overdue';

  return invoice.status === 'sent' ? 'sent' : 'sent';
}

export function deriveDebtStatus(
  amount: number,
  paidAmount: number,
  dueDate?: string
): 'unpaid' | 'partially_paid' | 'paid' | 'overdue' {
  const remaining = Math.max(0, subtractMoney(amount, paidAmount));
  if (remaining <= 0) return 'paid';
  if (paidAmount > 0) {
    if (dueDate && dayjs(dueDate).isBefore(dayjs(), 'day')) return 'overdue';
    return 'partially_paid';
  }
  if (dueDate && dayjs(dueDate).isBefore(dayjs(), 'day')) return 'overdue';
  return 'unpaid';
}
