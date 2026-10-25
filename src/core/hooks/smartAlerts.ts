import dayjs from 'dayjs';
import { can, canAccessModule, expenseScope, type Principal } from '../access';
import { buildPhaseBudgetRows } from '../finance/projectBudget';
import { findOverdueInvoices } from '../finance/overdueInvoices';
import { formatCurrency } from '../utils-formatters';
import type { Client, Expense, Invoice, Payment, ProjectPhase, StandaloneDebt } from '../../types';

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
}

export function alertAllowFor(p: Principal | null | undefined): AlertAllow {
  return {
    invoices: canAccessModule(p, 'invoices'),
    invoiceAmounts: can(p, 'payments.view'),
    phases: can(p, 'clients.view') && can(p, 'projects.view') && expenseScope(p) === 'all',
    debts: canAccessModule(p, 'debts'),
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
  now?: Date;
}

/** The alerts worth raising now, from data the person holds and for areas they can open. */
export function buildSmartAlerts({ allow, invoices, payments, clients, projectPhases, expenses, standaloneDebts, now }: Input): SmartAlert[] {
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
          body: `${client.name} · ${row.phase.name} (+${formatCurrency(row.actual - row.budget)})`,
          href: `/clients/${client.id}`,
        });
      }
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
        body: `${debt.partyName} · ${formatCurrency(debt.remainingAmount)}`,
        href: '/debts',
      });
    }
  }

  return alerts;
}
