import type { Expense, Payment, ProjectPhase, SiteReport, StandaloneDebt, UserBalance } from '../../types';
import { formatAmountDisplay, formatCurrencyDisplay, getExpenseCategoryLabel } from '../utils-formatters';
import { fromMilli, toMilli } from './money';

/**
 * سجل نشاط العميل: كل ما جرى على المشروع في خط زمني واحد.
 *
 * دوال نقية: تأخذ سجلات العميل كما تحمّلها المتصفح وصلاحيات المشاهد، وتعيد صفوفاً جاهزة للعرض.
 * لا تقرأ أي مخزن. كل جمع بالآلاف الصحيحة (1 د.ل = 1000) فلا تظهر فروق عائمة.
 *
 * الصلاحيات: المتصفح لا يحمّل إلا ما يحق لصاحبه رؤيته (ACCESS.md). هذه الدوال لا تُظهر نوعاً
 * لا يملكه المشاهد حتى لو مُرّر إليها، وتخبر الشاشة بما هو جزئي أو غائب (`activityAvailability`).
 */

export type ActivityKind = 'expense' | 'worker' | 'payment' | 'debt' | 'custody' | 'siteReport' | 'phase';

/** ترتيب الأنواع في الشرائح. */
export const ACTIVITY_KINDS: readonly ActivityKind[] = [
  'expense',
  'worker',
  'payment',
  'debt',
  'custody',
  'siteReport',
  'phase',
];

/** اسم النوع في مفرده (سطر الصف). */
export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  expense: 'مصروف',
  worker: 'دفعة عامل',
  payment: 'دفعة مستلمة',
  debt: 'دين',
  custody: 'عهدة',
  siteReport: 'تقرير موقع',
  phase: 'مرحلة',
};

/** اسم النوع كتصفية (شريحة). */
export const ACTIVITY_KIND_FILTER_LABEL: Record<ActivityKind, string> = {
  expense: 'المصروفات',
  worker: 'دفعات العمال',
  payment: 'المدفوعات',
  debt: 'الديون',
  custody: 'العهد',
  siteReport: 'تقارير الموقع',
  phase: 'المراحل',
};

export const PAYMENT_METHOD_LABELS: Record<Payment['paymentMethod'], string> = {
  cash: 'نقدي',
  bank_transfer: 'تحويل بنكي',
  check: 'شيك',
  credit_card: 'بطاقة',
  mobile_payment: 'دفع إلكتروني',
};

/** ما يملكه المشاهد من بيانات هذا العميل (مجموعة جزئية من `ClientProfileCaps`). */
export interface ActivityAccess {
  /** مصروفات الجميع، أو مصروفاته هو فقط، أو لا شيء. */
  expenseScope: 'all' | 'own' | 'none';
  payments: boolean;
  debts: boolean;
  /** `workers.view`: يرى كل دفعات العمال. */
  workers: boolean;
  /** عهدة من أي نوع. */
  custody: boolean;
  /** المراحل وتقارير الموقع. */
  projects: boolean;
  /** نطاق العهدة: عهدة الجميع أو عهدته هو (الافتراضي: الجميع). */
  custodyScope?: 'all' | 'own';
}

export interface ActivityInput {
  /** مصروفات العميل التي يحق للمشاهد عرضها (كلها أو مصروفاته فقط). */
  expenses: readonly Expense[];
  /**
   * دفعات عمال يراها المشاهد بصلاحية العمال وإن لم تكن في قائمة مصروفاته (مصروفات الآخرين).
   * تُدمج مع `expenses` بلا تكرار.
   */
  workerPayments?: readonly Expense[];
  payments: readonly Payment[];
  debts: readonly StandaloneDebt[];
  /** إيداعات العهدة على هذا العميل. */
  custodies: readonly UserBalance[];
  siteReports: readonly SiteReport[];
  phases: readonly ProjectPhase[];
}

/** اتجاه المبلغ: `in` مال داخل، `out` مال خارج، `neutral` ليس جزءاً من التدفق النقدي. */
export type ActivityFlow = 'in' | 'out' | 'neutral';

export interface ActivityItem {
  /** فريد عبر الأنواع. */
  key: string;
  kind: ActivityKind;
  /** معرّف السجل الأصلي (يفتح به الصف سجله). */
  id: string;
  /** يوم الحدث YYYY-MM-DD. */
  day: string;
  /** وقت الإنشاء بالمللي ثانية (فك التعادل داخل اليوم الواحد). */
  sortAt: number;
  title: string;
  /** سطر ثانٍ قصير (التصنيف، طريقة الدفع...). */
  detail: string;
  note: string;
  by: string;
  /** المبلغ دائماً غير سالب، أو null لسجل بلا مبلغ. */
  amount: number | null;
  flow: ActivityFlow;
  /** للدفعات: معرّف العامل. */
  workerId?: string;
  /** نص البحث الموحّد. */
  searchText: string;
}

/* ── Dates ─────────────────────────────────────────────────────────────── */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]/;

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

function isRealDay(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * اليوم التقويمي لنص تاريخ: `YYYY-MM-DD` يبقى كما هو، والطابع الزمني (ISO) يتحول إلى يوم الجهاز
 * المحلي (كما تفعل بقية الشاشة). نص غير صالح أو تاريخ غير موجود يعيد ''.
 */
export function toDay(value: unknown): string {
  if (typeof value !== 'string') return '';
  const s = value.trim();
  const m = DATE_ONLY.exec(s);
  if (m) return isRealDay(Number(m[1]), Number(m[2]), Number(m[3])) ? s : '';
  if (!TIMESTAMP.test(s)) return '';
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return '';
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

/** يوم السجل: تاريخه، وإلا يوم إنشائه، وإلا ''. */
export function recordDay(date: unknown, createdAt: unknown): string {
  return toDay(date) || toDay(createdAt);
}

/** وقت الإنشاء بالمللي ثانية، أو 0. */
export function createdMillis(createdAt: unknown): number {
  if (typeof createdAt !== 'string') return 0;
  const t = Date.parse(createdAt);
  return Number.isNaN(t) ? 0 : t;
}

/** YYYY-MM-DD → DD/MM/YYYY (أرقام لاتينية). */
export function formatDayDMY(day: string): string {
  const m = DATE_ONLY.exec(day);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : day;
}

const MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

/** `2026-10` → «أكتوبر 2026». */
export function monthTitle(key: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return 'بدون تاريخ';
  return `${MONTH_NAMES[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/* ── Periods ───────────────────────────────────────────────────────────── */

/** حدود مغلقة من الطرفين (YYYY-MM-DD). null = بلا حد. */
export interface DayRange {
  from: string | null;
  to: string | null;
}

export type PeriodKey = 'all' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

const NO_RANGE: DayRange = { from: null, to: null };

/** نطاق أيام فترة جاهزة محسوبة من `today`، أو النطاق المكتوب يدوياً (يُصحَّح إن عُكس). */
export function periodRange(key: PeriodKey, today: string, custom?: { from?: string; to?: string }): DayRange {
  if (key === 'all') return NO_RANGE;
  if (key === 'custom') {
    let from = toDay(custom?.from ?? '') || null;
    let to = toDay(custom?.to ?? '') || null;
    if (from && to && from > to) [from, to] = [to, from];
    return { from, to };
  }
  const m = DATE_ONLY.exec(today);
  if (!m) return NO_RANGE;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (key === 'thisYear') return { from: `${year}-01-01`, to: `${year}-12-31` };
  const target = key === 'lastMonth' ? new Date(Date.UTC(year, month - 2, 1)) : new Date(Date.UTC(year, month - 1, 1));
  const y = target.getUTCFullYear();
  const mo = target.getUTCMonth() + 1;
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return { from: `${y}-${pad(mo)}-01`, to: `${y}-${pad(mo)}-${pad(last)}` };
}

/** هل اليوم داخل النطاق (الطرفان مشمولان)؟ */
export function dayInRange(day: string, range: DayRange): boolean {
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

/** اليوم المحلي YYYY-MM-DD. */
export function todayDay(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/* ── Search ────────────────────────────────────────────────────────────── */

/** توحيد النص للبحث: همزات، تاء مربوطة، ألف مقصورة، تشكيل، أرقام عربية وفارسية. */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/[\u064B-\u065F\u0670\u0640\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function amountSearchTerms(amount: number | null): string {
  if (amount == null) return '';
  return `${amount} ${formatAmountDisplay(amount)}`;
}

function searchTextOf(kind: ActivityKind, day: string, fields: (string | null | undefined)[], amount: number | null): string {
  return normalizeSearch(
    [ACTIVITY_KIND_LABEL[kind], ACTIVITY_KIND_FILTER_LABEL[kind], ...fields, amountSearchTerms(amount), formatDayDMY(day)]
      .filter(Boolean)
      .join(' '),
  );
}

/* ── Building the feed ─────────────────────────────────────────────────── */

const clean = (value: string | undefined | null) => (typeof value === 'string' ? value.trim() : '');

const categoryLabel = getExpenseCategoryLabel;
const money = (value: number) => (Number.isFinite(value) ? fromMilli(toMilli(value)) : 0);

interface Draft {
  kind: ActivityKind;
  id: string;
  /** لاحقة تُميّز أكثر من حدث للسجل نفسه (المرحلة). */
  keySuffix?: string;
  day: string;
  sortAt: number;
  title: string;
  detail?: string;
  note?: string;
  by?: string;
  amount: number | null;
  flow: ActivityFlow;
  workerId?: string;
}

function toItem(d: Draft): ActivityItem {
  const detail = d.detail ?? '';
  const note = d.note ?? '';
  const by = d.by ?? '';
  return {
    key: `${d.kind}:${d.id}${d.keySuffix ? `:${d.keySuffix}` : ''}`,
    kind: d.kind,
    id: d.id,
    day: d.day,
    sortAt: d.sortAt,
    title: d.title,
    detail,
    note,
    by,
    amount: d.amount,
    flow: d.flow,
    workerId: d.workerId,
    searchText: searchTextOf(d.kind, d.day, [d.title, detail, note, by], d.amount),
  };
}

function expenseDraft(e: Expense, day: string): Draft {
  const isWorker = !!e.workerId;
  const base = clean(e.description);
  if (isWorker) {
    return {
      kind: 'worker',
      id: e.id,
      day,
      sortAt: createdMillis(e.createdAt),
      title: base || `دفعة ${clean(e.workerName) || 'عامل'}`,
      // The description usually names the worker already: do not say it twice.
      detail: clean(e.workerName) && !base.includes(clean(e.workerName)) ? clean(e.workerName) : '',
      note: clean(e.notes),
      by: clean(e.createdBy),
      amount: money(e.amount),
      flow: 'out',
      workerId: e.workerId,
    };
  }
  const invoice = clean(e.invoiceNumber);
  return {
    kind: 'expense',
    id: e.id,
    day,
    sortAt: createdMillis(e.createdAt),
    title: base || 'مصروف',
    detail: `${categoryLabel(e.category)}${invoice ? ` · فاتورة ${invoice}` : ''}`,
    note: clean(e.notes),
    by: clean(e.createdBy),
    amount: money(e.amount),
    flow: 'out',
  };
}

/** Keeps "92%" as one left-to-right run inside right-to-left text. */
const ltrIsolate = (text: string) => `\u2066${text}\u2069`;

function reportDetail(r: SiteReport): string {
  const parts: string[] = [];
  if (r.progressPercent != null && Number.isFinite(r.progressPercent)) parts.push(`إنجاز ${ltrIsolate(`${r.progressPercent}%`)}`);
  if (r.workersOnSite) parts.push(`${r.workersOnSite} عامل`);
  return parts.join(' · ');
}

export interface ClientActivity {
  /** الأحدث أولاً. */
  items: ActivityItem[];
  /** سجلات بلا أي تاريخ صالح لم تُدرج. */
  skipped: number;
}

/** كل ما جرى على العميل، الأحدث أولاً، مقتصراً على ما يملكه المشاهد. */
export function buildClientActivity(input: ActivityInput, access: ActivityAccess): ClientActivity {
  const drafts: Draft[] = [];
  let skipped = 0;

  const push = (day: string, make: (day: string) => Draft) => {
    if (!day) {
      skipped += 1;
      return;
    }
    drafts.push(make(day));
  };

  const seenExpenses = new Set<string>();
  const addExpense = (e: Expense) => {
    if (seenExpenses.has(e.id)) return;
    seenExpenses.add(e.id);
    push(recordDay(e.date, e.createdAt), (day) => expenseDraft(e, day));
  };
  if (access.expenseScope !== 'none') input.expenses.forEach(addExpense);
  if (access.workers) input.workerPayments?.forEach((e) => e.workerId && addExpense(e));

  if (access.payments) {
    for (const p of input.payments) {
      push(recordDay(p.paymentDate, p.createdAt), (day) => ({
        kind: 'payment',
        id: p.id,
        day,
        sortAt: createdMillis(p.createdAt),
        title: ACTIVITY_KIND_LABEL.payment,
        detail: PAYMENT_METHOD_LABELS[p.paymentMethod] ?? clean(p.paymentMethod),
        note: clean(p.notes),
        by: clean(p.createdBy),
        amount: money(p.amount),
        flow: 'in',
      }));
    }
  }

  if (access.debts) {
    for (const d of input.debts) {
      push(recordDay(d.date, d.createdAt), (day) => ({
        kind: 'debt',
        id: d.id,
        day,
        sortAt: createdMillis(d.createdAt),
        title: clean(d.description) || clean(d.partyName) || 'دين',
        detail: d.remainingAmount > 0 ? `المتبقي ${formatCurrencyDisplay(money(d.remainingAmount))}` : 'مسدد بالكامل',
        note: clean(d.notes),
        by: clean(d.createdBy),
        amount: money(d.amount),
        flow: 'neutral',
      }));
    }
  }

  if (access.custody) {
    for (const b of input.custodies) {
      push(recordDay(b.date, b.createdAt), (day) => ({
        kind: 'custody',
        id: b.id,
        day,
        sortAt: createdMillis(b.createdAt),
        title: `عهدة ${clean(b.userName) || 'موظف'}`,
        note: clean(b.notes),
        by: clean(b.createdBy),
        amount: money(b.amount),
        flow: 'neutral',
      }));
    }
  }

  if (access.projects) {
    for (const r of input.siteReports) {
      push(recordDay(r.reportDate, r.createdAt), (day) => ({
        kind: 'siteReport',
        id: r.id,
        day,
        sortAt: createdMillis(r.createdAt),
        title: clean(r.title) || 'تقرير موقع',
        detail: reportDetail(r),
        note: clean(r.workCompleted),
        by: clean(r.createdBy),
        amount: null,
        flow: 'neutral',
      }));
    }

    // Phases have no event log: an event exists only where a real date and state say it happened.
    for (const ph of input.phases) {
      const name = clean(ph.name) || 'بدون اسم';
      const budget = ph.budgetAmount && ph.budgetAmount > 0 ? `الميزانية ${formatCurrencyDisplay(money(ph.budgetAmount))}` : '';
      const start = toDay(ph.startDate);
      if (start && ph.status !== 'planned') {
        drafts.push({
          kind: 'phase',
          id: ph.id,
          keySuffix: 'start',
          day: start,
          sortAt: 0,
          title: `بدأت مرحلة ${name}`,
          detail: budget,
          note: clean(ph.notes),
          by: clean(ph.createdBy),
          amount: null,
          flow: 'neutral',
        });
      }
      const end = toDay(ph.endDate);
      if (end && ph.status === 'completed') {
        drafts.push({
          kind: 'phase',
          id: ph.id,
          keySuffix: 'end',
          day: end,
          sortAt: 0,
          title: `اكتملت مرحلة ${name}`,
          detail: budget,
          note: '',
          by: clean(ph.createdBy),
          amount: null,
          flow: 'neutral',
        });
      }
    }
  }

  const items = drafts.map(toItem).sort(compareNewestFirst);
  return { items, skipped };
}

function compareNewestFirst(a: ActivityItem, b: ActivityItem): number {
  if (a.day !== b.day) return a.day < b.day ? 1 : -1;
  if (a.sortAt !== b.sortAt) return b.sortAt - a.sortAt;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/* ── Filtering and grouping ────────────────────────────────────────────── */

export interface ActivityFilter {
  /** فارغ = كل الأنواع. */
  kinds: readonly ActivityKind[];
  range: DayRange;
  query: string;
}

export function filterActivity(items: readonly ActivityItem[], filter: ActivityFilter): ActivityItem[] {
  const kinds = filter.kinds.length > 0 ? new Set(filter.kinds) : null;
  const tokens = normalizeSearch(filter.query).split(' ').filter(Boolean);
  return items.filter((item) => {
    if (kinds && !kinds.has(item.kind)) return false;
    if (!dayInRange(item.day, filter.range)) return false;
    return tokens.every((t) => item.searchText.includes(t));
  });
}

export type KindCounts = Record<ActivityKind | 'all', number>;

export function countByKind(items: readonly ActivityItem[]): KindCounts {
  const counts: KindCounts = { all: items.length, expense: 0, worker: 0, payment: 0, debt: 0, custody: 0, siteReport: 0, phase: 0 };
  for (const item of items) counts[item.kind] += 1;
  return counts;
}

export interface ActivityMonth {
  /** YYYY-MM */
  key: string;
  items: ActivityItem[];
  /** مجموع الدفعات المستلمة. */
  in: number;
  /** مجموع المصروفات ودفعات العمال. */
  out: number;
  /** in - out (العهد والديون ليست جزءاً منه). */
  net: number;
}

/** تجميع بالشهر بترتيب ظهور الشهور في القائمة (الأحدث أولاً)، مع مجاميع دقيقة. */
export function groupActivityByMonth(items: readonly ActivityItem[]): ActivityMonth[] {
  const groups = new Map<string, { items: ActivityItem[]; inMilli: number; outMilli: number }>();
  for (const item of items) {
    const key = item.day.slice(0, 7);
    let g = groups.get(key);
    if (!g) {
      g = { items: [], inMilli: 0, outMilli: 0 };
      groups.set(key, g);
    }
    g.items.push(item);
    if (item.amount != null) {
      if (item.flow === 'in') g.inMilli += toMilli(item.amount);
      else if (item.flow === 'out') g.outMilli += toMilli(item.amount);
    }
  }
  return [...groups.entries()].map(([key, g]) => ({
    key,
    items: g.items,
    in: fromMilli(g.inMilli),
    out: fromMilli(g.outMilli),
    net: fromMilli(g.inMilli - g.outMilli),
  }));
}

/* ── What the viewer holds ─────────────────────────────────────────────── */

export interface ActivityAvailability {
  /** الأنواع التي يملكها المشاهد فعلاً، بترتيب العرض. */
  kinds: ActivityKind[];
  /** جمل تقول ما هو جزئي أو غائب، فلا يُحذف شيء بصمت. */
  notes: string[];
  /**
   * هل الصافي (المحصّل ناقص المصروف) حقيقي؟ فقط عند رؤية كل الدفعات وكل المصروفات.
   * غير ذلك تعرض الشاشة كل رقم على حدة بوصفه ما يراه المشاهد.
   */
  netComplete: boolean;
}

export function activityAvailability(access: ActivityAccess): ActivityAvailability {
  const hasExpenses = access.expenseScope !== 'none';
  const kinds = ACTIVITY_KINDS.filter((k) => {
    switch (k) {
      case 'expense':
        return hasExpenses;
      case 'worker':
        return hasExpenses || access.workers;
      case 'payment':
        return access.payments;
      case 'debt':
        return access.debts;
      case 'custody':
        return access.custody;
      case 'siteReport':
      case 'phase':
        return access.projects;
    }
  });

  const notes: string[] = [];
  if (access.expenseScope === 'own') notes.push('لا تظهر مصروفات الآخرين، فقط ما سجّلته أنت.');
  if (access.custody && access.custodyScope === 'own') notes.push('تظهر عهدتك أنت فقط.');

  const missing: string[] = [];
  if (!hasExpenses) missing.push('المصروفات');
  if (!hasExpenses && !access.workers) missing.push('دفعات العمال');
  if (!access.payments) missing.push('المدفوعات');
  if (!access.debts) missing.push('الديون');
  if (!access.custody) missing.push('العهد');
  if (!access.projects) missing.push('تقارير الموقع والمراحل');
  if (missing.length > 0) notes.push(`غير مضمّنة لأن صلاحياتك لا تشملها: ${missing.join('، ')}.`);

  return { kinds, notes, netComplete: access.payments && access.expenseScope === 'all' };
}
