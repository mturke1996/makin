import { describe, expect, it } from 'vitest';
import type { Expense, GlobalFundTransaction } from '../../types';
import {
  buildAllUsersCustodyLedger,
  buildUserCustodyLedger,
  computeUserFundAllocTotals,
  custodyTotals,
  roundMoney,
  splitAgainstCustody,
} from './custodyFifo';

const dep = (id: string, userId: string, amount: number, createdAt: string): GlobalFundTransaction => ({
  id, type: 'deposit', amount, userId, userName: userId, description: id,
  date: createdAt.slice(0, 10), createdAt, updatedAt: createdAt,
});
const exp = (id: string, userId: string, amount: number, createdAt: string, extra: Partial<Expense> = {}): Expense => ({
  id, clientId: 'c1', description: id, amount, category: 'materials',
  date: createdAt.slice(0, 10), isClosed: false, createdAt, updatedAt: createdAt,
  userId, createdBy: userId, ...extra,
});
const U = { userId: 'u1', userName: 'u1' };

describe('buildUserCustodyLedger', () => {
  it('deducts expenses from a single custody in order', () => {
    const [c] = buildUserCustodyLedger(
      [dep('d1', 'u1', 1000, '2026-01-01T09:00:00Z')],
      [exp('e1', 'u1', 300, '2026-01-02T09:00:00Z'), exp('e2', 'u1', 200.5, '2026-01-03T09:00:00Z')],
      U,
    );
    expect(c.spent).toBe(500.5);
    expect(c.remaining).toBe(499.5);
    expect(c.expenses.map((e) => e.balanceAfter)).toEqual([700, 499.5]);
    expect(c.expenses.every((e) => e.overdrawnAmount === 0)).toBe(true);
  });

  it('never splits an overspending expense: one row, full amount, overdraft marked', () => {
    const [c] = buildUserCustodyLedger(
      [dep('d1', 'u1', 1000, '2026-01-01T09:00:00Z')],
      [exp('e1', 'u1', 1500, '2026-01-02T09:00:00Z')],
      U,
    );
    expect(c.expenses).toHaveLength(1);
    expect(c.expenses[0]).toMatchObject({ usedAmount: 1500, balanceBefore: 1000, balanceAfter: -500, overdrawnAmount: 500 });
    expect(c.remaining).toBe(-500);
    expect(c.carriedOut).toBe(0); // no later custody yet
  });

  it('rolls the deficit (only) into the next custody when it is granted', () => {
    const [c1, c2] = buildUserCustodyLedger(
      [dep('d1', 'u1', 1000, '2026-01-01T09:00:00Z'), dep('d2', 'u1', 3000, '2026-01-03T09:00:00Z')],
      [exp('e1', 'u1', 1200, '2026-01-02T09:00:00Z'), exp('e2', 'u1', 100, '2026-01-04T09:00:00Z')],
      U,
    );
    expect(c1).toMatchObject({ carriedOut: 200, remaining: 0, carryToId: 'd2', debtRolledOut: true });
    expect(c1.expenses).toHaveLength(1); // the 1200 expense stays whole on custody #1
    expect(c2).toMatchObject({ carryOver: 200, carryFromId: 'd1', spent: 100, remaining: 2700 });
    expect(custodyTotals([c1, c2])).toEqual({ deposited: 4000, spent: 1300, remaining: 2700 });
  });

  it('ignores expenses made before the first custody and other users', () => {
    const rows = buildUserCustodyLedger(
      [dep('d1', 'u1', 500, '2026-01-02T09:00:00Z'), dep('dx', 'u2', 9999, '2026-01-02T09:00:00Z')],
      [exp('early', 'u1', 100, '2026-01-01T09:00:00Z'), exp('other', 'u2', 100, '2026-01-03T09:00:00Z')],
      U,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].expenses).toHaveLength(0);
    expect(rows[0].remaining).toBe(500);
  });

  it('returns no ledger for a user without deposits', () => {
    expect(buildUserCustodyLedger([], [exp('e1', 'u1', 5, '2026-01-01T09:00:00Z')], U)).toEqual([]);
  });

  it('matches expenses by createdBy name when userId is missing', () => {
    const [c] = buildUserCustodyLedger(
      [dep('d1', 'u1', 100, '2026-01-01T09:00:00Z')],
      [exp('e1', '', 40, '2026-01-02T09:00:00Z', { userId: undefined, createdBy: 'u1' })],
      U,
    );
    expect(c.spent).toBe(40);
  });

  it('keeps cents exact (no phantom deficit from float residue)', () => {
    const [c] = buildUserCustodyLedger(
      [dep('d1', 'u1', 100.1, '2026-01-01T09:00:00Z')],
      [1, 2, 3].map((i) => exp(`e${i}`, 'u1', 33.33, `2026-01-0${i + 1}T09:00:00Z`)),
      U,
    );
    expect(c.spent).toBe(99.99);
    expect(c.remaining).toBe(0.11);
  });

  it('skips zero and negative expenses', () => {
    const [c] = buildUserCustodyLedger(
      [dep('d1', 'u1', 100, '2026-01-01T09:00:00Z')],
      [exp('z', 'u1', 0, '2026-01-02T09:00:00Z'), exp('n', 'u1', -5, '2026-01-03T09:00:00Z')],
      U,
    );
    expect(c.expenses).toHaveLength(0);
    expect(c.remaining).toBe(100);
  });
});

describe('splitAgainstCustody', () => {
  it.each([
    [100, 150, { fromBalance: 100, deficit: 50 }],
    [200, 150, { fromBalance: 150, deficit: 0 }],
    [-50, 100, { fromBalance: 0, deficit: 100 }],
    [100, 0, { fromBalance: 0, deficit: 0 }],
    [100, -10, { fromBalance: 0, deficit: 0 }],
  ])('available %s, amount %s', (available, amount, expected) => {
    expect(splitAgainstCustody(available, amount)).toEqual(expected);
  });
});

describe('computeUserFundAllocTotals', () => {
  it('has no custody but spent: negative remaining', () => {
    expect(computeUserFundAllocTotals([], [{ createdAt: '2026-01-01T00:00:00Z', amount: 40 }])).toEqual({
      deposited: 0, spent: 40, remaining: -40,
    });
  });
  it('is zero with nothing', () => {
    expect(computeUserFundAllocTotals([], [])).toEqual({ deposited: 0, spent: 0, remaining: 0 });
  });
  it('matches the ledger with deposits', () => {
    expect(
      computeUserFundAllocTotals(
        [{ createdAt: '2026-01-01T00:00:00Z', amount: 100 }],
        [{ createdAt: '2026-01-02T00:00:00Z', amount: 30 }],
      ),
    ).toEqual({ deposited: 100, spent: 30, remaining: 70 });
  });
});

describe('buildAllUsersCustodyLedger', () => {
  it('builds per-user ledgers with per-user references and carry links', () => {
    const tx = [
      dep('a1', 'u1', 1000, '2026-01-01T09:00:00Z'),
      dep('b1', 'u2', 500, '2026-01-02T09:00:00Z'),
      dep('a2', 'u1', 2000, '2026-01-05T09:00:00Z'),
    ];
    const views = buildAllUsersCustodyLedger(tx, [exp('e1', 'u1', 1100, '2026-01-03T09:00:00Z')], { u1: 'سالم', u2: 'علي' });
    expect(views.map((v) => v.name).sort()).toEqual(['سالم', 'علي']);
    // numbered per user: the owner (who only downloads their own deposits) sees the same reference as the manager
    views.forEach((v) => {
      const refs = v.custodies.map((c) => c.ref);
      expect(new Set(refs).size).toBe(refs.length);
    });
    expect(views.find((v) => v.uid === 'u2')!.custodies[0].ref).toBe('EHD-001');
    const ownOnly = buildAllUsersCustodyLedger(tx.filter((t) => t.userId === 'u1'), [exp('e1', 'u1', 1100, '2026-01-03T09:00:00Z')], { u1: 'سالم' });
    expect(ownOnly[0].custodies.map((c) => c.ref)).toEqual(views.find((v) => v.uid === 'u1')!.custodies.map((c) => c.ref));
    const u1 = views.find((v) => v.uid === 'u1')!;
    expect(u1.custodies).toHaveLength(2);
    expect(u1.custodies[1].carryFromRef).toBe(u1.custodies[0].ref);
    expect(u1.custodies[0].carryToRef).toBe(u1.custodies[1].ref);
    expect(u1.custodies[1].carryOver).toBe(100);
  });
});

describe('thousandths precision and identity', () => {
  it('keeps the third decimal the rest of the app displays', () => {
    const [c] = buildUserCustodyLedger(
      [dep('d1', 'u1', 100, '2026-01-01T09:00:00Z')],
      [1, 2, 3].map((n) => exp(`e${n}`, 'u1', 33.333, `2026-01-0${n + 1}T09:00:00Z`)),
      U,
    );
    expect(c.spent).toBe(99.999);
    expect(c.remaining).toBe(0.001);
  });

  it('never counts another user\'s expense just because the display names match', () => {
    const [c] = buildUserCustodyLedger(
      [{ ...dep('d1', 'u1', 1000, '2026-01-01T09:00:00Z'), userName: 'محمد' }],
      [
        exp('mine', 'u1', 100, '2026-01-02T09:00:00Z', { createdBy: 'محمد' }),
        exp('theirs', 'u2', 400, '2026-01-03T09:00:00Z', { createdBy: 'محمد' }),
        exp('legacy', '', 50, '2026-01-04T09:00:00Z', { userId: undefined, createdBy: 'محمد' }),
      ],
      { userId: 'u1', userName: 'محمد' },
    );
    expect(c.expenses.map((e) => e.id)).toEqual(['mine', 'legacy']);
    expect(c.spent).toBe(150);
  });
});

describe('roundMoney', () => {
  it('rounds to thousandths and sanitizes bad input', () => {
    expect(roundMoney(1.0004)).toBe(1);
    expect(roundMoney(1.0005)).toBe(1.001);
    expect(roundMoney(1.005 + 1.005)).toBe(2.01);
    expect(roundMoney(NaN)).toBe(0);
    expect(roundMoney(Infinity)).toBe(0);
  });
});
