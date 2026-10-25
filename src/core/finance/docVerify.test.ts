import { describe, expect, it } from 'vitest';
import type { Expense, Payment } from '../../types';
import { buildClaim, claimIntact, matchRecords, parseClaim, verifyUrl, workerVoucherRef } from './docVerify';

const claimOf = (url: string) => parseClaim(new URL(url, 'https://makin.example').searchParams)!;

describe('docVerify: the link in the QR code', () => {
  it('round-trips through the link, with the amount in thousandths', () => {
    const url = verifyUrl(buildClaim('receipt', 'RC-2026-0001', 60000, '2026-09-20T08:00:00Z'), 'https://makin.example/');
    expect(url.startsWith('https://makin.example/verify?')).toBe(true);
    expect(claimOf(url)).toMatchObject({ kind: 'receipt', ref: 'RC-2026-0001', amount: '60000.000', date: '2026-09-20' });
    expect(claimIntact(claimOf(url))).toBe(true);
  });

  it('notices a changed figure, date or number', () => {
    const c = claimOf(verifyUrl(buildClaim('receipt', 'RC-2026-0001', 500, '2026-09-20')));
    expect(claimIntact({ ...c, amount: '5000.000' })).toBe(false);
    expect(claimIntact({ ...c, date: '2026-09-21' })).toBe(false);
    expect(claimIntact({ ...c, ref: 'RC-2026-0002' })).toBe(false);
    expect(claimIntact({ ...c, kind: 'voucher' })).toBe(false);
  });

  it('rejects links that are incomplete or malformed', () => {
    expect(parseClaim(new URLSearchParams('k=RC&r=RC-1'))).toBeNull();
    expect(parseClaim(new URLSearchParams('k=XX&r=a&a=1.000&d=2026-01-01&s=ab'))).toBeNull();
    expect(parseClaim(new URLSearchParams('k=RC&r=a&a=abc&d=2026-01-01&s=ab'))).toBeNull();
    expect(parseClaim(new URLSearchParams('k=RC&r=a&a=1.000&d=yesterday&s=ab'))).toBeNull();
  });
});

describe('docVerify: against the company records', () => {
  const payments = [{ id: 'p1', clientId: 'c1', amount: 60000, paymentDate: '2026-09-20', receiptNumber: 'RC-2026-0001' }] as Payment[];
  const expense = { id: 'ex-worker-9f3a', clientId: 'c1', workerId: 'w1', amount: 250.5, date: '2026-10-02' } as Expense;
  const data = { payments, expenses: [expense] };
  const name = (id: string) => (id === 'c1' ? 'شركة النور' : '');

  it('a receipt that was issued for that amount and day matches', () => {
    const claim = buildClaim('receipt', 'RC-2026-0001', 60000, '2026-09-20');
    expect(matchRecords(claim, data, name)).toEqual({ status: 'match', who: 'شركة النور' });
  });

  it('a receipt with another amount or day is reported as different, with the recorded values', () => {
    expect(matchRecords(buildClaim('receipt', 'RC-2026-0001', 65000, '2026-09-20'), data)).toEqual({
      status: 'different', differences: ['amount'], recorded: { amount: 60000, date: '2026-09-20' },
    });
    expect(matchRecords(buildClaim('receipt', 'RC-2026-0001', 65000, '2026-09-22'), data)).toMatchObject({ differences: ['amount', 'date'] });
  });

  it('a number nobody issued is not found', () => {
    expect(matchRecords(buildClaim('receipt', 'RC-2026-0099', 10, '2026-09-20'), data)).toEqual({ status: 'not-found' });
  });

  it('a worker voucher is found by its reference, and fractional amounts compare exactly', () => {
    const ref = workerVoucherRef({ id: expense.id, day: '2026-10-02' });
    expect(ref).toBe('MK-WPV-20261002-9F3A');
    expect(matchRecords(buildClaim('voucher', ref, 250.5, '2026-10-02'), data, name)).toEqual({ status: 'match', who: 'شركة النور' });
    expect(matchRecords(buildClaim('voucher', ref, 250.501, '2026-10-02'), data)).toMatchObject({ status: 'different' });
  });
});
