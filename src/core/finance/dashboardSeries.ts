import { fromMilli, toMilli } from './money';

/**
 * Numbers for the home dashboard: daily totals over a period, the same period one step earlier, and
 * how they compare. Pure and exact (integer thousandths), so what the cards show always adds up.
 */

export interface Dated {
  /** `YYYY-MM-DD` or an ISO timestamp; only the day part is used. */
  date: string;
  amount: number;
}

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** The calendar day of a date text, or null when it has none. */
export function dayKey(value: string | undefined | null): string | null {
  const m = value ? DAY_RE.exec(value) : null;
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const MS_DAY = 86_400_000;
const toUtc = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** `days` consecutive calendar days, oldest first, the last one being `endDay`. */
export function lastDays(endDay: string, days: number): string[] {
  const end = toUtc(endDay);
  return Array.from({ length: Math.max(0, days) }, (_, i) => fromUtc(end - (days - 1 - i) * MS_DAY));
}

/** The same number of days immediately before `days[0]`. */
export function previousDays(days: readonly string[]): string[] {
  return days.length ? lastDays(fromUtc(toUtc(days[0]) - MS_DAY), days.length) : [];
}

/** Sum per day for the given days. Records outside the days, or without a valid day, are ignored. */
export function dailyTotals(items: readonly Dated[], days: readonly string[]): number[] {
  const index = new Map(days.map((d, i) => [d, i]));
  const milli = days.map(() => 0);
  for (const item of items) {
    const i = index.get(dayKey(item.date) ?? '');
    if (i !== undefined) milli[i] += toMilli(item.amount);
  }
  return milli.map(fromMilli);
}

export const sumOf = (values: readonly number[]): number => fromMilli(values.reduce((s, v) => s + toMilli(v), 0));

export interface PeriodComparison {
  total: number;
  previousTotal: number;
  /** Percent change against the previous period, one decimal; null when there is nothing to compare with. */
  changePct: number | null;
  direction: 'up' | 'down' | 'flat';
}

export function comparePeriods(current: readonly number[], previous: readonly number[]): PeriodComparison {
  const total = sumOf(current);
  const previousTotal = sumOf(previous);
  const changePct = previousTotal === 0 ? null : Math.round(((total - previousTotal) / Math.abs(previousTotal)) * 1000) / 10;
  const direction = toMilli(total) === toMilli(previousTotal) ? 'flat' : total > previousTotal ? 'up' : 'down';
  return { total, previousTotal, changePct, direction };
}

export interface Dashboard {
  days: string[];
  income: number[];
  expense: number[];
  /** income − expense per day */
  net: number[];
  comparison: { income: PeriodComparison; expense: PeriodComparison; net: PeriodComparison };
  /** Average expense per day over the period. */
  dailyAverageExpense: number;
  /** Expenses as a percentage of income over the period; null when there was no income. */
  expenseShareOfIncome: number | null;
  expenseCount: number;
}

export interface DashboardInput {
  /** What came in (payments received). Pass [] when the person may not see them. */
  income: readonly Dated[];
  /** What went out (expenses the person may list). */
  expense: readonly Dated[];
  endDay: string;
  days?: number;
}

export function buildDashboard({ income, expense, endDay, days = 30 }: DashboardInput): Dashboard {
  const current = lastDays(endDay, days);
  const earlier = previousDays(current);

  const incomeNow = dailyTotals(income, current);
  const expenseNow = dailyTotals(expense, current);
  const net = incomeNow.map((v, i) => fromMilli(toMilli(v) - toMilli(expenseNow[i])));
  const netBefore = dailyTotals(income, earlier).map((v, i) => fromMilli(toMilli(v) - toMilli(dailyTotals(expense, earlier)[i])));

  const incomeTotal = sumOf(incomeNow);
  const expenseTotal = sumOf(expenseNow);
  const currentSet = new Set(current);

  return {
    days: current,
    income: incomeNow,
    expense: expenseNow,
    net,
    comparison: {
      income: comparePeriods(incomeNow, dailyTotals(income, earlier)),
      expense: comparePeriods(expenseNow, dailyTotals(expense, earlier)),
      net: comparePeriods(net, netBefore),
    },
    dailyAverageExpense: days > 0 ? fromMilli(Math.round(toMilli(expenseTotal) / days)) : 0,
    expenseShareOfIncome: incomeTotal > 0 ? Math.round((expenseTotal / incomeTotal) * 100) : null,
    expenseCount: expense.filter((e) => currentSet.has(dayKey(e.date) ?? '')).length,
  };
}
