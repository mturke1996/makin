import { describe, expect, it } from 'vitest';
import { buildPrincipal } from '../../core/access';
import type { Client, Expense, Invoice, Payment, PaymentMilestone, ProjectPhase, StandaloneDebt, Worker } from '../../types';
import { buildAttentionItems } from './homeAttentionModel';
import { canOpenPath, homeGates, planDashboard } from './homeGates';
import { bucketSums, computeHomeStats } from './homeStats';

const admin = buildPrincipal({ id: 'u-admin', role: 'admin' });
const salem = buildPrincipal({ id: 'u-salem', role: 'employee' }); // no stored list: the default set
const ali = buildPrincipal({
  id: 'u-ali',
  role: 'employee',
  permissions: ['expenses.create', 'workers.view', 'workers.manage', 'clients.view', 'custody.view.own', 'projects.view', 'projects.manage'],
});
const fatima = buildPrincipal({
  id: 'u-fatima',
  role: 'employee',
  permissions: [
    'clients.view', 'clients.manage', 'invoices.view', 'invoices.manage', 'payments.view', 'payments.manage',
    'expenses.create', 'expenses.view.all', 'expenses.edit.all', 'debts.view', 'debts.manage', 'custody.view.own',
    'letters.view', 'letters.manage', 'reports.view',
  ],
});
const nobody = buildPrincipal({ id: 'u-none', role: 'employee', permissions: [] });
const reportsOnly = buildPrincipal({ id: 'u-rep', role: 'employee', permissions: ['reports.view'] });

describe('homeGates', () => {
  it('admin gets every card and cell', () => {
    const g = homeGates(admin);
    expect(g.income).toBe(true);
    expect(g.expenses).toBe('all');
    expect(g.net).toBe(true);
    expect(g.custodyKind).toBe('pooled');
    expect(g.cells).toEqual(['outstanding', 'debts', 'custody', 'overdueInvoices']);
    expect(planDashboard(g, false).kpis).toEqual(['income', 'expenses', 'net', 'average']);
  });

  it('the accountant sees income and everyone\'s expenses, and their own custody', () => {
    const g = homeGates(fatima);
    expect(g).toMatchObject({ income: true, expenses: 'all', net: true, custodyKind: 'own', custody: true, pooledFund: false });
    // personal custody has its own card on Home, so the grid has no custody cell for this person
    expect(g.cells).toEqual(['outstanding', 'debts', 'overdueInvoices']);
    expect(g).toMatchObject({ newInvoice: true, newPayment: true, newExpense: true });
  });

  it('only the manager is reminded to back up', () => {
    expect(homeGates(admin).backup).toBe(true);
    expect(homeGates(fatima).backup).toBe(false);
    expect(homeGates(salem).backup).toBe(false);
  });

  it('only whoever sees payments follows the payment schedule', () => {
    expect(homeGates(admin).schedule).toBe(true);
    expect(homeGates(fatima).schedule).toBe(true);
    expect(homeGates(salem).schedule).toBe(false);
    expect(homeGates(ali).schedule).toBe(false);
  });

  it('a field employee only gets the personal expense cards and nothing about the business', () => {
    const g = homeGates(salem);
    expect(g.income).toBe(false);
    expect(g.net).toBe(false);
    expect(g.expenses).toBe('own');
    expect(g.custodyKind).toBe('own');
    expect(g.cells).toEqual([]);
    expect(g).toMatchObject({ overdueInvoices: false, overdueDebts: false, newInvoice: false, newPayment: false, newExpense: true });
    expect(planDashboard(g, false)).toEqual({ kpis: ['expenses', 'average'], cells: [], chart: true });
    expect(planDashboard(g, true).cells).toEqual([]);
  });

  it('a supervisor sees what is owed to workers, not invoices', () => {
    const g = homeGates(ali);
    expect(g.cells).toEqual(['workers']);
    expect(g.expenses).toBe('own');
    expect(g.income).toBe(false);
  });

  it('the business figures need reports.view even when the payments are readable', () => {
    const noReports = buildPrincipal({ id: 'x', role: 'employee', permissions: ['payments.view', 'expenses.view.all'] });
    const g = homeGates(noReports);
    expect(g.income).toBe(false);
    expect(g.net).toBe(false);
    expect(g.expenses).toBe('all');
  });

  it('net needs every payment AND every expense: personal expenses are not enough', () => {
    const p = buildPrincipal({ id: 'x', role: 'employee', permissions: ['payments.view', 'reports.view', 'expenses.create'] });
    const g = homeGates(p);
    expect(g.income).toBe(true);
    expect(g.expenses).toBe('own');
    expect(g.net).toBe(false);
  });

  it('a person with almost nothing gets nothing to draw', () => {
    const plan = planDashboard(homeGates(nobody), false);
    expect(plan).toEqual({ kpis: [], cells: [], chart: false });
    expect(planDashboard(homeGates(reportsOnly), false)).toEqual({ kpis: [], cells: [], chart: false });
  });

  it('nobody signed in gets nothing', () => {
    const g = homeGates(null);
    expect(g.cells).toEqual([]);
    expect(g.expenses).toBe('none');
    expect(g.income).toBe(false);
  });
});

describe('canOpenPath', () => {
  it('keeps recent shortcuts inside what the person may open', () => {
    expect(canOpenPath(salem, '/clients')).toBe(true);
    expect(canOpenPath(salem, '/payments')).toBe(false);
    expect(canOpenPath(salem, '/invoices/new')).toBe(false);
    expect(canOpenPath(salem, '/fund')).toBe(true);
    expect(canOpenPath(salem, '/users')).toBe(false);
    expect(canOpenPath(salem, '/settings/audit')).toBe(false);
    expect(canOpenPath(fatima, '/invoices/new')).toBe(true);
    expect(canOpenPath(fatima, '/expenses/invoices')).toBe(true);
    expect(canOpenPath(ali, '/expenses/invoices')).toBe(false);
    expect(canOpenPath(fatima, '/clients/c1?tab=x')).toBe(true);
    expect(canOpenPath(admin, '/users')).toBe(true);
    expect(canOpenPath(admin, '/something-else')).toBe(false);
    expect(canOpenPath(salem, '/')).toBe(true);
    expect(canOpenPath(fatima, '/receivables')).toBe(true);
    expect(canOpenPath(salem, '/receivables')).toBe(false);
  });
});

const day = (n: number) => new Date(Date.UTC(2026, 9, 23) - n * 86_400_000).toISOString().slice(0, 10);
const pay = (id: string, amount: number, ago: number, invoiceId = 'i1', clientId = 'c1'): Payment =>
  ({ id, invoiceId, clientId, amount, paymentMethod: 'cash', paymentDate: day(ago), createdAt: day(ago), updatedAt: day(ago), createdBy: 'x' }) as Payment;
const exp = (id: string, amount: number, ago: number, userId: string, extra: Partial<Expense> = {}): Expense =>
  ({ id, clientId: 'c1', description: id, amount, category: 'materials', date: day(ago), isClosed: false, createdAt: day(ago), updatedAt: day(ago), createdBy: userId, userId, ...extra }) as Expense;
const inv = (id: string, total: number, status: Invoice['status'], dueAgo: number): Invoice =>
  ({ id, invoiceNumber: `INV-${id}`, clientId: 'c1', items: [], subtotal: total, taxRate: 0, taxAmount: 0, total, status, issueDate: day(dueAgo + 30), dueDate: day(dueAgo), createdAt: day(40), updatedAt: day(40), createdBy: 'x' }) as Invoice;

const payments = [pay('p1', 1000, 2), pay('p2', 500, 40)];
const allExpenses = [
  exp('e1', 300, 1, 'u-admin'),
  exp('e2', 200, 3, 'u-salem'),
  exp('e3', 100, 50, 'u-salem'),
  exp('w1', 50, 2, 'u-ali', { workerId: 'w1' }),
  exp('w2', 100, 4, 'u-admin', { workerId: 'w1' }),
];
const invoices = [inv('i1', 3000, 'sent', 5), inv('i2', 900, 'paid', 5)];
const debts = [
  { id: 'd1', partyName: 'مورد', status: 'unpaid', dueDate: day(3), remainingAmount: 250, amount: 250, paidAmount: 0 },
] as unknown as StandaloneDebt[];
const workers = [{ id: 'w1', clientId: 'c1', name: 'عامل', totalAmount: 400, paidAmount: 0, remainingAmount: 400, status: 'active' }] as unknown as Worker[];

const statsFor = (p: ReturnType<typeof buildPrincipal>, days = 30) => {
  const gates = homeGates(p);
  const listable = allExpenses.filter((e) => (gates.expenses === 'all' ? true : gates.expenses === 'own' ? e.userId === p!.id : false));
  return computeHomeStats(gates, {
    payments, listableExpenses: listable, allExpenses, invoices, debts, workers,
    endDay: day(0), days, now: new Date(Date.UTC(2026, 9, 23, 12)),
  });
};

describe('computeHomeStats', () => {
  it('admin: period totals, the comparison with the period before, and the balances', () => {
    const s = statsFor(admin);
    expect(s.dashboard.comparison.income).toMatchObject({ total: 1000, previousTotal: 500, changePct: 100 });
    expect(s.dashboard.comparison.expense).toMatchObject({ total: 650, previousTotal: 100 });
    expect(s.dashboard.expenseCount).toBe(4);
    expect(s.dashboard.comparison.net.total).toBe(350);
    expect(s.outstanding).toBe(1500); // 3000 less both payments; the paid invoice is not outstanding
    expect(s.overdueInvoices).toBe(1);
    expect(s.debtsRemaining).toBe(250);
    expect(s.workersOwed).toBeNull(); // the fourth cell is overdue invoices for anyone who can see invoices
  });

  it('a field employee: only their own expenses, and nothing else is computed', () => {
    const s = statsFor(salem);
    expect(s.dashboard.comparison.expense.total).toBe(200);
    expect(s.dashboard.expenseCount).toBe(1);
    // income is not even read: the series is empty, so nobody can mistake it for "0 collected"
    expect(s.dashboard.income.every((v) => v === 0)).toBe(true);
    expect(s.outstanding).toBeNull();
    expect(s.debtsRemaining).toBeNull();
    expect(s.overdueInvoices).toBeNull();
    expect(s.workersOwed).toBeNull();
  });

  it('a supervisor: worker balances count every payment made to the worker, listed or not', () => {
    const s = statsFor(ali);
    expect(s.dashboard.comparison.expense.total).toBe(50); // only theirs is listed
    expect(s.workersOwed).toBe(250); // 400 agreed less 50 (theirs) and 100 (the admin's, not listed to them)
  });

  it('the accountant: everyone\'s expenses and the invoice balances, no worker line', () => {
    const s = statsFor(fatima);
    expect(s.dashboard.comparison.expense.total).toBe(650);
    expect(s.outstanding).toBe(1500);
    expect(s.workersOwed).toBeNull();
  });

  it('the period length changes the totals', () => {
    expect(statsFor(admin, 7).dashboard.comparison.expense.total).toBe(650);
    expect(statsFor(admin, 90).dashboard.comparison.expense.total).toBe(750);
    expect(statsFor(admin, 90).dashboard.days).toHaveLength(90);
  });
});

describe('bucketSums', () => {
  it('folds the newest block whole and sums exactly', () => {
    expect(bucketSums([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([1, 9, 18]);
    expect(bucketSums([0.1, 0.2], 2)).toEqual([0.3]);
    expect(bucketSums([1, 2], 1)).toEqual([1, 2]);
    expect(bucketSums(Array.from({ length: 90 }, () => 1), 3)).toHaveLength(30);
  });
});

describe('buildAttentionItems', () => {
  const now = new Date(Date.UTC(2026, 9, 23, 12));
  const clients = [{ id: 'c1', name: 'شركة النور' }] as Client[];
  const t = (ar: string) => ar;
  const base = { invoices, payments, clients, debts, custody: null, t, now };
  const all = { invoices: true, invoiceAmounts: true, debts: true, custody: true };

  it('quotes what is left on an overdue invoice only when the payments are held', () => {
    const withAmounts = buildAttentionItems({ ...base, allow: all }).find((i) => i.kind === 'invoice')!;
    expect(withAmounts.amount).toBe(1500);
    expect(withAmounts.title).toBe('شركة النور');
    const noPayments = buildAttentionItems({ ...base, payments: [], allow: { ...all, invoiceAmounts: false } }).find((i) => i.kind === 'invoice')!;
    expect(noPayments.amount).toBeUndefined();
  });

  it('draws only from the areas the person may open', () => {
    expect(buildAttentionItems({ ...base, allow: { invoices: false, invoiceAmounts: false, debts: false, custody: false } })).toEqual([]);
    const onlyDebts = buildAttentionItems({ ...base, allow: { invoices: false, invoiceAmounts: false, debts: true, custody: false } });
    expect(onlyDebts.map((i) => i.kind)).toEqual(['debt']);
  });

  it('flags the person\'s own custody deficit, and only with the custody gate', () => {
    const custody = { deposited: 1000, spent: 1200, remaining: -200 };
    expect(buildAttentionItems({ ...base, invoices: [], debts: [], custody, allow: all }).map((i) => i.kind)).toEqual(['custody-deficit']);
    expect(buildAttentionItems({ ...base, invoices: [], debts: [], custody, allow: { ...all, custody: false } })).toEqual([]);
  });

  describe('expense review', () => {
    const exp = (id: string, userId: string, approvalStatus?: 'pending' | 'rejected' | 'approved', extra = {}) =>
      ({ id, clientId: 'c1', userId, description: id, amount: 100, category: 'other', date: '2026-10-20', createdAt: '2026-10-21T08:00:00Z', isClosed: false, approvalStatus, ...extra }) as Expense;
    const noOthers = { invoices: [], debts: [] };
    const review = [exp('a', 'u-field', 'pending'), exp('b', 'u-field', 'pending', { amount: 50.5 }), exp('c', 'u-field', 'rejected', { rejectionReason: 'الفاتورة ناقصة' }), exp('d', 'u-acct', 'approved'), exp('e', 'u-acct')];

    it('tells an approver how many are waiting, how much, and since when', () => {
      const [item] = buildAttentionItems({ ...base, ...noOthers, expenses: review, userId: 'u-acct', allow: { ...all, approvals: true } });
      expect(item.kind).toBe('expense-approval');
      expect(item.title).toBe('مصروفان بانتظار الاعتماد');
      expect(item.amount).toBe(150.5);
      expect(item.path).toBe('/expenses?status=pending');
    });

    it('shows nothing about approval to someone who cannot decide, and ignores closed expenses', () => {
      expect(buildAttentionItems({ ...base, ...noOthers, expenses: review, userId: 'u-acct', allow: all })).toEqual([]);
      const closed = review.map((e) => ({ ...e, isClosed: true }));
      expect(buildAttentionItems({ ...base, ...noOthers, expenses: closed, userId: 'u-acct', allow: { ...all, approvals: true } })).toEqual([]);
    });

    it('tells a person which of their own expenses were sent back, with the reason', () => {
      const [item] = buildAttentionItems({ ...base, ...noOthers, expenses: review, userId: 'u-field', allow: { ...all, corrections: true } });
      expect(item.kind).toBe('expense-rejected');
      expect(item.tone).toBe('danger');
      expect(item.subtitle).toBe('الفاتورة ناقصة');
      expect(buildAttentionItems({ ...base, ...noOthers, expenses: review, userId: 'u-other', allow: { ...all, corrections: true } })).toEqual([]);
    });
  });

  describe('phase budgets', () => {
    const phase = (id: string, clientId: string, name: string, budgetAmount: number, order = 1) => ({ id, clientId, name, order, status: 'in_progress', budgetAmount, createdAt: '', updatedAt: '' }) as ProjectPhase;
    const spend = (phaseId: string, amount: number) => ({ id: `e-${phaseId}-${amount}`, clientId: 'c1', phaseId, amount, description: 'x', category: 'other', date: '2026-10-20', createdAt: '2026-10-20T08:00:00Z', isClosed: false }) as Expense;
    const none = { invoices: [], debts: [] };

    it('names a phase that went past its budget and its client, with the excess', () => {
      const items = buildAttentionItems({ ...base, ...none, phases: [phase('p1', 'c1', 'الهيكل', 1000)], expenses: [spend('p1', 1250)], allow: { ...all, budgets: true } });
      expect(items.map((i) => i.kind)).toEqual(['budget-over']);
      expect(items[0]).toMatchObject({ tone: 'danger', title: 'مرحلة الهيكل تجاوزت ميزانيتها', subtitle: 'شركة النور', amount: 250, path: '/clients/c1?section=phases' });
    });

    it('warns early when a phase has used 80 percent, and keeps over and near apart', () => {
      const phases = [phase('p1', 'c1', 'الهيكل', 1000), phase('p2', 'c1', 'التشطيب', 1000, 2)];
      const items = buildAttentionItems({ ...base, ...none, phases, expenses: [spend('p1', 1100), spend('p2', 850)], allow: { ...all, budgets: true } });
      expect(items.map((i) => i.kind)).toEqual(['budget-over', 'budget-near']);
      expect(items[1]).toMatchObject({ tone: 'warning', title: 'مرحلة التشطيب قاربت ميزانيتها' });
    });

    it('stays quiet without the gate, and for phases comfortably within budget', () => {
      const phases = [phase('p1', 'c1', 'الهيكل', 1000)];
      expect(buildAttentionItems({ ...base, ...none, phases, expenses: [spend('p1', 5000)], allow: all })).toEqual([]);
      expect(buildAttentionItems({ ...base, ...none, phases, expenses: [spend('p1', 300)], allow: { ...all, budgets: true } })).toEqual([]);
    });
  });
  describe('backup reminder', () => {
    const none = { invoices: [], debts: [], payments: [] };
    const allowed = { ...all, backup: true };
    const info = (lastAt: string | null, records = 50) => ({ lastAt, records });

    it('reminds the manager who never took a copy, or not for a week', () => {
      for (const lastAt of [null, '2026-10-10T08:00:00Z']) {
        const items = buildAttentionItems({ ...base, ...none, backupInfo: info(lastAt), allow: allowed });
        expect(items.map((i) => i.kind)).toEqual(['backup-due']);
        expect(items[0]).toMatchObject({ tone: 'warning', path: '/settings/backup' });
      }
    });

    it('stays quiet after a recent copy, with no data yet, or for anyone who is not the manager', () => {
      expect(buildAttentionItems({ ...base, ...none, backupInfo: info('2026-10-22T08:00:00Z'), allow: allowed })).toEqual([]);
      expect(buildAttentionItems({ ...base, ...none, backupInfo: info(null, 0), allow: allowed })).toEqual([]);
      expect(buildAttentionItems({ ...base, ...none, backupInfo: info(null), allow: all })).toEqual([]);
    });
  });

  describe('payment schedule', () => {
    const milestone = (id: string, order: number, amount: number, dueAgo: number, clientId = 'c1'): PaymentMilestone =>
      ({ id, clientId, title: `دفعة ${id}`, amount, order, dueDate: day(dueAgo), createdAt: day(90), updatedAt: day(90) }) as PaymentMilestone;
    const none = { invoices: [], debts: [] };
    const allowed = { ...all, schedule: true };

    it('names the client with a late instalment, what is left on it and for how long', () => {
      // 1500 collected: the first (1000) is covered, the second (2000) is half covered and 10 days late.
      const milestones = [milestone('m1', 1, 1000, 60), milestone('m2', 2, 2000, 10), milestone('m3', 3, 500, -20)];
      const items = buildAttentionItems({ ...base, ...none, milestones, allow: allowed });
      expect(items.map((i) => i.kind)).toEqual(['schedule-overdue']);
      expect(items[0]).toMatchObject({ tone: 'warning', title: 'شركة النور', amount: 1500, path: '/clients/c1?section=schedule' });
      expect(items[0].subtitle).toContain('دفعة m2');
    });

    it('turns urgent after a month and sums several clients into one line to the receivables page', () => {
      const urgent = buildAttentionItems({ ...base, ...none, milestones: [milestone('m1', 1, 5000, 45)], allow: allowed });
      expect(urgent[0].tone).toBe('danger');

      const twoClients = [{ id: 'c1', name: 'شركة النور' }, { id: 'c2', name: 'مكتب الأمل' }] as Client[];
      const many = buildAttentionItems({
        ...base, ...none, clients: twoClients,
        payments: [],
        milestones: [milestone('m1', 1, 700, 40), milestone('m2', 1, 300, 5, 'c2')],
        allow: allowed,
      });
      expect(many).toHaveLength(1);
      expect(many[0]).toMatchObject({ key: 'schedule-many', amount: 1000, path: '/receivables' });
      expect(many[0].subtitle).toContain('شركة النور');
    });

    it('stays quiet without the gate, and when nothing is late', () => {
      const late = [milestone('m1', 1, 5000, 45)];
      expect(buildAttentionItems({ ...base, ...none, milestones: late, allow: all })).toEqual([]);
      expect(buildAttentionItems({ ...base, ...none, milestones: [milestone('m1', 1, 5000, -10)], allow: allowed })).toEqual([]);
    });

    it('keeps invoices and instalments apart, each named for what it is (the receivables page merges them per client)', () => {
      const kinds = buildAttentionItems({ ...base, debts: [], milestones: [milestone('m1', 1, 5000, 45)], allow: allowed }).map((i) => i.kind);
      expect(kinds).toEqual(['invoice', 'schedule-overdue']);
      // Without the schedule gate only the overdue invoice shows, as before.
      expect(buildAttentionItems({ ...base, debts: [], milestones: [milestone('m1', 1, 5000, 45)], allow: all }).map((i) => i.kind)).toEqual(['invoice']);
    });
  });
});
