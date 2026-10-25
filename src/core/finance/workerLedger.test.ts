import { describe, expect, it } from 'vitest';
import type { Expense, Worker, WorkerAgreementItem } from '../../types';
import {
  agreementLineTotal,
  buildWorkerLedger,
  displayProgress,
  subtractMoney,
  sumMoney,
  summarizeWorkerLedgers,
  workerAgreementTotal,
} from './workerLedger';

const worker = (extra: Partial<Worker> = {}): Worker => ({
  id: 'w1', clientId: 'c1', name: 'عامل', totalAmount: 1000, paidAmount: 0, remainingAmount: 1000,
  status: 'active', createdAt: '2026-01-01T09:00:00Z', updatedAt: '2026-01-01T09:00:00Z', ...extra,
});
const pay = (id: string, amount: number, date: string | undefined, createdAt: string, extra: Partial<Expense> = {}): Expense => ({
  id, clientId: 'c1', description: id, amount, category: 'labor', date: date as string, isClosed: false,
  createdAt, updatedAt: createdAt, workerId: 'w1', createdBy: 'مدير', ...extra,
});
const item = (id: string, quantity: number, unitPrice: number): WorkerAgreementItem => ({ id, title: id, quantity, unitPrice });

describe('workerAgreementTotal', () => {
  it('sums quantity x unit price exactly', () => {
    expect(workerAgreementTotal([item('a', 120, 55), item('b', 80, 75), item('c', 3, 1800), item('d', 1, 0)])).toBe(18000);
  });
  it('avoids floating point drift', () => {
    expect(workerAgreementTotal([item('a', 3, 0.1), item('b', 3, 0.2)])).toBe(0.9);
    expect(agreementLineTotal({ quantity: 12.5, unitPrice: 3.333 })).toBe(41.663);
  });
  it('treats invalid lines as zero and handles empty input', () => {
    expect(workerAgreementTotal([item('a', -2, 10), item('b', 2, -10), item('c', NaN, 5)])).toBe(0);
    expect(workerAgreementTotal(undefined)).toBe(0);
    expect(workerAgreementTotal([])).toBe(0);
  });
});

describe('money helpers', () => {
  it('sums and subtracts in thousandths', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(subtractMoney(1, 0.9)).toBe(0.1);
  });
});

describe('buildWorkerLedger', () => {
  it('handles a worker with no payments', () => {
    const l = buildWorkerLedger(worker(), []);
    expect(l.agreed).toBe(1000);
    expect(l.paid).toBe(0);
    expect(l.remaining).toBe(1000);
    expect(l.status).toBe('not_started');
    expect(l.progress).toBe(0);
    expect(l.payments).toHaveLength(0);
    expect(l.lastPaymentDay).toBeNull();
    expect(l.largestPayment).toBeNull();
    expect(l.averagePayment).toBe(0);
    expect(l.isItemized).toBe(false);
    expect(l.lines).toHaveLength(0);
  });

  it('orders payments oldest first with running totals', () => {
    const l = buildWorkerLedger(worker(), [
      pay('late', 300, '2026-03-10', '2026-03-10T08:00:00Z'),
      pay('early', 200, '2026-01-05', '2026-01-05T08:00:00Z'),
      pay('mid', 100.5, '2026-02-01', '2026-02-01T08:00:00Z'),
      pay('other-worker', 999, '2026-02-02', '2026-02-02T08:00:00Z', { workerId: 'w9' }),
    ]);
    expect(l.payments.map((p) => p.id)).toEqual(['early', 'mid', 'late']);
    expect(l.payments.map((p) => p.cumulativePaid)).toEqual([200, 300.5, 600.5]);
    expect(l.payments.map((p) => p.remainingAfter)).toEqual([800, 699.5, 399.5]);
    expect(l.paid).toBe(600.5);
    expect(l.remaining).toBe(399.5);
    expect(l.status).toBe('in_progress');
    expect(l.lastPaymentDay).toBe('2026-03-10');
    expect(l.firstPaymentDay).toBe('2026-01-05');
    expect(l.largestPayment?.id).toBe('late');
    expect(l.averagePayment).toBe(200.167);
  });

  it('orders same-day payments by createdAt, then input order', () => {
    const l = buildWorkerLedger(worker(), [
      pay('b', 10, '2026-01-05', '2026-01-05T12:00:00Z'),
      pay('a', 20, '2026-01-05', '2026-01-05T08:00:00Z'),
      pay('c1', 30, '2026-01-05', '2026-01-05T12:00:00Z'),
      pay('c2', 30, '2026-01-05', '2026-01-05T12:00:00Z'),
    ]);
    expect(l.payments.map((p) => p.id)).toEqual(['a', 'b', 'c1', 'c2']);
  });

  it('ignores zero, negative and invalid amounts', () => {
    const l = buildWorkerLedger(worker(), [
      pay('zero', 0, '2026-01-01', '2026-01-01T00:00:00Z'),
      pay('neg', -50, '2026-01-02', '2026-01-02T00:00:00Z'),
      pay('nan', NaN, '2026-01-03', '2026-01-03T00:00:00Z'),
      pay('ok', 50, '2026-01-04', '2026-01-04T00:00:00Z'),
    ]);
    expect(l.paymentCount).toBe(1);
    expect(l.ignoredCount).toBe(3);
    expect(l.paid).toBe(50);
  });

  it('falls back to createdAt when the date is missing or invalid', () => {
    const l = buildWorkerLedger(worker(), [
      pay('nodate', 10, undefined, '2026-05-20T12:00:00Z'),
      pay('baddate', 10, 'not-a-date', '2026-04-20T12:00:00Z'),
    ]);
    expect(l.payments[0].id).toBe('baddate');
    expect(l.payments[0].day.slice(0, 7)).toBe('2026-04');
    expect(l.payments[1].day.slice(0, 7)).toBe('2026-05');
  });

  it('reports settled and overpaid states', () => {
    const settled = buildWorkerLedger(worker(), [pay('a', 400, '2026-01-01', '2026-01-01T00:00:00Z'), pay('b', 600, '2026-01-02', '2026-01-02T00:00:00Z')]);
    expect(settled.status).toBe('settled');
    expect(settled.remaining).toBe(0);
    expect(settled.progress).toBe(100);
    expect(displayProgress(settled)).toBe(100);

    const over = buildWorkerLedger(worker(), [pay('a', 700, '2026-01-01', '2026-01-01T00:00:00Z'), pay('b', 400, '2026-01-02', '2026-01-02T00:00:00Z')]);
    expect(over.status).toBe('overpaid');
    expect(over.remaining).toBe(-100);
    expect(over.overpaidBy).toBe(100);
    expect(over.progress).toBe(100);
    expect(over.payments.map((p) => p.exceedsAgreed)).toEqual([false, true]);
    expect(over.payments[1].remainingAfter).toBe(-100);
  });

  it('never rounds a nearly paid worker up to 100 percent', () => {
    const l = buildWorkerLedger(worker({ totalAmount: 100000 }), [pay('a', 99999, '2026-01-01', '2026-01-01T00:00:00Z')]);
    expect(l.status).toBe('in_progress');
    expect(displayProgress(l)).toBe(99);
    const tiny = buildWorkerLedger(worker({ totalAmount: 100000 }), [pay('a', 1, '2026-01-01', '2026-01-01T00:00:00Z')]);
    expect(displayProgress(tiny)).toBe(1);
  });

  it('uses the itemized total as the agreed amount and breaks it down', () => {
    const l = buildWorkerLedger(
      worker({ totalAmount: 32000, agreementItems: [item('a', 420, 45), item('b', 160, 52), item('c', 1, 4800)] }),
      [pay('p', 34000, '2026-01-01', '2026-01-01T00:00:00Z')],
    );
    expect(l.isItemized).toBe(true);
    expect(l.agreed).toBe(32020);
    expect(l.storedAgreed).toBe(32000);
    expect(l.agreedDrift).toBe(20);
    expect(l.lines.map((x) => x.total)).toEqual([18900, 8320, 4800]);
    expect(Math.round(l.lines.reduce((s, x) => s + x.share, 0) * 1e6) / 1e6).toBe(100);
    expect(l.remaining).toBe(-1980);
    expect(l.status).toBe('overpaid');
  });

  it('treats items that sum to zero as a lump sum', () => {
    const l = buildWorkerLedger(worker({ totalAmount: 500, agreementItems: [item('free', 1, 0)] }), []);
    expect(l.isItemized).toBe(false);
    expect(l.agreed).toBe(500);
    expect(l.lines).toHaveLength(0);
  });

  it('groups payments by month with exact totals', () => {
    const l = buildWorkerLedger(worker(), [
      pay('a', 0.1, '2026-01-05', '2026-01-05T00:00:00Z'),
      pay('b', 0.2, '2026-01-20', '2026-01-20T00:00:00Z'),
      pay('c', 50, '2026-02-02', '2026-02-02T00:00:00Z'),
    ]);
    expect(l.months.map((m) => m.key)).toEqual(['2026-01', '2026-02']);
    expect(l.months[0].total).toBe(0.3);
    expect(l.months[0].count).toBe(2);
    expect(l.months[1].total).toBe(50);
    expect(l.months[1].payments[0].id).toBe('c');
  });
});

describe('summarizeWorkerLedgers', () => {
  it('totals agreed, paid and remaining, and counts states', () => {
    const a = buildWorkerLedger(worker({ id: 'w1', totalAmount: 1000 }), [pay('a', 400, '2026-01-01', '2026-01-01T00:00:00Z')]);
    const b = buildWorkerLedger(worker({ id: 'w2', totalAmount: 500 }), [pay('b', 700, '2026-01-01', '2026-01-01T00:00:00Z', { workerId: 'w2' })]);
    const c = buildWorkerLedger(worker({ id: 'w3', totalAmount: 300 }), [pay('c', 300, '2026-01-01', '2026-01-01T00:00:00Z', { workerId: 'w3' })]);
    const t = summarizeWorkerLedgers([a, b, c]);
    expect(t).toEqual({
      workerCount: 3, agreed: 1800, paid: 1400, remaining: 400, owed: 600, overpaid: 200, settledCount: 1, overpaidCount: 1,
    });
  });
});

describe('buildWorkerLedger with a visibility filter', () => {
  const payments = [
    pay('mine', 300, '2026-01-02', '2026-01-02T09:00:00Z', { userId: 'u1' }),
    pay('admin', 500, '2026-01-03', '2026-01-03T09:00:00Z', { userId: 'u-admin' }),
    pay('mine2', 100, '2026-01-04', '2026-01-04T09:00:00Z', { userId: 'u1' }),
  ];
  const ledger = buildWorkerLedger(worker(), payments, (e) => e.userId === 'u1');

  it('keeps balances exact: every payment counts toward paid and remaining', () => {
    expect(ledger.paid).toBe(900);
    expect(ledger.remaining).toBe(100);
    expect(ledger.status).toBe('in_progress');
  });

  it('lists, counts and averages only the visible payments', () => {
    expect(ledger.payments.map((p) => p.id)).toEqual(['mine', 'mine2']);
    expect(ledger.paymentCount).toBe(2);
    expect(ledger.averagePayment).toBe(200);
    expect(ledger.largestPayment?.id).toBe('mine');
    expect(ledger.months[0].count).toBe(2);
    expect(ledger.firstPaymentDay).toBe('2026-01-02');
  });

  it('matches the unfiltered ledger when everything is visible', () => {
    expect(buildWorkerLedger(worker(), payments, () => true)).toEqual(buildWorkerLedger(worker(), payments));
  });
});
