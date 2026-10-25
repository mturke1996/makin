import { describe, expect, it } from 'vitest';
import { buildPrincipal } from '../access';
import type { Client, Expense, Invoice, Payment, PaymentMilestone, ProjectPhase, StandaloneDebt, Worker } from '../../types';
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

const core = (p: Parameters<typeof alertAllowFor>[0]) => {
  const { invoices: i, invoiceAmounts, phases, debts } = alertAllowFor(p);
  return { invoices: i, invoiceAmounts, phases, debts };
};

describe('alertAllowFor', () => {
  it('follows the areas the person may open and the data they hold', () => {
    expect(core(admin)).toEqual({ invoices: true, invoiceAmounts: true, phases: true, debts: true });
    expect(core(salem)).toEqual({ invoices: false, invoiceAmounts: false, phases: false, debts: false });
    // phase overruns need EVERY expense: a supervisor lists only their own, so no overrun is quoted to them
    expect(alertAllowFor(ali).phases).toBe(false);
    expect(core(fatima)).toEqual({ invoices: true, invoiceAmounts: true, phases: true, debts: true });
    expect(core(invoicesOnly)).toEqual({ invoices: true, invoiceAmounts: false, phases: false, debts: false });
    expect(core(null)).toEqual({ invoices: false, invoiceAmounts: false, phases: false, debts: false });
  });

  it('the newer sources each follow the data they quote', () => {
    const a = alertAllowFor(admin);
    expect(a).toMatchObject({ schedule: true, phasesNear: true, approvals: true, corrections: true, prices: true, workers: true });
    // a field employee records and sees only their own: corrections and custody, nothing that needs everyone's data
    const f = alertAllowFor(ali);
    expect(f).toMatchObject({ schedule: false, phasesNear: false, approvals: false, prices: false, corrections: true });
    expect(alertAllowFor(null)).toMatchObject({ schedule: false, approvals: false, corrections: false, prices: false, custody: false, workers: false });
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

describe('buildSmartAlerts: schedule, approvals, prices, workers and custody', () => {
  const base = { invoices: [], payments: [], clients, projectPhases: [], standaloneDebts: [], now } as const;
  const allowAll = alertAllowFor(admin);

  it('a late instalment of the agreed schedule is raised once per client', () => {
    const paymentMilestones = [
      { id: 'm1', clientId: 'c1', title: 'الدفعة الأولى', amount: 1000, dueDate: day(10), order: 1 },
      { id: 'm2', clientId: 'c1', title: 'الدفعة الثانية', amount: 1000, dueDate: day(3), order: 2 },
      { id: 'm3', clientId: 'c1', title: 'الدفعة الثالثة', amount: 1000, dueDate: day(-20), order: 3 },
    ] as PaymentMilestone[];
    const alerts = buildSmartAlerts({ ...base, allow: allowAll, expenses: [], paymentMilestones });
    const a = alerts.find((x) => x.key === 'schedule-overdue-c1')!;
    expect(a.title).toBe('2 دفعات متأخرة من الجدول');
    expect(a.href).toBe('/clients/c1?section=schedule');
    expect(buildSmartAlerts({ ...base, allow: { ...allowAll, schedule: false }, expenses: [], paymentMilestones }).some((x) => x.key.startsWith('schedule-'))).toBe(false);
  });

  it('a phase at 80–100% of its budget warns before it is over', () => {
    const near = [{ id: 'e2', clientId: 'c1', phaseId: 'ph1', amount: 90, userId: 'u-admin' }] as Expense[];
    const alerts = buildSmartAlerts({ ...base, allow: allowAll, expenses: near, projectPhases });
    expect(alerts.map((a) => a.key)).toContain('phase-near-ph1');
    expect(alerts.map((a) => a.key)).not.toContain('phase-over-ph1');
    expect(alerts.find((a) => a.key === 'phase-near-ph1')!.body).toContain('90%');
  });

  it('an approver is told about expenses waiting, and only for areas they approve', () => {
    const pending = [{ id: 'e3', clientId: 'c1', amount: 40, userId: 'u-ali', approvalStatus: 'pending' }] as Expense[];
    const alerts = buildSmartAlerts({ ...base, allow: allowAll, expenses: pending });
    expect(alerts.find((a) => a.key === 'approvals-pending')).toMatchObject({ type: 'info', href: '/expenses?status=pending' });
    expect(buildSmartAlerts({ ...base, allow: { ...allowAll, approvals: false }, expenses: pending }).some((a) => a.key === 'approvals-pending')).toBe(false);
  });

  it('the person who recorded an expense is told when it was sent back, nobody else', () => {
    const back = [{ id: 'e4', clientId: 'c1', amount: 40, userId: 'u-ali', approvalStatus: 'rejected', rejectionReason: 'الفاتورة غير واضحة' }] as Expense[];
    const mine = buildSmartAlerts({ ...base, allow: alertAllowFor(ali), expenses: back, userId: 'u-ali' });
    expect(mine.find((a) => a.key === 'expenses-sent-back')).toMatchObject({ type: 'error', body: 'الفاتورة غير واضحة' });
    expect(buildSmartAlerts({ ...base, allow: alertAllowFor(ali), expenses: back, userId: 'u-other' })).toEqual([]);
  });

  it('a worker paid ahead of the approved progress is flagged', () => {
    const workers = [{ id: 'w1', clientId: 'c1', name: 'سالم', totalAmount: 1000, paidAmount: 0, remainingAmount: 1000, status: 'active', workProgressPercent: 20 }] as Worker[];
    const paid = [{ id: 'e5', clientId: 'c1', workerId: 'w1', amount: 600, userId: 'u-admin' }] as Expense[];
    const alerts = buildSmartAlerts({ ...base, allow: allowAll, expenses: paid, workers });
    const a = alerts.find((x) => x.key === 'worker-ahead-w1')!;
    expect(a.type).toBe('error');
    expect(a.href).toBe('/clients/c1?section=workers&worker=w1');
    // no approved progress yet: nothing to compare against
    expect(buildSmartAlerts({ ...base, allow: allowAll, expenses: paid, workers: [{ ...workers[0], workProgressPercent: undefined }] }).some((x) => x.key.startsWith('worker-ahead'))).toBe(false);
  });

  it('custody: a deficit is an error, an empty fund a warning, an unfunded one nothing', () => {
    const allow = { ...alertAllowFor(ali), custody: true };
    const keys = (custody: { deposited: number; remaining: number } | null) =>
      buildSmartAlerts({ ...base, allow, expenses: [], custody }).map((a) => a.key);
    expect(keys({ deposited: 500, remaining: -12.5 })).toEqual(['custody-deficit']);
    expect(keys({ deposited: 500, remaining: 0 })).toEqual(['custody-empty']);
    expect(keys({ deposited: 500, remaining: 80 })).toEqual([]);
    expect(keys({ deposited: 0, remaining: 0 })).toEqual([]);
    expect(keys(null)).toEqual([]);
  });
});
