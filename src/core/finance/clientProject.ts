import type { ClientStatus } from '../../types';
import { toMilli } from './money';

/**
 * The project side of a client: its status, where it stands against its dates, and how much of the
 * agreed contract value has been collected. All pure; the screens only format what comes out.
 */

export const CLIENT_STATUSES: readonly ClientStatus[] = ['active', 'paused', 'completed'];

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  active: 'نشط',
  paused: 'متوقف',
  completed: 'منتهٍ',
};

/** A client saved before the field existed (or with a value nobody knows) is an active project. */
export function resolveClientStatus(client: { status?: string | null }): ClientStatus {
  return CLIENT_STATUSES.find((s) => s === client.status) ?? 'active';
}

const DAY_MS = 86_400_000;

/**
 * Whole days since 1970-01-01 for a calendar day, so two days can be subtracted without the daylight
 * saving shifts a time-of-day diff would pick up. Accepts `YYYY-MM-DD` (or an ISO date-time, whose
 * date part is used) and a `Date` (its local calendar day). Anything that is not a real date is null.
 */
export function dayNumber(value: string | Date | null | undefined): number | null {
  if (value == null || value === '') return null;
  let y: number, m: number, d: number;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    y = value.getFullYear();
    m = value.getMonth() + 1;
    d = value.getDate();
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return null;
    y = Number(match[1]);
    m = Number(match[2]);
    d = Number(match[3]);
  }
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  // Date.UTC rolls 2026-02-30 over to March: a real day round-trips unchanged.
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return Math.round(ms / DAY_MS);
}

export type ProjectTimelineKind =
  /** Marked finished. */
  | 'completed'
  /** No start and no expected end were entered. */
  | 'unscheduled'
  /** The start date is still ahead. */
  | 'upcoming'
  /** Started (or no start date) and not past the expected end. */
  | 'running'
  /** The expected end is today. */
  | 'due_today'
  /** The expected end has passed and the project is not finished. */
  | 'late';

export interface ProjectTimeline {
  status: ClientStatus;
  kind: ProjectTimelineKind;
  /** Whole days from the start date to today (0 on the start day). Null before the start or without a start date. */
  daysSinceStart: number | null;
  /** Days until the start date (>= 1), only for an upcoming project. */
  daysToStart: number | null;
  /** Days until the expected end (>= 1). Null without an end date, on the day itself, and once late. */
  daysLeft: number | null;
  /** Days past the expected end (>= 1). Never set for a finished project. */
  daysLate: number | null;
  /** Planned length, start to expected end. Null unless both dates are real and the end is not before the start. */
  plannedDays: number | null;
  /** Share of the planned length that has passed, 0 to 100. Null without a positive planned length. */
  elapsedPct: number | null;
}

/**
 * Where the project stands today. Dates are calendar days (`YYYY-MM-DD`); an unreadable date counts as
 * missing. A completed project keeps its planned length but is never "late". A paused one is judged
 * against the same dates (the status badge says it is paused).
 */
export function projectTimeline(
  client: { status?: string | null; startDate?: string | null; expectedEndDate?: string | null },
  today: string | Date = new Date(),
): ProjectTimeline {
  const status = resolveClientStatus(client);
  const now = dayNumber(today);
  const start = dayNumber(client.startDate);
  const end = dayNumber(client.expectedEndDate);

  const plannedDays = start != null && end != null && end >= start ? end - start : null;
  const base: ProjectTimeline = {
    status,
    kind: 'unscheduled',
    daysSinceStart: null,
    daysToStart: null,
    daysLeft: null,
    daysLate: null,
    plannedDays,
    elapsedPct: null,
  };
  if (now == null) return base;

  if (plannedDays != null && plannedDays > 0) {
    base.elapsedPct = Math.min(100, Math.max(0, Math.round(((now - start!) / plannedDays) * 100)));
  }
  if (start != null && now >= start) base.daysSinceStart = now - start;

  if (status === 'completed') return { ...base, kind: 'completed' };
  if (start == null && end == null) return base;

  if (start != null && now < start) return { ...base, kind: 'upcoming', daysToStart: start - now };

  if (end != null) {
    if (now > end) return { ...base, kind: 'late', daysLate: now - end };
    if (now === end) return { ...base, kind: 'due_today' };
    return { ...base, kind: 'running', daysLeft: end - now };
  }
  return { ...base, kind: 'running' };
}

export type ContractState =
  /** Nothing collected yet. */
  | 'none'
  | 'partial'
  /** Collected exactly the contract value. */
  | 'complete'
  /** Collected more than the contract value. */
  | 'over';

export interface ContractProgress {
  contractValue: number;
  collected: number;
  /** Still to collect, never negative. */
  remaining: number;
  /** Collected beyond the contract value, never negative. */
  over: number;
  /** Whole percent collected, 0 to 100. Never 100 while something remains, never 0 once something was collected. */
  pct: number;
  state: ContractState;
}

/**
 * Collected against the agreed contract value, in exact thousandths. Null when there is no usable
 * contract value (empty, zero, negative or not a number): nothing is then claimed about it.
 */
export function contractProgress(contractValue: number | null | undefined, collected: number): ContractProgress | null {
  if (contractValue == null || !Number.isFinite(contractValue)) return null;
  const contractMilli = toMilli(contractValue);
  if (contractMilli <= 0) return null;
  const collectedMilli = Math.max(0, toMilli(collected));

  const remainingMilli = Math.max(0, contractMilli - collectedMilli);
  const overMilli = Math.max(0, collectedMilli - contractMilli);
  const state: ContractState = collectedMilli === 0 ? 'none' : overMilli > 0 ? 'over' : remainingMilli === 0 ? 'complete' : 'partial';

  let pct = Math.round((Math.min(collectedMilli, contractMilli) / contractMilli) * 100);
  if (remainingMilli > 0) pct = Math.min(99, pct);
  if (collectedMilli > 0) pct = Math.max(1, pct);

  return {
    contractValue: contractMilli / 1000,
    collected: collectedMilli / 1000,
    remaining: remainingMilli / 1000,
    over: overMilli / 1000,
    pct,
    state,
  };
}
