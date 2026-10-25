import type { ClientProfitBase, Expense, Invoice, Payment, ProjectPhase, StandaloneDebt } from '../../types';
import { formatCurrencyDisplay } from '../utils-formatters';
import { dayOf, monthName, monthOf, percentOf, shiftMonth } from './clientAnalytics';
import { getInvoicePaymentSummary } from './invoicePayments';
import { budgetState } from './budgetStatus';
import { fromMilli, toMilli } from './money';
import { findOverdueInvoices } from './overdueInvoices';

/**
 * What deserves the owner's attention on a client, as a short ranked list. Every rule is a pure function
 * of the figures the page already holds; the list is deterministic (danger before warning before info,
 * then a fixed rule order), so the same data always reads the same way.
 *
 * Nothing here decides what the viewer may see: the caller passes only groups that are complete for the
 * viewer (a rule whose input is missing simply does not fire).
 */

export type InsightSeverity = 'danger' | 'warning' | 'info';

/** Where tapping an insight should lead; the page routes it (a sheet, a form or the statement). */
export type InsightAction =
  | 'expenses'
  | 'payments'
  | 'debts'
  | 'workers'
  | 'balances'
  | 'phases'
  | 'boq'
  | 'invoices'
  | 'profit'
  | 'statement';

export interface ClientInsight {
  /** Stable rule id, with a suffix when one rule can fire for several records. */
  id: string;
  severity: InsightSeverity;
  title: string;
  /** One sentence with the numbers that justify the title. */
  reason: string;
  action: InsightAction;
}

/** One line of custody the viewer can read (structurally the page's `UserBalanceInfo`). */
export interface InsightCustodyLine {
  name: string;
  given: number;
  spent: number;
  remaining: number;
  /** Whether `spent` is complete for the viewer; an incomplete line never raises an alert. */
  exact: boolean;
}

export interface InsightPhaseRow {
  phase: Pick<ProjectPhase, 'id' | 'name'>;
  budget: number;
  actual: number;
}

/** One category of the estimate against what was spent on it (see `buildCategoryBudgetRows`). */
export interface InsightCategoryRow {
  label: string;
  budget: number;
  actual: number;
  state: 'none' | 'ok' | 'near' | 'over' | 'unbudgeted';
}

export interface InsightInput {
  /** The local day, `YYYY-MM-DD`. */
  today: string;
  /** The account figures (`computeClientAccount` plus the plain totals). */
  totals: {
    expenses: number;
    paid: number;
    clientDeficit: number;
    agreedPercentageDeficit: number;
    profitPercentage: number;
    profitBase: ClientProfitBase;
    /** What workers are still owed; leave out when the viewer does not hold the workers group. */
    workersDue?: number;
  };
  expenses: readonly Pick<Expense, 'id' | 'date' | 'amount' | 'description'>[];
  payments: readonly Payment[];
  debts?: readonly Pick<StandaloneDebt, 'remainingAmount' | 'dueDate'>[];
  phases?: readonly InsightPhaseRow[];
  /** The estimate by category, only when the viewer sees every expense. */
  categories?: readonly InsightCategoryRow[];
  custody?: readonly InsightCustodyLine[];
  invoices?: readonly Invoice[];
}

/* ── Arabic count phrases ─────────────────────────────────────────────── */

interface Forms {
  one: string;
  two: string;
  few: string;
  many: string;
}

/** «فاتورة واحدة»، «فاتورتان»، «5 فواتير»، «12 فاتورة». */
function countWords(n: number, f: Forms): string {
  if (n === 1) return f.one;
  if (n === 2) return f.two;
  return `${n} ${n <= 10 ? f.few : f.many}`;
}

const INVOICES = { one: 'فاتورة واحدة', two: 'فاتورتان', few: 'فواتير', many: 'فاتورة' };
const DEBTS = { one: 'دين واحد', two: 'دينان', few: 'ديون', many: 'ديناً' };

/** «يوم واحد»، «يومان»، «5 أيام»، «30 يوماً». */
export function daysWord(n: number): string {
  return countWords(n, { one: 'يوم واحد', two: 'يومان', few: 'أيام', many: 'يوماً' });
}

/** A money figure in words, rounded to the thousandth the way every amount on the page is. */
const money = (amount: number) => formatCurrencyDisplay(fromMilli(toMilli(amount)));
/** Keeps a figure such as «80.4%» or «INV-7» in reading order inside right-to-left text (a bare «%» would jump to the front). */
const ltr = (text: string) => `\u2066${text}\u2069`;
/** No line break after a hyphen (a word joiner follows it), so «INV-2026-002» never splits across two lines. */
const noBreak = (text: string) => text.replace(/-/g, '-\u2060');
const pct = (n: number) => ltr(`${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`);
const clip = (text: string, max = 36) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** DD/MM/YYYY of a `YYYY-MM-DD` day. */
const showDay = (day: string) => ltr(`${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`);

const UTC_DAY = 86_400_000;
const dayNumber = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) / UTC_DAY;
/** Whole days from `from` to `to` (both `YYYY-MM-DD`). */
const daysBetween = (from: string, to: string) => Math.round(dayNumber(to) - dayNumber(from));
/** The day `n` days after (or before, when negative) a `YYYY-MM-DD` day. */
const addDays = (day: string, n: number) => new Date((dayNumber(day) + n) * UTC_DAY).toISOString().slice(0, 10);

/* ── Rules ─────────────────────────────────────────────────────────────── */

const RANK: Record<InsightSeverity, number> = { danger: 0, warning: 1, info: 2 };

/** Fixed order inside one severity. */
const PRIORITY = [
  'low-collection',
  'expenses-exceed-collections',
  'account-deficit',
  'custody-overdrawn',
  'invoices-overdue',
  'percentage-deficit',
  'phase-over-budget',
  'category-over-budget',
  'phase-near-budget',
  'category-near-budget',
  'custody-depleted',
  'no-recent-payment',
  'debts-overdue',
  'large-expense',
  'invoices-unpaid',
  'workers-due',
];
const priorityOf = (id: string) => {
  const i = PRIORITY.indexOf(id.split(':')[0]);
  return i === -1 ? PRIORITY.length : i;
};

/** Less than half of the spending has come back. */
export const LOW_COLLECTION_PCT = 50;
/** A single expense that makes up this share of a month stands out. */
export const LARGE_EXPENSE_SHARE = 40;
/** Days without a payment before it is worth a mention. */
export const QUIET_PAYMENT_DAYS = 30;

function collectionRules(input: InsightInput, out: ClientInsight[]) {
  const { expenses, paid, clientDeficit } = input.totals;
  const spentMilli = toMilli(expenses);
  const paidMilli = toMilli(paid);

  if (spentMilli > paidMilli) {
    const ratio = percentOf(paid, expenses) ?? 0;
    const gap = fromMilli(spentMilli - paidMilli);
    if (ratio < LOW_COLLECTION_PCT) {
      out.push({
        id: 'low-collection',
        severity: 'danger',
        title: 'التحصيل ضعيف مقارنة بالمصروفات',
        reason:
          paidMilli === 0
            ? `لم يُحصَّل أي مبلغ بعد، والمصروفات ${money(expenses)}.`
            : `حُصّل ${pct(ratio)} فقط من المصروفات: ${money(paid)} من ${money(expenses)}.`,
        action: 'payments',
      });
    } else {
      const withDebts = toMilli(clientDeficit) > toMilli(gap) ? ` ومع الديون يبلغ العجز ${money(clientDeficit)}.` : '.';
      out.push({
        id: 'expenses-exceed-collections',
        severity: 'warning',
        title: 'المصروفات تجاوزت المحصّل',
        reason: `المصروفات ${money(expenses)} والمحصّل ${money(paid)}، والفرق ${money(gap)}${withDebts}`,
        action: 'statement',
      });
    }
    return;
  }

  // Expenses are covered, yet the account is still short (debts or the agreed percentage push it negative).
  if (toMilli(clientDeficit) > 0) {
    out.push({
      id: 'account-deficit',
      severity: 'warning',
      title: 'الرصيد الحالي بالسالب',
      reason: `المصروفات والديون والنسبة المتفق عليها تفوق المحصّل بمقدار ${money(clientDeficit)}.`,
      action: 'statement',
    });
  }
}

function percentageRule(input: InsightInput, out: ClientInsight[]) {
  const { agreedPercentageDeficit, profitPercentage, profitBase } = input.totals;
  if (toMilli(agreedPercentageDeficit) <= 0) return;
  out.push({
    id: 'percentage-deficit',
    severity: 'warning',
    title: `عجز في النسبة المتفق عليها${profitPercentage > 0 ? ` (${pct(profitPercentage)})` : ''}`,
    reason:
      profitBase === 'payments'
        ? `النسبة المستحقة على مبلغ العجز عند تحصيله ${money(agreedPercentageDeficit)}.`
        : `${money(agreedPercentageDeficit)} لم تُغطَّ من النسبة المحتسبة على المصروفات.`,
    action: 'profit',
  });
}

function custodyRules(input: InsightInput, out: ClientInsight[]) {
  const lines = (input.custody ?? []).filter((l) => l.exact && toMilli(l.given) > 0);

  const over = lines.filter((l) => toMilli(l.remaining) < 0).sort((a, b) => toMilli(a.remaining) - toMilli(b.remaining));
  if (over.length === 1) {
    const l = over[0];
    out.push({
      id: 'custody-overdrawn',
      severity: 'danger',
      title: `عهدة ${l.name} تجاوزت رصيدها`,
      reason: `المصروف ${money(l.spent)} أكبر من الممنوح ${money(l.given)} بمقدار ${money(-l.remaining)}.`,
      action: 'balances',
    });
  } else if (over.length > 1) {
    const l = over[0];
    out.push({
      id: 'custody-overdrawn',
      severity: 'danger',
      title: over.length === 2 ? 'عهدتان تجاوزتا رصيدهما' : `${countWords(over.length, { one: 'عهدة', two: 'عهدتان', few: 'عهد', many: 'عهدة' })} تجاوزت رصيدها`,
      reason: `أكبرها عهدة ${l.name} بمقدار ${money(-l.remaining)}.`,
      action: 'balances',
    });
  }

  const empty = lines.filter((l) => toMilli(l.remaining) === 0);
  if (empty.length === 1) {
    const l = empty[0];
    out.push({
      id: 'custody-depleted',
      severity: 'warning',
      title: `نفد رصيد عهدة ${l.name}`,
      reason: `صُرف كامل الممنوح ${money(l.given)} على هذا المشروع.`,
      action: 'balances',
    });
  } else if (empty.length > 1) {
    out.push({
      id: 'custody-depleted',
      severity: 'warning',
      title: `نفد رصيد ${countWords(empty.length, { one: 'عهدة', two: 'عهدتين', few: 'عهد', many: 'عهدة' })}`,
      reason: `${empty.map((l) => l.name).join(' و')} صرفوا كامل ما مُنح لهم على هذا المشروع.`,
      action: 'balances',
    });
  }
}

function phaseRule(input: InsightInput, out: ClientInsight[]) {
  const over = (input.phases ?? [])
    .filter((p) => toMilli(p.budget) > 0 && toMilli(p.actual) > toMilli(p.budget))
    .map((p) => ({ ...p, excess: fromMilli(toMilli(p.actual) - toMilli(p.budget)) }))
    .sort((a, b) => toMilli(b.excess) - toMilli(a.excess));
  if (over.length === 0) return;

  const worst = over[0];
  const worstPct = percentOf(worst.excess, worst.budget) ?? 0;
  const severity: InsightSeverity = worstPct >= 20 ? 'danger' : 'warning';
  if (over.length === 1) {
    out.push({
      id: 'phase-over-budget',
      severity,
      title: `مرحلة ${worst.phase.name} تجاوزت ميزانيتها`,
      reason: `الفعلي ${money(worst.actual)} من ميزانية ${money(worst.budget)}، بزيادة ${money(worst.excess)} (${pct(worstPct)}).`,
      action: 'phases',
    });
  } else {
    out.push({
      id: 'phase-over-budget',
      severity,
      title: over.length === 2 ? 'مرحلتان تجاوزتا ميزانيتهما' : `${countWords(over.length, { one: 'مرحلة', two: 'مرحلتان', few: 'مراحل', many: 'مرحلة' })} تجاوزت ميزانيتها`,
      reason: `الأكبر مرحلة ${worst.phase.name} بزيادة ${money(worst.excess)} (${pct(worstPct)}).`,
      action: 'phases',
    });
  }
}

/** A phase that has used 80% or more of its budget but has not passed it yet: the moment to act. */
function phaseNearRule(input: InsightInput, out: ClientInsight[]) {
  const near = (input.phases ?? []).filter((p) => budgetState(p.budget, p.actual) === 'near');
  if (near.length === 0) return;
  const closest = [...near].sort((a, b) => (percentOf(b.actual, b.budget) ?? 0) - (percentOf(a.actual, a.budget) ?? 0))[0];
  const used = percentOf(closest.actual, closest.budget) ?? 0;
  out.push({
    id: 'phase-near-budget',
    severity: 'warning',
    title:
      near.length === 1
        ? `مرحلة ${closest.phase.name} قاربت ميزانيتها`
        : `${countWords(near.length, { one: 'مرحلة', two: 'مرحلتان', few: 'مراحل', many: 'مرحلة' })} قاربت ميزانيتها`,
    reason: `${near.length === 1 ? 'استُهلك' : 'الأقرب مرحلة ' + closest.phase.name + ': استُهلك'} ${pct(used)} من ${money(closest.budget)}، والمتبقي ${money(fromMilli(toMilli(closest.budget) - toMilli(closest.actual)))}.`,
    action: 'phases',
  });
}

/** The estimate by category (bill of quantities) against the spending on the same categories. */
function categoryRules(input: InsightInput, out: ClientInsight[]) {
  const rows = input.categories ?? [];
  const over = rows
    .filter((r) => r.state === 'over')
    .map((r) => ({ ...r, excess: fromMilli(toMilli(r.actual) - toMilli(r.budget)) }))
    .sort((a, b) => toMilli(b.excess) - toMilli(a.excess));
  if (over.length > 0) {
    const worst = over[0];
    const worstPct = percentOf(worst.excess, worst.budget) ?? 0;
    out.push({
      id: 'category-over-budget',
      severity: worstPct >= 20 ? 'danger' : 'warning',
      title:
        over.length === 1
          ? `بند ${worst.label} تجاوز تقديره`
          : `${countWords(over.length, { one: 'تصنيف', two: 'تصنيفان', few: 'تصنيفات', many: 'تصنيفاً' })} تجاوزت تقديرها`,
      reason: `${over.length === 1 ? '' : 'الأكبر ' + worst.label + ': '}الفعلي ${money(worst.actual)} من تقدير ${money(worst.budget)}، بزيادة ${money(worst.excess)} (${pct(worstPct)}).`,
      action: 'boq',
    });
  }
  const near = rows.filter((r) => r.state === 'near');
  if (near.length > 0) {
    const closest = [...near].sort((a, b) => (percentOf(b.actual, b.budget) ?? 0) - (percentOf(a.actual, a.budget) ?? 0))[0];
    out.push({
      id: 'category-near-budget',
      severity: 'warning',
      title:
        near.length === 1
          ? `بند ${closest.label} قارب تقديره`
          : `${countWords(near.length, { one: 'تصنيف', two: 'تصنيفان', few: 'تصنيفات', many: 'تصنيفاً' })} قاربت تقديرها`,
      reason: `${near.length === 1 ? '' : 'الأقرب ' + closest.label + ': '}استُهلك ${pct(percentOf(closest.actual, closest.budget) ?? 0)} من تقدير ${money(closest.budget)}.`,
      action: 'boq',
    });
  }
}

function sumInWindow(items: readonly { day: string | null; milli: number }[], from: string, to: string): number {
  let total = 0;
  for (const i of items) if (i.day && i.day >= from && i.day <= to) total += i.milli;
  return total;
}

function quietPaymentRule(input: InsightInput, out: ClientInsight[]) {
  const days = input.payments.map((p) => dayOf(p.paymentDate)).filter((d): d is string => !!d && d <= input.today);
  if (days.length === 0 || input.expenses.length === 0) return;
  const last = days.reduce((a, b) => (a > b ? a : b));
  const since = daysBetween(last, input.today);
  if (since < QUIET_PAYMENT_DAYS) return;

  const rows = input.expenses.map((e) => ({ day: dayOf(e.date), milli: toMilli(e.amount) }));
  // The last 30 days (today included) against the 30 days before them.
  const recent = sumInWindow(rows, addDays(input.today, -(QUIET_PAYMENT_DAYS - 1)), input.today);
  const before = sumInWindow(rows, addDays(input.today, -(QUIET_PAYMENT_DAYS * 2 - 1)), addDays(input.today, -QUIET_PAYMENT_DAYS));
  if (recent <= 0 || recent <= before) return;

  out.push({
    id: 'no-recent-payment',
    severity: since >= QUIET_PAYMENT_DAYS * 2 ? 'danger' : 'warning',
    title: `لا دفعات منذ ${daysWord(since)}`,
    reason: `آخر دفعة بتاريخ ${showDay(last)}، والمصروفات في آخر ${QUIET_PAYMENT_DAYS} يوماً ${money(fromMilli(recent))} مقابل ${money(fromMilli(before))} قبلها.`,
    action: 'payments',
  });
}

function largeExpenseRule(input: InsightInput, out: ClientInsight[]) {
  const thisMonth = input.today.slice(0, 7);
  const months = [thisMonth, shiftMonth(thisMonth, -1)];
  for (const month of months) {
    const inMonth = input.expenses.filter((e) => monthOf(e.date) === month && toMilli(e.amount) > 0);
    if (inMonth.length < 3) continue;
    const total = inMonth.reduce((s, e) => s + toMilli(e.amount), 0);
    const top = inMonth.reduce((a, b) => (toMilli(b.amount) > toMilli(a.amount) ? b : a));
    const share = percentOf(top.amount, fromMilli(total)) ?? 0;
    if (share < LARGE_EXPENSE_SHARE) return;
    const when = month === thisMonth ? 'هذا الشهر' : 'الشهر الماضي';
    out.push({
      id: 'large-expense',
      severity: 'info',
      title: `مصروف واحد يشكل ${pct(share)} من مصروفات ${when}`,
      reason: `${clip(top.description || 'مصروف')} بقيمة ${money(top.amount)} من أصل ${money(fromMilli(total))} في ${monthName(month)}.`,
      action: 'expenses',
    });
    return;
  }
}

function workersRule(input: InsightInput, out: ClientInsight[]) {
  const due = input.totals.workersDue;
  if (due === undefined || toMilli(due) <= 0) return;
  out.push({
    id: 'workers-due',
    severity: 'info',
    title: 'مستحقات عمال غير مسددة',
    reason: `المتبقي للعمال ${money(due)} ولم يدخل في حساب العميل بعد.`,
    action: 'workers',
  });
}

function debtsRule(input: InsightInput, out: ClientInsight[]) {
  const late = (input.debts ?? [])
    .map((d) => ({ day: dayOf(d.dueDate), milli: toMilli(d.remainingAmount) }))
    .filter((d): d is { day: string; milli: number } => !!d.day && d.milli > 0 && d.day < input.today);
  if (late.length === 0) return;
  const oldest = late.reduce((a, b) => (b.day < a.day ? b : a));
  const total = late.reduce((s, d) => s + d.milli, 0);
  out.push({
    id: 'debts-overdue',
    severity: 'warning',
    title: 'ديون تجاوزت موعد استحقاقها',
    reason:
      late.length === 1
        ? `المتبقي ${money(fromMilli(total))} وهو متأخر ${daysWord(daysBetween(oldest.day, input.today))}.`
        : `المتبقي ${money(fromMilli(total))} من ${countWords(late.length, DEBTS)}، وأقدمها متأخر ${daysWord(daysBetween(oldest.day, input.today))}.`,
    action: 'debts',
  });
}

/** «فاتورة واحدة متأخرة عن السداد»، «فاتورتان متأخرتان عن السداد»، «5 فواتير متأخرة عن السداد». */
function overdueTitle(n: number): string {
  if (n === 2) return 'فاتورتان متأخرتان عن السداد';
  return `${countWords(n, { one: 'فاتورة واحدة', two: '', few: 'فواتير', many: 'فاتورة' })} متأخرة عن السداد`;
}

function invoiceRules(input: InsightInput, out: ClientInsight[]) {
  const invoices = input.invoices;
  if (!invoices || invoices.length === 0) return;
  const [y, m, d] = input.today.split('-').map(Number);
  const now = new Date(y, m - 1, d);

  const overdue = findOverdueInvoices(invoices, input.payments, true, now).filter((o) => o.inv.status !== 'draft');
  const overdueIds = new Set(overdue.map((o) => o.inv.id));
  if (overdue.length > 0) {
    const oldest = overdue[0];
    const total = overdue.reduce((s, o) => s + toMilli(o.remaining ?? 0), 0);
    out.push({
      id: 'invoices-overdue',
      severity: oldest.days >= 30 ? 'danger' : 'warning',
      title: overdueTitle(overdue.length),
      reason: `المتبقي عليها ${money(fromMilli(total))}، وأقدمها (${ltr(noBreak(oldest.inv.invoiceNumber))}) متأخرة ${daysWord(oldest.days)}.`,
      action: 'invoices',
    });
  }

  const open = invoices
    .filter((inv) => inv.status !== 'draft' && inv.status !== 'cancelled' && !overdueIds.has(inv.id))
    .map((inv) => toMilli(getInvoicePaymentSummary(inv, input.payments as Payment[]).remaining))
    .filter((remaining) => remaining > 0);
  if (open.length > 0) {
    out.push({
      id: 'invoices-unpaid',
      severity: 'info',
      title: 'فواتير بانتظار السداد',
      reason: `${countWords(open.length, INVOICES)} غير مسددة بالكامل، والمتبقي عليها ${money(fromMilli(open.reduce((s, v) => s + v, 0)))}.`,
      action: 'invoices',
    });
  }
}

/** Every observation that applies, most urgent first. */
export function buildClientInsights(input: InsightInput): ClientInsight[] {
  const out: ClientInsight[] = [];
  collectionRules(input, out);
  percentageRule(input, out);
  custodyRules(input, out);
  phaseRule(input, out);
  phaseNearRule(input, out);
  categoryRules(input, out);
  quietPaymentRule(input, out);
  largeExpenseRule(input, out);
  workersRule(input, out);
  debtsRule(input, out);
  invoiceRules(input, out);
  return out.sort((a, b) => RANK[a.severity] - RANK[b.severity] || priorityOf(a.id) - priorityOf(b.id));
}
