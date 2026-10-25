import type { AttendanceStatus, WorkerAttendance } from '../../types';
import { fromMilli, toMilli } from './money';

/**
 * الحضور اليومي للعمال. سجل واحد لكل عامل في اليوم، معرّفه ثابت (workerId_YYYY-MM-DD)، فتسجيل اليوم نفسه
 * مرتين يعدّل السجل ولا يكرره. يوم الحضور = 1، ونصف اليوم = 0.5، والغياب = 0.
 */

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ['present', 'half', 'absent'];

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  half: 'نصف يوم',
  absent: 'غائب',
};

export const attendanceId = (workerId: string, date: string) => `${workerId}_${date}`;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const isDay = (value: string) => DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** كم يوم عمل يساوي الحالة. */
export const ATTENDANCE_UNITS: Record<AttendanceStatus, number> = { present: 1, half: 0.5, absent: 0 };

export interface AttendanceSummary {
  present: number;
  half: number;
  absent: number;
  /** أيام الحضور الفعلية: الحاضر يوم كامل والنصف نصف. */
  units: number;
  /** أيام سُجّل فيها شيء. */
  marked: number;
}

export interface DayRange {
  from?: string;
  to?: string;
}

/** أول اليوم وآخره في الشهر الذي يقع فيه `day`. */
export function monthRange(day: string): Required<DayRange> {
  const ym = day.slice(0, 7);
  return { from: `${ym}-01`, to: `${ym}-31` };
}

export function summarizeAttendance(records: readonly Pick<WorkerAttendance, 'status' | 'date'>[], range: DayRange = {}): AttendanceSummary {
  let present = 0;
  let half = 0;
  let absent = 0;
  for (const r of records) {
    if (range.from && r.date < range.from) continue;
    if (range.to && r.date > range.to) continue;
    if (r.status === 'present') present++;
    else if (r.status === 'half') half++;
    else if (r.status === 'absent') absent++;
  }
  return { present, half, absent, units: present + half * ATTENDANCE_UNITS.half, marked: present + half + absent };
}

/** أجر أيام الحضور: الأجر اليومي × الأيام، بالآلاف الصحيحة. */
export function wagesEarned(dailyRate: number | undefined, units: number): number {
  if (!dailyRate || !(dailyRate > 0) || !(units > 0)) return 0;
  return fromMilli(Math.round((toMilli(dailyRate) * Math.round(units * 2)) / 2));
}

export interface WageView {
  rate: number;
  /** أجر كل أيام الحضور المسجلة. */
  earned: number;
  paid: number;
  /** ما يستحقه الآن: الأجر − المدفوع (0 إن لم يبقَ شيء). */
  payableNow: number;
  /** دُفع أكثر من أجر الحضور. */
  aheadBy: number;
}

/** عامل باليومية: أجر ما حضر مقابل ما قبض. null إن لم يُحدَّد أجر يومي. */
export function wageView(dailyRate: number | undefined, records: readonly Pick<WorkerAttendance, 'status' | 'date'>[], paid: number): WageView | null {
  if (!dailyRate || !(dailyRate > 0)) return null;
  const earned = toMilli(wagesEarned(dailyRate, summarizeAttendance(records).units));
  const paidMilli = toMilli(paid);
  return {
    rate: dailyRate,
    earned: fromMilli(earned),
    paid: fromMilli(paidMilli),
    payableNow: fromMilli(Math.max(0, earned - paidMilli)),
    aheadBy: fromMilli(Math.max(0, paidMilli - earned)),
  };
}

/** سجلات يوم واحد مفهرسة بمعرّف العامل. */
export function attendanceOfDay(records: readonly WorkerAttendance[], day: string): Map<string, WorkerAttendance> {
  return new Map(records.filter((r) => r.date === day).map((r) => [r.workerId, r]));
}

export function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** The record for marking a worker on a day (its id is fixed, so marking again replaces it). */
export function buildAttendance(args: { worker: { id: string; clientId: string }; day: string; status: AttendanceStatus; by: string; now?: Date; previous?: WorkerAttendance }): WorkerAttendance {
  const { worker, day, status, by, previous } = args;
  const iso = (args.now ?? new Date()).toISOString();
  return {
    id: attendanceId(worker.id, day),
    workerId: worker.id,
    clientId: worker.clientId,
    date: day,
    status,
    ...(previous?.note ? { note: previous.note } : {}),
    createdAt: previous?.createdAt ?? iso,
    updatedAt: iso,
    createdBy: previous?.createdBy ?? by,
  };
}
