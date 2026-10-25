import { describe, expect, it } from 'vitest';
import { buildPrincipal } from '../../../core/access';
import { canDeleteInvoice } from './invoiceAccess';

const admin = buildPrincipal({ id: 'a', role: 'admin' });
const employee = (permissions: string[]) => buildPrincipal({ id: 'e', role: 'employee', permissions });

describe('canDeleteInvoice', () => {
  it('needs invoices.delete first', () => {
    expect(canDeleteInvoice(employee(['invoices.manage', 'payments.delete']), 0)).toBe(false);
    expect(canDeleteInvoice(null, 0)).toBe(false);
  });

  it('with payments.delete the invoice and its payments can both go', () => {
    expect(canDeleteInvoice(admin, 3)).toBe(true);
    expect(canDeleteInvoice(employee(['invoices.delete', 'payments.delete']), 3)).toBe(true);
  });

  it('without payments.delete only an invoice KNOWN to have no payments may go', () => {
    const p = employee(['invoices.delete', 'payments.view']);
    expect(canDeleteInvoice(p, 0)).toBe(true);
    expect(canDeleteInvoice(p, 2)).toBe(false);
    // cannot see payments at all: there may be some, so no
    expect(canDeleteInvoice(employee(['invoices.delete']), 0)).toBe(false);
  });
});
