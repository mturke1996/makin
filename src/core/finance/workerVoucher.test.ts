import { describe, expect, it } from 'vitest';
import type { Expense } from '../../types';
import { buildWorkerVoucher, workerVoucherRef } from './workerVoucher';
import type { WorkerLedgerPayment } from './workerLedger';

const payment = (over: Partial<WorkerLedgerPayment> & { advance?: boolean } = {}): WorkerLedgerPayment => ({
  id: 'exp-abcd1234',
  expense: { id: 'exp-abcd1234', isWorkerAdvance: over.advance } as Expense,
  amount: 2500,
  day: '2026-10-14',
  createdAt: '2026-10-14T08:00:00Z',
  note: 'دفعة على الحساب',
  recordedBy: 'م. أحمد',
  cumulativePaid: 6000,
  remainingAfter: 12000,
  agreedAtPayment: 18000,
  balanceBasis: 'recorded',
  exceedsAgreed: false,
  ...over,
});

describe('workerVoucherRef', () => {
  it('is the same on every print: the payment day and the end of its id', () => {
    expect(workerVoucherRef({ id: 'exp-abcd1234', day: '2026-10-14' })).toBe('MK-WPV-20261014-1234');
  });
});

describe('buildWorkerVoucher', () => {
  const worker = { name: 'علي الكهربائي', jobType: 'كهرباء', phone: '0921112233', nationalId: undefined, workProgressPercent: undefined };

  it('carries the payment, in words, with what remains of the agreement', () => {
    const v = buildWorkerVoucher({ payment: payment(), worker, ledger: { agreed: 18000, paid: 6000 }, projectName: 'فيلا خالد' });
    expect(v).toMatchObject({ ref: 'MK-WPV-20261014-1234', amount: 2500, paidThrough: 6000, remainingAfter: 12000, isAdvance: false, projectName: 'فيلا خالد' });
    expect(v.amountWords).toContain('ألفان');
    expect(v.qr).toMatch(/^\/verify\?k=WPV&r=MK-WPV-20261014-1234&a=2500\.000&d=2026-10-14&s=[0-9a-f]{8}$/);
    expect(v.progress).toBeUndefined();
  });

  it('marks an advance', () => {
    expect(buildWorkerVoucher({ payment: payment({ advance: true }), worker, ledger: { agreed: 18000, paid: 6000 }, projectName: 'x' }).isAdvance).toBe(true);
  });

  it('adds the progress line only when a percentage is approved', () => {
    const v = buildWorkerVoucher({ payment: payment(), worker: { ...worker, workProgressPercent: 40 }, ledger: { agreed: 18000, paid: 6000 }, projectName: 'x', advances: 0 });
    expect(v.progress).toMatchObject({ percent: 40, earned: 7200, payableNow: 1200, state: 'ok' });
  });
});
