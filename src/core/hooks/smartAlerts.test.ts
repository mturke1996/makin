import { describe, expect, it } from 'vitest';
import { buildPrincipal } from '../access';
import type { Client, Expense, Invoice, Payment, ProjectPhase, StandaloneDebt } from '../../types';
import { alertAllowFor, buildSmartAlerts } from './smartAlerts';

const admin = buildPrincipal({ id: 'u-admin', role: 'admin' });
const salem = buildPrincipal({ id: 'u-salem', role: 'employee' });
const ali = buildPrincipal({ id: 'u-ali', role: 'employee', permissions: ['expenses.create', 'clients.view', 'projects.view', 'workers.view'] });
const fatima = buildPrincipal({
  id: 'u-fatima',
  role: 'employee',
  permissions: ['clients.view', 'invoices.view', 'payments.view', 'expenses.create', 'expenses.view.all', 'debts.view', 'reports.view', 'projects.view'],
});
const invoicesOnly = buildPrincipal({ id: 'u-inv', role: 'employee', permissions: ['invoices.view'] });

const now = new Date(Date.UTC(2026, 9, 23, 12));
const day = (n: number) => new Date(Date.UTC(2026, 9, 23) - n * 86_400_000).toISOString().slice(0, 10);

const clients = [{ id: 'c1', name: 'شركة النور' }] as Client[];
const invoices = [
  { id: 'i1', invoiceNumber: 'INV-1', clientId: 'c1', total: 1000, status: 'sent', dueDate: day(5) },
  { id: 'i2', invoiceNumber: 'INV-2', clientId: 'c1', total: 500, status: 'sent', dueDate: day(5) },
  { id: 'i3', invoiceNumber: 'INV-3', clientId: 'c9', tempClientName: 'عميل مؤقت', total: 500, status: 'sent', dueDate: day(1) },
  { id: 'i4', invoiceNumber: 'INV-4', clientId: 'c1', total: 500, status: 'sent', dueDate: day(-3) },
] as Invoice[];
const payments = [{ id: 'p1', invoiceId: 'i2', clientId: 'c1', amount: 500, paymentDate: day(2) }] as Payment[];
const projectPhases = [{ id: 'ph1', clientId: 'c1', name: 'الهيكل', order: 1, budgetAmount: 100 }] as ProjectPhase[];
const expenses = [{ id: 'e1', clientId: 'c1', phaseId: 'ph1', amount: 160, userId: 'u-admin' }] as Expense[];
const standaloneDebts = [
  { id: 'd1', partyName: 'مورد الحديد', status: 'overdue', dueDate: day(10), remainingAmount: 800 },
] as StandaloneDebt[];

const run = (p: typeof admin, over: { payments?: Payment[]; expenses?: Expense[] } = {}) =>
  buildSmartAlerts({
    allow: alertAllowFor(p),
    invoices, payments: over.payments ?? payments, clients, projectPhases, expenses: over.expenses ?? expenses, standaloneDebts, now,
  });

describe('alertAllowFor', () => {
  it('follows the areas the person may open and the data they hold', () => {
    expect(alertAllowFor(admin)).toEqual({ invoices: true, invoiceAmounts: true, phases: true, debts: true });
    expect(alertAllowFor(salem)).toEqual({ invoices: false, invoiceAmounts: false, phases: false, debts: false });
    // phase overruns need EVERY expense: a supervisor lists only their own, so no overrun is quoted to them
    expect(alertAllowFor(ali).phases).toBe(false);
    expect(alertAllowFor(fatima)).toEqual({ invoices: true, invoiceAmounts: true, phases: true, debts: true });
    expect(alertAllowFor(invoicesOnly)).toEqual({ invoices: true, invoiceAmounts: false, phases: false, debts: false });
    expect(alertAllowFor(null)).toEqual({ invoices: false, invoiceAmounts: false, phases: false, debts: false });
  });
});

describe('buildSmartAlerts', () => {
  it('admin: overdue invoices (settled and not yet due are skipped), a phase overrun and an overdue debt', () => {
    const alerts = run(admin);
    expect(alerts.map((a) => a.key).sort()).toEqual(['debt-overdue-d1', 'inv-overdue-i1', 'inv-overdue-i3', 'phase-over-ph1']);
    expect(alerts.find((a) => a.key === 'inv-overdue-i1')!.body).toBe('#INV-1 · شركة النور');
    expect(alerts.find((a) => a.key === 'inv-overdue-i3')!.body).toBe('#INV-3 · عميل مؤقت');
    expect(alerts.find((a) => a.key === 'phase-over-ph1')!.body).toContain('شركة النور · الهيكل (+');
  });

  it('a field employee gets no alert at all', () => {
    expect(run(salem)).toEqual([]);
  });

  it('a person who can open only invoices gets only invoice alerts, and no client name', () => {
    const alerts = buildSmartAlerts({
      allow: alertAllowFor(invoicesOnly),
      invoices, payments: [], clients: [], projectPhases: [], expenses: [], standaloneDebts: [], now,
    });
    // without the payments the stored status decides, so the settled-by-payment i2 still counts as overdue here
    expect(alerts.map((a) => a.key).sort()).toEqual(['inv-overdue-i1', 'inv-overdue-i2', 'inv-overdue-i3']);
    expect(alerts.find((a) => a.key === 'inv-overdue-i1')!.body).toBe('#INV-1');
  });

  it('never quotes a phase overrun built from partial expenses', () => {
    const own = buildSmartAlerts({
      allow: alertAllowFor(ali),
      invoices: [], payments: [], clients, projectPhases, expenses, standaloneDebts: [], now,
    });
    expect(own).toEqual([]);
  });

  it('the accountant gets invoice and debt alerts and the phase overrun', () => {
    expect(run(fatima).map((a) => a.title).sort()).toEqual(['تجاوز ميزانية مرحلة', 'دين متأخر', 'فاتورة متأخرة', 'فاتورة متأخرة'].sort());
  });
});
