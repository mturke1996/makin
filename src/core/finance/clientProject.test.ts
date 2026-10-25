import { describe, expect, it } from 'vitest';
import { contractProgress, dayNumber, projectTimeline, resolveClientStatus } from './clientProject';

describe('resolveClientStatus', () => {
  it('treats a missing or unknown status as active', () => {
    expect(resolveClientStatus({})).toBe('active');
    expect(resolveClientStatus({ status: null })).toBe('active');
    expect(resolveClientStatus({ status: 'archived' })).toBe('active');
  });
  it('keeps the three known statuses', () => {
    expect(resolveClientStatus({ status: 'paused' })).toBe('paused');
    expect(resolveClientStatus({ status: 'completed' })).toBe('completed');
    expect(resolveClientStatus({ status: 'active' })).toBe('active');
  });
});

describe('dayNumber', () => {
  it('counts calendar days and ignores the time of day', () => {
    expect(dayNumber('1970-01-02')! - dayNumber('1970-01-01')!).toBe(1);
    expect(dayNumber('2026-10-24T23:59:00.000Z')).toBe(dayNumber('2026-10-24'));
    expect(dayNumber(new Date(2026, 9, 24, 23, 59))).toBe(dayNumber('2026-10-24'));
  });
  it('survives the daylight saving change and leap days', () => {
    expect(dayNumber('2026-03-30')! - dayNumber('2026-03-28')!).toBe(2);
    expect(dayNumber('2028-03-01')! - dayNumber('2028-02-28')!).toBe(2);
    expect(dayNumber('2027-03-01')! - dayNumber('2027-02-28')!).toBe(1);
  });
  it('rejects text that is not a real date', () => {
    expect(dayNumber('')).toBeNull();
    expect(dayNumber(undefined)).toBeNull();
    expect(dayNumber('soon')).toBeNull();
    expect(dayNumber('2026-02-30')).toBeNull();
    expect(dayNumber('2026-13-01')).toBeNull();
    expect(dayNumber(new Date('nope'))).toBeNull();
  });
});

describe('projectTimeline', () => {
  const today = '2026-10-24';

  it('is unscheduled without dates', () => {
    const t = projectTimeline({}, today);
    expect(t.kind).toBe('unscheduled');
    expect(t.daysSinceStart).toBeNull();
    expect(t.status).toBe('active');
  });

  it('counts the days since the start when there is no end date', () => {
    const t = projectTimeline({ startDate: '2026-10-14' }, today);
    expect(t).toMatchObject({ kind: 'running', daysSinceStart: 10, daysLeft: null, elapsedPct: null });
    expect(projectTimeline({ startDate: today }, today).daysSinceStart).toBe(0);
  });

  it('counts the days left and the share of the planned length that passed', () => {
    const t = projectTimeline({ startDate: '2026-10-04', expectedEndDate: '2026-11-03' }, today);
    expect(t).toMatchObject({ kind: 'running', daysSinceStart: 20, daysLeft: 10, plannedDays: 30, elapsedPct: 67 });
  });

  it('works from the end date alone', () => {
    const t = projectTimeline({ expectedEndDate: '2026-10-30' }, today);
    expect(t).toMatchObject({ kind: 'running', daysLeft: 6, daysSinceStart: null, plannedDays: null });
  });

  it('flags the expected end day itself', () => {
    const t = projectTimeline({ startDate: '2026-09-24', expectedEndDate: today }, today);
    expect(t).toMatchObject({ kind: 'due_today', daysLeft: null, daysLate: null, elapsedPct: 100 });
  });

  it('is late past the expected end, counting the days', () => {
    const t = projectTimeline({ startDate: '2026-08-01', expectedEndDate: '2026-10-21' }, today);
    expect(t).toMatchObject({ kind: 'late', daysLate: 3, daysLeft: null, elapsedPct: 100 });
  });

  it('is upcoming before the start date', () => {
    const t = projectTimeline({ startDate: '2026-11-01', expectedEndDate: '2026-12-01' }, today);
    expect(t).toMatchObject({ kind: 'upcoming', daysToStart: 8, daysSinceStart: null, elapsedPct: 0 });
  });

  it('a finished project is never late and keeps its planned length', () => {
    const t = projectTimeline({ status: 'completed', startDate: '2026-01-01', expectedEndDate: '2026-02-01' }, today);
    expect(t).toMatchObject({ kind: 'completed', daysLate: null, plannedDays: 31 });
    expect(projectTimeline({ status: 'completed' }, today).kind).toBe('completed');
  });

  it('a paused project is judged against the same dates', () => {
    const t = projectTimeline({ status: 'paused', startDate: '2026-08-01', expectedEndDate: '2026-10-01' }, today);
    expect(t).toMatchObject({ status: 'paused', kind: 'late', daysLate: 23 });
  });

  it('ignores an end date before the start date and unreadable dates', () => {
    const t = projectTimeline({ startDate: '2026-10-10', expectedEndDate: '2026-10-01' }, today);
    expect(t.plannedDays).toBeNull();
    expect(t.elapsedPct).toBeNull();
    expect(projectTimeline({ startDate: 'x', expectedEndDate: '2026-02-31' }, today).kind).toBe('unscheduled');
  });

  it('is calm about an unreadable today', () => {
    expect(projectTimeline({ startDate: '2026-10-01' }, 'nope').kind).toBe('unscheduled');
  });
});

describe('contractProgress', () => {
  it('has nothing to say without a usable contract value', () => {
    expect(contractProgress(undefined, 100)).toBeNull();
    expect(contractProgress(null, 100)).toBeNull();
    expect(contractProgress(0, 100)).toBeNull();
    expect(contractProgress(-5, 100)).toBeNull();
    expect(contractProgress(Number.NaN, 100)).toBeNull();
  });

  it('shows collected, remaining and the share', () => {
    expect(contractProgress(200000, 50000)).toEqual({
      contractValue: 200000,
      collected: 50000,
      remaining: 150000,
      over: 0,
      pct: 25,
      state: 'partial',
    });
  });

  it('starts at none with 0 percent', () => {
    expect(contractProgress(1000, 0)).toMatchObject({ pct: 0, state: 'none', remaining: 1000 });
  });

  it('never claims 100 percent while something is left, nor 0 once something came in', () => {
    expect(contractProgress(1000, 999.5)).toMatchObject({ pct: 99, state: 'partial', remaining: 0.5 });
    expect(contractProgress(1_000_000, 1)).toMatchObject({ pct: 1, state: 'partial' });
  });

  it('is complete at exactly the contract value, even through float edges', () => {
    expect(contractProgress(112.4, 100.1 + 12.3)).toMatchObject({ pct: 100, state: 'complete', remaining: 0, over: 0 });
  });

  it('reports what was collected beyond the contract', () => {
    expect(contractProgress(1000, 1250.5)).toMatchObject({ pct: 100, state: 'over', remaining: 0, over: 250.5 });
  });

  it('keeps three decimals exactly', () => {
    expect(contractProgress(10.003, 0.001)).toMatchObject({ remaining: 10.002, collected: 0.001 });
  });

  it('treats a negative collected total as nothing collected', () => {
    expect(contractProgress(1000, -50)).toMatchObject({ collected: 0, remaining: 1000, state: 'none' });
  });
});
