import type { Expense, Worker, WorkerAgreementItem } from '../../types';

/**
 * دفتر حساب العامل: الاتفاق، الدفعات، المتبقي.
 *
 * دفعة العامل هي مصروف (Expense) يحمل workerId — هكذا تُخصم من العهدة وتدخل في مصروفات
 * العميل. هذه الدوال نقية ولا تقرأ أي مخزن: تأخذ العامل والمصروفات وتعيد أرقاماً دقيقة.
 *
 * كل الجمع والمقارنة يتمّان بالآلاف الصحيحة (1 د.ل = 1000) حتى لا تظهر فروق عائمة
 * مثل 0.1 + 0.2.
 */

import { fromMilli, subtractMoney, sumMoney, toMilli } from './money';
import { agreementForPayment, type AgreementBalanceBasis } from './workerLedgerHistory';
export { fromMilli, subtractMoney, sumMoney, toMilli };

/** إجمالي بند = الكمية × سعر الوحدة، مقرّباً إلى أقرب 0.001. البنود غير الصالحة تساوي صفراً. */
export function agreementLineTotal(item: Pick<WorkerAgreementItem, 'quantity' | 'unitPrice'>): number {
  return fromMilli(lineTotalMilli(item));
}

function lineTotalMilli(item: Pick<WorkerAgreementItem, 'quantity' | 'unitPrice'>): number {
  const q = Number(item.quantity);
  const p = Number(item.unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p < 0) return 0;
  return Math.round((toMilli(q) * toMilli(p)) / 1000);
}

/** مجموع إجماليات بنود الاتفاق بالضبط. */
export function workerAgreementTotal(items: readonly WorkerAgreementItem[] | null | undefined): number {
  if (!items?.length) return 0;
  let total = 0;
  for (const item of items) total += lineTotalMilli(item);
  return fromMilli(total);
}

export type WorkerLedgerStatus = 'not_started' | 'in_progress' | 'settled' | 'overpaid';

export interface WorkerLedgerLine {
  id: string;
  title: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  note?: string;
  /** إجمالي البند. */
  total: number;
  /** نسبة البند من إجمالي الاتفاق (0 إلى 100). */
  share: number;
}

export interface WorkerLedgerPayment {
  id: string;
  expense: Expense;
  amount: number;
  /** تاريخ الدفعة YYYY-MM-DD (يُستبدل بتاريخ الإنشاء إذا غاب). */
  day: string;
  createdAt: string;
  /** الملاحظة بعد التقليم، أو نص فارغ. */
  note: string;
  recordedBy: string;
  /** مجموع المدفوع حتى هذه الدفعة (شاملاً إياها). */
  cumulativePaid: number;
  /** المتبقي بعد هذه الدفعة. سالب = دُفع أكثر من المتفق عليه. */
  remainingAfter: number;
  agreedAtPayment: number;
  balanceBasis: AgreementBalanceBasis;
  /** هل المتبقي بعد هذه الدفعة سالب؟ */
  exceedsAgreed: boolean;
}

export interface WorkerLedgerMonth {
  /** YYYY-MM، أو 'unknown' عند غياب أي تاريخ صالح. */
  key: string;
  year: number;
  /** 1 إلى 12 (0 لغير المعروف). */
  month: number;
  total: number;
  count: number;
  /** الأقدم أولاً. */
  payments: WorkerLedgerPayment[];
}

export interface WorkerLedger {
  workerId: string;
  /** القيمة المتفق عليها المعتمدة: مجموع البنود إن وُجدت، وإلا totalAmount. */
  agreed: number;
  /** totalAmount كما هو محفوظ على العامل. */
  storedAgreed: number;
  /** agreed − storedAgreed. غير صفر إذا خالف المحفوظ مجموع البنود. */
  agreedDrift: number;
  isItemized: boolean;
  lines: WorkerLedgerLine[];
  paid: number;
  /** سالب = دُفع أكثر من المتفق عليه. */
  remaining: number;
  /** مقدار الزيادة عن الاتفاق (0 إن لم يوجد). */
  overpaidBy: number;
  /** نسبة المدفوع من المتفق عليه، محصورة بين 0 و100 وغير مقرّبة. */
  progress: number;
  status: WorkerLedgerStatus;
  /** الدفعات الصالحة، الأقدم أولاً، بتجميع تراكمي. */
  payments: WorkerLedgerPayment[];
  months: WorkerLedgerMonth[];
  paymentCount: number;
  /** سجلات بمبلغ صفر أو سالب أو غير صالح تم تجاهلها. */
  ignoredCount: number;
  firstPaymentDay: string | null;
  lastPaymentDay: string | null;
  averagePayment: number;
  largestPayment: WorkerLedgerPayment | null;
}

const PLAIN_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** يوم محلي YYYY-MM-DD من نص تاريخ (يوم صرف أو طابع زمني). */
function toDay(value: string | undefined | null): string | null {
  if (!value) return null;
  const s = value.trim();
  const plain = PLAIN_DAY.exec(s);
  if (plain) {
    const mm = Number(plain[2]);
    const dd = Number(plain[3]);
    return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 ? s : null;
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function time(value: string | undefined): number {
  const t = value ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

function buildLines(items: readonly WorkerAgreementItem[] | undefined): { lines: WorkerLedgerLine[]; totalMilli: number } {
  const lines: WorkerLedgerLine[] = [];
  let totalMilli = 0;
  for (const item of items ?? []) {
    if (!item) continue;
    const title = (item.title ?? '').trim();
    const totalM = lineTotalMilli(item);
    if (!title && totalM === 0) continue; // سطر فارغ
    totalMilli += totalM;
    lines.push({
      id: item.id,
      title,
      quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0,
      ...(item.unit?.trim() ? { unit: item.unit.trim() } : {}),
      unitPrice: Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : 0,
      ...(item.note?.trim() ? { note: item.note.trim() } : {}),
      total: fromMilli(totalM),
      share: 0,
    });
  }
  if (totalMilli > 0) {
    for (const line of lines) line.share = (toMilli(line.total) / totalMilli) * 100;
  }
  return { lines, totalMilli };
}

/**
 * يبني دفتر عامل واحد.
 * @param expenses كل مصروفات العميل (تُؤخذ منها فقط ما يحمل workerId هذا العامل).
 * @param isVisible اختياري: أي الدفعات يجوز عرضها للمستخدم. الأرصدة (المدفوع، المتبقي، الحالة)
 *   تُحسب دائماً من كل الدفعات حتى لا يُدفع للعامل مرتين لمجرد أن دفعة زميل أو المدير محجوبة عنه،
 *   أما قائمة الدفعات والأشهر والعدّاد والمتوسط فمن المرئية فقط.
 */
export function buildWorkerLedger(
  worker: Worker,
  expenses: readonly Expense[],
  isVisible?: (expense: Expense) => boolean,
): WorkerLedger {
  const storedMilli = Math.max(0, toMilli(worker.totalAmount));
  const { lines, totalMilli: linesMilli } = buildLines(worker.agreementItems);
  const isItemized = linesMilli > 0;
  const agreedMilli = isItemized ? linesMilli : storedMilli;

  // Stable ordering survives a different Firestore snapshot order on another device.
  let ignoredCount = 0;
  const raw: { expense: Expense; milli: number; day: string; created: number; index: number }[] = [];
  expenses.forEach((expense, index) => {
    if (expense.workerId !== worker.id || expense.clientId !== worker.clientId) return;
    const milli = toMilli(expense.amount);
    if (milli <= 0) {
      ignoredCount += 1;
      return;
    }
    raw.push({
      expense,
      milli,
      day: toDay(expense.date) ?? toDay(expense.createdAt) ?? '',
      created: time(expense.createdAt),
      index,
    });
  });
  raw.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.created - b.created || a.expense.id.localeCompare(b.expense.id)));

  let running = 0;
  const payments: WorkerLedgerPayment[] = raw.map((r) => {
    running += r.milli;
    const historic = agreementForPayment(worker, r.expense.createdAt, fromMilli(agreedMilli));
    const remainingMilli = toMilli(historic.agreed) - running;
    return {
      id: r.expense.id,
      expense: r.expense,
      amount: fromMilli(r.milli),
      day: r.day,
      createdAt: r.expense.createdAt,
      note: (r.expense.notes ?? '').trim(),
      recordedBy: (r.expense.createdBy ?? '').trim(),
      cumulativePaid: fromMilli(running),
      remainingAfter: fromMilli(remainingMilli),
      agreedAtPayment: historic.agreed,
      balanceBasis: historic.basis,
      exceedsAgreed: remainingMilli < 0,
    };
  });

  const paidMilli = running;
  const remainingMilli = agreedMilli - paidMilli;
  const shown = isVisible ? payments.filter((p) => isVisible(p.expense)) : payments;
  const shownMilli = shown.reduce((s, p) => s + toMilli(p.amount), 0);

  const monthMap = new Map<string, WorkerLedgerMonth>();
  const monthTotals = new Map<string, number>();
  for (const p of shown) {
    const key = p.day ? p.day.slice(0, 7) : 'unknown';
    let bucket = monthMap.get(key);
    if (!bucket) {
      bucket = {
        key,
        year: p.day ? Number(p.day.slice(0, 4)) : 0,
        month: p.day ? Number(p.day.slice(5, 7)) : 0,
        total: 0,
        count: 0,
        payments: [],
      };
      monthMap.set(key, bucket);
      monthTotals.set(key, 0);
    }
    bucket.count += 1;
    bucket.payments.push(p);
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + toMilli(p.amount));
  }
  const months = [...monthMap.values()];
  for (const m of months) m.total = fromMilli(monthTotals.get(m.key) ?? 0);

  let largest: WorkerLedgerPayment | null = null;
  for (const p of shown) if (!largest || p.amount > largest.amount) largest = p;

  let status: WorkerLedgerStatus;
  if (paidMilli === 0) status = 'not_started';
  else if (remainingMilli < 0) status = 'overpaid';
  else if (remainingMilli === 0) status = 'settled';
  else status = 'in_progress';

  const progress = agreedMilli > 0 ? Math.min(100, (paidMilli / agreedMilli) * 100) : paidMilli > 0 ? 100 : 0;

  return {
    workerId: worker.id,
    agreed: fromMilli(agreedMilli),
    storedAgreed: fromMilli(storedMilli),
    agreedDrift: fromMilli(agreedMilli - storedMilli),
    isItemized,
    lines: isItemized ? lines : [],
    paid: fromMilli(paidMilli),
    remaining: fromMilli(remainingMilli),
    overpaidBy: remainingMilli < 0 ? fromMilli(-remainingMilli) : 0,
    progress,
    status,
    payments: shown,
    months,
    paymentCount: shown.length,
    ignoredCount,
    firstPaymentDay: shown.length ? shown[0].day || null : null,
    lastPaymentDay: shown.length ? shown[shown.length - 1].day || null : null,
    averagePayment: shown.length ? fromMilli(Math.round(shownMilli / shown.length)) : 0,
    largestPayment: largest,
  };
}

/** Group expenses once for client lists and PDF appendices rather than scanning every expense per worker. */
export function buildWorkerLedgers(workers: readonly Worker[], expenses: readonly Expense[], isVisible?: (expense: Expense) => boolean): { worker: Worker; ledger: WorkerLedger }[] {
  const byWorker = new Map<string, Expense[]>();
  for (const expense of expenses) {
    if (!expense.workerId) continue;
    const list = byWorker.get(expense.workerId) ?? [];
    list.push(expense);
    byWorker.set(expense.workerId, list);
  }
  return workers.map((worker) => ({ worker, ledger: buildWorkerLedger(worker, byWorker.get(worker.id) ?? [], isVisible) }));
}

/** النسبة المعروضة (عدد صحيح): لا تصل 100 إلا عند السداد الكامل، ولا تبقى 0 بعد أول دفعة. */
export function displayProgress(ledger: Pick<WorkerLedger, 'progress' | 'status'>): number {
  if (ledger.status === 'settled' || ledger.status === 'overpaid') return 100;
  if (ledger.status === 'not_started') return 0;
  return Math.min(99, Math.max(1, Math.floor(ledger.progress)));
}

export interface WorkerLedgerTotals {
  workerCount: number;
  agreed: number;
  paid: number;
  /** agreed − paid عبر كل العمال (الزيادة عند عامل تخصم من المتبقي عند غيره). */
  remaining: number;
  /** مجموع ما هو مستحق فعلاً (المتبقي الموجب فقط). */
  owed: number;
  /** مجموع الزيادة عن الاتفاق عبر العمال. */
  overpaid: number;
  settledCount: number;
  overpaidCount: number;
}

/** إجماليات عدة عمال بدقة الآلاف. */
export function summarizeWorkerLedgers(ledgers: readonly WorkerLedger[]): WorkerLedgerTotals {
  let agreed = 0;
  let paid = 0;
  let owed = 0;
  let overpaid = 0;
  let settledCount = 0;
  let overpaidCount = 0;
  for (const l of ledgers) {
    const a = toMilli(l.agreed);
    const p = toMilli(l.paid);
    agreed += a;
    paid += p;
    if (a - p > 0) owed += a - p;
    if (l.status === 'overpaid') {
      overpaid += p - a;
      overpaidCount += 1;
    }
    if (l.status === 'settled') settledCount += 1;
  }
  return {
    workerCount: ledgers.length,
    agreed: fromMilli(agreed),
    paid: fromMilli(paid),
    remaining: fromMilli(agreed - paid),
    owed: fromMilli(owed),
    overpaid: fromMilli(overpaid),
    settledCount,
    overpaidCount,
  };
}
