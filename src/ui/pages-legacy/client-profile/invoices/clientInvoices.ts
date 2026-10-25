import type { Invoice, Payment } from '../../../../types';
import { deriveInvoiceStatus, getInvoicePaymentSummary } from '../../../../core/finance/invoicePayments';
import { fromMilli, sumMoney, toMilli } from '../../../../core/finance/money';
import { findOverdueInvoices } from '../../../../core/finance/overdueInvoices';

export type InvoiceStatus = Invoice['status'];

export interface ClientInvoiceRow {
  invoice: Invoice;
  /** What the badge says: derived from the payments when they are available, the stored status otherwise. */
  status: InvoiceStatus;
  /** Collected on this invoice. Null when the viewer does not hold the payments: nothing is claimed then. */
  paid: number | null;
  /** Still to collect (never negative). Null without the payments. */
  remaining: number | null;
  /** Whole percent collected, 0 to 100. Null without the payments. */
  progressPct: number | null;
  /** Days past the due date for an overdue invoice, else 0. */
  daysOverdue: number;
}

export interface ClientInvoiceTotals {
  /** Invoices that count (everything except cancelled ones). */
  count: number;
  cancelledCount: number;
  overdueCount: number;
  /** Sum of the totals of the counted invoices. */
  invoiced: number;
  /** The next three are null when the payments are not held. */
  paid: number | null;
  remaining: number | null;
  /** The part of `remaining` that is past due. */
  overdueRemaining: number | null;
  /** Payments of the client that point at no invoice of theirs (recorded straight on the account). */
  unlinked: number | null;
}

export interface ClientInvoicesView {
  rows: ClientInvoiceRow[];
  totals: ClientInvoiceTotals;
}

/** Where an invoice sits in the list: what needs chasing first, finished business last. */
const RANK: Record<InvoiceStatus, number> = {
  overdue: 0,
  partially_paid: 1,
  sent: 2,
  draft: 3,
  paid: 4,
  cancelled: 5,
};

/** This client's invoices, newest first (the order the screens store them in). */
export function selectClientInvoices(invoices: readonly Invoice[], clientId: string | undefined): Invoice[] {
  if (!clientId) return [];
  return invoices
    .filter((inv) => inv.clientId === clientId)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.createdAt.localeCompare(a.createdAt));
}

/**
 * One row per invoice plus the header totals.
 *
 *  - A cancelled invoice stays in the list but is left out of every total.
 *  - An invoice is overdue when it is past its due date and not settled (the rule of the overdue list on
 *    the dashboard, `findOverdueInvoices`); a draft was never sent, so it is not.
 *  - `paymentsKnown` says whether `payments` is the client's complete payments (`payments.view`). Without
 *    it the stored status is all there is, and no collected or remaining figure is made up.
 *  - Order: overdue (the longest first), partly paid, sent, draft (all by due date, soonest first),
 *    then paid and cancelled (newest first).
 */
export function buildClientInvoices(input: {
  invoices: readonly Invoice[];
  payments: readonly Payment[];
  paymentsKnown: boolean;
  today?: Date;
}): ClientInvoicesView {
  const { invoices, payments, paymentsKnown, today } = input;

  const overdue = new Map(
    findOverdueInvoices(
      invoices.filter((inv) => inv.status !== 'draft'),
      payments,
      paymentsKnown,
      today,
    ).map((o) => [o.inv.id, o.days]),
  );

  const rows: ClientInvoiceRow[] = invoices.map((invoice) => {
    const summary = paymentsKnown ? getInvoicePaymentSummary(invoice, payments as Payment[]) : null;
    let status: InvoiceStatus;
    if (invoice.status === 'cancelled') status = 'cancelled';
    else if (overdue.has(invoice.id)) status = 'overdue';
    else if (summary) status = deriveInvoiceStatus(invoice, summary.paid);
    else status = invoice.status === 'overdue' ? 'sent' : invoice.status;
    return {
      invoice,
      status,
      paid: summary ? summary.paid : null,
      remaining: summary ? summary.remaining : null,
      progressPct: summary ? summary.progressPct : null,
      daysOverdue: status === 'overdue' ? (overdue.get(invoice.id) ?? 0) : 0,
    };
  });

  rows.sort((a, b) => {
    if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
    if (a.status === 'overdue') return b.daysOverdue - a.daysOverdue;
    if (a.status === 'partially_paid' || a.status === 'sent' || a.status === 'draft') {
      return a.invoice.dueDate.localeCompare(b.invoice.dueDate) || b.invoice.issueDate.localeCompare(a.invoice.issueDate);
    }
    return b.invoice.issueDate.localeCompare(a.invoice.issueDate) || b.invoice.createdAt.localeCompare(a.invoice.createdAt);
  });

  const counted = rows.filter((r) => r.status !== 'cancelled');
  const overdueRows = counted.filter((r) => r.status === 'overdue');
  const invoiceIds = new Set(invoices.map((i) => i.id));
  const milli = (values: (number | null)[]) => fromMilli(values.reduce<number>((sum, v) => sum + toMilli(v ?? 0), 0));

  return {
    rows,
    totals: {
      count: counted.length,
      cancelledCount: rows.length - counted.length,
      overdueCount: overdueRows.length,
      invoiced: sumMoney(counted.map((r) => r.invoice.total)),
      paid: paymentsKnown ? milli(counted.map((r) => r.paid)) : null,
      remaining: paymentsKnown ? milli(counted.map((r) => r.remaining)) : null,
      overdueRemaining: paymentsKnown ? milli(overdueRows.map((r) => r.remaining)) : null,
      unlinked: paymentsKnown ? sumMoney(payments.filter((p) => !invoiceIds.has(p.invoiceId)).map((p) => p.amount)) : null,
    },
  };
}
