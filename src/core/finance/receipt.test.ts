import { describe, expect, it } from 'vitest';
import type { Invoice, Payment } from '../../types';
import { buildReceipt, formatReceiptNumber, receiptCounterId, receiptInvoice, receiptQrPayload } from './receipt';

const pay = (id: string, amount: number, paymentDate: string, extra: Partial<Payment> = {}): Payment =>
  ({ id, invoiceId: 'inv1', clientId: 'c1', amount, paymentMethod: 'cash', paymentDate, createdAt: `${paymentDate}T09:00:00Z`, updatedAt: '', ...extra }) as Payment;
const invoice = { id: 'inv1', invoiceNumber: 'MK-2026-001', total: 110000 } as Invoice;
const all = [pay('p2', 25000, '2026-10-10'), pay('p1', 60000, '2026-09-20'), pay('p3', 10000.5, '2026-10-12'), pay('other', 999, '2026-10-01', { invoiceId: 'inv2' })];

describe('receipt numbers', () => {
  it('are numbered per year with four digits', () => {
    expect(formatReceiptNumber(2026, 7)).toBe('RC-2026-0007');
    expect(formatReceiptNumber(2026, 12345)).toBe('RC-2026-12345');
    expect(receiptCounterId(2026)).toBe('receipts-2026');
  });
});

describe('receipt invoice summary', () => {
  it('counts what was paid up to and including the payment, in the order they came in', () => {
    expect(receiptInvoice(all[1], invoice, all)).toEqual({ number: 'MK-2026-001', total: 110000, paidThrough: 60000, remaining: 50000 });
    expect(receiptInvoice(all[0], invoice, all)).toMatchObject({ paidThrough: 85000, remaining: 25000 });
    expect(receiptInvoice(all[2], invoice, all)).toMatchObject({ paidThrough: 95000.5, remaining: 14999.5 });
  });

  it('never goes below zero and ignores other invoices\' payments', () => {
    const over = [pay('a', 120000, '2026-10-01')];
    expect(receiptInvoice(over[0], invoice, over)?.remaining).toBe(0);
    expect(receiptInvoice(all[3], invoice, all)).toBeUndefined(); // that payment is on another invoice
  });

  it('has no invoice part for a payment on no invoice', () => {
    expect(receiptInvoice(all[0], undefined, all)).toBeUndefined();
  });
});

describe('buildReceipt', () => {
  it('puts the amount in figures, in words, with the method, the receiver and a checkable QR', () => {
    const receipt = buildReceipt({ payment: pay('p1', 60000, '2026-09-20', { createdBy: 'م. أحمد', notes: ' الدفعة الأولى ' }), number: 'RC-2026-0001', client: { name: 'فيلا خالد', phone: '0912345678' }, invoice, allPayments: all });
    expect(receipt).toMatchObject({
      number: 'RC-2026-0001',
      date: '2026-09-20',
      clientName: 'فيلا خالد',
      amount: 60000,
      amountWords: 'ستون ألف دينار ليبي فقط لا غير',
      method: 'نقداً',
      notes: 'الدفعة الأولى',
      receivedBy: 'م. أحمد',
      qr: expect.stringMatching(/^\/verify\?k=RC&r=RC-2026-0001&a=60000\.000&d=2026-09-20&s=[0-9a-f]{8}$/),
    });
    expect(receipt.invoice?.remaining).toBe(50000);
  });

  it('falls back to a given receiver and tolerates a missing client', () => {
    const receipt = buildReceipt({ payment: pay('p1', 5, '2026-09-20'), number: 'RC-2026-0002', client: undefined, allPayments: [], fallbackReceiver: 'المحاسب' });
    expect(receipt.clientName).toBe('عميل');
    expect(receipt.receivedBy).toBe('المحاسب');
  });

  it('keeps the QR payload in thousandths', () => {
    expect(receiptQrPayload('RC-2026-0003', 10000.5, '2026-10-12T08:00:00Z', 'https://app.example')).toContain('https://app.example/verify?k=RC&r=RC-2026-0003&a=10000.500&d=2026-10-12&s=');
  });
});
