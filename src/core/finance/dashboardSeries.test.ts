import { describe, expect, it } from 'vitest';
import { buildDashboard, comparePeriods, dailyTotals, dayKey, lastDays, previousDays } from './dashboardSeries';

describe('days', () => {
  it('reads the day of a date or timestamp', () => {
    expect(dayKey('2026-03-05')).toBe('2026-03-05');
    expect(dayKey('2026-03-05T22:30:00Z')).toBe('2026-03-05');
    expect(dayKey('soon')).toBeNull();
    expect(dayKey(undefined)).toBeNull();
  });

  it('lists consecutive days across a month end, oldest first', () => {
    expect(lastDays('2026-03-02', 4)).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
    expect(previousDays(['2026-03-01', '2026-03-02'])).toEqual(['2026-02-27', '2026-02-28']);
    expect(lastDays('2026-03-02', 0)).toEqual([]);
  });
});

describe('dailyTotals', () => {
  it('sums per day exactly and ignores records outside the period or without a day', () => {
    const days = lastDays('2026-01-03', 3);
    const items = [
      { date: '2026-01-01', amount: 0.1 },
      { date: '2026-01-01T09:00:00Z', amount: 0.2 },
      { date: '2026-01-03', amount: 5 },
      { date: '2025-12-31', amount: 99 },
      { date: 'bad', amount: 7 },
    ];
    expect(dailyTotals(items, days)).toEqual([0.3, 0, 5]);
  });
});

describe('comparePeriods', () => {
  it('reports percent change to one decimal and the direction', () => {
    expect(comparePeriods([150], [100])).toMatchObject({ total: 150, previousTotal: 100, changePct: 50, direction: 'up' });
    expect(comparePeriods([100], [300])).toMatchObject({ changePct: -66.7, direction: 'down' });
    expect(comparePeriods([100], [100])).toMatchObject({ changePct: 0, direction: 'flat' });
  });

  it('has no percentage when there is nothing to compare with', () => {
    expect(comparePeriods([40], [0]).changePct).toBeNull();
    expect(comparePeriods([], []).direction).toBe('flat');
  });
});

describe('buildDashboard', () => {
  const input = {
    endDay: '2026-01-10',
    days: 5,
    income: [{ date: '2026-01-10', amount: 1000 }, { date: '2026-01-06', amount: 500 }, { date: '2026-01-02', amount: 600 }],
    expense: [{ date: '2026-01-09', amount: 250 }, { date: '2026-01-06', amount: 250.5 }, { date: '2026-01-03', amount: 100 }],
  };
  const d = buildDashboard(input);

  it('builds aligned daily series and their net', () => {
    expect(d.days).toEqual(['2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10']);
    expect(d.income).toEqual([500, 0, 0, 0, 1000]);
    expect(d.expense).toEqual([250.5, 0, 0, 250, 0]);
    expect(d.net).toEqual([249.5, 0, 0, -250, 1000]);
  });

  it('compares with the five days before', () => {
    expect(d.comparison.income).toMatchObject({ total: 1500, previousTotal: 600, changePct: 150, direction: 'up' });
    expect(d.comparison.expense).toMatchObject({ total: 500.5, previousTotal: 100, direction: 'up' });
    expect(d.comparison.net.total).toBe(999.5);
  });

  it('derives the average, the share of income and the entry count', () => {
    expect(d.dailyAverageExpense).toBe(100.1);
    expect(d.expenseShareOfIncome).toBe(33);
    expect(d.expenseCount).toBe(2);
  });

  it('works with no income at all (a person who may not see payments)', () => {
    const own = buildDashboard({ ...input, income: [] });
    expect(own.income.every((v) => v === 0)).toBe(true);
    expect(own.expenseShareOfIncome).toBeNull();
    expect(own.comparison.income.changePct).toBeNull();
  });
});
