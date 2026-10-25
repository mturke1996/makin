import dayjs from 'dayjs';
import { findOverdueInvoices } from '../../core/finance/overdueInvoices';
import { sumMoney, toMilli } from '../../core/finance/money';
import type { MyFundStats } from '../../core/hooks/useMyFundStats';
import type { Client, Invoice, Payment } from '../../types';

type Translate = (ar: string, en: string) => string;

export type AttentionKind = 'invoice' | 'debt' | 'custody-deficit' | 'custody-empty';

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
}

interface BuildArgs {
  invoices: Invoice[];
  payments: Payment[];
  clients: Client[];
  debts: DebtLike[];
  custody: MyFundStats | null;
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
  invoices, payments, clients, debts, custody, allow, t, now,
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
