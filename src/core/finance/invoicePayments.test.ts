import { describe, expect, it } from 'vitest';
import type { Invoice, Payment } from '../../types';
import { deriveDebtStatus, deriveInvoiceStatus, getInvoicePaymentSummary, sumInvoicePayments } from './invoicePayments';

const invoice = (total: number, status: Invoice['status'] = 'sent') =>
  ({ id: 'i1', total, status, dueDate: '2999-01-01' }) as Invoice;
const pay = (amount: number) => ({ invoiceId: 'i1', amount }) as Payment;

describe('invoice payments', () => {
  it('sums partial payments exactly', () => {
    expect(sumInvoicePayments([pay(100.1), pay(12.3)], 'i1')).toBe(112.4);
  });

  it('marks an invoice paid when float sums would fall a hair short', () => {
    const paid = sumInvoicePayments([pay(100.1), pay(12.3)], 'i1');
    expect(deriveInvoiceStatus(invoice(112.4), paid)).toBe('paid');
    expect(getInvoicePaymentSummary(invoice(112.4), [pay(100.1), pay(12.3)]).remaining).toBe(0);
  });

  it('keeps partial status when money is still owed', () => {
    expect(deriveInvoiceStatus(invoice(200), 50)).toBe('partially_paid');
  });

  it('settles a debt paid in float-unfriendly steps', () => {
    expect(deriveDebtStatus(0.8, 0.1 + 0.7)).toBe('paid');
  });
});
