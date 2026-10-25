import { describe, expect, it } from 'vitest';
import type { Expense, GlobalFundTransaction } from '../../types';
import {
  buildAllCustodyProfiles,
  buildCustodyLog,
  buildUserCustodyProfile,
  getCustodyBadge,
  summarizeCustodyProfiles,
} from './custodyProfile';

const dep = (id: string, userId: string, amount: number, createdAt: string): GlobalFundTransaction => ({
  id, type: 'deposit', amount, userId, userName: userId, description: id,
  date: createdAt.slice(0, 10), createdAt, updatedAt: createdAt,
});
const wd = (id: string, userId: string, amount: number, createdAt: string): GlobalFundTransaction => ({
  ...dep(id, userId, amount, createdAt), type: 'withdrawal',
});
const exp = (id: string, userId: string, amount: number, createdAt: string, extra: Partial<Expense> = {}): Expense => ({
  id, clientId: 'c1', description: id, amount, category: 'materials',
  date: createdAt.slice(0, 10), isClosed: false, createdAt, updatedAt: createdAt,
  userId, createdBy: userId, ...extra,
});
const clients = { c1: 'النور', c2: 'الأندلس' };

describe('buildUserCustodyProfile', () => {
  it('returns an empty profile for a user without custody', () => {
    const p = buildUserCustodyProfile('nobody', [dep('d1', 'u1', 100, '2026-01-01T09:00:00Z')], [], { userName: 'فلان' });
    expect(p.hasCustody).toBe(false);
    expect(p.userName).toBe('فلان');
    expect(p.totals).toMatchObject({ deposited: 0, spent: 0, remaining: 0, deficit: 0 });
    expect(p.status.key).toBe('none');
    expect(p.timeline).toEqual([]);
  });

  it('totals tie out: deposited - spent = remaining, with exact cents', () => {
    const p = buildUserCustodyProfile(
      'u1',
      [dep('d1', 'u1', 1000.1, '2026-01-01T09:00:00Z')],
      [exp('e1', 'u1', 0.2, '2026-01-02T09:00:00Z'), exp('e2', 'u1', 0.1, '2026-01-03T09:00:00Z')],
      { clientMap: clients },
    );
    expect(p.totals.deposited).toBe(1000.1);
    expect(p.totals.spent).toBe(0.3);
    expect(p.totals.remaining).toBe(999.8);
    expect(p.timeline[0].balanceAfter).toBe(999.8);
  });

  it('carries only the deficit forward and keeps the ledger identity across two custodies', () => {
    const p = buildUserCustodyProfile(
      'u1',
      [dep('d1', 'u1', 1000, '2026-01-01T09:00:00Z'), dep('d2', 'u1', 3000, '2026-01-03T09:00:00Z')],
      [exp('e1', 'u1', 1200, '2026-01-02T09:00:00Z'), exp('e2', 'u1', 100, '2026-01-04T09:00:00Z', { clientId: 'c2' })],
      { clientMap: clients },
    );
    const [c1, c2] = p.custodies;
    expect(c1).toMatchObject({ carriedOut: 200, remaining: 0, carryToRef: c2.ref });
    expect(c2).toMatchObject({ carryOver: 200, carryFromRef: c1.ref, opening: 2800, remaining: 2700 });
    expect(p.totals).toMatchObject({ deposited: 4000, spent: 1300, remaining: 2700, deficit: 0, carriedBetween: 200 });
    expect(p.counts).toMatchObject({ custodies: 2, active: 1, finished: 1, expenses: 2 });
    // newest first, running balance ends at the remaining total
    expect(p.timeline.map((e) => e.id)).toEqual(['exp-e2', 'dep-d2', 'exp-e1', 'dep-d1']);
    expect(p.timeline.map((e) => e.balanceAfter)).toEqual([2700, 2800, -200, 1000]);
    expect(p.timeline[0].balanceAfter).toBe(p.totals.remaining);
  });

  it('reports a lone overdrawn custody as a deficit', () => {
    const p = buildUserCustodyProfile(
      'u1',
      [dep('d1', 'u1', 500, '2026-01-01T09:00:00Z')],
      [exp('e1', 'u1', 800, '2026-01-02T09:00:00Z')],
    );
    expect(p.totals).toMatchObject({ remaining: -300, deficit: 300, available: 0 });
    expect(p.status).toMatchObject({ key: 'deficit', tone: 'danger' });
    expect(p.custodies[0].status.key).toBe('overdrawn');
    expect(p.custodies[0].expenses[0]).toMatchObject({ amount: 800, overdrawnAmount: 300, balanceAfter: -300 });
  });

  it('chains deficits through three custodies', () => {
    const p = buildUserCustodyProfile(
      'u1',
      [
        dep('d1', 'u1', 100, '2026-01-01T09:00:00Z'),
        dep('d2', 'u1', 100, '2026-01-02T09:00:00Z'),
        dep('d3', 'u1', 1000, '2026-01-03T09:00:00Z'),
      ],
      [exp('e1', 'u1', 150, '2026-01-04T09:00:00Z'), exp('e2', 'u1', 120, '2026-01-05T09:00:00Z')],
    );
    const [a, b, c] = p.custodies;
    expect(a).toMatchObject({ carriedOut: 50, remaining: 0 });
    expect(b).toMatchObject({ carryOver: 50, carriedOut: 70, remaining: 0 });
    expect(c).toMatchObject({ carryOver: 70, remaining: 930 });
    expect(p.totals).toMatchObject({ deposited: 1200, spent: 270, remaining: 930, carriedBetween: 120 });
  });

  it('groups spending by client, merges unknown clients and matches by createdBy name', () => {
    const p = buildUserCustodyProfile(
      'u1',
      [dep('d1', 'u1', 1000, '2026-01-01T09:00:00Z')],
      [
        exp('e1', 'u1', 300, '2026-01-02T09:00:00Z'),
        exp('e2', 'u1', 100, '2026-01-03T09:00:00Z', { clientId: 'gone-1' }),
        exp('e3', 'u1', 100, '2026-01-04T09:00:00Z', { clientId: 'gone-2' }),
        exp('e4', 'u1', 100, '2026-01-05T09:00:00Z', { clientId: '' }),
        // no userId: matched through createdBy (userName)
        exp('e5', '', 100, '2026-01-06T09:00:00Z', { userId: undefined, createdBy: 'u1' }),
      ],
      { clientMap: clients },
    );
    expect(p.totals.spent).toBe(700);
  });

  it('ignores expenses before the first custody and keeps withdrawals out of the balance', () => {
    const p = buildUserCustodyProfile(
      'u1',
      [dep('d1', 'u1', 1000, '2026-01-05T09:00:00Z'), wd('w1', 'u1', 50, '2026-01-06T09:00:00Z')],
      [exp('early', 'u1', 999, '2026-01-01T09:00:00Z'), exp('e1', 'u1', 100, '2026-01-07T09:00:00Z')],
    );
    expect(p.totals).toMatchObject({ deposited: 1000, spent: 100, remaining: 900, withdrawn: 50 });
    const wRow = p.timeline.find((e) => e.kind === 'withdrawal');
    expect(wRow).toMatchObject({ amount: -50, countedInBalance: false, balanceAfter: 1000 });
    expect(p.timeline.some((e) => e.id === 'exp-early')).toBe(false);
  });
});

describe('overview and timeline helpers', () => {
  it('sorts deficit first, then the largest balance, and summarizes', () => {
    const profiles = buildAllCustodyProfiles(
      [
        dep('a', 'ua', 1000, '2026-01-01T09:00:00Z'),
        dep('b', 'ub', 5000, '2026-01-01T09:00:00Z'),
        dep('c', 'uc', 300, '2026-01-01T09:00:00Z'),
      ],
      [exp('e1', 'uc', 450, '2026-01-02T09:00:00Z')],
    );
    expect(profiles.map((p) => p.userId)).toEqual(['uc', 'ub', 'ua']);
    expect(summarizeCustodyProfiles(profiles)).toEqual({
      deposited: 6300, spent: 450, remaining: 5850, deficit: 150, holders: 3, deficitUsers: 1,
    });
  });

});

describe('compact screen helpers', () => {
  const twoCustodies = () =>
    buildUserCustodyProfile(
      'u1',
      [dep('d1', 'u1', 1000, '2026-01-01T09:00:00Z'), dep('d2', 'u1', 3000, '2026-01-05T09:00:00Z')],
      [
        exp('e1', 'u1', 1200, '2026-01-02T09:00:00Z'),
        exp('e2', 'u1', 100, '2026-01-06T09:00:00Z', { clientId: 'c2' }),
        exp('e3', 'u1', 50, '2026-02-01T09:00:00Z', { clientId: 'c2' }),
      ],
      { clientMap: clients },
    );

  it('badges: deficit, finished, deducted, active (and never "low")', () => {
    expect(getCustodyBadge(-1, 0)).toMatchObject({ key: 'deficit', label: 'عليها عجز', tone: 'danger' });
    expect(getCustodyBadge(0, 0)).toMatchObject({ key: 'finished', label: 'منتهية' });
    expect(getCustodyBadge(0, 200)).toMatchObject({ key: 'finished' });
    expect(getCustodyBadge(10, 200)).toMatchObject({ key: 'deducted', label: 'خُصم منها عجز', tone: 'warning' });
    expect(getCustodyBadge(10, 0)).toMatchObject({ key: 'active', label: 'نشطة', tone: 'success' });
    // 1 left of 1000 would be "low" in the old status; the compact badge stays "active"
    expect(getCustodyBadge(1, 0).key).toBe('active');
  });

  it('puts the badge on every batch of a profile', () => {
    const p = twoCustodies();
    expect(p.custodies.map((c) => c.badge.key)).toEqual(['finished', 'deducted']);
    const lone = buildUserCustodyProfile('u1', [dep('d1', 'u1', 500, '2026-01-01T09:00:00Z')], [exp('e1', 'u1', 800, '2026-01-02T09:00:00Z')]);
    expect(lone.custodies[0].badge.key).toBe('deficit');
  });
});

describe('buildCustodyLog', () => {
  const profile = buildUserCustodyProfile(
    'u1',
    [dep('d1', 'u1', 1000, '2026-01-01T09:00:00Z'), dep('d2', 'u1', 3000, '2026-01-04T09:00:00Z')],
    [
      exp('e1', 'u1', 400, '2026-01-02T09:00:00Z'),
      exp('e2', 'u1', 800, '2026-01-03T09:00:00Z', { clientId: 'c2' }), // overdraws d1 by 200
      exp('e3', 'u1', 100, '2026-01-05T09:00:00Z'),
    ],
    { clientMap: clients },
  );
  const [first, second] = profile.custodies;

  it("lists one custody's own movements newest first, the deposit last", () => {
    expect(buildCustodyLog(first).map((r) => r.kind)).toEqual(['carry-out', 'expense', 'expense', 'deposit']);
    expect(buildCustodyLog(second).map((r) => r.kind)).toEqual(['expense', 'carry-in', 'deposit']);
  });

  it('keeps the custody balance after every row and ends at its remaining', () => {
    const asc = [...buildCustodyLog(first)].reverse();
    expect(asc.map((r) => r.balanceAfter)).toEqual([1000, 600, -200, 0]);
    expect(asc[asc.length - 1].balanceAfter).toBe(first.remaining);
    const asc2 = [...buildCustodyLog(second)].reverse();
    // the 200 deficit of the first custody is deducted once, then the 100 expense
    expect(asc2.map((r) => r.balanceAfter)).toEqual([3000, 2800, 2700]);
    expect(asc2[asc2.length - 1].balanceAfter).toBe(second.remaining);
  });

  it('every step equals the previous balance plus the row amount, exactly', () => {
    [first, second].forEach((batch) => {
      const asc = [...buildCustodyLog(batch)].reverse();
      asc.slice(1).forEach((r, i) => expect(Math.round((asc[i].balanceAfter + r.amount) * 1000)).toBe(Math.round(r.balanceAfter * 1000)));
    });
  });

  it('points the deficit rows at the other custody and flags the overrun', () => {
    const out = buildCustodyLog(first).find((r) => r.kind === 'carry-out')!;
    const inn = buildCustodyLog(second).find((r) => r.kind === 'carry-in')!;
    expect(out).toMatchObject({ amount: 200, otherRef: second.ref });
    expect(inn).toMatchObject({ amount: -200, otherRef: first.ref });
    expect(buildCustodyLog(first).find((r) => r.id === 'exp-e2')).toMatchObject({ overdrawnAmount: 200, clientName: 'الأندلس' });
  });

  it('a custody with no spending is just its deposit', () => {
    const p = buildUserCustodyProfile('u9', [dep('x', 'u9', 50.5, '2026-01-01T09:00:00Z')], []);
    expect(buildCustodyLog(p.custodies[0]).map((r) => [r.kind, r.balanceAfter])).toEqual([['deposit', 50.5]]);
  });
});
