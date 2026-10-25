import { describe, expect, it } from 'vitest';
import {
  allocateShares,
  breakdownByCategory,
  breakdownByPerson,
  categoryLabel,
  buildMonthlyFlow,
  buildOverviewTrend,
  changeBetween,
  dayOf,
  daysInMonth,
  localDay,
  monthName,
  monthOf,
  monthTitle,
  monthsEnding,
  percentOf,
  shiftMonth,
} from './clientAnalytics';

const pay = (paymentDate: string, amount: number) => ({ paymentDate, amount });
const exp = (date: string, amount: number) => ({ date, amount });

describe('dates', () => {
  it('reads the day of a date or timestamp and rejects dates that do not exist', () => {
    expect(dayOf('2026-03-05')).toBe('2026-03-05');
    expect(dayOf('2026-03-05T22:30:00Z')).toBe('2026-03-05');
    expect(dayOf('2026-02-30')).toBeNull();
    expect(dayOf('2026-13-01')).toBeNull();
    expect(dayOf('2026-00-10')).toBeNull();
    expect(dayOf('0000-01-01')).toBeNull();
    expect(dayOf('soon')).toBeNull();
    expect(dayOf('')).toBeNull();
    expect(dayOf(undefined)).toBeNull();
    expect(dayOf(null)).toBeNull();
  });

  it('knows leap years', () => {
    expect(dayOf('2024-02-29')).toBe('2024-02-29');
    expect(dayOf('2026-02-29')).toBeNull();
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it('reads the month and formats the local day', () => {
    expect(monthOf('2026-03-05T22:30:00Z')).toBe('2026-03');
    expect(monthOf('2026-02-31')).toBeNull();
    expect(localDay(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('moves between months across a year end', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(shiftMonth('2026-03', -14)).toBe('2025-01');
    expect(monthsEnding('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(monthsEnding('2026-02', 0)).toEqual([]);
  });

  it('names months in Arabic', () => {
    expect(monthName('2026-10')).toBe('أكتوبر');
    expect(monthTitle('2026-01')).toBe('يناير 2026');
  });
});

describe('percentOf', () => {
  it('is a one decimal percentage, or null with nothing to divide by', () => {
    expect(percentOf(1, 3)).toBe(33.3);
    expect(percentOf(150, 100)).toBe(150);
    expect(percentOf(5, 0)).toBeNull();
    expect(percentOf(5, -2)).toBeNull();
    expect(percentOf(0, 10)).toBe(0);
  });
});

describe('buildMonthlyFlow', () => {
  const flow = buildMonthlyFlow({
    endMonth: '2026-03',
    months: 3,
    payments: [pay('2026-01-10', 1000), pay('2026-03-02', 0.1), pay('2026-03-20T09:00:00Z', 0.2), pay('2025-11-01', 400), pay('2026-04-01', 9999), pay('bad', 777)],
    expenses: [exp('2026-01-12', 250.5), exp('2026-02-03', 100), exp('2025-12-30', 50), exp('2026-02-31', 123456)],
  });

  it('lists the months oldest first', () => {
    expect(flow.months).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('sums each month exactly and leaves out records outside the window or without a real date', () => {
    expect(flow.collected).toEqual([1000, 0, 0.3]);
    expect(flow.expenses).toEqual([250.5, 100, 0]);
    expect(flow.net).toEqual([749.5, -100, 0.3]);
  });

  it('counts everything before the first month in the running totals', () => {
    expect(flow.cumulativeCollected).toEqual([1400, 1400, 1400.3]);
    expect(flow.cumulativeExpenses).toEqual([300.5, 400.5, 400.5]);
  });

  it('gives the collection ratio at each month end, null while nothing has been spent', () => {
    expect(flow.ratio[0]).toBe(465.9);
    expect(flow.ratio[2]).toBe(349.6);
    const none = buildMonthlyFlow({ endMonth: '2026-03', months: 2, payments: [pay('2026-03-01', 5)], expenses: [] });
    expect(none.ratio).toEqual([null, null]);
  });

  it('is all zeros for a client without records', () => {
    const empty = buildMonthlyFlow({ endMonth: '2026-03', months: 2, payments: [], expenses: [] });
    expect(empty.collected).toEqual([0, 0]);
    expect(empty.net).toEqual([0, 0]);
  });
});

describe('changeBetween', () => {
  it('reports percent change to one decimal and the direction', () => {
    expect(changeBetween(150, 100)).toMatchObject({ changePct: 50, direction: 'up' });
    expect(changeBetween(100, 300)).toMatchObject({ changePct: -66.7, direction: 'down' });
    expect(changeBetween(100, 100)).toMatchObject({ changePct: 0, direction: 'flat' });
  });

  it('has no percentage when there is nothing to compare with', () => {
    expect(changeBetween(50, 0)).toMatchObject({ changePct: null, direction: 'up' });
    expect(changeBetween(0, 0)).toMatchObject({ changePct: null, direction: 'flat' });
  });

  it('measures a change from a negative base against its size', () => {
    expect(changeBetween(-50, -100)).toMatchObject({ changePct: 50, direction: 'up' });
  });

  it('compares in thousandths', () => {
    expect(changeBetween(0.1 + 0.2, 0.3)).toMatchObject({ changePct: 0, direction: 'flat' });
  });
});

describe('buildOverviewTrend', () => {
  it('sets the month so far against the same days of the previous month', () => {
    const t = buildOverviewTrend({
      today: '2026-03-10',
      payments: [pay('2026-02-05', 100), pay('2026-02-20', 500), pay('2026-03-03', 50), pay('2026-03-12', 999)],
      expenses: [exp('2026-02-10', 40), exp('2026-02-11', 1000), exp('2026-03-10', 60)],
    });
    expect(t.collected).toMatchObject({ current: 50, previous: 100, changePct: -50, direction: 'down' });
    expect(t.expenses).toMatchObject({ current: 60, previous: 40, changePct: 50, direction: 'up' });
    expect(t.net).toMatchObject({ current: -10, previous: 60 });
    expect(t.month).toBe('2026-03');
    expect(t.dayOfMonth).toBe(10);
  });

  it('counts a whole short previous month when today is past its last day', () => {
    const t = buildOverviewTrend({
      today: '2026-03-31',
      payments: [pay('2026-02-28', 70), pay('2026-03-31', 140)],
      expenses: [],
    });
    expect(t.collected).toMatchObject({ current: 140, previous: 70, changePct: 100 });
  });

  it('ignores records without a real date', () => {
    const t = buildOverviewTrend({ today: '2026-03-10', payments: [pay('nope', 100), pay('2026-02-30', 100)], expenses: [] });
    expect(t.collected).toMatchObject({ current: 0, previous: 0, changePct: null });
  });

  it('reports the ratio now, at the end of last month and the change in points', () => {
    const t = buildOverviewTrend({
      today: '2026-03-10',
      payments: [pay('2026-02-05', 50), pay('2026-03-03', 100)],
      expenses: [exp('2026-02-10', 100), exp('2026-03-05', 100)],
    });
    expect(t.ratio).toEqual({ now: 75, before: 50, deltaPoints: 25 });
  });

  it('uses six months by default', () => {
    const t = buildOverviewTrend({ today: '2026-03-10', payments: [], expenses: [] });
    expect(t.flow.months).toHaveLength(6);
    expect(t.flow.months[5]).toBe('2026-03');
    expect(t.ratio).toEqual({ now: null, before: null, deltaPoints: null });
  });
});

describe('allocateShares', () => {
  it('returns whole percentages that add up to exactly 100', () => {
    const shares = allocateShares([1, 1, 1]);
    expect(shares.reduce((s, v) => s + v, 0)).toBe(100);
    expect(shares).toEqual([34, 33, 33]);
    expect(allocateShares([50, 30, 20])).toEqual([50, 30, 20]);
  });

  it('keeps a tiny share at zero rather than inventing one', () => {
    const shares = allocateShares([9999, 1]);
    expect(shares.reduce((s, v) => s + v, 0)).toBe(100);
    expect(shares[1]).toBe(0);
  });

  it('is all zeros when nothing was spent', () => {
    expect(allocateShares([0, 0])).toEqual([0, 0]);
    expect(allocateShares([])).toEqual([]);
  });
});

describe('breakdownByCategory', () => {
  const rows = [
    { category: 'materials', amount: 500 },
    { category: 'materials', amount: 250.25 },
    { category: 'transport', amount: 100 },
    { category: 'labor', amount: 149.75 },
    { category: 'rent', amount: 0 },
  ] as const;

  it('groups, labels and ranks the categories, and the shares add up to 100', () => {
    const b = breakdownByCategory(rows);
    expect(b.rows.map((r) => [r.key, r.amount, r.count])).toEqual([
      ['materials', 750.25, 2],
      ['labor', 149.75, 1],
      ['transport', 100, 1],
    ]);
    expect(b.rows[0].label).toBe('توفير مواد خام متنوعة');
    expect(b.total).toBe(1000);
    expect(b.count).toBe(4);
    expect(b.rows.reduce((s, r) => s + r.share, 0)).toBe(100);
    expect(b.folded).toBe(0);
  });

  it('folds the tail into one «أخرى» row', () => {
    const many = ['materials', 'labor', 'transport', 'equipment', 'rent', 'utilities', 'other'].map((category, i) => ({
      category: category as never,
      amount: 100 - i * 10,
    }));
    const b = breakdownByCategory(many, 3);
    expect(b.rows).toHaveLength(4);
    expect(b.rows[3]).toMatchObject({ key: '__rest', label: 'أخرى', count: 4, amount: 220 });
    expect(b.folded).toBe(4);
    expect(b.total).toBe(490);
    expect(b.rows.reduce((s, r) => s + r.share, 0)).toBe(100);
  });

  it('shows a single leftover category as itself', () => {
    const b = breakdownByCategory(
      [
        { category: 'materials', amount: 5 },
        { category: 'labor', amount: 4 },
        { category: 'rent', amount: 3 },
      ],
      2,
    );
    expect(b.rows.map((r) => r.key)).toEqual(['materials', 'labor', 'rent']);
    expect(b.folded).toBe(0);
  });

  it('treats a missing category as «other» and an empty list as no rows', () => {
    expect(breakdownByCategory([{ category: undefined as never, amount: 3 }]).rows[0].key).toBe('other');
    expect(breakdownByCategory([])).toEqual({ rows: [], total: 0, count: 0, folded: 0 });
  });

  it('sums exactly', () => {
    const b = breakdownByCategory([
      { category: 'materials', amount: 0.1 },
      { category: 'materials', amount: 0.2 },
    ]);
    expect(b.rows[0].amount).toBe(0.3);
  });
});

describe('categoryLabel', () => {
  it('names every category the expense form offers, and never shows a raw key', () => {
    expect(categoryLabel('materials')).toBe('توفير مواد خام متنوعة');
    expect(categoryLabel('government_fees')).toBe('رسوم حكومية');
    expect(categoryLabel('office_supplies')).toBe('قرطاسية ومكتبية');
    expect(categoryLabel('marketing')).toBe('تسويق');
    expect(categoryLabel('something_new')).toBe('تصنيف غير معروف');
  });
});

describe('breakdownByPerson', () => {
  it('groups by user id and joins name-only records to the id the same name carries elsewhere', () => {
    const b = breakdownByPerson([
      { userId: 'u1', createdBy: 'سالم', amount: 100 },
      { userId: undefined, createdBy: 'سالم', amount: 50 },
      { userId: 'u2', createdBy: 'علي', amount: 80 },
      { userId: undefined, createdBy: 'خالد', amount: 20 },
    ]);
    expect(b.rows.map((r) => [r.label, r.amount, r.count])).toEqual([
      ['سالم', 150, 2],
      ['علي', 80, 1],
      ['خالد', 20, 1],
    ]);
    expect(b.rows.reduce((s, r) => s + r.share, 0)).toBe(100);
  });

  it('labels records without any name as unknown', () => {
    const b = breakdownByPerson([{ amount: 10 }, { amount: 5, createdBy: '  ' }]);
    expect(b.rows).toHaveLength(1);
    expect(b.rows[0]).toMatchObject({ label: 'غير معروف', amount: 15, count: 2 });
  });

  it('uses the name written most often for a user', () => {
    const b = breakdownByPerson([
      { userId: 'u1', createdBy: 'سالم', amount: 1 },
      { userId: 'u1', createdBy: 'سالم الورفلي', amount: 1 },
      { userId: 'u1', createdBy: 'سالم الورفلي', amount: 1 },
    ]);
    expect(b.rows[0].label).toBe('سالم الورفلي');
  });

  it('keeps two different ids with the same name apart', () => {
    const b = breakdownByPerson([
      { userId: 'u1', createdBy: 'محمد', amount: 10 },
      { userId: 'u2', createdBy: 'محمد', amount: 10 },
    ]);
    expect(b.rows).toHaveLength(2);
  });
});
