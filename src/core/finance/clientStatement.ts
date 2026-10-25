import type { Expense, Payment, StandaloneDebt } from '../../types';
import { formatAmountDisplay } from '../utils-formatters';
import {
  buildClientActivity,
  dayInRange,
  formatDayDMY,
  type ActivityAccess,
  type ActivityItem,
  type DayRange,
} from './clientActivity';
import { fromMilli, toMilli } from './money';

/**
 * كشف حساب العميل: ما دخل (الدفعات) وما خرج (المصروفات ودفعات العمال) بترتيب زمني، برصيد جارٍ.
 *
 * اصطلاح الإشارة (ثابت في الكود والاختبارات):
 *  - المال الداخل (دفعة مستلمة من العميل) موجب.
 *  - المال الخارج (مصروف أو دفعة عامل) سالب.
 *  - الرصيد = المحصّل ناقص المصروف. موجب = فائض (المحصّل أكبر)، سالب = عجز (المصروف أكبر).
 *  - الرصيد الافتتاحي = صافي كل ما قبل بداية الفترة، فيتصل الكشف بما قبله.
 *  - الرصيد الختامي = الافتتاحي + الداخل - الخارج = الرصيد الجاري لآخر صف.
 *  - الديون تُعرض رقماً منفصلاً في التذييل ولا تدخل الرصيد الجاري.
 *
 * لا يصح عرض الكشف إلا لمن يرى الصورة كاملة (`caps.showSummary`: كل الدفعات وكل المصروفات والديون)،
 * وإلا بدا جزء من الحساب كأنه الحساب كله. الشاشة تحرس ذلك؛ الدوال هنا تحسب فقط.
 */

export interface StatementInput {
  payments: readonly Payment[];
  /** كل مصروفات العميل، ومنها دفعات العمال (مصروف يحمل workerId). */
  expenses: readonly Expense[];
  debts: readonly StandaloneDebt[];
}

export type StatementKind = 'payment' | 'expense' | 'worker';

export interface StatementRow {
  key: string;
  kind: StatementKind;
  /** معرّف السجل الأصلي. */
  id: string;
  day: string;
  sortAt: number;
  title: string;
  detail: string;
  note: string;
  by: string;
  /** موجب للداخل وسالب للخارج. */
  amount: number;
  /** الرصيد بعد هذا الصف: المحصّل ناقص المصروف حتى هنا. */
  balance: number;
}

export interface ClientStatement {
  range: DayRange;
  opening: number;
  /** الأقدم أولاً، داخل الفترة فقط. */
  rows: StatementRow[];
  totalIn: number;
  totalOut: number;
  closing: number;
  inCount: number;
  outCount: number;
  /** المتبقي من الديون اليوم (لا يتبع الفترة، ولا يدخل الرصيد). */
  debtsRemaining: number;
  debtsCount: number;
  /** سجلات بلا أي تاريخ صالح لم تدخل الكشف. */
  skipped: number;
}

const STATEMENT_ACCESS: ActivityAccess = {
  expenseScope: 'all',
  payments: true,
  debts: false,
  workers: false,
  custody: false,
  projects: false,
};

/** المال الداخل أولاً عند التساوي في الوقت. */
const FLOW_ORDER = { in: 0, out: 1, neutral: 2 } as const;

function compareOldestFirst(a: ActivityItem, b: ActivityItem): number {
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  if (a.sortAt !== b.sortAt) return a.sortAt - b.sortAt;
  if (a.flow !== b.flow) return FLOW_ORDER[a.flow] - FLOW_ORDER[b.flow];
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

export function buildClientStatement(input: StatementInput, range: DayRange): ClientStatement {
  const { items, skipped } = buildClientActivity(
    { expenses: input.expenses, payments: input.payments, debts: [], custodies: [], siteReports: [], phases: [] },
    STATEMENT_ACCESS,
  );
  const moves = items.filter((i) => i.amount != null && (i.flow === 'in' || i.flow === 'out')).sort(compareOldestFirst);

  let running = 0;
  let openingMilli = 0;
  let inMilli = 0;
  let outMilli = 0;
  let inCount = 0;
  let outCount = 0;
  const rows: StatementRow[] = [];

  for (const item of moves) {
    const signed = (item.flow === 'in' ? 1 : -1) * toMilli(item.amount ?? 0);
    if (range.from && item.day < range.from) {
      openingMilli += signed;
      running += signed;
      continue;
    }
    if (!dayInRange(item.day, range)) continue;
    running += signed;
    if (item.flow === 'in') {
      inMilli += signed;
      inCount += 1;
    } else {
      outMilli += -signed;
      outCount += 1;
    }
    rows.push({
      key: item.key,
      kind: item.kind as StatementKind,
      id: item.id,
      day: item.day,
      sortAt: item.sortAt,
      title: item.title,
      detail: item.detail,
      note: item.note,
      by: item.by,
      amount: fromMilli(signed),
      balance: fromMilli(running),
    });
  }

  let debtsMilli = 0;
  let debtsCount = 0;
  for (const d of input.debts) {
    const remaining = toMilli(d.remainingAmount);
    if (remaining > 0) {
      debtsMilli += remaining;
      debtsCount += 1;
    }
  }

  return {
    range,
    opening: fromMilli(openingMilli),
    rows,
    totalIn: fromMilli(inMilli),
    totalOut: fromMilli(outMilli),
    closing: fromMilli(openingMilli + inMilli - outMilli),
    inCount,
    outCount,
    debtsRemaining: fromMilli(debtsMilli),
    debtsCount,
    skipped,
  };
}

/* ── Share text ────────────────────────────────────────────────────────── */

/** Keeps a number and its sign in one left-to-right run inside right-to-left chat text. */
const ltr = (text: string) => `\u202A${text}\u202C`;

const CURRENCY = 'د.ل';

const absText = (value: number) => ltr(formatAmountDisplay(Math.abs(value)));
const signedText = (value: number) => ltr(`${value < 0 ? '−' : '+'}${formatAmountDisplay(Math.abs(value))}`);
const balanceText = (value: number) => ltr(`${value < 0 ? '−' : ''}${formatAmountDisplay(Math.abs(value))}`);

function movementsPhrase(n: number): string {
  if (n === 1) return 'حركة واحدة';
  if (n === 2) return 'حركتين';
  return n <= 10 ? `${n} حركات` : `${n} حركة`;
}

function periodText(range: DayRange): string {
  if (range.from && range.to) return `من ${formatDayDMY(range.from)} إلى ${formatDayDMY(range.to)}`;
  if (range.from) return `من ${formatDayDMY(range.from)}`;
  if (range.to) return `حتى ${formatDayDMY(range.to)}`;
  return 'كل الفترات';
}

function balanceLine(label: string, value: number): string {
  const tag = toMilli(value) < 0 ? ' (عجز)' : toMilli(value) > 0 ? ' (فائض)' : '';
  return `${label}: ${absText(value)} ${CURRENCY}${tag}`;
}

/**
 * نص كشف الحساب للمشاركة (واتساب أو الحافظة): اسم العميل، الفترة، المجاميع، الرصيد الختامي، الديون،
 * وآخر `rowLimit` حركة (الأحدث أولاً). نص عادي بلا رموز زخرفية.
 */
export function buildStatementText(options: { clientName: string; statement: ClientStatement; rowLimit?: number }): string {
  const { clientName, statement } = options;
  const rowLimit = Math.max(1, options.rowLimit ?? 10);
  const lines: string[] = [
    `كشف حساب: ${clientName}`,
    `الفترة: ${periodText(statement.range)}`,
    '',
    balanceLine('الرصيد الافتتاحي', statement.opening),
    `المحصّل: ${absText(statement.totalIn)} ${CURRENCY}`,
    `المصروف: ${absText(statement.totalOut)} ${CURRENCY}`,
    balanceLine('الرصيد الختامي', statement.closing),
  ];
  if (statement.debtsCount > 0) {
    lines.push(`الديون المتبقية: ${absText(statement.debtsRemaining)} ${CURRENCY} (منفصلة، لا تدخل في الرصيد)`);
  }

  lines.push('');
  if (statement.rows.length === 0) {
    lines.push('لا توجد حركات في هذه الفترة.');
  } else {
    const shown = statement.rows.slice(-rowLimit).reverse();
    lines.push(statement.rows.length > rowLimit ? `آخر ${movementsPhrase(rowLimit)}:` : 'الحركات:');
    for (const r of shown) {
      lines.push(
        `${formatDayDMY(r.day)}  ${r.title}  ${signedText(r.amount)} ${CURRENCY}  (الرصيد ${balanceText(r.balance)})`,
      );
    }
  }
  return lines.join('\n');
}
