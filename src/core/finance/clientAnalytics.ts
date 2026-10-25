import type { Expense, Payment } from '../../types';
import { expenseCategories, LEGACY_EXPENSE_CATEGORY_LABELS } from '../utils-formatters';
import { fromMilli, toMilli } from './money';

/**
 * Numbers behind the client overview: monthly collected-versus-spent series, change against the previous
 * month, and where the money went (by category and by person). Pure and exact: every sum is made of
 * whole thousandths, and records without a real calendar date are left out of the time series.
 *
 * Sign convention: `collected` (payments received) and `expenses` (money spent) are both positive
 * figures; `net` is always collected minus expenses, so a positive net is money in hand.
 */

export type DatedPayment = Pick<Payment, 'paymentDate' | 'amount'>;
export type DatedExpense = Pick<Expense, 'date' | 'amount'>;

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** `YYYY-MM-DD` of a date text or timestamp, or null when it is not a real calendar day. */
export function dayOf(value: string | undefined | null): string | null {
  const m = typeof value === 'string' ? DAY_RE.exec(value) : null;
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** `YYYY-MM` of a date text or timestamp, or null when it has no real date. */
export function monthOf(value: string | undefined | null): string | null {
  const day = dayOf(value);
  return day ? day.slice(0, 7) : null;
}

/** The local calendar day of a Date as `YYYY-MM-DD`. */
export function localDay(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** The month `delta` months from a `YYYY-MM` key (negative goes back). */
export function shiftMonth(key: string, delta: number): string {
  const m = MONTH_RE.exec(key);
  if (!m) return key;
  const index = Number(m[1]) * 12 + (Number(m[2]) - 1) + delta;
  const year = Math.floor(index / 12);
  return `${String(year).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** `count` consecutive months, oldest first, the last one being `endMonth`. */
export function monthsEnding(endMonth: string, count: number): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => shiftMonth(endMonth, i - (count - 1)));
}

/** «أكتوبر» */
export function monthName(key: string): string {
  const m = MONTH_RE.exec(key);
  return m ? (MONTH_NAMES[Number(m[2]) - 1] ?? key) : key;
}

/** «أكتوبر 2026» */
export function monthTitle(key: string): string {
  const m = MONTH_RE.exec(key);
  return m ? `${monthName(key)} ${m[1]}` : key;
}

/** A percentage to one decimal; null when there is nothing to divide by. */
export function percentOf(part: number, whole: number): number | null {
  const base = toMilli(whole);
  if (base <= 0) return null;
  return Math.round((toMilli(part) / base) * 1000) / 10;
}

/* ── Monthly series ────────────────────────────────────────────────────── */

const collectedMilli = (payments: readonly DatedPayment[]) =>
  payments.map((p) => ({ month: monthOf(p.paymentDate), milli: toMilli(p.amount) }));
const spentMilli = (expenses: readonly DatedExpense[]) =>
  expenses.map((e) => ({ month: monthOf(e.date), milli: toMilli(e.amount) }));

interface MilliRow {
  month: string | null;
  milli: number;
}

function totalsPerMonth(rows: readonly MilliRow[], months: readonly string[]): { perMonth: number[]; before: number } {
  const index = new Map(months.map((m, i) => [m, i]));
  const perMonth = months.map(() => 0);
  let before = 0;
  for (const r of rows) {
    if (!r.month) continue;
    const i = index.get(r.month);
    if (i !== undefined) perMonth[i] += r.milli;
    else if (months.length > 0 && r.month < months[0]) before += r.milli;
  }
  return { perMonth, before };
}

export interface MonthlyFlow {
  /** `YYYY-MM`, oldest first. */
  months: string[];
  collected: number[];
  expenses: number[];
  /** Collected minus expenses in each month. */
  net: number[];
  /** Running totals at the end of each month, counting everything recorded before the first month too. */
  cumulativeCollected: number[];
  cumulativeExpenses: number[];
  /** Collected as a percent of spent, at the end of each month; null while nothing has been spent. */
  ratio: (number | null)[];
}

export function buildMonthlyFlow(input: {
  payments: readonly DatedPayment[];
  expenses: readonly DatedExpense[];
  /** The newest month shown (`YYYY-MM`). */
  endMonth: string;
  months: number;
}): MonthlyFlow {
  const months = monthsEnding(input.endMonth, input.months);
  const c = totalsPerMonth(collectedMilli(input.payments), months);
  const s = totalsPerMonth(spentMilli(input.expenses), months);

  let runC = c.before;
  let runS = s.before;
  const cumulativeCollected: number[] = [];
  const cumulativeExpenses: number[] = [];
  months.forEach((_, i) => {
    runC += c.perMonth[i];
    runS += s.perMonth[i];
    cumulativeCollected.push(fromMilli(runC));
    cumulativeExpenses.push(fromMilli(runS));
  });

  return {
    months,
    collected: c.perMonth.map(fromMilli),
    expenses: s.perMonth.map(fromMilli),
    net: c.perMonth.map((v, i) => fromMilli(v - s.perMonth[i])),
    cumulativeCollected,
    cumulativeExpenses,
    ratio: cumulativeCollected.map((v, i) => percentOf(v, cumulativeExpenses[i])),
  };
}

/* ── Change against the previous month ─────────────────────────────────── */

export interface PeriodChange {
  current: number;
  previous: number;
  /** Percent change against the previous period, one decimal; null when there is nothing to compare with. */
  changePct: number | null;
  direction: 'up' | 'down' | 'flat';
}

export function changeBetween(current: number, previous: number): PeriodChange {
  const cur = toMilli(current);
  const prev = toMilli(previous);
  return {
    current: fromMilli(cur),
    previous: fromMilli(prev),
    changePct: prev === 0 ? null : Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10,
    direction: cur === prev ? 'flat' : cur > prev ? 'up' : 'down',
  };
}

interface DayRow extends MilliRow {
  /** Day of the month (1 to 31); undefined without a real date. */
  day: number | undefined;
}

function dayRows<T>(items: readonly T[], read: (item: T) => string, milliOf: (item: T) => number): DayRow[] {
  return items.map((item) => {
    const day = dayOf(read(item));
    return { month: day ? day.slice(0, 7) : null, day: day ? Number(day.slice(8, 10)) : undefined, milli: milliOf(item) };
  });
}

/** Milli totals of the current month up to `currentCutoff` and of the previous month up to `previousCutoff`. */
function sumMonthToDate(
  rows: readonly DayRow[],
  thisMonth: string,
  lastMonth: string,
  currentCutoff: number,
  previousCutoff: number,
): { current: number; previous: number } {
  let current = 0;
  let previous = 0;
  for (const r of rows) {
    if (!r.month || r.day === undefined) continue;
    if (r.month === thisMonth && r.day <= currentCutoff) current += r.milli;
    else if (r.month === lastMonth && r.day <= previousCutoff) previous += r.milli;
  }
  return { current, previous };
}

export interface OverviewTrend {
  flow: MonthlyFlow;
  /** This month so far against the same days of the previous month. */
  collected: PeriodChange;
  expenses: PeriodChange;
  net: PeriodChange;
  /** Collection ratio now (percent of spent that was collected), at the end of last month, and the change in points. */
  ratio: { now: number | null; before: number | null; deltaPoints: number | null };
  /** The month the comparison is about, and the day of the month it runs to. */
  month: string;
  dayOfMonth: number;
}

/**
 * Everything the KPI row needs. The comparison is like for like: the current month up to today against
 * the previous month up to the same day, so a month that is still running is never set against a full one.
 */
export function buildOverviewTrend(input: {
  payments: readonly DatedPayment[];
  expenses: readonly DatedExpense[];
  /** `YYYY-MM-DD`. */
  today: string;
  months?: number;
}): OverviewTrend {
  const today = dayOf(input.today) ?? localDay();
  const month = today.slice(0, 7);
  const flow = buildMonthlyFlow({ payments: input.payments, expenses: input.expenses, endMonth: month, months: input.months ?? 6 });

  const lastMonth = shiftMonth(month, -1);
  const dayNumber = Number(today.slice(8, 10));
  const previousCutoff = Math.min(dayNumber, daysInMonth(Number(lastMonth.slice(0, 4)), Number(lastMonth.slice(5, 7))));

  const c = sumMonthToDate(dayRows(input.payments, (p) => p.paymentDate, (p) => toMilli(p.amount)), month, lastMonth, dayNumber, previousCutoff);
  const s = sumMonthToDate(dayRows(input.expenses, (e) => e.date, (e) => toMilli(e.amount)), month, lastMonth, dayNumber, previousCutoff);

  const n = flow.months.length;
  const now = n > 0 ? flow.ratio[n - 1] : null;
  const before = n > 1 ? flow.ratio[n - 2] : null;

  return {
    flow,
    collected: changeBetween(fromMilli(c.current), fromMilli(c.previous)),
    expenses: changeBetween(fromMilli(s.current), fromMilli(s.previous)),
    net: changeBetween(fromMilli(c.current - s.current), fromMilli(c.previous - s.previous)),
    ratio: {
      now,
      before,
      deltaPoints: now !== null && before !== null ? Math.round((now - before) * 10) / 10 : null,
    },
    month,
    dayOfMonth: dayNumber,
  };
}

/* ── Where the money went ──────────────────────────────────────────────── */

/**
 * Whole-number percentages that add up to exactly 100 (largest remainder), so a ranked list never
 * reads 33 + 33 + 33. All zeros when the amounts add up to nothing.
 */
export function allocateShares(amounts: readonly number[]): number[] {
  const milli = amounts.map((a) => Math.max(0, toMilli(a)));
  const total = milli.reduce((s, v) => s + v, 0);
  if (total <= 0) return milli.map(() => 0);
  const exact = milli.map((v) => (v * 100) / total);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((s, v) => s + v, 0);
  const order = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem || milli[b.i] - milli[a.i] || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}

export interface ShareRow {
  key: string;
  label: string;
  amount: number;
  count: number;
  /** Whole percent of the total; the rows add up to 100. */
  share: number;
}

export interface Breakdown {
  rows: ShareRow[];
  total: number;
  count: number;
  /** How many groups were folded into the last «أخرى» row (0 when none). */
  folded: number;
}

export const UNKNOWN_CATEGORY = 'تصنيف غير معروف';

/** The Arabic name of an expense category; never a raw key. */
export function categoryLabel(key: string): string {
  return expenseCategories[key] ?? LEGACY_EXPENSE_CATEGORY_LABELS[key] ?? UNKNOWN_CATEGORY;
}

export const REST_KEY = '__rest';
export const REST_LABEL = 'أخرى';

interface Group {
  key: string;
  label: string;
  milli: number;
  count: number;
}

function toBreakdown(groups: Map<string, Group>, topN: number): Breakdown {
  const sorted = [...groups.values()].sort((a, b) => b.milli - a.milli || a.label.localeCompare(b.label, 'ar'));
  const head = sorted.slice(0, topN);
  const tail = sorted.slice(topN);
  // A single leftover group is shown as itself; folding one row into «أخرى» would hide its name for nothing.
  const shown = tail.length === 1 ? [...head, tail[0]] : head;
  const rest = tail.length === 1 ? [] : tail;
  const rows: Group[] = [...shown];
  if (rest.length > 0) {
    rows.push({ key: REST_KEY, label: REST_LABEL, milli: rest.reduce((s, g) => s + g.milli, 0), count: rest.reduce((s, g) => s + g.count, 0) });
  }
  const shares = allocateShares(rows.map((r) => fromMilli(r.milli)));
  const total = sorted.reduce((s, g) => s + g.milli, 0);
  return {
    rows: rows.map((r, i) => ({ key: r.key, label: r.label, amount: fromMilli(r.milli), count: r.count, share: shares[i] })),
    total: fromMilli(total),
    count: sorted.reduce((s, g) => s + g.count, 0),
    folded: rest.length,
  };
}

/** Expenses grouped by category, largest first; categories past `topN` are folded into one «أخرى» row. */
export function breakdownByCategory(
  expenses: readonly Pick<Expense, 'amount' | 'category'>[],
  topN = 5,
): Breakdown {
  const groups = new Map<string, Group>();
  for (const e of expenses) {
    const milli = toMilli(e.amount);
    if (milli <= 0) continue;
    const key = e.category || 'other';
    const g = groups.get(key) ?? { key, label: categoryLabel(key), milli: 0, count: 0 };
    g.milli += milli;
    g.count += 1;
    groups.set(key, g);
  }
  return toBreakdown(groups, topN);
}

export const UNKNOWN_PERSON = 'غير معروف';

/**
 * Expenses grouped by who recorded them. The user id decides; a record that only carries a name joins the
 * group of the same name when some other record ties that name to an id (older records have no id).
 */
export function breakdownByPerson(
  expenses: readonly Pick<Expense, 'amount' | 'userId' | 'createdBy'>[],
  topN = 5,
): Breakdown {
  const idByName = new Map<string, string>();
  for (const e of expenses) {
    const name = e.createdBy?.trim();
    if (e.userId && name && !idByName.has(name)) idByName.set(name, e.userId);
  }

  const groups = new Map<string, Group & { names: Map<string, number> }>();
  for (const e of expenses) {
    const milli = toMilli(e.amount);
    if (milli <= 0) continue;
    const name = e.createdBy?.trim() || '';
    const key = e.userId || (name && idByName.get(name)) || (name ? `name:${name}` : 'unknown');
    const g = groups.get(key) ?? { key, label: UNKNOWN_PERSON, milli: 0, count: 0, names: new Map() };
    g.milli += milli;
    g.count += 1;
    if (name) g.names.set(name, (g.names.get(name) ?? 0) + 1);
    groups.set(key, g);
  }
  // The label is the name used most often on the group's records.
  for (const g of groups.values()) {
    const best = [...g.names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))[0];
    if (best) g.label = best[0];
  }
  return toBreakdown(groups, topN);
}
