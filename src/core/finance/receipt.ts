import type { Client, Invoice, Payment } from '../../types';
import { amountInWords } from './amountInWords';
import { subtractMoney, sumMoney } from './money';

/** Receipts are numbered per year, from 1: RC-2026-0001. */
export const receiptCounterId = (year: number) => `receipts-${year}`;
export const formatReceiptNumber = (year: number, sequence: number) => `RC-${year}-${String(sequence).padStart(4, '0')}`;

export const PAYMENT_METHOD_TEXT: Record<Payment['paymentMethod'], string> = {
  cash: 'نقداً',
  check: 'شيك',
  bank_transfer: 'تحويل بنكي',
  credit_card: 'بطاقة',
  mobile_payment: 'دفع إلكتروني',
};

export interface ReceiptInvoice {
  number: string;
  total: number;
  /** Paid on the invoice up to and including this payment. */
  paidThrough: number;
  /** What is still owed on the invoice after this payment. */
  remaining: number;
}

export interface ReceiptData {
  number: string;
  /** The day the payment was received (YYYY-MM-DD). */
  date: string;
  clientName: string;
  clientPhone?: string;
  amount: number;
  amountWords: string;
  method: string;
  notes?: string;
  invoice?: ReceiptInvoice;
  /** Who took the money: the person who recorded the payment. */
  receivedBy: string;
  /** What the QR code carries: enough to check the receipt against the company's records. */
  qr: string;
}

const day = (value?: string) => (value ?? '').slice(0, 10);

/** Payments of one invoice in the order they came in, so «paid up to this one» is well defined. */
function inOrder(payments: readonly Payment[]) {
  return [...payments].sort((a, b) => day(a.paymentDate).localeCompare(day(b.paymentDate)) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function receiptInvoice(payment: Payment, invoice: Invoice | undefined, allPayments: readonly Payment[]): ReceiptInvoice | undefined {
  if (!invoice) return undefined;
  const ofInvoice = inOrder(allPayments.filter((p) => p.invoiceId === invoice.id));
  const index = ofInvoice.findIndex((p) => p.id === payment.id);
  if (index < 0) return undefined;
  const paidThrough = sumMoney(ofInvoice.slice(0, index + 1).map((p) => p.amount));
  return { number: invoice.invoiceNumber, total: invoice.total, paidThrough, remaining: Math.max(0, subtractMoney(invoice.total, paidThrough)) };
}

export function receiptQrPayload(number: string, amount: number, date: string): string {
  return ['MAKIN', number, amount.toFixed(3), day(date)].join('|');
}

export function buildReceipt(args: {
  payment: Payment;
  number: string;
  client: Pick<Client, 'name' | 'phone'> | undefined;
  invoice?: Invoice;
  allPayments: readonly Payment[];
  /** Used when the payment names no recorder. */
  fallbackReceiver?: string;
}): ReceiptData {
  const { payment, number, client, invoice, allPayments, fallbackReceiver } = args;
  return {
    number,
    date: day(payment.paymentDate),
    clientName: client?.name ?? 'عميل',
    clientPhone: client?.phone || undefined,
    amount: payment.amount,
    amountWords: amountInWords(payment.amount),
    method: PAYMENT_METHOD_TEXT[payment.paymentMethod] ?? payment.paymentMethod,
    notes: payment.notes?.trim() || undefined,
    invoice: receiptInvoice(payment, invoice, allPayments),
    receivedBy: payment.createdBy || fallbackReceiver || '',
    qr: receiptQrPayload(number, payment.amount, payment.paymentDate),
  };
}
