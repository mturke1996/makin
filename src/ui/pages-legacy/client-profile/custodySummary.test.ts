import { describe, expect, it } from 'vitest';
import type { Expense, UserBalance } from '../../../types';
import { buildUserBalancesSummary, custodyIsExact, depletedLines } from './custodySummary';

const balance = (o: Partial<UserBalance>): UserBalance => ({
  id: Math.random().toString(36).slice(2),
  clientId: 'c1',
  userId: 'u-salem',
  userName: 'سالم',
  amount: 1000,
  date: '2026-01-01',
  notes: '',
  createdAt: '2026-01-01T08:00:00.000Z',
  updatedAt: '2026-01-01T08:00:00.000Z',
  ...o,
});
const expense = (o: Partial<Expense>): Expense => ({
  id: Math.random().toString(36).slice(2),
  clientId: 'c1',
  description: 'x',
  amount: 100,
  category: 'materials',
  date: '2026-02-01',
  isClosed: false,
  createdAt: '2026-02-01T08:00:00.000Z',
  updatedAt: '2026-02-01T08:00:00.000Z',
  userId: 'u-salem',
  ...o,
});

const balances = [balance({ userId: 'u-salem', amount: 1000 }), balance({ userId: 'u-ali', userName: 'علي', amount: 500 })];
const expenses = [expense({ userId: 'u-salem', amount: 300 }), expense({ userId: 'u-ali', amount: 200 })];
const users = [
  { id: 'u-salem', displayName: 'سالم الورفلي', role: 'employee' },
  { id: 'doc-ali', uid: 'u-ali', displayName: 'علي المبروك', role: 'employee' },
];

describe('custody per user on a client', () => {
  it('someone who sees every expense gets exact balances for everyone', () => {
    const s = buildUserBalancesSummary({ balances, expenses, users, expenseScope: 'all', viewerId: 'u-admin' });
    expect(s['u-salem']).toMatchObject({ given: 1000, spent: 300, remaining: 700, exact: true, name: 'سالم الورفلي' });
    expect(s['u-ali']).toMatchObject({ given: 500, spent: 200, remaining: 300, exact: true, name: 'علي المبروك' });
    expect(custodyIsExact(s)).toBe(true);
  });

  it('a person with only their own expenses is exact about themselves and about nobody else', () => {
    // custody.manage without expenses.view.all: every custody line is readable, only their own expenses are listed
    const s = buildUserBalancesSummary({ balances, expenses: [expenses[0]], users, expenseScope: 'own', viewerId: 'u-salem' });
    expect(s['u-salem']).toMatchObject({ given: 1000, spent: 300, remaining: 700, exact: true });
    expect(s['u-ali']).toMatchObject({ given: 500, exact: false });
    expect(custodyIsExact(s)).toBe(false);
  });

  it('a person who sees no expenses has only what was given, never a made-up balance', () => {
    const s = buildUserBalancesSummary({ balances: [balances[0]], expenses: [], users: [], expenseScope: 'none', viewerId: 'u-salem' });
    expect(s['u-salem']).toMatchObject({ given: 1000, exact: false });
    expect(custodyIsExact(s)).toBe(false);
  });

  it('works without the directory (own custody only): the key is the user id', () => {
    const s = buildUserBalancesSummary({ balances: [balances[0]], expenses: [expenses[0]], users: [], expenseScope: 'own', viewerId: 'u-salem' });
    expect(Object.keys(s)).toEqual(['u-salem']);
    expect(s['u-salem']).toMatchObject({ spent: 300, remaining: 700, exact: true, name: 'سالم' });
  });

  it('counts only expenses made after the custody was handed over', () => {
    const early = expense({ userId: 'u-salem', amount: 50, createdAt: '2025-12-01T08:00:00.000Z' });
    const s = buildUserBalancesSummary({ balances: [balances[0]], expenses: [early, expenses[0]], users, expenseScope: 'all', viewerId: 'u-admin' });
    expect(s['u-salem'].spent).toBe(300);
  });

  it('flags only real, exhausted balances as depleted', () => {
    const spendAll = [expense({ userId: 'u-salem', amount: 1000 })];
    const exact = buildUserBalancesSummary({ balances, expenses: spendAll, users, expenseScope: 'all', viewerId: 'u-admin' });
    expect(depletedLines(exact).map(([id]) => id)).toEqual(['u-salem']);
    // the same viewer who cannot see the other person's expenses must not be told their custody ran out
    const partial = buildUserBalancesSummary({ balances, expenses: [], users, expenseScope: 'own', viewerId: 'u-salem' });
    expect(depletedLines(partial)).toEqual([]);
  });
});

describe('custody summary: one source of truth with per-custody detail', () => {
  const at = (day: number, hh = '09:00:00') => `2026-03-${String(day).padStart(2, '0')}T${hh}.000Z`;
  const salem = (o: Partial<Expense>) => expense({ userId: 'u-salem', ...o });
  const run = (b: UserBalance[], e: Expense[], extra: Partial<Parameters<typeof buildUserBalancesSummary>[0]> = {}) =>
    buildUserBalancesSummary({ balances: b, expenses: e, users, expenseScope: 'all', viewerId: 'u-admin', clientId: 'c1', ...extra });

  it('keeps the shape the rest of the page reads and adds the custodies and the deficit', () => {
    const s = run([balance({ amount: 1000, createdAt: at(1) })], [salem({ amount: 300, createdAt: at(2) })]);
    const line = s['u-salem'];
    expect(line).toMatchObject({
      given: 1000,
      spent: 300,
      remaining: 700,
      name: 'سالم الورفلي',
      minTime: at(1),
      exact: true,
      deficit: 0,
    });
    expect(line.expenses).toHaveLength(1);
    expect(line.custodies).toHaveLength(1);
    expect(line.custodies[0]).toMatchObject({ number: 1, amount: 1000, spent: 300, remaining: 700 });
  });

  it('two custodies with a carried deficit: the totals match the cards', () => {
    const s = run(
      [balance({ id: 'b1', amount: 1000, createdAt: at(1) }), balance({ id: 'b2', amount: 3000, createdAt: at(3) })],
      [salem({ amount: 1200, createdAt: at(2) }), salem({ amount: 100, createdAt: at(4) })],
    );
    const line = s['u-salem'];
    expect(line).toMatchObject({ given: 4000, spent: 1300, remaining: 2700, deficit: 0 });
    expect(line.custodies.map((c) => [c.number, c.spent, c.remaining])).toEqual([[1, 1200, 0], [2, 100, 2700]]);
    expect(line.custodies[0].carryOut).toMatchObject({ amount: 200, otherNumber: 2 });
    expect(line.custodies[1].carryIn).toMatchObject({ amount: 200, otherNumber: 1 });
    // the figures the module row, the personal summary and the expense form read agree with the cards
    expect(line.remaining).toBe(line.custodies.reduce((n, c) => n + c.remaining, 0));
  });

  it('an overrun is a deficit and counts as depleted', () => {
    const s = run([balance({ amount: 1000, createdAt: at(1) })], [salem({ amount: 1500, createdAt: at(2) })]);
    expect(s['u-salem']).toMatchObject({ remaining: -500, deficit: 500 });
    expect(depletedLines(s).map(([id]) => id)).toEqual(['u-salem']);
  });

  it('ignores an expense of another client and one made before the first deposit', () => {
    const s = run(
      [balance({ amount: 1000, createdAt: at(5) })],
      [
        salem({ amount: 900, clientId: 'c2', createdAt: at(6) }),
        salem({ amount: 50, createdAt: at(2) }),
        salem({ amount: 100, createdAt: at(6) }),
      ],
    );
    expect(s['u-salem']).toMatchObject({ spent: 100, remaining: 900 });
    expect(s['u-salem'].beforeCustody).toEqual({ count: 1, amount: 50 });
  });

  it('same-minute ordering: a deposit given with an expense in the same instant is charged by it', () => {
    const same = run([balance({ amount: 500, createdAt: at(1, '10:00:00') })], [salem({ amount: 40, createdAt: at(1, '10:00:00') })]);
    expect(same['u-salem'].spent).toBe(40);
    // a few seconds earlier is before the custody existed
    const earlier = run([balance({ amount: 500, createdAt: at(1, '10:00:30') })], [salem({ amount: 40, createdAt: at(1, '10:00:00') })]);
    expect(earlier['u-salem'].spent).toBe(0);
  });

  it('legacy records with only a name still pair up', () => {
    const s = run(
      [balance({ userId: undefined, userName: 'سالم', amount: 800, createdAt: at(1) })],
      [expense({ userId: undefined, createdBy: 'سالم', amount: 300, createdAt: at(2) })],
      { users: [] },
    );
    expect(Object.keys(s)).toEqual(['سالم']);
    expect(s['سالم']).toMatchObject({ given: 800, spent: 300, remaining: 500, exact: true });
  });

  it('a viewer who cannot see the expenses gets amounts and dates only', () => {
    const s = run([balance({ amount: 500, createdAt: at(1) })], [], { expenseScope: 'none', viewerId: 'u-ali' });
    const line = s['u-salem'];
    expect(line).toMatchObject({ given: 500, exact: false, deficit: 0 });
    expect(line.custodies[0]).toMatchObject({ amount: 500, exact: false, status: null });
    expect(custodyIsExact(s)).toBe(false);
  });

  it('rounds 3-decimal amounts exactly', () => {
    const s = run(
      [balance({ amount: 100.125, createdAt: at(1) })],
      [salem({ amount: 33.375, createdAt: at(2) }), salem({ amount: 33.375, createdAt: at(3) }), salem({ amount: 33.375, createdAt: at(4) })],
    );
    expect(s['u-salem']).toMatchObject({ spent: 100.125, remaining: 0 });
    expect(depletedLines(s)).toHaveLength(1);
  });
});

