import { describe, expect, it } from 'vitest';
import type { Expense, Payment, StandaloneDebt } from '../../types';
import { buildClientStatement, buildStatementText, type StatementInput } from './clientStatement';

const expense = (id: string, amount: number, day: string, extra: Partial<Expense> = {}): Expense => ({
  id,
  clientId: 'c1',
  description: `مصروف ${id}`,
  amount,
  category: 'materials',
  date: day,
  isClosed: false,
  createdAt: `${day}T09:00:00.000Z`,
  updatedAt: `${day}T09:00:00.000Z`,
  createdBy: 'محمد',
  userId: 'u1',
  ...extra,
});
const payment = (id: string, amount: number, day: string, extra: Partial<Payment> = {}): Payment => ({
  id,
  invoiceId: '',
  clientId: 'c1',
  amount,
  paymentMethod: 'cash',
  paymentDate: day,
  createdAt: `${day}T09:00:00.000Z`,
  updatedAt: `${day}T09:00:00.000Z`,
  createdBy: 'محمد',
  ...extra,
});
const debt = (id: string, remaining: number, extra: Partial<StandaloneDebt> = {}): StandaloneDebt => ({
  id,
  clientId: 'c1',
  partyType: 'client',
  partyName: 'العميل',
  description: 'سلفة',
  amount: remaining + 100,
  paidAmount: 100,
  remainingAmount: remaining,
  status: 'partially_paid',
  date: '2026-09-01',
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
  ...extra,
});
const data = (partial: Partial<StatementInput> = {}): StatementInput => ({ payments: [], expenses: [], debts: [], ...partial });
const ALL = { from: null, to: null };

// Strips the invisible direction marks the share text uses around amounts.
const plain = (s: string) => s.replace(/[\u202A\u202C\u200E\u2066\u2069]/g, '');

describe('buildClientStatement', () => {
  it('balance is collected minus spent: money in is positive, money out is negative', () => {
    const s = buildClientStatement(
      data({
        payments: [payment('p1', 1000, '2026-10-01')],
        expenses: [expense('e1', 300, '2026-10-02'), expense('e2', 900, '2026-10-03')],
      }),
      ALL,
    );
    expect(s.rows.map((r) => [r.id, r.amount, r.balance])).toEqual([
      ['p1', 1000, 1000],
      ['e1', -300, 700],
      ['e2', -900, -200],
    ]);
    expect(s).toMatchObject({ opening: 0, totalIn: 1000, totalOut: 1200, closing: -200, inCount: 1, outCount: 2 });
  });

  it('lists oldest first and the closing balance is the last running balance', () => {
    const s = buildClientStatement(
      data({
        payments: [payment('p2', 50, '2026-10-05'), payment('p1', 100, '2026-10-01')],
        expenses: [expense('e1', 30, '2026-10-03')],
      }),
      ALL,
    );
    expect(s.rows.map((r) => r.id)).toEqual(['p1', 'e1', 'p2']);
    expect(s.rows[s.rows.length - 1].balance).toBe(s.closing);
    expect(s.closing).toBe(s.opening + s.totalIn - s.totalOut);
  });

  it('treats a worker payment as money out and says so', () => {
    const s = buildClientStatement(
      data({ expenses: [expense('w1', 500, '2026-10-02', { workerId: 'wk', workerName: 'أبو سالم' })] }),
      ALL,
    );
    expect(s.rows[0]).toMatchObject({ kind: 'worker', amount: -500, balance: -500 });
    expect(s.rows[0].detail).toContain('أبو سالم');
  });

  it('puts money in before money out when they are recorded at the same moment', () => {
    const at = '2026-10-02T09:00:00.000Z';
    const s = buildClientStatement(
      data({
        payments: [payment('p1', 100, '2026-10-02', { createdAt: at })],
        expenses: [expense('e1', 100, '2026-10-02', { createdAt: at })],
      }),
      ALL,
    );
    expect(s.rows.map((r) => r.id)).toEqual(['p1', 'e1']);
  });

  it('orders the same day by the time each record was created', () => {
    const s = buildClientStatement(
      data({
        payments: [payment('p1', 100, '2026-10-02', { createdAt: '2026-10-02T15:00:00.000Z' })],
        expenses: [expense('e1', 40, '2026-10-02', { createdAt: '2026-10-02T08:00:00.000Z' })],
      }),
      ALL,
    );
    expect(s.rows.map((r) => r.id)).toEqual(['e1', 'p1']);
    expect(s.rows.map((r) => r.balance)).toEqual([-40, 60]);
  });

  it('carries the earlier balance into the opening of a period and drops later rows', () => {
    const s = buildClientStatement(
      data({
        payments: [payment('p0', 1000, '2026-08-20'), payment('p1', 200, '2026-10-05'), payment('p2', 999, '2026-11-02')],
        expenses: [expense('e0', 250, '2026-09-10'), expense('e1', 100, '2026-10-20')],
      }),
      { from: '2026-10-01', to: '2026-10-31' },
    );
    expect(s.opening).toBe(750);
    expect(s.rows.map((r) => [r.id, r.balance])).toEqual([
      ['p1', 950],
      ['e1', 850],
    ]);
    expect(s).toMatchObject({ totalIn: 200, totalOut: 100, closing: 850 });
  });

  it('includes both ends of the period', () => {
    const s = buildClientStatement(
      data({ payments: [payment('a', 10, '2026-10-01'), payment('b', 20, '2026-10-31'), payment('c', 40, '2026-09-30')] }),
      { from: '2026-10-01', to: '2026-10-31' },
    );
    expect(s.rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(s.opening).toBe(40);
  });

  it('an open-ended period works on either side', () => {
    const d = data({ payments: [payment('a', 10, '2026-01-01'), payment('b', 20, '2026-06-01')] });
    expect(buildClientStatement(d, { from: '2026-03-01', to: null })).toMatchObject({ opening: 10, closing: 30 });
    expect(buildClientStatement(d, { from: null, to: '2026-03-01' })).toMatchObject({ opening: 0, closing: 10 });
  });

  it('stays exact with fractions of a dinar', () => {
    const s = buildClientStatement(
      data({
        payments: [payment('p1', 0.1, '2026-10-01'), payment('p2', 0.2, '2026-10-02')],
        expenses: [expense('e1', 0.3, '2026-10-03')],
      }),
      ALL,
    );
    expect(s.totalIn).toBe(0.3);
    expect(s.closing).toBe(0);
    expect(s.rows.map((r) => r.balance)).toEqual([0.1, 0.3, 0]);

    const t = buildClientStatement(
      data({ payments: [payment('p1', 1000.001, '2026-10-01')], expenses: [expense('e1', 0.002, '2026-10-02')] }),
      ALL,
    );
    expect(t.closing).toBe(999.999);
  });

  it('shows debts as a separate footer figure that never enters the running balance', () => {
    const s = buildClientStatement(
      data({
        payments: [payment('p1', 100, '2026-10-01')],
        debts: [debt('d1', 400), debt('d2', 0, { status: 'paid' }), debt('d3', 50.5)],
      }),
      ALL,
    );
    expect(s.debtsRemaining).toBe(450.5);
    expect(s.debtsCount).toBe(2);
    expect(s.closing).toBe(100);
    expect(s.rows).toHaveLength(1);
  });

  it('keeps the debts footer as of today even when the period is narrow', () => {
    const s = buildClientStatement(data({ debts: [debt('d1', 400)] }), { from: '2020-01-01', to: '2020-01-31' });
    expect(s.debtsRemaining).toBe(400);
  });

  it('falls back to the creation day, and reports records with no usable day instead of hiding them silently', () => {
    const s = buildClientStatement(
      data({
        payments: [payment('p1', 100, 'x', { paymentDate: 'x', createdAt: '2026-10-04T09:00:00.000Z' })],
        expenses: [expense('e1', 5, 'x', { date: '', createdAt: '' })],
      }),
      ALL,
    );
    expect(s.rows.map((r) => r.id)).toEqual(['p1']);
    expect(s.skipped).toBe(1);
  });

  it('is empty and balanced when there is nothing', () => {
    const s = buildClientStatement(data(), ALL);
    expect(s).toMatchObject({ opening: 0, closing: 0, totalIn: 0, totalOut: 0, debtsRemaining: 0, debtsCount: 0, skipped: 0 });
    expect(s.rows).toEqual([]);
  });

  it('copes with a few thousand rows', () => {
    const expenses = Array.from({ length: 3000 }, (_, i) => expense(`e${i}`, 1.5, '2026-10-02', { createdAt: `2026-10-02T09:${String(i % 60).padStart(2, '0')}:00.000Z` }));
    const s = buildClientStatement(data({ expenses }), ALL);
    expect(s.rows).toHaveLength(3000);
    expect(s.closing).toBe(-4500);
  });
});

describe('buildStatementText', () => {
  const statement = buildClientStatement(
    data({
      payments: [payment('p1', 5000, '2026-10-01'), payment('p2', 1250.5, '2026-10-09')],
      expenses: [
        expense('e1', 3200, '2026-10-02', { description: 'أسمنت' }),
        expense('e2', 4000, '2026-10-12', { description: 'حديد' }),
      ],
      debts: [debt('d1', 500)],
    }),
    { from: '2026-10-01', to: '2026-10-31' },
  );

  it('names the client and the period, and states the sign of the balance in words', () => {
    const text = plain(buildStatementText({ clientName: 'شركة النور', statement }));
    expect(text).toContain('كشف حساب: شركة النور');
    expect(text).toContain('01/10/2026');
    expect(text).toContain('31/10/2026');
    expect(text).toContain('المحصّل');
    expect(text).toContain('6,250.5');
    expect(text).toContain('المصروف');
    expect(text).toContain('7,200');
    expect(text).toContain('عجز');
    expect(text).toContain('الديون المتبقية');
    expect(text).toContain('500');
  });

  it('lists the newest rows first and no more than asked', () => {
    const text = plain(buildStatementText({ clientName: 'س', statement, rowLimit: 2 }));
    expect(text).toContain('حديد');
    expect(text).toContain('دفعة مستلمة');
    expect(text).not.toContain('أسمنت');
    expect(text.indexOf('حديد')).toBeLessThan(text.indexOf('دفعة مستلمة'));
    expect(text).toContain('آخر حركتين');
  });

  it('says all periods when there is no range and calls a positive balance a surplus', () => {
    const s = buildClientStatement(data({ payments: [payment('p1', 100, '2026-10-01')] }), ALL);
    const text = plain(buildStatementText({ clientName: 'س', statement: s }));
    expect(text).toContain('كل الفترات');
    expect(text).toContain('فائض');
    expect(text).not.toContain('عجز');
  });

  it('handles an empty statement without a rows section', () => {
    const text = plain(buildStatementText({ clientName: 'س', statement: buildClientStatement(data(), ALL) }));
    expect(text).toContain('لا توجد حركات');
  });

  it('never uses an em dash and keeps amounts readable inside right-to-left text', () => {
    const raw = buildStatementText({ clientName: 'س', statement });
    expect(raw).not.toContain('—');
    expect(raw).not.toContain('--');
    expect(raw).toMatch(/\u202A[+−-]?[\d,.]+\u202C/);
  });
});
