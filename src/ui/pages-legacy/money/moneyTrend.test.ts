import { describe, expect, it } from 'vitest';
import type { Expense, Payment } from '../../../types';
import { summarizeExpenses, summarizePayments } from './moneyTrend';

const pay = (id: string, paymentDate: string, amount: number, createdAt = `${paymentDate}T10:00:00Z`) =>
  ({ id, clientId: 'c1', invoiceId: '', amount, paymentMethod: 'cash', paymentDate, createdAt, updatedAt: createdAt }) as Payment;
const exp = (id: string, date: string, amount: number, category = 'cement', extra: Partial<Expense> = {}) =>
  ({ id, clientId: 'c1', description: id, amount, category, date, isClosed: false, createdAt: `${date}T10:00:00Z`, updatedAt: `${date}T10:00:00Z`, ...extra }) as Expense;

const TODAY = '2026-10-25';

describe('summarizePayments', () => {
  const payments = [
    pay('a', '2026-08-10', 1000),
    pay('b', '2026-09-12', 2000.5),
    pay('c', '2026-10-03', 500),
    pay('d', '2026-10-20', 1500.25),
    pay('e', '2026-10-20', 99.999, '2026-10-20T15:00:00Z'),
  ];
  const s = summarizePayments(payments, TODAY);

  it('adds in exact thousandths', () => {
    expect(s.total).toBe(5100.749);
    expect(s.month).toEqual({ amount: 2100.249, count: 3 });
    expect(s.count).toBe(5);
    expect(s.largest).toBe(2000.5);
  });

  it('averages to the thousandth', () => {
    expect(s.average).toBe(1020.15);
  });

  it('finds the latest by day, then by when it was recorded', () => {
    expect(s.last!.id).toBe('e');
  });

  it('gives the latest amounts oldest first, for the bars', () => {
    expect(s.recent).toEqual([1000, 2000.5, 500, 1500.25, 99.999]);
  });

  it('compares this month with the same days of last month and draws six months', () => {
    expect(s.trend.flow.months).toHaveLength(6);
    expect(s.trend.flow.collected[5]).toBe(2100.249);
    expect(s.trend.collected.current).toBe(2100.249);
    expect(s.trend.collected.previous).toBe(2000.5);
    expect(s.trend.flow.cumulativeCollected[5]).toBe(5100.749);
  });

  it('copes with nothing at all', () => {
    const empty = summarizePayments([], TODAY);
    expect(empty).toMatchObject({ total: 0, count: 0, average: 0, largest: 0, last: undefined, recent: [] });
    expect(empty.month).toEqual({ amount: 0, count: 0 });
    expect(empty.trend.collected.changePct).toBeNull();
  });

  it('ignores records without a real date in the month figures but keeps them in the total', () => {
    const odd = summarizePayments([pay('x', '', 100), pay('y', 'not a date', 50), pay('z', '2026-10-01', 10)], TODAY);
    expect(odd.total).toBe(160);
    expect(odd.month).toEqual({ amount: 10, count: 1 });
  });
});

describe('summarizeExpenses', () => {
  const label = (c: string) => ({ cement: 'أسمنت', rebar: 'حديد', labor: 'أجور' }[c] ?? c);
  const waiting = (e: Expense) => e.approvalStatus === 'pending';
  const expenses = [
    exp('1', '2026-09-05', 14000, 'rebar'),
    exp('2', '2026-10-02', 6000, 'cement'),
    exp('3', '2026-10-18', 6390, 'rebar', { approvalStatus: 'pending' }),
    exp('4', '2026-10-19', 3000.5, 'labor', { approvalStatus: 'pending' }),
  ];
  const s = summarizeExpenses(expenses, label, waiting, TODAY);

  it('totals and splits the month', () => {
    expect(s.total).toBe(29390.5);
    expect(s.month).toEqual({ amount: 15390.5, count: 3 });
    expect(s.count).toBe(4);
  });

  it('counts what waits for approval', () => {
    expect(s.pending).toEqual({ amount: 9390.5, count: 2 });
  });

  it('names the biggest category with a share of what is shown', () => {
    expect(s.top).toEqual({ key: 'rebar', label: 'حديد', amount: 20390, share: 69 });
  });

  it('compares with last month like for like', () => {
    expect(s.trend.expenses.current).toBe(15390.5);
    expect(s.trend.expenses.previous).toBe(14000);
    expect(s.trend.expenses.changePct).toBe(9.9);
  });

  it('has no top category and no waiting amount for an empty list', () => {
    const empty = summarizeExpenses([], label, waiting, TODAY);
    expect(empty.top).toBeNull();
    expect(empty.pending).toEqual({ amount: 0, count: 0 });
    expect(empty.average).toBe(0);
  });

  it('a single category is the whole', () => {
    expect(summarizeExpenses([exp('x', '2026-10-01', 10, 'cement')], label, waiting, TODAY).top!.share).toBe(100);
  });
});
