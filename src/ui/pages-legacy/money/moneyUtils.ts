import dayjs from 'dayjs';
import { sumMoney } from '../../../core/finance/money';

/** Latin digits regardless of the global dayjs locale. */
const en = (value: string | Date) => dayjs(value).locale('en');

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const monthKey = (value: string | Date) => en(value).format('YYYY-MM');

export const monthLabel = (value: string | Date) => {
  const d = en(value);
  return `${MONTHS[d.month()]} ${d.year()}`;
};

export const dayKey = (value: string | Date) => en(value).format('YYYY-MM-DD');

/** «اليوم»، «أمس» أو «الخميس، 15/10/2026». */
export const dayLabel = (value: string | Date) => {
  const d = en(value);
  const today = dayjs().locale('en');
  if (d.isSame(today, 'day')) return 'اليوم';
  if (d.isSame(today.subtract(1, 'day'), 'day')) return 'أمس';
  return `${WEEKDAYS[d.day()]}، ${d.format('DD/MM/YYYY')}`;
};

export const isSameMonthAsToday = (value: string | Date) => en(value).isSame(dayjs(), 'month');

export const isoDay = (value?: string | Date) => en(value ?? new Date()).format('YYYY-MM-DD');

/** Money math in integer thousandths so sums never drift (see core/finance/money). */
export { fromMilli, toMilli } from '../../../core/finance/money';
export const sumAmounts = (values: number[]) => sumMoney(values);

/** Group items by key, keeping the order in which keys first appear. */
export function groupBy<T>(items: T[], keyOf: (item: T) => string): { key: string; items: T[] }[] {
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyOf(item);
    if (!map.has(k)) {
      map.set(k, []);
      order.push(k);
    }
    map.get(k)!.push(item);
  }
  return order.map((key) => ({ key, items: map.get(key)! }));
}

export const matchesQuery = (query: string, ...fields: Array<string | undefined | null>) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => !!f && f.toLowerCase().includes(q));
};

/**
 * The first `limit` rows of grouped rows, in order, cut wherever the limit falls (a group may show only some of its
 * rows). Long ledgers draw a page at a time instead of every row at once, which is what keeps scrolling and
 * typing smooth on an older tablet. `hidden` is how many rows are still waiting.
 */
export function limitGroups<T>(groups: { key: string; items: T[] }[], limit: number): { groups: { key: string; items: T[] }[]; hidden: number } {
  let left = Math.max(0, Math.floor(limit));
  const shown: { key: string; items: T[] }[] = [];
  let total = 0;
  for (const g of groups) {
    total += g.items.length;
    if (left <= 0) continue;
    const items = g.items.length <= left ? g.items : g.items.slice(0, left);
    shown.push(items === g.items ? g : { key: g.key, items });
    left -= items.length;
  }
  const visible = shown.reduce((n, g) => n + g.items.length, 0);
  return { groups: shown, hidden: total - visible };
}
