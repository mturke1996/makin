import dayjs from 'dayjs';
import { findOverdueInvoices } from '../../core/finance/overdueInvoices';
import { sumMoney, toMilli } from '../../core/finance/money';
import type { MyFundStats } from '../../core/hooks/useMyFundStats';
import { approvalCounts, approvalStatusOf, expensePhrase } from '../../core/finance/expenseApproval';
import { budgetState } from '../../core/finance/budgetStatus';
import { buildPhaseBudgetRows } from '../../core/finance/projectBudget';
import { backupAgeDays, backupDue } from '../../core/backup';
import { buildReceivables } from '../../core/finance/paymentSchedule';
import type { Client, Expense, Invoice, Payment, PaymentMilestone, ProjectPhase } from '../../types';

type Translate = (ar: string, en: string) => string;

export type AttentionKind = 'invoice' | 'debt' | 'custody-deficit' | 'custody-empty' | 'expense-approval' | 'expense-rejected' | 'budget-over' | 'budget-near' | 'schedule-overdue' | 'backup-due';

export interface AttentionItem {
  key: string;
  tone: 'warning' | 'danger';
  kind: AttentionKind;
  title: string;
  subtitle: string;
  /** Money tied to the item (shown at the inline end). Absent when it cannot be told exactly. */
  amount?: number;
  path: string;
}

export type DebtLike = { id: string; partyName: string; status: string; dueDate?: string; remainingAmount: number };

/** Which sources the person may draw from (see `homeGates`). An off source contributes nothing. */
export interface AttentionAllow {
  invoices: boolean;
  /** Payments are held, so "what is left" on an invoice is exact. */
  invoiceAmounts: boolean;
  debts: boolean;
  custody: boolean;
  /** An approver: expenses waiting for a decision. */
  approvals?: boolean;
  /** Anyone who records expenses: their own that were sent back for correction. */
  corrections?: boolean;
  /** Phase budgets against spending: needs the phases AND every expense. */
  budgets?: boolean;
  /** Agreed instalments past their date: needs the payments they are covered by. */
  schedule?: boolean;
  /** The manager: reminded to keep a copy of the data. */
  backup?: boolean;
}

interface BuildArgs {
  invoices: Invoice[];
  payments: Payment[];
  clients: Client[];
  debts: DebtLike[];
  custody: MyFundStats | null;
  /** The expenses this person may list (everyone's or only their own), and who they are. */
  expenses?: Expense[];
  phases?: ProjectPhase[];
  /** The agreed payment schedules of all clients. */
  milestones?: PaymentMilestone[];
  userId?: string;
  /** When a copy was last taken on this device (ISO), if ever; and how many records there are to keep. */
  backupInfo?: { lastAt: string | null; records: number };
  allow: AttentionAllow;
  t: Translate;
  /** For tests; defaults to now. */
  now?: Date;
}

function sinceDays(days: number, t: Translate): string {
  if (days <= 1) return t('منذ يوم', 'since yesterday');
  if (days === 2) return t('منذ يومين', '2 days ago');
  if (days <= 10) return t(`منذ ${days} أيام`, `${days} days ago`);
  return t(`منذ ${days} يوماً`, `${days} days ago`);
}

/**
 * What needs the person today. Same overdue rules as `useSmartAlerts` (unpaid + past due date),
 * plus the signed-in user's own custody state. Each source is read only when the person may open
 * that area, and an amount is quoted only when the data behind it is complete.
 */
export function buildAttentionItems({
  invoices, payments, clients, debts, custody, expenses = [], phases = [], milestones = [], userId, backupInfo, allow, t, now,
}: BuildArgs): AttentionItem[] {
  const items: AttentionItem[] = [];
  const today = dayjs(now).startOf('day');

  if (allow.invoices) {
    const overdue = findOverdueInvoices(invoices, payments, allow.invoiceAmounts, now);

    if (overdue.length === 1) {
      const { inv, remaining, days } = overdue[0];
      const client = clients.find((c) => c.id === inv.clientId)?.name || inv.tempClientName || '';
      items.push({
        key: `inv-${inv.id}`,
        tone: 'warning',
        kind: 'invoice',
        title: client || t(`فاتورة ${inv.invoiceNumber}`, `Invoice ${inv.invoiceNumber}`),
        subtitle: `${t('متأخرة', 'Overdue')} ${sinceDays(days, t)} · ${inv.invoiceNumber}`,
        amount: remaining,
        path: `/invoices/${inv.id}`,
      });
    } else if (overdue.length > 1) {
      const oldest = overdue[0];
      items.push({
        key: 'inv-many',
        tone: 'warning',
        kind: 'invoice',
        title: t(`${overdue.length} فواتير متأخرة`, `${overdue.length} overdue invoices`),
        subtitle: `${t('الأقدم', 'Oldest')} ${sinceDays(oldest.days, t)}`,
        amount: allow.invoiceAmounts ? sumMoney(overdue.map((o) => o.remaining ?? 0)) : undefined,
        path: '/invoices',
      });
    }
  }

  if (allow.schedule && milestones.length > 0) {
    const { late, overdueTotal } = buildReceivables({ clients, payments, milestones, now });
    if (late.length === 1) {
      const row = late[0];
      const first = row.overdue[0];
      items.push({
        key: `schedule-${row.client.id}`,
        tone: row.oldestDays >= 30 ? 'danger' : 'warning',
        kind: 'schedule-overdue',
        title: row.client.name,
        subtitle:
          row.overdue.length === 1
            ? `${t('دفعة', 'Instalment')} «${first.title}» ${t('متأخرة', 'overdue')} ${sinceDays(first.daysLate, t)}`
            : `${t(`${row.overdue.length} دفعات متأخرة`, `${row.overdue.length} instalments overdue`)} · ${t('الأقدم', 'Oldest')} ${sinceDays(first.daysLate, t)}`,
        amount: overdueTotal,
        path: `/clients/${row.client.id}?section=schedule`,
      });
    } else if (late.length > 1) {
      const oldest = late[0];
      items.push({
        key: 'schedule-many',
        tone: oldest.oldestDays >= 30 ? 'danger' : 'warning',
        kind: 'schedule-overdue',
        title: t(`دفعات متأخرة عند ${late.length} عملاء`, `Overdue instalments from ${late.length} clients`),
        subtitle: `${t('الأقدم', 'Oldest')}: ${oldest.client.name} ${sinceDays(oldest.oldestDays, t)}`,
        amount: overdueTotal,
        path: '/receivables',
      });
    }
  }

  if (allow.approvals) {
    const waiting = expenses.filter((e) => approvalStatusOf(e) === 'pending' && !e.isClosed);
    if (waiting.length > 0) {
      const counts = approvalCounts(waiting);
      const oldest = Math.max(...waiting.map((e) => today.diff(dayjs(e.createdAt || e.date).startOf('day'), 'day')));
      items.push({
        key: 'expense-approval',
        tone: 'warning',
        kind: 'expense-approval',
        title: t(`${expensePhrase(waiting.length)} بانتظار الاعتماد`, `${waiting.length} expense${waiting.length === 1 ? '' : 's'} awaiting approval`),
        subtitle: oldest > 0 ? `${t('الأقدم', 'Oldest')} ${sinceDays(oldest, t)}` : t('سُجّلت اليوم', 'Recorded today'),
        amount: counts.pendingAmount,
        path: '/expenses?status=pending',
      });
    }
  }

  if (allow.budgets && phases.length > 0) {
    const rows = clients.flatMap((c) =>
      buildPhaseBudgetRows(phases, expenses, c.id).map((r) => ({ ...r, client: c, state: budgetState(r.budget, r.actual) })),
    );
    const over = rows.filter((r) => r.state === 'over').sort((a, b) => b.actual - b.budget - (a.actual - a.budget));
    const near = rows.filter((r) => r.state === 'near').sort((a, b) => b.actual / b.budget - a.actual / a.budget);
    const sectionPath = (r: (typeof rows)[number]) => `/clients/${r.client.id}?section=phases`;
    if (over.length > 0) {
      const worst = over[0];
      items.push({
        key: 'budget-over',
        tone: 'danger',
        kind: 'budget-over',
        title: over.length === 1 ? t(`مرحلة ${worst.phase.name} تجاوزت ميزانيتها`, `Phase ${worst.phase.name} is over budget`) : t(`${over.length} مراحل تجاوزت ميزانيتها`, `${over.length} phases are over budget`),
        subtitle: over.length === 1 ? worst.client.name : `${t('الأكبر', 'Largest')}: ${worst.client.name} · ${worst.phase.name}`,
        amount: sumMoney(over.map((r) => r.actual - r.budget)),
        path: over.length === 1 ? sectionPath(worst) : '/clients',
      });
    }
    if (near.length > 0) {
      const closest = near[0];
      items.push({
        key: 'budget-near',
        tone: 'warning',
        kind: 'budget-near',
        title: near.length === 1 ? t(`مرحلة ${closest.phase.name} قاربت ميزانيتها`, `Phase ${closest.phase.name} is near its budget`) : t(`${near.length} مراحل قاربت ميزانيتها`, `${near.length} phases are near their budget`),
        subtitle: near.length === 1 ? closest.client.name : `${t('الأقرب', 'Closest')}: ${closest.client.name} · ${closest.phase.name}`,
        path: near.length === 1 ? sectionPath(closest) : '/clients',
      });
    }
  }

  if (allow.corrections && userId) {
    const sentBack = expenses.filter((e) => e.userId === userId && approvalStatusOf(e) === 'rejected' && !e.isClosed);
    if (sentBack.length > 0) {
      const reason = sentBack.length === 1 ? sentBack[0].rejectionReason : undefined;
      items.push({
        key: 'expense-rejected',
        tone: 'danger',
        kind: 'expense-rejected',
        title: t(
          `${expensePhrase(sentBack.length, { one: 'مرفوض', two: 'مرفوضان', few: 'مرفوضة', many: 'مرفوضاً' })} يحتاج تصحيحك`,
          `${sentBack.length} of your expenses ${sentBack.length === 1 ? 'was' : 'were'} sent back`,
        ),
        subtitle: reason || t('عدّل المصروف ليعود إلى المراجعة', 'Fix it and it returns to review'),
        amount: approvalCounts(sentBack).rejected > 0 ? sentBack.reduce((sum, e) => sum + e.amount, 0) : undefined,
        path: '/expenses?status=rejected',
      });
    }
  }

  if (allow.debts) {
    const overdueDebts = debts.filter(
      (d) => d.status !== 'paid' && !!d.dueDate && dayjs(d.dueDate).isBefore(today, 'day'),
    );
    if (overdueDebts.length === 1) {
      const d = overdueDebts[0];
      items.push({
        key: `debt-${d.id}`,
        tone: 'warning',
        kind: 'debt',
        title: d.partyName,
        subtitle: `${t('دين متأخر', 'Overdue debt')} ${sinceDays(today.diff(dayjs(d.dueDate).startOf('day'), 'day'), t)}`,
        amount: d.remainingAmount,
        path: '/debts',
      });
    } else if (overdueDebts.length > 1) {
      items.push({
        key: 'debt-many',
        tone: 'warning',
        kind: 'debt',
        title: t(`${overdueDebts.length} ديون متأخرة`, `${overdueDebts.length} overdue debts`),
        subtitle: t('تجاوزت موعد السداد', 'Past their due date'),
        amount: sumMoney(overdueDebts.map((d) => d.remainingAmount)),
        path: '/debts',
      });
    }
  }

  if (allow.backup && backupInfo && backupDue(backupInfo.lastAt, now ?? new Date(), backupInfo.records)) {
    const age = backupAgeDays(backupInfo.lastAt, now ?? new Date());
    items.push({
      key: 'backup-due',
      tone: 'warning',
      kind: 'backup-due',
      title: t('احتفظ بنسخة احتياطية من البيانات', 'Keep a backup copy of your data'),
      subtitle: age === null ? t('لم تُحمَّل نسخة من هذا الجهاز بعد', 'No copy has been taken on this device yet') : `${t('آخر نسخة', 'Last copy')} ${sinceDays(age, t)}`,
      path: '/settings/backup',
    });
  }

  if (allow.custody && custody && custody.deposited > 0) {
    const remaining = toMilli(custody.remaining);
    if (remaining < 0) {
      items.push({
        key: 'custody-deficit',
        tone: 'danger',
        kind: 'custody-deficit',
        title: t('عجز في عهدتك', 'Your custody is in deficit'),
        subtitle: t('المصروفات تجاوزت العهدة', 'Expenses exceed the custody'),
        amount: custody.remaining,
        path: '/fund',
      });
    } else if (remaining === 0) {
      items.push({
        key: 'custody-empty',
        tone: 'warning',
        kind: 'custody-empty',
        title: t('نفدت عهدتك', 'Your custody is used up'),
        subtitle: t('اطلب إيداعاً جديداً', 'Ask for a new deposit'),
        amount: 0,
        path: '/fund',
      });
    }
  }

  return items;
}
