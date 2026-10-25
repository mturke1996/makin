import dayjs from 'dayjs';
import { can, canAccessModule, expenseScope, type Principal } from '../access';
import { buildPhaseBudgetRows } from '../finance/projectBudget';
import { findOverdueInvoices } from '../finance/overdueInvoices';
import { formatCurrencyDisplay } from '../utils-formatters';
import { approvalCounts, approvalStatusOf } from '../finance/expenseApproval';
import { budgetState } from '../finance/budgetStatus';
import { buildReceivables } from '../finance/paymentSchedule';
import { recentPriceSpikes } from '../finance/priceTracking';
import { advanceTotal, workerProgressView } from '../finance/workerProgress';
import { buildWorkerLedgers } from '../finance/workerLedger';
import { toMilli } from '../finance/money';
import type { Client, Expense, Invoice, Payment, PaymentMilestone, ProjectPhase, StandaloneDebt, Worker } from '../../types';

export interface SmartAlert {
  key: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  body?: string;
  href?: string;
}

/** Which alert sources a person may draw from. An alert quotes names and amounts, so each needs its data. */
export interface AlertAllow {
  /** Overdue invoices: the person can open the invoices. */
  invoices: boolean;
  /** Payments are held, so "settled in full" can be told from the payments themselves. */
  invoiceAmounts: boolean;
  /** Phase budget overruns: phases, client names AND every expense (a partial sum would understate the overrun). */
  phases: boolean;
  /** Overdue debts: the person can open the debts. */
  debts: boolean;
  /** Late instalments of an agreed payment schedule (needs the payments that cover them and the clients' names). */
  schedule?: boolean;
  /** Phases that have used 80% of their budget but not passed it (same data as the overrun). */
  phasesNear?: boolean;
  /** An approver: expenses waiting for a decision. */
  approvals?: boolean;
  /** Anyone who records expenses: their own that were sent back. */
  corrections?: boolean;
  /** Material prices: needs every expense. */
  prices?: boolean;
  /** The person's own custody. */
  custody?: boolean;
  /** Workers paid ahead of their approved progress. */
  workers?: boolean;
}

export function alertAllowFor(p: Principal | null | undefined): AlertAllow {
  return {
    invoices: canAccessModule(p, 'invoices'),
    invoiceAmounts: can(p, 'payments.view'),
    phases: can(p, 'clients.view') && can(p, 'projects.view') && expenseScope(p) === 'all',
    debts: canAccessModule(p, 'debts'),
    schedule: can(p, 'payments.view') && can(p, 'clients.view'),
    phasesNear: can(p, 'clients.view') && can(p, 'projects.view') && expenseScope(p) === 'all',
    approvals: can(p, 'expenses.edit.all'),
    corrections: can(p, 'expenses.create'),
    prices: expenseScope(p) === 'all',
    custody: can(p, 'custody.view.own') && expenseScope(p) !== 'none',
    workers: can(p, 'workers.view') && can(p, 'clients.view'),
  };
}

interface Input {
  allow: AlertAllow;
  invoices: readonly Invoice[];
  payments: readonly Payment[];
  clients: readonly Client[];
  projectPhases: readonly ProjectPhase[];
  /** Already narrowed to what the person may list. */
  expenses: readonly Expense[];
  standaloneDebts: readonly StandaloneDebt[];
  paymentMilestones?: readonly PaymentMilestone[];
  workers?: readonly Worker[];
  userId?: string;
  /** The signed-in person's own custody, when it was ever funded. */
  custody?: { deposited: number; remaining: number } | null;
  now?: Date;
}

/** The alerts worth raising now, from data the person holds and for areas they can open. */
export function buildSmartAlerts({ allow, invoices, payments, clients, projectPhases, expenses, standaloneDebts, paymentMilestones = [], workers = [], userId, custody, now }: Input): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const today = dayjs(now).startOf('day');

  if (allow.invoices) {
    for (const { inv } of findOverdueInvoices(invoices, payments, allow.invoiceAmounts, now)) {
      const clientName = clients.find((c) => c.id === inv.clientId)?.name || inv.tempClientName || '';
      alerts.push({
        key: `inv-overdue-${inv.id}`,
        type: 'warning',
        title: 'فاتورة متأخرة',
        body: `#${inv.invoiceNumber}${clientName ? ` · ${clientName}` : ''}`,
        href: `/invoices/${inv.id}`,
      });
    }
  }

  if (allow.phases) {
    for (const client of clients) {
      const phases = projectPhases.filter((p) => p.clientId === client.id);
      if (phases.length === 0) continue;
      const rows = buildPhaseBudgetRows(phases as ProjectPhase[], expenses as Expense[], client.id);
      for (const row of rows) {
        if (row.budget <= 0) continue;
        // Compare in thousandths: 50.1 + 50.2 > 100.3 in floats would raise a "+0" alert.
        if (Math.round(row.actual * 1000) <= Math.round(row.budget * 1000)) continue;
        alerts.push({
          key: `phase-over-${row.phase.id}`,
          type: 'error',
          title: 'تجاوز ميزانية مرحلة',
          body: `${client.name} · ${row.phase.name} (+${formatCurrencyDisplay(row.actual - row.budget)})`,
          href: `/clients/${client.id}`,
        });
      }
    }
  }

  if (allow.phasesNear) {
    for (const client of clients) {
      const phases = projectPhases.filter((p) => p.clientId === client.id);
      if (phases.length === 0) continue;
      for (const row of buildPhaseBudgetRows(phases as ProjectPhase[], expenses as Expense[], client.id)) {
        if (budgetState(row.budget, row.actual) !== 'near') continue;
        alerts.push({
          key: `phase-near-${row.phase.id}`,
          type: 'warning',
          title: 'مرحلة قاربت ميزانيتها',
          body: `${client.name} · ${row.phase.name} (استُهلك ${Math.round((row.actual / row.budget) * 100)}%)`,
          href: `/clients/${client.id}?section=phases`,
        });
      }
    }
  }

  if (allow.schedule && paymentMilestones.length > 0) {
    // The agreed schedule only: a client without one is already covered by the overdue-invoice alerts above.
    for (const row of buildReceivables({ clients, payments, milestones: paymentMilestones, now }).late) {
      const first = row.overdue[0];
      alerts.push({
        key: `schedule-overdue-${row.client.id}`,
        type: 'warning',
        title: row.overdue.length === 1 ? 'دفعة متأخرة من الجدول' : `${row.overdue.length} دفعات متأخرة من الجدول`,
        body: `${row.client.name} · ${first.title} (${first.daysLate} يوماً) · ${formatCurrencyDisplay(row.overdueTotal)}`,
        href: `/clients/${row.client.id}?section=schedule`,
      });
    }
  }

  if (allow.approvals) {
    const counts = approvalCounts(expenses.filter((e) => !e.isClosed));
    if (counts.pending > 0) {
      alerts.push({
        key: 'approvals-pending',
        type: 'info',
        title: 'مصروفات بانتظار الاعتماد',
        body: `${counts.pending} ${counts.pending === 1 ? 'مصروف' : 'مصروفات'} بقيمة ${formatCurrencyDisplay(counts.pendingAmount)}`,
        href: '/expenses?status=pending',
      });
    }
  }

  if (allow.corrections && userId) {
    const sentBack = expenses.filter((e) => e.userId === userId && approvalStatusOf(e) === 'rejected' && !e.isClosed);
    if (sentBack.length > 0) {
      alerts.push({
        key: 'expenses-sent-back',
        type: 'error',
        title: sentBack.length === 1 ? 'مصروف أُعيد إليك للتصحيح' : `${sentBack.length} مصروفات أُعيدت إليك للتصحيح`,
        body: sentBack.length === 1 ? sentBack[0].rejectionReason || sentBack[0].description : sentBack[0].rejectionReason || undefined,
        href: '/expenses?status=rejected',
      });
    }
  }

  if (allow.prices) {
    for (const spike of recentPriceSpikes(expenses as Expense[], now ?? new Date()).slice(0, 3)) {
      alerts.push({
        key: `price-rise-${spike.expense.id}`,
        type: 'warning',
        title: 'سعر مادة أعلى من المعتاد',
        body: `${spike.material}: ${formatCurrencyDisplay(spike.unitPrice)} مقابل المعتاد ${formatCurrencyDisplay(spike.usual)} (+${Math.round(spike.change * 100)}%)`,
        href: '/suppliers?tab=prices',
      });
    }
  }

  if (allow.workers && workers.length > 0) {
    for (const { worker, ledger } of buildWorkerLedgers(workers, expenses as Expense[])) {
      if (worker.archivedAt || worker.workProgressPercent == null) continue;
      const view = workerProgressView({ agreed: ledger.agreed, paid: ledger.paid, percent: worker.workProgressPercent, advances: advanceTotal(ledger.payments) });
      if (view.state !== 'ahead' && view.state !== 'far_ahead') continue;
      alerts.push({
        key: `worker-ahead-${worker.id}`,
        type: view.state === 'far_ahead' ? 'error' : 'warning',
        title: 'دُفع لعامل قبل إنجاز عمله',
        body: `${worker.name} · المدفوع يسبق الإنجاز بمقدار ${formatCurrencyDisplay(view.aheadBy)}`,
        href: `/clients/${worker.clientId}?section=workers&worker=${worker.id}`,
      });
    }
  }

  if (allow.custody && custody && custody.deposited > 0) {
    const left = toMilli(custody.remaining);
    if (left < 0) {
      alerts.push({ key: 'custody-deficit', type: 'error', title: 'عجز في عهدتك', body: `المصروفات تجاوزت العهدة بمقدار ${formatCurrencyDisplay(-custody.remaining)}`, href: '/fund' });
    } else if (left === 0) {
      alerts.push({ key: 'custody-empty', type: 'warning', title: 'نفدت عهدتك', body: 'اطلب إيداعاً جديداً لتتابع الصرف', href: '/fund' });
    }
  }

  if (allow.debts) {
    for (const debt of standaloneDebts) {
      if (debt.status === 'paid' || !debt.dueDate) continue;
      if (!dayjs(debt.dueDate).isBefore(today, 'day')) continue;
      alerts.push({
        key: `debt-overdue-${debt.id}`,
        type: 'warning',
        title: 'دين متأخر',
        body: `${debt.partyName} · ${formatCurrencyDisplay(debt.remainingAmount)}`,
        href: '/debts',
      });
    }
  }

  return alerts;
}
