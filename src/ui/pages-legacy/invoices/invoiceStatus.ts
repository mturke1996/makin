import type { Invoice } from '../../../types';

export type InvoiceStatus = Invoice['status'];
export type StatusTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  draft: 'neutral',
  sent: 'info',
  partially_paid: 'warning',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'neutral',
};

/** Progress tone for the collected share. */
export const PROGRESS_TONE: Record<InvoiceStatus, 'brand' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'brand',
  sent: 'brand',
  partially_paid: 'warning',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'brand',
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'نقدي',
  bank_transfer: 'تحويل بنكي',
  check: 'شيك',
  mobile_payment: 'دفع إلكتروني',
  credit_card: 'بطاقة',
};
