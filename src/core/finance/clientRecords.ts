import type { Expense, Payment, StandaloneDebt } from '../../types';
import { fromMilli, toMilli } from './money';

/**
 * Searching, filtering, sorting, grouping and summarising the record lists of a client profile
 * (expenses, payments, debts). Everything here is pure: the screens hand in the records the
 * viewer may see and get back exactly what to show, so a summary can never disagree with the list
 * under it. Sums are integer thousandths (see money.ts), and a total is only ever a total of the
 * records it was given: callers decide whether that is the whole picture or a partial one.
 */

/* ── text ─────────────────────────────────────────────────────────────── */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_INDIC = '۰۱۲۳۴۵۶۷۸۹';
/** Harakat, Quranic marks (every combining mark) and the tatweel: never part of what people type in a search box. */
const MARKS = /\p{M}|ـ/gu;

/**
 * Search text in one canonical form: lowercase, Latin digits, no diacritics, the alef / yeh / teh
 * marbuta spellings folded together (أحمد = احمد, مدرسة = مدرسه) and thousands separators removed
 * from numbers (1,500 = 1500).
 */
export function normalizeSearchText(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EXTENDED_INDIC.indexOf(d)))
    .replace(MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/(\d)[,٬،](?=\d)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Every word of the query must appear somewhere in the fields (order does not matter). The fields come
 * as a function so that an empty search (most of the time) never builds them for hundreds of records.
 */
export function matchesSearch(query: string, fields: () => readonly unknown[]): boolean {
  const tokens = normalizeSearchText(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = fields().map(normalizeSearchText).join(' | ');
  return tokens.every((token) => haystack.includes(token));
}

/** An amount in the forms people search for: 1500, 1,500 and 1500.5. */
export function amountSearchText(amount: number): string {
  const n = fromMilli(toMilli(amount));
  const [whole, fraction] = String(Math.abs(n)).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n} ${n < 0 ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
}

/* ── dates ────────────────────────────────────────────────────────────── */

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})/;
const MS_DAY = 86_400_000;

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const toUtc = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** `YYYY-MM-DD` of a date text (a day or an ISO timestamp), or null when it is not a real date. */
export function dayOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = DAY_RE.exec(value);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${mm}-${dd}`;
}

/** `YYYY-MM` of a date text, or null. */
export function monthOf(value: string | null | undefined): string | null {
  return dayOf(value)?.slice(0, 7) ?? null;
}

/** «15/10/2026» from a date text, with Latin digits whatever the app locale is. Empty when invalid. */
export function formatDayText(value: string | null | undefined): string {
  const day = dayOf(value);
  return day ? `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}` : '';
}

/** A closed period of days; an empty side is open. */
export interface DateRange {
  from: string;
  to: string;
}

export const EMPTY_RANGE: DateRange = { from: '', to: '' };

export const isOpenRange = (range: DateRange): boolean => !range.from && !range.to;

/** Whether a day is inside the range. A range that is open on both sides keeps even records without a date. */
export function inRange(day: string | null, range: DateRange): boolean {
  if (isOpenRange(range)) return true;
  if (!day) return false;
  let { from, to } = range;
  if (from && to && from > to) [from, to] = [to, from];
  return (!from || day >= from) && (!to || day <= to);
}

export type PeriodPreset = 'thisMonth' | 'lastMonth' | 'last30';

/** The days a quick period stands for, relative to `today` (`YYYY-MM-DD`). */
export function presetRange(preset: PeriodPreset, today: string): DateRange {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  if (preset === 'last30') return { from: fromUtc(toUtc(today) - 29 * MS_DAY), to: today };
  const target =
    preset === 'thisMonth' ? { y: year, m: month } : month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const mm = String(target.m).padStart(2, '0');
  return { from: `${target.y}-${mm}-01`, to: `${target.y}-${mm}-${String(daysInMonth(target.y, target.m)).padStart(2, '0')}` };
}

/** The quick period a range is exactly equal to, if any (so its button can show as selected). */
export function matchPreset(range: DateRange, today: string): PeriodPreset | null {
  const presets: PeriodPreset[] = ['thisMonth', 'lastMonth', 'last30'];
  return (
    presets.find((p) => {
      const r = presetRange(p, today);
      return r.from === range.from && r.to === range.to;
    }) ?? null
  );
}

/* ── sort ─────────────────────────────────────────────────────────────── */

export type RecordSort = 'newest' | 'oldest' | 'largest';

/** Days compare as text; a record without a valid day goes last in either direction. */
function compareDay(a: string | null, b: string | null, direction: 1 | -1): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a < b ? -1 : 1) * direction;
}

function compareText(a: string | undefined, b: string | undefined): number {
  const x = a ?? '';
  const y = b ?? '';
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * One comparator for every record type. `newest` / `oldest` order by day, then by when the record was
 * created; `largest` orders by size first, then newest. Ties end on the id so the order never flickers.
 */
export function compareRecords<T extends { id: string; createdAt?: string }>(
  sort: RecordSort,
  dayOfRecord: (item: T) => string | null,
  amountOf: (item: T) => number
): (a: T, b: T) => number {
  const direction = sort === 'oldest' ? 1 : -1;
  return (a, b) => {
    if (sort === 'largest') {
      const bySize = toMilli(amountOf(b)) - toMilli(amountOf(a));
      if (bySize !== 0) return bySize;
    }
    const byDay = compareDay(dayOfRecord(a), dayOfRecord(b), direction);
    if (byDay !== 0) return byDay;
    const byCreated = compareText(a.createdAt, b.createdAt) * direction;
    return byCreated !== 0 ? byCreated : compareText(a.id, b.id);
  };
}

/* ── facets ───────────────────────────────────────────────────────────── */

/** One choice of a filter, with how many records (and how much money) it would leave. */
export interface FacetOption {
  key: string;
  label: string;
  count: number;
  amount: number;
}

export interface FacetEntry {
  key: string;
  label: string;
  milli: number;
  count: number;
}

export function toFacetList(
  entries: Map<string, FacetEntry>,
  selected: readonly string[],
  labelOf: (key: string) => string
): FacetOption[] {
  // A selected choice that currently matches nothing stays listed, so it can still be switched off.
  for (const key of selected) if (!entries.has(key)) entries.set(key, { key, label: labelOf(key), milli: 0, count: 0 });
  return [...entries.values()]
    .sort((a, b) => b.count - a.count || b.milli - a.milli || a.label.localeCompare(b.label, 'ar'))
    .map((e) => ({ key: e.key, label: e.label, count: e.count, amount: fromMilli(e.milli) }));
}

export function addToFacetEntries(entries: Map<string, FacetEntry>, key: string, label: string, amount: number) {
  const entry = entries.get(key);
  if (entry) {
    entry.count += 1;
    entry.milli += toMilli(amount);
  } else {
    entries.set(key, { key, label, count: 1, milli: toMilli(amount) });
  }
}

/* ── shares ───────────────────────────────────────────────────────────── */

/** A slice of a total: what a category, a person or a payment method accounts for. */
export interface ShareRow {
  key: string;
  label: string;
  count: number;
  amount: number;
  /** Whole percent; the percents of one breakdown add up to exactly 100 (largest remainder). */
  percent: number;
}

/** Ranked slices of a total. Slices with nothing in them are dropped. */
export function buildShares(entries: readonly { key: string; label: string; amount: number; count?: number }[]): ShareRow[] {
  const rows = entries
    .map((e) => ({ key: e.key, label: e.label, count: e.count ?? 1, milli: toMilli(e.amount) }))
    .filter((e) => e.milli > 0)
    .sort((a, b) => b.milli - a.milli || a.label.localeCompare(b.label, 'ar'));
  const totalMilli = rows.reduce((s, r) => s + r.milli, 0);
  if (totalMilli <= 0) return [];

  const raw = rows.map((r) => (r.milli * 100) / totalMilli);
  const percents = raw.map(Math.floor);
  let missing = 100 - percents.reduce((s, p) => s + p, 0);
  [...raw.keys()]
    .sort((a, b) => raw[b] - Math.floor(raw[b]) - (raw[a] - Math.floor(raw[a])) || a - b)
    .forEach((i) => {
      if (missing > 0) {
        percents[i] += 1;
        missing -= 1;
      }
    });
  return rows.map((r, i) => ({ key: r.key, label: r.label, count: r.count, amount: fromMilli(r.milli), percent: percents[i] }));
}

/** The first `top` slices as they are and every other one merged into a single «other» slice. */
export function collapseShares(rows: readonly ShareRow[], top: number, otherLabel: string): ShareRow[] {
  if (rows.length <= top) return [...rows];
  const rest = rows.slice(top);
  return [
    ...rows.slice(0, top),
    {
      key: '__other',
      label: otherLabel,
      count: rest.reduce((s, r) => s + r.count, 0),
      amount: fromMilli(rest.reduce((s, r) => s + toMilli(r.amount), 0)),
      percent: rest.reduce((s, r) => s + r.percent, 0),
    },
  ];
}

/* ── groups ───────────────────────────────────────────────────────────── */

export type GroupBy = 'month' | 'day' | 'none';

export interface RecordGroup<T> {
  /** `YYYY-MM`, `YYYY-MM-DD`, `all` or `undated`. */
  key: string;
  kind: 'month' | 'day' | 'all' | 'undated';
  items: T[];
  /** Records in the group, even when `limitGroups` cut some of `items`. */
  count: number;
  /** Exact sum of every record in the group. */
  total: number;
}

/** Groups in the order their first record appears; records without a valid date go in a last group. */
export function groupRecords<T>(
  items: readonly T[],
  dateOf: (item: T) => string | null | undefined,
  amountOf: (item: T) => number,
  by: GroupBy
): RecordGroup<T>[] {
  const groups = new Map<string, { kind: RecordGroup<T>['kind']; items: T[]; milli: number }>();
  const undated: T[] = [];
  for (const item of items) {
    const day = dayOf(dateOf(item));
    if (by !== 'none' && !day) {
      undated.push(item);
      continue;
    }
    const key = by === 'none' ? 'all' : by === 'month' ? day!.slice(0, 7) : day!;
    const group = groups.get(key) ?? { kind: by === 'none' ? 'all' : by, items: [], milli: 0 };
    group.items.push(item);
    group.milli += toMilli(amountOf(item));
    groups.set(key, group);
  }
  const out: RecordGroup<T>[] = [...groups.entries()].map(([key, g]) => ({
    key,
    kind: g.kind,
    items: g.items,
    count: g.items.length,
    total: fromMilli(g.milli),
  }));
  if (undated.length > 0) {
    out.push({
      key: 'undated',
      kind: 'undated',
      items: undated,
      count: undated.length,
      total: fromMilli(undated.reduce((s, i) => s + toMilli(amountOf(i)), 0)),
    });
  }
  return out;
}

/** Keeps the first `maxRows` records across the groups (a group may be cut); totals stay those of the whole group. */
export function limitGroups<T>(
  groups: readonly RecordGroup<T>[],
  maxRows: number
): { groups: RecordGroup<T>[]; shown: number; hidden: number } {
  let left = Math.max(0, maxRows);
  const out: RecordGroup<T>[] = [];
  let shown = 0;
  for (const group of groups) {
    if (left <= 0) break;
    const items = group.items.slice(0, left);
    out.push({ ...group, items });
    left -= items.length;
    shown += items.length;
  }
  const all = groups.reduce((s, g) => s + g.items.length, 0);
  return { groups: out, shown, hidden: all - shown };
}

/* ── expenses ─────────────────────────────────────────────────────────── */

export interface ExpenseQuery {
  search: string;
  /** Category keys; empty keeps every category. */
  categories: readonly string[];
  /** Person keys (see `expensePersonKey`); empty keeps everyone. */
  people: readonly string[];
  range: DateRange;
  sort: RecordSort;
}

export const EMPTY_EXPENSE_QUERY: ExpenseQuery = { search: '', categories: [], people: [], range: EMPTY_RANGE, sort: 'newest' };

export interface ExpenseContext {
  categoryLabel: (category: string) => string;
  /** A name for a person key when the expense itself carries none (the users directory). */
  nameOfUser?: (userId: string) => string | undefined;
  /** An extra condition applied before everything else (the author role filter of the screen). */
  predicate?: (expense: Expense) => boolean;
}

/** The person an expense belongs to: the account id when there is one, otherwise the recorded name. */
export function expensePersonKey(e: Pick<Expense, 'userId' | 'createdBy'>): string {
  if (e.userId) return e.userId;
  const name = e.createdBy?.trim();
  return name ? `name:${name}` : 'unknown';
}

export function expensePersonLabel(e: Pick<Expense, 'userId' | 'createdBy'>, ctx?: Pick<ExpenseContext, 'nameOfUser'>): string {
  return e.createdBy?.trim() || (e.userId ? ctx?.nameOfUser?.(e.userId) : undefined) || 'مستخدم غير معروف';
}

type ExpenseFacetName = 'categories' | 'people';

function expenseMatches(e: Expense, q: ExpenseQuery, ctx: ExpenseContext, skip?: ExpenseFacetName): boolean {
  if (ctx.predicate && !ctx.predicate(e)) return false;
  if (skip !== 'categories' && q.categories.length > 0 && !q.categories.includes(e.category)) return false;
  if (skip !== 'people' && q.people.length > 0 && !q.people.includes(expensePersonKey(e))) return false;
  if (!inRange(dayOf(e.date), q.range)) return false;
  return matchesSearch(q.search, () => [
    e.description,
    e.category,
    ctx.categoryLabel(e.category),
    e.invoiceNumber,
    e.createdBy,
    e.notes,
    e.workerName,
    amountSearchText(e.amount),
    formatDayText(e.date),
  ]);
}

export function sortExpenses(list: readonly Expense[], sort: RecordSort): Expense[] {
  return [...list].sort(
    compareRecords<Expense>(
      sort,
      (e) => dayOf(e.date),
      (e) => e.amount
    )
  );
}

export function filterExpenses(list: readonly Expense[], q: ExpenseQuery, ctx: ExpenseContext): Expense[] {
  return sortExpenses(
    list.filter((e) => expenseMatches(e, q, ctx)),
    q.sort
  );
}

/**
 * The choices of the category and person filters. Each one counts what it would leave given the OTHER
 * filters (so picking it never leads to an empty list by surprise), most used first.
 */
export function expenseFacets(
  list: readonly Expense[],
  q: ExpenseQuery,
  ctx: ExpenseContext
): { categories: FacetOption[]; people: FacetOption[] } {
  const categories = new Map<string, FacetEntry>();
  const people = new Map<string, FacetEntry>();
  for (const e of list) {
    if (expenseMatches(e, q, ctx, 'categories'))
      addToFacetEntries(categories, e.category, ctx.categoryLabel(e.category), e.amount);
    if (expenseMatches(e, q, ctx, 'people')) addToFacetEntries(people, expensePersonKey(e), expensePersonLabel(e, ctx), e.amount);
  }
  return {
    categories: toFacetList(categories, q.categories, ctx.categoryLabel),
    people: toFacetList(people, q.people, (key) =>
      key.startsWith('name:') ? key.slice(5) : (ctx.nameOfUser?.(key) ?? 'مستخدم غير معروف')
    ),
  };
}

/**
 * The running number of each expense on the client: #1 is the one entered first, the newest gets the
 * largest number. It follows when the expense was recorded (then its day), never the filters or the
 * sort, so «مصروف رقم 18» means the same thing on every screen.
 */
export function expenseSerials(list: readonly Pick<Expense, 'id' | 'createdAt' | 'date'>[]): Map<string, number> {
  const time = (value: string | undefined) => Date.parse(value ?? '') || 0;
  const order = [...list].sort(
    (a, b) => time(a.createdAt) - time(b.createdAt) || time(a.date) - time(b.date) || compareText(a.id, b.id)
  );
  return new Map(order.map((e, i) => [e.id, i + 1]));
}

export interface ExpenseSummary {
  count: number;
  total: number;
  byCategory: ShareRow[];
  byPerson: ShareRow[];
}

export function summarizeExpenses(list: readonly Expense[], ctx: ExpenseContext): ExpenseSummary {
  const categories = new Map<string, FacetEntry>();
  const people = new Map<string, FacetEntry>();
  let milli = 0;
  for (const e of list) {
    milli += toMilli(e.amount);
    addToFacetEntries(categories, e.category, ctx.categoryLabel(e.category), e.amount);
    addToFacetEntries(people, expensePersonKey(e), expensePersonLabel(e, ctx), e.amount);
  }
  const rows = (entries: Map<string, FacetEntry>) =>
    buildShares([...entries.values()].map((e) => ({ key: e.key, label: e.label, amount: fromMilli(e.milli), count: e.count })));
  return { count: list.length, total: fromMilli(milli), byCategory: rows(categories), byPerson: rows(people) };
}

/* ── payments ─────────────────────────────────────────────────────────── */

export interface PaymentQuery {
  search: string;
  /** Payment method keys; empty keeps every method. */
  methods: readonly string[];
  /** `YYYY-MM`, or empty for every month. */
  month: string;
  sort: RecordSort;
}

export const EMPTY_PAYMENT_QUERY: PaymentQuery = { search: '', methods: [], month: '', sort: 'newest' };

export interface PaymentContext {
  methodLabel: (method: string) => string;
}

type PaymentFacetName = 'methods' | 'months';

function paymentMatches(p: Payment, q: PaymentQuery, ctx: PaymentContext, skip?: PaymentFacetName): boolean {
  if (skip !== 'methods' && q.methods.length > 0 && !q.methods.includes(p.paymentMethod)) return false;
  if (skip !== 'months' && q.month && monthOf(p.paymentDate) !== q.month) return false;
  return matchesSearch(q.search, () => [
    amountSearchText(p.amount),
    ctx.methodLabel(p.paymentMethod),
    p.paymentMethod,
    p.notes,
    p.createdBy,
    formatDayText(p.paymentDate),
  ]);
}

export function sortPayments(list: readonly Payment[], sort: RecordSort): Payment[] {
  return [...list].sort(
    compareRecords<Payment>(
      sort,
      (p) => dayOf(p.paymentDate),
      (p) => p.amount
    )
  );
}

export function filterPayments(list: readonly Payment[], q: PaymentQuery, ctx: PaymentContext): Payment[] {
  return sortPayments(
    list.filter((p) => paymentMatches(p, q, ctx)),
    q.sort
  );
}

/** Methods and months to filter by; months run newest first and are keyed `YYYY-MM`. */
export function paymentFacets(
  list: readonly Payment[],
  q: PaymentQuery,
  ctx: PaymentContext
): { methods: FacetOption[]; months: FacetOption[] } {
  const methods = new Map<string, FacetEntry>();
  const months = new Map<string, FacetEntry>();
  for (const p of list) {
    if (paymentMatches(p, q, ctx, 'methods'))
      addToFacetEntries(methods, p.paymentMethod, ctx.methodLabel(p.paymentMethod), p.amount);
    const month = monthOf(p.paymentDate);
    if (month && paymentMatches(p, q, ctx, 'months')) addToFacetEntries(months, month, month, p.amount);
  }
  return {
    methods: toFacetList(methods, q.methods, ctx.methodLabel),
    months: toFacetList(months, q.month ? [q.month] : [], (key) => key).sort((a, b) => (a.key < b.key ? 1 : -1)),
  };
}

export interface PaymentSummary {
  count: number;
  total: number;
  byMethod: ShareRow[];
}

export function summarizePayments(list: readonly Payment[], ctx: PaymentContext): PaymentSummary {
  const methods = new Map<string, FacetEntry>();
  let milli = 0;
  for (const p of list) {
    milli += toMilli(p.amount);
    addToFacetEntries(methods, p.paymentMethod, ctx.methodLabel(p.paymentMethod), p.amount);
  }
  return {
    count: list.length,
    total: fromMilli(milli),
    byMethod: buildShares(
      [...methods.values()].map((e) => ({ key: e.key, label: e.label, amount: fromMilli(e.milli), count: e.count }))
    ),
  };
}

/* ── debts ────────────────────────────────────────────────────────────── */

/** Settled when marked paid or nothing is left; the same rule the sheet has always used. */
export const isDebtSettled = (d: Pick<StandaloneDebt, 'status' | 'remainingAmount'>): boolean =>
  d.status === 'paid' || toMilli(d.remainingAmount) <= 0;

export type DebtState = 'settled' | 'overdue' | 'partial' | 'unpaid';

export function debtStateOf(d: Pick<StandaloneDebt, 'status' | 'remainingAmount' | 'paidAmount'>): DebtState {
  if (isDebtSettled(d)) return 'settled';
  if (d.status === 'overdue') return 'overdue';
  return toMilli(d.paidAmount || 0) > 0 ? 'partial' : 'unpaid';
}

/** `open` is everything not settled, overdue included. */
export type DebtStatusFilter = 'all' | 'open' | 'overdue' | 'settled';

export interface DebtQuery {
  search: string;
  status: DebtStatusFilter;
  /** Party keys (see `debtPartyKey`); empty keeps every party. */
  parties: readonly string[];
  sort: RecordSort;
}

export const EMPTY_DEBT_QUERY: DebtQuery = { search: '', status: 'all', parties: [], sort: 'newest' };

export const debtPartyKey = (d: Pick<StandaloneDebt, 'partyId' | 'partyName'>): string =>
  d.partyId || `name:${d.partyName.trim()}`;

type DebtFacetName = 'status' | 'parties';

function debtMatches(d: StandaloneDebt, q: DebtQuery, skip?: DebtFacetName): boolean {
  if (skip !== 'status' && q.status !== 'all') {
    const state = debtStateOf(d);
    if (q.status === 'settled' && state !== 'settled') return false;
    if (q.status === 'open' && state === 'settled') return false;
    if (q.status === 'overdue' && state !== 'overdue') return false;
  }
  if (skip !== 'parties' && q.parties.length > 0 && !q.parties.includes(debtPartyKey(d))) return false;
  return matchesSearch(q.search, () => [
    d.partyName,
    d.description,
    d.notes,
    d.createdBy,
    amountSearchText(d.amount),
    amountSearchText(d.remainingAmount),
    formatDayText(d.date),
    formatDayText(d.dueDate),
  ]);
}

export function sortDebts(list: readonly StandaloneDebt[], sort: RecordSort): StandaloneDebt[] {
  // The largest debt is the one with the most still owed.
  return [...list].sort(
    compareRecords<StandaloneDebt>(
      sort,
      (d) => dayOf(d.date),
      (d) => d.remainingAmount
    )
  );
}

export function filterDebts(list: readonly StandaloneDebt[], q: DebtQuery): StandaloneDebt[] {
  return sortDebts(
    list.filter((d) => debtMatches(d, q)),
    q.sort
  );
}

export function debtFacets(
  list: readonly StandaloneDebt[],
  q: DebtQuery
): { status: Record<DebtStatusFilter, number>; parties: FacetOption[] } {
  const status: Record<DebtStatusFilter, number> = { all: 0, open: 0, overdue: 0, settled: 0 };
  const parties = new Map<string, FacetEntry>();
  for (const d of list) {
    if (debtMatches(d, q, 'status')) {
      const state = debtStateOf(d);
      status.all += 1;
      if (state === 'settled') status.settled += 1;
      else status.open += 1;
      if (state === 'overdue') status.overdue += 1;
    }
    if (debtMatches(d, q, 'parties')) addToFacetEntries(parties, debtPartyKey(d), d.partyName, d.remainingAmount);
  }
  return { status, parties: toFacetList(parties, q.parties, (key) => (key.startsWith('name:') ? key.slice(5) : key)) };
}

/** Open debts first, then settled ones, each keeping the order they came in. */
export function splitDebts(list: readonly StandaloneDebt[]): { open: StandaloneDebt[]; settled: StandaloneDebt[] } {
  return { open: list.filter((d) => !isDebtSettled(d)), settled: list.filter(isDebtSettled) };
}

export interface DebtSummary {
  count: number;
  openCount: number;
  overdueCount: number;
  /** Original value of the debts. */
  value: number;
  paid: number;
  /** Still owed. */
  remaining: number;
  /** Whole percent of the value that is already paid (0 when there is no value). */
  paidPercent: number;
}

export function summarizeDebts(list: readonly StandaloneDebt[]): DebtSummary {
  let value = 0;
  let paid = 0;
  let remaining = 0;
  let openCount = 0;
  let overdueCount = 0;
  for (const d of list) {
    value += toMilli(d.amount);
    paid += toMilli(d.paidAmount || 0);
    remaining += toMilli(d.remainingAmount);
    const state = debtStateOf(d);
    if (state !== 'settled') openCount += 1;
    if (state === 'overdue') overdueCount += 1;
  }
  return {
    count: list.length,
    openCount,
    overdueCount,
    value: fromMilli(value),
    paid: fromMilli(paid),
    remaining: fromMilli(remaining),
    paidPercent: value > 0 ? Math.max(0, Math.min(100, Math.round((paid * 100) / value))) : 0,
  };
}
