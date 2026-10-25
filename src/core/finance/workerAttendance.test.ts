import { describe, expect, it } from 'vitest';
import type { WorkerAttendance } from '../../types';
import { attendanceId, attendanceOfDay, buildAttendance, isDay, monthRange, shiftDay, summarizeAttendance, wageView, wagesEarned } from './workerAttendance';

const rec = (workerId: string, date: string, status: WorkerAttendance['status']): WorkerAttendance =>
  ({ id: attendanceId(workerId, date), workerId, clientId: 'c1', date, status, createdAt: '', updatedAt: '' });

describe('attendanceId and isDay', () => {
  it('is one record per worker per day', () => {
    expect(attendanceId('w1', '2026-10-25')).toBe('w1_2026-10-25');
  });
  it('accepts only real days', () => {
    expect(isDay('2026-10-25')).toBe(true);
    expect(isDay('2026-02-30')).toBe(false);
    expect(isDay('25/10/2026')).toBe(false);
  });
});

describe('summarizeAttendance', () => {
  const records = [rec('w1', '2026-10-01', 'present'), rec('w1', '2026-10-02', 'half'), rec('w1', '2026-10-03', 'absent'), rec('w1', '2026-10-04', 'present'), rec('w1', '2026-09-30', 'present')];

  it('counts present as a day and a half-day as half', () => {
    expect(summarizeAttendance(records)).toEqual({ present: 3, half: 1, absent: 1, units: 3.5, marked: 5 });
  });

  it('can be limited to a month', () => {
    expect(summarizeAttendance(records, monthRange('2026-10-15'))).toEqual({ present: 2, half: 1, absent: 1, units: 2.5, marked: 4 });
  });
});

describe('wagesEarned and wageView', () => {
  it('multiplies the daily rate by the days worked, exactly', () => {
    expect(wagesEarned(120, 3.5)).toBe(420);
    expect(wagesEarned(33.333, 3)).toBe(99.999);
    expect(wagesEarned(undefined, 3)).toBe(0);
    expect(wagesEarned(120, 0)).toBe(0);
  });

  it('is only for a worker with a daily rate', () => {
    expect(wageView(undefined, [], 0)).toBeNull();
  });

  it('says what the attendance earned against what was paid', () => {
    const records = [rec('w1', '2026-10-01', 'present'), rec('w1', '2026-10-02', 'present'), rec('w1', '2026-10-03', 'half')];
    expect(wageView(100, records, 100)).toMatchObject({ earned: 250, paid: 100, payableNow: 150, aheadBy: 0 });
    expect(wageView(100, records, 300)).toMatchObject({ payableNow: 0, aheadBy: 50 });
  });
});

describe('attendanceOfDay and shiftDay', () => {
  it('indexes one day by worker', () => {
    const map = attendanceOfDay([rec('w1', '2026-10-01', 'present'), rec('w2', '2026-10-01', 'absent'), rec('w1', '2026-10-02', 'half')], '2026-10-01');
    expect([...map.keys()].sort()).toEqual(['w1', 'w2']);
    expect(map.get('w2')?.status).toBe('absent');
  });
  it('moves across month and year ends', () => {
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('buildAttendance', () => {
  const worker = { id: 'w1', clientId: 'c1' };
  const now = new Date('2026-10-25T09:00:00Z');

  it('builds the record with the fixed id', () => {
    expect(buildAttendance({ worker, day: '2026-10-25', status: 'present', by: 'سالم', now })).toEqual({
      id: 'w1_2026-10-25', workerId: 'w1', clientId: 'c1', date: '2026-10-25', status: 'present',
      createdAt: '2026-10-25T09:00:00.000Z', updatedAt: '2026-10-25T09:00:00.000Z', createdBy: 'سالم',
    });
  });

  it('keeps who first marked the day and when, when it is marked again', () => {
    const first = buildAttendance({ worker, day: '2026-10-25', status: 'present', by: 'سالم', now });
    const again = buildAttendance({ worker, day: '2026-10-25', status: 'half', by: 'منصور', now: new Date('2026-10-25T15:00:00Z'), previous: { ...first, note: 'مغادرة مبكرة' } });
    expect(again).toMatchObject({ status: 'half', createdBy: 'سالم', createdAt: first.createdAt, updatedAt: '2026-10-25T15:00:00.000Z', note: 'مغادرة مبكرة' });
  });
});
