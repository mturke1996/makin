import { describe, expect, it } from 'vitest';
import type { Expense, UserBalance } from '../../types';
import { buildClientCustody, chargedCustody, summarizeClientCustody, type ClientCustodyInput } from './clientCustody';
import { buildUserCustodyLedger } from './custodyFifo';
import { sumMoney } from './money';

const bal = (id: string, userId: string | undefined, amount: number, createdAt: string, o: Partial<UserBalance> = {}): UserBalance => ({
  id,
  clientId: 'c1',
  userId,
  userName: userId === 'u-ali' ? 'علي' : 'سالم',
  amount,
  date: createdAt.slice(0, 10),
  notes: '',
  createdAt,
  updatedAt: createdAt,
  createdBy: 'المدير',
  ...o,
});
const exp = (id: string, userId: string | undefined, amount: number, createdAt: string, o: Partial<Expense> = {}): Expense => ({
  id,
  clientId: 'c1',
  description: id,
  amount,
  category: 'materials',
  date: createdAt.slice(0, 10),
  isClosed: false,
  createdAt,
  updatedAt: createdAt,
  userId,
  createdBy: userId === 'u-ali' ? 'علي' : 'سالم',
  ...o,
});
const run = (o: Partial<ClientCustodyInput> & Pick<ClientCustodyInput, 'balances' | 'expenses'>) =>
  buildClientCustody({ expenseScope: 'all', viewerId: 'u-admin', clientId: 'c1', ...o });

const T = (day: number, hh = '09:00:00') => `2026-01-${String(day).padStart(2, '0')}T${hh}.000Z`;

describe('one custody', () => {
  it('shows what was spent, what is left and each expense with its running balance', () => {
    const { users, totals } = run({
      balances: [bal('b1', 'u-salem', 1000, T(1))],
      expenses: [exp('e1', 'u-salem', 300, T(2)), exp('e2', 'u-salem', 200.5, T(3))],
    });
    expect(users).toHaveLength(1);
    const u = users[0];
    expect(u).toMatchObject({ key: 'u-salem', name: 'سالم', given: 1000, spent: 500.5, remaining: 499.5, deficit: 0, exact: true });
    expect(u.status).toMatchObject({ key: 'active', tone: 'success' });
    const [c] = u.custodies;
    expect(c).toMatchObject({
      id: 'b1',
      number: 1,
      amount: 1000,
      opening: 1000,
      spent: 500.5,
      remaining: 499.5,
      overdrawn: 0,
      exact: true,
      carryIn: null,
      carryOut: null,
      status: { key: 'active' },
      badge: { key: 'active' },
    });
    expect(c.usedPct).toBeCloseTo(50.05, 5);
    expect(c.expenses.map((e) => [e.id, e.amount, e.balanceBefore, e.balanceAfter, e.overdrawnAmount])).toEqual([
      ['e1', 300, 1000, 700, 0],
      ['e2', 200.5, 700, 499.5, 0],
    ]);
    expect(c.source.id).toBe('b1');
    expect(u.expenses.map((e) => e.id)).toEqual(['e2', 'e1']); // newest first, the originals
    expect(totals).toMatchObject({ given: 1000, spent: 500.5, remaining: 499.5, deficit: 0, holders: 1, custodies: 1, exact: true });
  });

  it('marks a custody whose balance is below 30% of its amount as low, and an emptied one as finished', () => {
    const low = run({ balances: [bal('b1', 'u-salem', 1000, T(1))], expenses: [exp('e1', 'u-salem', 800, T(2))] }).users[0];
    expect(low.custodies[0].status).toMatchObject({ key: 'low' });
    expect(low.status).toMatchObject({ key: 'low' });
    const done = run({ balances: [bal('b1', 'u-salem', 1000, T(1))], expenses: [exp('e1', 'u-salem', 1000, T(2))] }).users[0];
    expect(done.custodies[0]).toMatchObject({ remaining: 0, status: { key: 'finished' }, badge: { key: 'finished' } });
    expect(done.status).toMatchObject({ key: 'finished' });
  });

  it('skips zero and negative expenses', () => {
    const [u] = run({
      balances: [bal('b1', 'u-salem', 100, T(1))],
      expenses: [exp('z', 'u-salem', 0, T(2)), exp('n', 'u-salem', -5, T(3))],
    }).users;
    expect(u.custodies[0].expenses).toHaveLength(0);
    expect(u.remaining).toBe(100);
    expect(u.beforeCustody).toEqual({ count: 0, amount: 0 });
  });

  it('flags a payment to a worker', () => {
    const [u] = run({
      balances: [bal('b1', 'u-salem', 1000, T(1))],
      expenses: [exp('e1', 'u-salem', 300, T(2), { workerId: 'w1', workerName: 'أبو سالم' })],
    }).users;
    expect(u.custodies[0].expenses[0].workerName).toBe('أبو سالم');
  });
});

describe('several custodies of one person', () => {
  it('charges the oldest open custody first and carries only the deficit to the next one', () => {
    const { users, totals } = run({
      balances: [bal('b2', 'u-salem', 3000, T(3)), bal('b1', 'u-salem', 1000, T(1))], // input order is irrelevant
      expenses: [exp('e1', 'u-salem', 1200, T(2)), exp('e2', 'u-salem', 100, T(4))],
    });
    const [c1, c2] = users[0].custodies;
    expect([c1.id, c1.number, c2.id, c2.number]).toEqual(['b1', 1, 'b2', 2]);
    // the 1200 expense stays whole on #1; its 200 overrun becomes a one-off deduction on #2
    expect(c1).toMatchObject({ spent: 1200, remaining: 0, overdrawn: 0, status: { key: 'finished' } });
    expect(c1.expenses).toHaveLength(1);
    expect(c1.expenses[0]).toMatchObject({ amount: 1200, balanceAfter: -200, overdrawnAmount: 200 });
    expect(c1.carryOut).toEqual({ amount: 200, otherId: 'b2', otherNumber: 2 });
    expect(c1.carryIn).toBeNull();
    expect(c2).toMatchObject({ amount: 3000, opening: 2800, spent: 100, remaining: 2700, badge: { key: 'deducted' } });
    expect(c2.carryIn).toEqual({ amount: 200, otherId: 'b1', otherNumber: 1 });
    expect(c2.carryOut).toBeNull();
    // the deficit moved between custodies; it is not spent twice
    expect(users[0]).toMatchObject({ given: 4000, spent: 1300, remaining: 2700, deficit: 0, carriedBetween: 200 });
    expect(totals.remaining).toBe(2700);
  });

  it('keeps the custody ledger identity: given − spent = sum of the remainders', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 1000.125, T(1)), bal('b2', 'u-salem', 500.5, T(5)), bal('b3', 'u-salem', 250, T(9))],
      expenses: [
        exp('e1', 'u-salem', 1100.333, T(2)),
        exp('e2', 'u-salem', 700, T(6)),
        exp('e3', 'u-salem', 33.333, T(10)),
      ],
    });
    const u = users[0];
    expect(sumMoney(u.custodies.map((c) => c.remaining))).toBe(u.remaining);
    // given 1750.625, spent 1833.666: the deficit is exactly 83.041 (no float tail)
    expect(u.remaining).toBe(-83.041);
    expect(u.deficit).toBe(83.041);
  });

  it('chains a deficit through three custodies', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 100, T(1)), bal('b2', 'u-salem', 100, T(3)), bal('b3', 'u-salem', 1000, T(5))],
      expenses: [exp('e1', 'u-salem', 150, T(2)), exp('e2', 'u-salem', 40, T(4))],
    });
    const [c1, c2, c3] = users[0].custodies;
    expect(c1.carryOut).toMatchObject({ amount: 50, otherNumber: 2 });
    // #2 started with 100 - 50 = 50, spent 40 -> 10 left, nothing to carry
    expect(c2).toMatchObject({ opening: 50, spent: 40, remaining: 10, carryOut: null });
    expect(c3).toMatchObject({ carryIn: null, remaining: 1000 });
    expect(users[0]).toMatchObject({ given: 1200, spent: 190, remaining: 1010 });
  });

  it('shows a standing deficit on the last custody as overdrawn, and the person as in deficit', () => {
    const { users, totals } = run({
      balances: [bal('b1', 'u-salem', 1000, T(1))],
      expenses: [exp('e1', 'u-salem', 1500, T(2))],
    });
    const u = users[0];
    expect(u.custodies[0]).toMatchObject({
      remaining: -500,
      overdrawn: 500,
      carryOut: null,
      usedPct: 100,
      status: { key: 'overdrawn', tone: 'danger' },
      badge: { key: 'deficit' },
    });
    expect(u.expenses).toHaveLength(1);
    expect(u).toMatchObject({ remaining: -500, deficit: 500, status: { key: 'deficit' } });
    expect(totals).toMatchObject({ deficit: 500, deficitUsers: 1, remaining: -500 });
  });

  it('settles the deficit as soon as the next custody is given, and not before', () => {
    const before = run({ balances: [bal('b1', 'u-salem', 1000, T(1))], expenses: [exp('e1', 'u-salem', 1500, T(2))] });
    const after = run({
      balances: [bal('b1', 'u-salem', 1000, T(1)), bal('b2', 'u-salem', 2000, T(3))],
      expenses: [exp('e1', 'u-salem', 1500, T(2))],
    });
    expect(before.users[0].custodies[0].carryOut).toBeNull();
    expect(after.users[0].custodies[0].carryOut).toMatchObject({ amount: 500, otherNumber: 2 });
    expect(after.users[0]).toMatchObject({ remaining: 1500, deficit: 0 });
  });

  it('matches the fund page ledger exactly when the same expenses are fed to it', () => {
    const balances = [bal('b1', 'u-salem', 700, T(1)), bal('b2', 'u-salem', 900, T(4))];
    const expenses = [exp('e1', 'u-salem', 500, T(2)), exp('e2', 'u-salem', 400, T(3)), exp('e3', 'u-salem', 250, T(5))];
    const ledger = buildUserCustodyLedger(
      balances.map((b) => ({ ...b, type: 'deposit' as const, userId: b.userId!, description: '' })),
      expenses,
      { userId: 'u-salem', userName: 'سالم' },
    );
    const mine = run({ balances, expenses }).users[0].custodies;
    expect(mine.map((c) => [c.id, c.spent, c.remaining, c.carryIn?.amount ?? 0, c.carryOut?.amount ?? 0])).toEqual(
      ledger.map((c) => [c.id, c.spent, c.remaining, c.carryOver, c.carriedOut]),
    );
  });
});

describe('which expenses count', () => {
  it('counts only expenses of this client', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 1000, T(1))],
      expenses: [exp('e1', 'u-salem', 300, T(2)), exp('other', 'u-salem', 900, T(3), { clientId: 'c2' })],
    });
    expect(users[0].spent).toBe(300);
    expect(users[0].custodies[0].expenses.map((e) => e.id)).toEqual(['e1']);
  });

  it('ignores custody of another client', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 1000, T(1)), bal('bx', 'u-salem', 5000, T(1), { clientId: 'c2' })],
      expenses: [],
    });
    expect(users[0].given).toBe(1000);
  });

  it('does not charge an expense that came before the first custody, but reports it', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 1000, T(5))],
      expenses: [exp('early', 'u-salem', 120.5, T(2)), exp('e1', 'u-salem', 300, T(6))],
    });
    expect(users[0]).toMatchObject({ spent: 300, remaining: 700, beforeCustody: { count: 1, amount: 120.5 } });
  });

  it('puts a custody given in the same instant as an expense first, and an expense a second earlier outside', () => {
    const same = run({
      balances: [bal('b1', 'u-salem', 100, T(1, '10:00:00'))],
      expenses: [exp('e1', 'u-salem', 40, T(1, '10:00:00'))],
    }).users[0];
    expect(same.spent).toBe(40);
    const earlier = run({
      balances: [bal('b1', 'u-salem', 100, T(1, '10:00:01'))],
      expenses: [exp('e1', 'u-salem', 40, T(1, '10:00:00'))],
    }).users[0];
    expect(earlier.spent).toBe(0);
    expect(earlier.beforeCustody.count).toBe(1);
  });

  it('orders two custodies given in the same minute by their time, then by id', () => {
    const { users } = run({
      balances: [bal('bb', 'u-salem', 500, T(1, '10:00:00')), bal('ba', 'u-salem', 700, T(1, '10:00:00'))],
      expenses: [exp('e1', 'u-salem', 600, T(1, '10:30:00'))],
    });
    expect(users[0].custodies.map((c) => c.id)).toEqual(['ba', 'bb']);
    // charged to #1 (700) first
    expect(users[0].custodies[0]).toMatchObject({ spent: 600, remaining: 100 });
    expect(users[0].custodies[1].spent).toBe(0);
  });

  it('never charges one expense to two people', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 1000, T(1)), bal('b2', 'u-ali', 1000, T(1))],
      expenses: [exp('e1', 'u-salem', 100, T(2)), exp('e2', 'u-ali', 50, T(2))],
    });
    expect(users.find((u) => u.key === 'u-salem')!.spent).toBe(100);
    expect(users.find((u) => u.key === 'u-ali')!.spent).toBe(50);
    expect(users.reduce((n, u) => n + u.expenses.length, 0)).toBe(2);
  });
});

describe('who owns a record', () => {
  it('lets the id decide: an expense with another userId is never theirs even with the same name', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 1000, T(1))],
      expenses: [exp('mine', 'u-salem', 100, T(2)), exp('namesake', 'u-other', 400, T(2), { createdBy: 'سالم' })],
    });
    expect(users[0].spent).toBe(100);
  });

  it('matches legacy records that carry only a name', () => {
    const { users } = run({
      balances: [bal('b1', undefined, 800, T(1))],
      expenses: [exp('e1', undefined, 300, T(2))],
    });
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ key: 'سالم', name: 'سالم', given: 800, spent: 300, remaining: 500, exact: true });
  });

  it('treats an old name-only custody and a newer one with an id as the same person', () => {
    const { users } = run({
      balances: [bal('b1', undefined, 500, T(1)), bal('b2', 'u-salem', 500, T(5))],
      expenses: [exp('e1', undefined, 600, T(2)), exp('e2', 'u-salem', 100, T(6))],
    });
    expect(users).toHaveLength(1);
    const u = users[0];
    expect(u.key).toBe('u-salem');
    expect(u.custodies.map((c) => c.id)).toEqual(['b1', 'b2']);
    expect(u.custodies[0].carryOut).toMatchObject({ amount: 100, otherNumber: 2 });
    expect(u).toMatchObject({ given: 1000, spent: 700, remaining: 300 });
  });

  it('accepts a name-only expense for a holder with an id when only the name is recorded', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 500, T(1))],
      expenses: [exp('legacy', undefined, 120, T(2))],
    });
    expect(users[0].spent).toBe(120);
  });

  it('resolves a Firestore document id to the Auth uid through the directory and prefers its display name', () => {
    const { users } = run({
      balances: [bal('b1', 'doc-ali', 600, T(1)), bal('b2', 'u-ali', 400, T(2))],
      expenses: [exp('e1', 'u-ali', 100, T(3)), exp('e2', 'doc-ali', 50, T(3))],
      users: [{ id: 'doc-ali', uid: 'u-ali', displayName: 'علي المبروك' }],
    });
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ key: 'u-ali', name: 'علي المبروك', given: 1000, spent: 150 });
  });

  it('uses the directory to link a name-only custody to an Auth uid', () => {
    const { users } = run({
      balances: [bal('b1', undefined, 600, T(1), { userName: 'علي المبروك' })],
      expenses: [exp('e1', 'u-ali', 100, T(3))],
      users: [{ id: 'u-ali', displayName: 'علي المبروك' }],
    });
    expect(users[0]).toMatchObject({ key: 'u-ali', spent: 100, remaining: 500 });
  });
});

describe('what the viewer may know', () => {
  const two = {
    balances: [bal('b1', 'u-salem', 1000, T(1)), bal('b2', 'u-ali', 500, T(2))],
    expenses: [exp('e1', 'u-salem', 300, T(3)), exp('e2', 'u-ali', 200, T(3))],
  };

  it('is exact about everybody for someone who sees every expense', () => {
    const { users, totals } = run({ ...two, expenseScope: 'all' });
    expect(users.every((u) => u.exact && u.custodies.every((c) => c.exact))).toBe(true);
    expect(totals).toMatchObject({ given: 1500, spent: 500, remaining: 1000, exact: true });
  });

  it('is exact only about themselves with their own expenses, and gives the others only what was handed over', () => {
    const { users, totals } = run({ balances: two.balances, expenses: [two.expenses[0]], expenseScope: 'own', viewerId: 'u-salem' });
    const salem = users.find((u) => u.key === 'u-salem')!;
    const ali = users.find((u) => u.key === 'u-ali')!;
    expect(salem).toMatchObject({ exact: true, spent: 300, remaining: 700 });
    expect(ali).toMatchObject({ exact: false, given: 500, status: { key: 'hidden' } });
    expect(ali.custodies).toHaveLength(1);
    expect(ali.custodies[0]).toMatchObject({
      id: 'b2',
      amount: 500,
      exact: false,
      date: '2026-01-02',
      status: null,
      badge: null,
      carryIn: null,
      carryOut: null,
      expenses: [],
    });
    expect(ali.deficit).toBe(0);
    expect(totals.exact).toBe(false);
  });

  it('gives a person who sees no expenses only the amounts and dates, never a made-up balance', () => {
    const { users, totals } = run({ balances: [two.balances[0]], expenses: [], expenseScope: 'none', viewerId: 'u-salem' });
    expect(users[0]).toMatchObject({ given: 1000, exact: false });
    expect(users[0].custodies[0]).toMatchObject({ amount: 1000, exact: false, status: null });
    expect(totals.exact).toBe(false);
  });

  it('numbers the custodies of a hidden holder in the order they were given', () => {
    const { users } = run({
      balances: [bal('b2', 'u-ali', 700, T(5)), bal('b1', 'u-ali', 500, T(1))],
      expenses: [],
      expenseScope: 'own',
      viewerId: 'u-salem',
    });
    expect(users[0].custodies.map((c) => [c.id, c.number])).toEqual([['b1', 1], ['b2', 2]]);
  });

  it('lists the holder in deficit first, then the largest balance, then the name', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 1000, T(1)), bal('b2', 'u-ali', 500, T(1)), bal('b3', 'u-k', 5000, T(1), { userName: 'خالد' })],
      expenses: [exp('e1', 'u-ali', 900, T(2))],
    });
    expect(users.map((u) => u.key)).toEqual(['u-ali', 'u-k', 'u-salem']);
  });
});

describe('exact money', () => {
  it('keeps three decimals exact (no phantom deficit from float residue)', () => {
    const [u] = run({
      balances: [bal('b1', 'u-salem', 100.1, T(1))],
      expenses: [1, 2, 3].map((i) => exp(`e${i}`, 'u-salem', 33.33, T(i + 1))),
    }).users;
    expect(u.spent).toBe(99.99);
    expect(u.remaining).toBe(0.11);
    expect(u.custodies[0].remaining).toBe(0.11);
    expect(u.deficit).toBe(0);
  });

  it('reports a zero balance as zero when the thousandths cancel exactly', () => {
    const [u] = run({
      balances: [bal('b1', 'u-salem', 0.3, T(1))],
      expenses: [exp('e1', 'u-salem', 0.1, T(2)), exp('e2', 'u-salem', 0.2, T(3))],
    }).users;
    expect(u.remaining).toBe(0);
    expect(u.custodies[0].badge).toMatchObject({ key: 'finished' });
    expect(u.status.key).toBe('finished');
  });

  it('carries a 3-decimal deficit exactly', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 10.001, T(1)), bal('b2', 'u-salem', 20.002, T(3))],
      expenses: [exp('e1', 'u-salem', 10.334, T(2))],
    });
    expect(users[0].custodies[0].carryOut?.amount).toBe(0.333);
    expect(users[0].custodies[1]).toMatchObject({ opening: 19.669, remaining: 19.669 });
    expect(users[0].remaining).toBe(19.669);
  });
});

describe('edge cases', () => {
  it('returns nothing without custody', () => {
    const r = run({ balances: [], expenses: [exp('e1', 'u-salem', 5, T(1))] });
    expect(r.users).toEqual([]);
    expect(r.totals).toMatchObject({ given: 0, spent: 0, remaining: 0, holders: 0, custodies: 0, exact: true });
  });

  it('survives a record with a broken date by falling back to the other date', () => {
    const [u] = run({
      balances: [bal('b1', 'u-salem', 100, 'not-a-date', { date: '2026-01-01' })],
      expenses: [exp('e1', 'u-salem', 10, T(2))],
    }).users;
    expect(u.spent).toBe(10);
  });
});

describe('which custody the next expense lands on', () => {
  it('is the oldest custody that still has a balance', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 100, T(1)), bal('b2', 'u-salem', 100, T(3))],
      expenses: [exp('e1', 'u-salem', 60, T(2))],
    });
    expect(chargedCustody(users[0].custodies)?.id).toBe('b1');
  });

  it('moves on once the first is used up', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 100, T(1)), bal('b2', 'u-salem', 100, T(3))],
      expenses: [exp('e1', 'u-salem', 100, T(2))],
    });
    expect(chargedCustody(users[0].custodies)?.id).toBe('b2');
  });

  it('is the last custody when all are used up (the deficit piles up there)', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 100, T(1)), bal('b2', 'u-salem', 100, T(3))],
      expenses: [exp('e1', 'u-salem', 100, T(2)), exp('e2', 'u-salem', 150, T(4))],
    });
    expect(chargedCustody(users[0].custodies)?.id).toBe('b2');
    expect(chargedCustody([])).toBeUndefined();
  });
});

describe('summarizeClientCustody', () => {
  it('adds the holders exactly and says whether every line is exact', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 1000.125, T(1)), bal('b2', 'u-ali', 500.5, T(1))],
      expenses: [exp('e1', 'u-salem', 300.125, T(2)), exp('e2', 'u-ali', 800, T(2))],
    });
    expect(summarizeClientCustody(users)).toEqual({
      given: 1500.625,
      spent: 1100.125,
      remaining: 400.5,
      deficit: 299.5,
      holders: 2,
      deficitUsers: 1,
      custodies: 2,
      exact: true,
    });
  });

  it('is not exact as soon as one holder is hidden', () => {
    const { users } = run({
      balances: [bal('b1', 'u-salem', 1000, T(1)), bal('b2', 'u-ali', 500, T(1))],
      expenses: [exp('e1', 'u-salem', 300, T(2))],
      expenseScope: 'own',
      viewerId: 'u-salem',
    });
    expect(summarizeClientCustody(users)).toMatchObject({ given: 1500, exact: false, holders: 2 });
  });
});
