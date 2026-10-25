import { describe, expect, it } from 'vitest';
import type { Client, Invoice, Payment, PaymentMilestone } from '../../types';
import {
  AGING_BUCKETS,
  agingBucketOf,
  buildPaymentSchedule,
  buildReceivables,
  clientCollected,
  scheduleHighlights,
  splitContract,
  splitEvenly,
} from './paymentSchedule';
import { buildReminderText, reminderHref } from './paymentReminder';

const NOW = new Date('2026-10-25T09:00:00');

const milestone = (id: string, order: number, amount: number, dueDate: string, clientId = 'c1'): PaymentMilestone => ({
  id,
  clientId,
  title: `دفعة ${id}`,
  amount,
  dueDate,
  order,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const payment = (id: string, amount: number, clientId = 'c1', invoiceId = ''): Payment => ({
  id,
  invoiceId,
  clientId,
  amount,
  paymentMethod: 'cash',
  paymentDate: '2026-10-01',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

const client = (id: string, name = `عميل ${id}`): Client => ({
  id,
  name,
  phone: '',
  address: '',
  type: 'individual',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const invoice = (id: string, clientId: string, total: number, dueDate: string, status: Invoice['status'] = 'sent'): Invoice => ({
  id,
  invoiceNumber: `INV-${id}`,
  clientId,
  items: [],
  subtotal: total,
  taxRate: 0,
  taxAmount: 0,
  total,
  status,
  issueDate: '2026-01-01',
  dueDate,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

describe('buildPaymentSchedule', () => {
  const schedule = [
    milestone('a', 1, 10000, '2026-08-01'),
    milestone('b', 2, 20000, '2026-09-20'),
    milestone('c', 3, 30000, '2026-10-30'),
    milestone('d', 4, 40000, '2026-12-30'),
  ];

  it('covers the instalments in their agreed order', () => {
    const result = buildPaymentSchedule(schedule, 25000, NOW);
    expect(result.rows.map((r) => [r.covered, r.remaining])).toEqual([
      [10000, 0],
      [15000, 5000],
      [0, 30000],
      [0, 40000],
    ]);
    expect(result.rows[1].partial).toBe(true);
    expect(result.covered).toBe(25000);
    expect(result.remaining).toBe(75000);
    expect(result.total).toBe(100000);
    expect(result.surplus).toBe(0);
  });

  it('names what is paid, late, due soon and still ahead', () => {
    const result = buildPaymentSchedule(schedule, 25000, NOW);
    expect(result.rows.map((r) => r.status)).toEqual(['paid', 'overdue', 'due_soon', 'upcoming']);
    expect(result.rows[1].daysLate).toBe(35);
    expect(result.rows[2].daysUntil).toBe(5);
    expect(result.overdueAmount).toBe(5000);
    expect(result.overdueCount).toBe(1);
    expect(result.next?.milestone.id).toBe('b');
  });

  it('is not late on the due date itself', () => {
    const result = buildPaymentSchedule([milestone('x', 1, 100, '2026-10-25')], 0, NOW);
    expect(result.rows[0].status).toBe('due_soon');
    expect(result.rows[0].daysUntil).toBe(0);
    expect(result.overdueCount).toBe(0);
  });

  it('is late the day after', () => {
    const result = buildPaymentSchedule([milestone('x', 1, 100, '2026-10-24')], 0, NOW);
    expect(result.rows[0].status).toBe('overdue');
    expect(result.rows[0].daysLate).toBe(1);
  });

  it('re-opens an instalment when a payment disappears', () => {
    const before = buildPaymentSchedule(schedule, 30000, NOW);
    expect(before.rows[1].status).toBe('paid');
    const after = buildPaymentSchedule(schedule, 20000, NOW);
    expect(after.rows[1].status).toBe('overdue');
  });

  it('reports what was received beyond the schedule', () => {
    const result = buildPaymentSchedule([milestone('a', 1, 1000, '2026-12-01')], 1500, NOW);
    expect(result.surplus).toBe(500);
    expect(result.remaining).toBe(0);
    expect(result.next).toBeUndefined();
  });

  it('settles in exact thousandths', () => {
    const result = buildPaymentSchedule([milestone('a', 1, 0.3, '2026-12-01')], 0.1 + 0.2, NOW);
    expect(result.rows[0].status).toBe('paid');
    expect(result.rows[0].remaining).toBe(0);
  });

  it('orders by the agreed order, then by due date', () => {
    const result = buildPaymentSchedule([milestone('late', 2, 10, '2026-12-01'), milestone('early', 1, 10, '2026-11-01')], 10, NOW);
    expect(result.rows.map((r) => r.milestone.id)).toEqual(['early', 'late']);
    expect(result.rows[0].status).toBe('paid');
  });

  it('ignores a negative collected figure', () => {
    expect(buildPaymentSchedule([milestone('a', 1, 10, '2026-12-01')], -50, NOW).covered).toBe(0);
  });
});

describe('scheduleHighlights', () => {
  it('says nothing for a client without a schedule', () => {
    expect(scheduleHighlights(buildPaymentSchedule([], 0, NOW))).toBeUndefined();
  });

  it('picks the longest-late instalment and the nearest one falling due', () => {
    const result = scheduleHighlights(
      buildPaymentSchedule(
        [
          milestone('a', 1, 100, '2026-10-20'),
          milestone('b', 2, 100, '2026-08-01'),
          milestone('c', 3, 100, '2026-10-30'),
          milestone('d', 4, 100, '2026-10-27'),
        ],
        0,
        NOW,
      ),
    );
    expect(result?.overdueCount).toBe(2);
    expect(result?.overdueAmount).toBe(200);
    expect(result?.oldest).toEqual({ title: 'دفعة b', daysLate: 85 });
    expect(result?.dueSoon).toEqual({ title: 'دفعة d', remaining: 100, daysUntil: 2 });
  });
});

describe('clientCollected', () => {
  it('adds every payment of the client, whatever invoice it was booked on', () => {
    const payments = [payment('1', 100.1, 'c1'), payment('2', 200.2, 'c1', 'inv'), payment('3', 999, 'c2')];
    expect(clientCollected(payments, 'c1')).toBe(300.3);
  });
});

describe('splitContract', () => {
  const opts = { startDate: '2026-11-01', intervalDays: 30 };

  it('shares the contract by weight and always adds up to it', () => {
    const parts = splitContract(100000, [40, 30, 30], opts);
    expect(parts.map((p) => p.amount)).toEqual([40000, 30000, 30000]);
    expect(parts.map((p) => p.dueDate)).toEqual(['2026-11-01', '2026-12-01', '2026-12-31']);
    expect(parts.map((p) => p.title)).toEqual(['الدفعة الأولى', 'الدفعة الثانية', 'الدفعة الثالثة']);
  });

  it('gives the odd thousandth to the last instalment', () => {
    const parts = splitEvenly(100, 3, opts);
    expect(parts.map((p) => p.amount)).toEqual([33.333, 33.333, 33.334]);
    expect(parts.reduce((s, p) => s + Math.round(p.amount * 1000), 0)).toBe(100000);
  });

  it('numbers instalments past the tenth', () => {
    expect(splitEvenly(1200, 12, opts)[10].title).toBe('الدفعة 11');
  });

  it('makes nothing from nothing', () => {
    expect(splitContract(0, [1, 1], opts)).toEqual([]);
    expect(splitContract(1000, [], opts)).toEqual([]);
    expect(splitEvenly(1000, 0, opts)).toEqual([]);
  });
});

describe('agingBucketOf', () => {
  it('puts days late into 30 / 60 / 90 / more', () => {
    expect(agingBucketOf(0)).toBeUndefined();
    expect(agingBucketOf(1)?.id).toBe('d30');
    expect(agingBucketOf(30)?.id).toBe('d30');
    expect(agingBucketOf(31)?.id).toBe('d60');
    expect(agingBucketOf(60)?.id).toBe('d60');
    expect(agingBucketOf(61)?.id).toBe('d90');
    expect(agingBucketOf(90)?.id).toBe('d90');
    expect(agingBucketOf(91)?.id).toBe('d90p');
    expect(agingBucketOf(400)?.id).toBe('d90p');
    expect(AGING_BUCKETS).toHaveLength(4);
  });
});

describe('buildReceivables', () => {
  it('ages the schedule of a client that has one', () => {
    const report = buildReceivables({
      clients: [client('c1')],
      payments: [payment('p', 10000)],
      milestones: [milestone('a', 1, 10000, '2026-06-01'), milestone('b', 2, 20000, '2026-09-01'), milestone('c', 3, 5000, '2026-11-10')],
      now: NOW,
    });
    expect(report.late).toHaveLength(1);
    const [row] = report.late;
    expect(row.basis).toBe('schedule');
    expect(row.overdue.map((i) => [i.title, i.amount, i.daysLate])).toEqual([['دفعة b', 20000, 54]]);
    expect(row.oldestDays).toBe(54);
    expect(report.overdueTotal).toBe(20000);
    expect(report.buckets.map((b) => [b.def.id, b.amount, b.count])).toEqual([
      ['d30', 0, 0],
      ['d60', 20000, 1],
      ['d90', 0, 0],
      ['d90p', 0, 0],
    ]);
    expect(report.soon[0].upcoming.map((i) => i.title)).toEqual(['دفعة c']);
    expect(report.upcomingTotal).toBe(5000);
  });

  it('falls back to invoices for a client without a schedule', () => {
    const report = buildReceivables({
      clients: [client('c2')],
      payments: [payment('p', 400, 'c2', 'i1')],
      milestones: [],
      invoices: [invoice('i1', 'c2', 1000, '2026-10-05'), invoice('i2', 'c2', 700, '2026-07-01'), invoice('i3', 'c2', 50, '2026-07-01', 'draft')],
      now: NOW,
    });
    const [row] = report.late;
    expect(row.basis).toBe('invoices');
    expect(row.overdue.map((i) => [i.title, i.amount, i.daysLate])).toEqual([
      ['فاتورة INV-i2', 700, 116],
      ['فاتورة INV-i1', 600, 20],
    ]);
    expect(report.buckets.find((b) => b.def.id === 'd90p')?.amount).toBe(700);
    expect(report.buckets.find((b) => b.def.id === 'd30')?.amount).toBe(600);
  });

  it('never counts the same money from the schedule and the invoices', () => {
    const report = buildReceivables({
      clients: [client('c1')],
      payments: [],
      milestones: [milestone('a', 1, 5000, '2026-09-01', 'c1')],
      invoices: [invoice('i1', 'c1', 5000, '2026-09-01')],
      now: NOW,
    });
    expect(report.overdueTotal).toBe(5000);
    expect(report.overdueCount).toBe(1);
    expect(report.late[0].basis).toBe('schedule');
  });

  it('lists the oldest debtor first', () => {
    const report = buildReceivables({
      clients: [client('c1'), client('c2')],
      payments: [],
      milestones: [milestone('a', 1, 100, '2026-10-10', 'c1'), milestone('b', 1, 50, '2026-06-10', 'c2')],
      now: NOW,
    });
    expect(report.late.map((c) => c.client.id)).toEqual(['c2', 'c1']);
  });

  it('has no basis, and so no row, for a client with neither', () => {
    const report = buildReceivables({ clients: [client('c9')], payments: [], milestones: [], invoices: [], now: NOW });
    expect(report.late).toEqual([]);
    expect(report.soon).toEqual([]);
    expect(report.overdueTotal).toBe(0);
  });

  it('forecasts only what falls due within 30 days', () => {
    const report = buildReceivables({
      clients: [client('c1')],
      payments: [],
      milestones: [milestone('a', 1, 100, '2026-11-24'), milestone('b', 2, 200, '2026-11-25')],
      now: NOW,
    });
    expect(report.soon[0].upcoming.map((i) => i.title)).toEqual(['دفعة a']);
    expect(report.upcomingTotal).toBe(100);
  });
});

describe('buildReminderText', () => {
  const item = { key: 'm:a', kind: 'milestone' as const, title: 'الدفعة الثانية', dueDate: '2026-09-01', amount: 20000, daysLate: 54 };

  it('words a single overdue instalment', () => {
    const text = buildReminderText({ clientName: 'أحمد', companyName: 'MAKIN', items: [item], total: 20000 });
    expect(text.split('\n')[0]).toBe('السلام عليكم أحمد،');
    expect(text).toContain('«الدفعة الثانية»');
    expect(text).toContain('حلّ موعدها');
    expect(text.trimEnd().endsWith('MAKIN')).toBe(true);
  });

  it('lists several items and their total', () => {
    const text = buildReminderText({ clientName: 'أحمد', companyName: 'MAKIN', items: [item, { ...item, key: 'm:b', title: 'الدفعة الثالثة', amount: 500 }], total: 20500 });
    expect(text).toContain('• الدفعة الثانية');
    expect(text).toContain('• الدفعة الثالثة');
    expect(text).toContain('الإجمالي');
  });

  it('speaks in the future for what is not yet due', () => {
    const text = buildReminderText({ clientName: 'أحمد', companyName: 'MAKIN', items: [{ ...item, daysLate: -5 }], total: 20000 });
    expect(text).toContain('يحلّ موعدها');
  });
});

describe('reminderHref', () => {
  it('appends the text to the client number', () => {
    expect(reminderHref('https://wa.me/218912345678', 'مرحبا')).toBe(`https://wa.me/218912345678?text=${encodeURIComponent('مرحبا')}`);
  });
  it('still opens WhatsApp when the client has no usable number', () => {
    expect(reminderHref(null, 'x')).toBe('https://wa.me/?text=x');
  });
});
