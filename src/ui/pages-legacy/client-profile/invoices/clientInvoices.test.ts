import { describe, expect, it } from 'vitest';
import type { Invoice, Payment } from '../../../../types';
import { buildClientInvoices, selectClientInvoices } from './clientInvoices';

const TODAY = new Date(2026, 9, 24, 10, 0, 0); // 24 Oct 2026

const inv = (o: Partial<Invoice> & { id: string }): Invoice => ({
  invoiceNumber: o.id.toUpperCase(),
  clientId: 'c8',
  items: [],
  subtotal: 1000,
  taxRate: 0,
  taxAmount: 0,
  total: 1000,
  status: 'sent',
  issueDate: '2026-10-01',
  dueDate: '2026-11-15',
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  ...o,
});
const pay = (invoiceId: string, amount: number, o: Partial<Payment> = {}): Payment => ({
  id: `p-${invoiceId}-${amount}`,
  invoiceId,
  clientId: 'c8',
  amount,
  paymentMethod: 'cash',
  paymentDate: '2026-10-10',
  createdAt: '2026-10-10T08:00:00.000Z',
  updatedAt: '2026-10-10T08:00:00.000Z',
  ...o,
});

describe('selectClientInvoices', () => {
  it('keeps only this client, newest first', () => {
    const list = selectClientInvoices(
      [inv({ id: 'a', issueDate: '2026-01-01' }), inv({ id: 'b', clientId: 'x' }), inv({ id: 'c', issueDate: '2026-05-01' })],
      'c8',
    );
    expect(list.map((i) => i.id)).toEqual(['c', 'a']);
    expect(selectClientInvoices([inv({ id: 'a' })], undefined)).toEqual([]);
  });
});

describe('buildClientInvoices with the payments', () => {
  const invoices = [
    inv({ id: 'draft', status: 'draft', total: 500, dueDate: '2026-09-01' }),
    inv({ id: 'sent', status: 'sent', total: 2000, dueDate: '2026-11-20' }),
    inv({ id: 'part', status: 'partially_paid', total: 3000, dueDate: '2026-11-05' }),
    inv({ id: 'paid', status: 'paid', total: 4000, issueDate: '2026-08-01' }),
    inv({ id: 'late', status: 'sent', total: 1500, dueDate: '2026-10-14' }),
    inv({ id: 'later', status: 'overdue', total: 800, dueDate: '2026-09-24' }),
    inv({ id: 'gone', status: 'cancelled', total: 9999, dueDate: '2026-01-01' }),
  ];
  const payments = [pay('part', 1000), pay('paid', 4000), pay('late', 500), pay('', 250), pay('other-client-invoice', 75)];
  const view = buildClientInvoices({ invoices, payments, paymentsKnown: true, today: TODAY });
  const byId = (id: string) => view.rows.find((r) => r.invoice.id === id)!;

  it('derives each status from the payments and the due date', () => {
    expect(byId('draft').status).toBe('draft'); // a draft past its date is not overdue
    expect(byId('sent').status).toBe('sent');
    expect(byId('part').status).toBe('partially_paid');
    expect(byId('paid').status).toBe('paid');
    expect(byId('late').status).toBe('overdue');
    expect(byId('later').status).toBe('overdue');
    expect(byId('gone').status).toBe('cancelled');
  });

  it('puts overdue first, the longest overdue on top, finished business last', () => {
    expect(view.rows.map((r) => r.invoice.id)).toEqual(['later', 'late', 'part', 'sent', 'draft', 'paid', 'gone']);
  });

  it('counts the days overdue', () => {
    expect(byId('later').daysOverdue).toBe(30);
    expect(byId('late').daysOverdue).toBe(10);
    expect(byId('sent').daysOverdue).toBe(0);
  });

  it('paid, remaining and progress per invoice', () => {
    expect(byId('part')).toMatchObject({ paid: 1000, remaining: 2000, progressPct: 33 });
    expect(byId('late')).toMatchObject({ paid: 500, remaining: 1000, progressPct: 33 });
    expect(byId('paid')).toMatchObject({ paid: 4000, remaining: 0, progressPct: 100 });
    expect(byId('sent')).toMatchObject({ paid: 0, remaining: 2000, progressPct: 0 });
  });

  it('totals leave out cancelled invoices', () => {
    expect(view.totals).toMatchObject({
      count: 6,
      cancelledCount: 1,
      overdueCount: 2,
      invoiced: 500 + 2000 + 3000 + 4000 + 1500 + 800,
      paid: 1000 + 4000 + 500,
      remaining: 500 + 2000 + 2000 + 0 + 1000 + 800,
      overdueRemaining: 1000 + 800,
    });
  });

  it('reports payments that belong to no invoice of the client', () => {
    expect(view.totals.unlinked).toBe(250 + 75);
  });
});

describe('buildClientInvoices without the payments', () => {
  const view = buildClientInvoices({
    invoices: [
      inv({ id: 'a', status: 'partially_paid', dueDate: '2026-09-01' }),
      inv({ id: 'b', status: 'sent', dueDate: '2026-12-01' }),
      inv({ id: 'c', status: 'paid', dueDate: '2026-01-01' }),
      inv({ id: 'd', status: 'overdue', dueDate: '2026-12-31' }),
      inv({ id: 'e', status: 'draft', dueDate: '2026-01-01' }),
    ],
    payments: [],
    paymentsKnown: false,
    today: TODAY,
  });

  it('falls back on the stored status and the due date', () => {
    const status = Object.fromEntries(view.rows.map((r) => [r.invoice.id, r.status]));
    expect(status).toEqual({ a: 'overdue', b: 'sent', c: 'paid', d: 'sent', e: 'draft' });
  });

  it('makes up no collected or remaining figure', () => {
    for (const r of view.rows) expect(r).toMatchObject({ paid: null, remaining: null, progressPct: null });
    expect(view.totals).toMatchObject({ paid: null, remaining: null, overdueRemaining: null, unlinked: null });
    expect(view.totals.invoiced).toBe(5000);
    expect(view.totals.overdueCount).toBe(1);
  });
});

describe('exact money', () => {
  it('settles an invoice paid in float-unfriendly steps', () => {
    const view = buildClientInvoices({
      invoices: [inv({ id: 'x', total: 112.4, status: 'sent' })],
      payments: [pay('x', 100.1), pay('x', 12.3)],
      paymentsKnown: true,
      today: TODAY,
    });
    expect(view.rows[0]).toMatchObject({ status: 'paid', paid: 112.4, remaining: 0 });
    expect(view.totals).toMatchObject({ paid: 112.4, remaining: 0, invoiced: 112.4 });
  });

  it('an overpaid invoice shows what came in, with nothing remaining', () => {
    const view = buildClientInvoices({
      invoices: [inv({ id: 'x', total: 100 })],
      payments: [pay('x', 130)],
      paymentsKnown: true,
      today: TODAY,
    });
    expect(view.rows[0]).toMatchObject({ status: 'paid', paid: 130, remaining: 0, progressPct: 100 });
    expect(view.totals.remaining).toBe(0);
  });
});

describe('an empty client', () => {
  it('has no rows and zero totals', () => {
    const view = buildClientInvoices({ invoices: [], payments: [], paymentsKnown: true, today: TODAY });
    expect(view.rows).toEqual([]);
    expect(view.totals).toMatchObject({ count: 0, invoiced: 0, paid: 0, remaining: 0, unlinked: 0 });
  });
});
