import { describe, expect, it } from 'vitest';
import type { Expense, Payment, ProjectPhase, SiteReport, StandaloneDebt, UserBalance } from '../../types';
import {
  activityAvailability,
  buildClientActivity,
  countByKind,
  filterActivity,
  groupActivityByMonth,
  normalizeSearch,
  periodRange,
  toDay,
  type ActivityAccess,
  type ActivityInput,
} from './clientActivity';

const ALL: ActivityAccess = {
  expenseScope: 'all',
  payments: true,
  debts: true,
  workers: true,
  custody: true,
  projects: true,
  custodyScope: 'all',
};

const expense = (id: string, extra: Partial<Expense> = {}): Expense => ({
  id,
  clientId: 'c1',
  description: `مصروف ${id}`,
  amount: 100,
  category: 'materials',
  date: '2026-10-10',
  isClosed: false,
  createdAt: '2026-10-10T09:00:00.000Z',
  updatedAt: '2026-10-10T09:00:00.000Z',
  createdBy: 'محمد',
  userId: 'u1',
  ...extra,
});
const payment = (id: string, extra: Partial<Payment> = {}): Payment => ({
  id,
  invoiceId: '',
  clientId: 'c1',
  amount: 1000,
  paymentMethod: 'cash',
  paymentDate: '2026-10-11',
  createdAt: '2026-10-11T09:00:00.000Z',
  updatedAt: '2026-10-11T09:00:00.000Z',
  createdBy: 'محمد',
  ...extra,
});
const debt = (id: string, extra: Partial<StandaloneDebt> = {}): StandaloneDebt => ({
  id,
  clientId: 'c1',
  partyType: 'client',
  partyName: 'العميل',
  description: 'سلفة',
  amount: 500,
  paidAmount: 100,
  remainingAmount: 400,
  status: 'partially_paid',
  date: '2026-10-05',
  createdAt: '2026-10-05T09:00:00.000Z',
  updatedAt: '2026-10-05T09:00:00.000Z',
  ...extra,
});
const custody = (id: string, extra: Partial<UserBalance> = {}): UserBalance => ({
  id,
  clientId: 'c1',
  userId: 'u1',
  userName: 'سالم',
  amount: 2000,
  date: '2026-10-01',
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  createdBy: 'محمد',
  ...extra,
});
const report = (id: string, extra: Partial<SiteReport> = {}): SiteReport => ({
  id,
  clientId: 'c1',
  title: 'تقرير أسبوعي',
  reportDate: '2026-10-12',
  progressPercent: 40,
  workersOnSite: 8,
  workCompleted: 'صب السقف',
  createdAt: '2026-10-12T09:00:00.000Z',
  updatedAt: '2026-10-12T09:00:00.000Z',
  createdBy: 'علي',
  ...extra,
});
const phase = (id: string, extra: Partial<ProjectPhase> = {}): ProjectPhase => ({
  id,
  clientId: 'c1',
  name: 'الهيكل',
  order: 1,
  status: 'in_progress',
  startDate: '2026-09-20',
  createdAt: '2026-09-19T09:00:00.000Z',
  updatedAt: '2026-09-19T09:00:00.000Z',
  ...extra,
});
const input = (partial: Partial<ActivityInput> = {}): ActivityInput => ({
  expenses: [],
  payments: [],
  debts: [],
  custodies: [],
  siteReports: [],
  phases: [],
  ...partial,
});

describe('toDay', () => {
  it('keeps a valid YYYY-MM-DD as is', () => {
    expect(toDay('2026-10-24')).toBe('2026-10-24');
    expect(toDay(' 2026-02-28 ')).toBe('2026-02-28');
  });

  it('rejects dates that do not exist on the calendar', () => {
    expect(toDay('2026-02-30')).toBe('');
    expect(toDay('2026-13-01')).toBe('');
    expect(toDay('2026-00-10')).toBe('');
    expect(toDay('2025-02-29')).toBe('');
    expect(toDay('2024-02-29')).toBe('2024-02-29');
  });

  it('turns a timestamp into the local calendar day, whatever the time zone', () => {
    expect(toDay(new Date(2026, 9, 24, 12, 0, 0).toISOString())).toBe('2026-10-24');
    expect(toDay(new Date(2026, 0, 1, 0, 30, 0).toISOString())).toBe('2026-01-01');
    expect(toDay(new Date(2026, 11, 31, 23, 30, 0).toISOString())).toBe('2026-12-31');
  });

  it('returns an empty string for anything that is not a date', () => {
    expect(toDay('')).toBe('');
    expect(toDay('اليوم')).toBe('');
    expect(toDay(undefined)).toBe('');
    expect(toDay(null)).toBe('');
    expect(toDay(20261024)).toBe('');
    expect(toDay('2026-10')).toBe('');
  });
});

describe('periodRange', () => {
  it('all has no bounds', () => {
    expect(periodRange('all', '2026-10-24')).toEqual({ from: null, to: null });
  });

  it('this month runs from the 1st to the last day', () => {
    expect(periodRange('thisMonth', '2026-10-24')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(periodRange('thisMonth', '2024-02-10')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });

  it('last month crosses the year boundary', () => {
    expect(periodRange('lastMonth', '2026-10-24')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(periodRange('lastMonth', '2026-01-05')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('this year covers January to December', () => {
    expect(periodRange('thisYear', '2026-10-24')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('custom keeps what was typed, ignores blanks and swaps a reversed range', () => {
    expect(periodRange('custom', '2026-10-24', { from: '2026-03-01', to: '2026-03-31' })).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
    });
    expect(periodRange('custom', '2026-10-24', { from: '2026-03-01', to: '' })).toEqual({ from: '2026-03-01', to: null });
    expect(periodRange('custom', '2026-10-24', { from: 'x', to: '2026-03-31' })).toEqual({ from: null, to: '2026-03-31' });
    expect(periodRange('custom', '2026-10-24', { from: '2026-04-10', to: '2026-04-01' })).toEqual({
      from: '2026-04-01',
      to: '2026-04-10',
    });
    expect(periodRange('custom', '2026-10-24')).toEqual({ from: null, to: null });
  });
});

describe('buildClientActivity', () => {
  it('merges every kind and tags the money direction', () => {
    const { items } = buildClientActivity(
      input({
        expenses: [expense('e1')],
        payments: [payment('p1')],
        debts: [debt('d1')],
        custodies: [custody('b1')],
        siteReports: [report('r1')],
        phases: [phase('ph1')],
      }),
      ALL,
    );
    const byKind = Object.fromEntries(items.map((i) => [i.kind, i]));
    expect(Object.keys(byKind).sort()).toEqual(['custody', 'debt', 'expense', 'payment', 'phase', 'siteReport']);
    expect(byKind.payment).toMatchObject({ flow: 'in', amount: 1000, id: 'p1' });
    expect(byKind.expense).toMatchObject({ flow: 'out', amount: 100, id: 'e1' });
    expect(byKind.debt).toMatchObject({ flow: 'neutral', amount: 500, id: 'd1' });
    expect(byKind.custody).toMatchObject({ flow: 'neutral', amount: 2000, id: 'b1' });
    expect(byKind.siteReport).toMatchObject({ flow: 'neutral', amount: null, id: 'r1' });
    expect(byKind.phase).toMatchObject({ flow: 'neutral', amount: null, id: 'ph1' });
  });

  it('files an expense that names a worker under the worker kind, never twice', () => {
    const w = expense('e2', { workerId: 'w1', workerName: 'أبو سالم' });
    const { items } = buildClientActivity(input({ expenses: [expense('e1'), w] }), ALL);
    expect(items.filter((i) => i.kind === 'worker').map((i) => i.id)).toEqual(['e2']);
    expect(items.filter((i) => i.kind === 'expense').map((i) => i.id)).toEqual(['e1']);
    expect(items).toHaveLength(2);
  });

  it('adds worker payments the viewer may see though they are not in the expense list, without duplicates', () => {
    const mine = expense('e1', { workerId: 'w1', workerName: 'أبو سالم' });
    const others = expense('e9', { workerId: 'w1', workerName: 'أبو سالم', userId: 'u2' });
    const { items } = buildClientActivity(input({ expenses: [mine], workerPayments: [mine, others] }), {
      ...ALL,
      expenseScope: 'own',
    });
    expect(items.map((i) => i.id).sort()).toEqual(['e1', 'e9']);
  });

  it('never lists what the viewer has no permission for, even if it is passed in', () => {
    const data = input({
      expenses: [expense('e1'), expense('e2', { workerId: 'w1' })],
      payments: [payment('p1')],
      debts: [debt('d1')],
      custodies: [custody('b1')],
      siteReports: [report('r1')],
      phases: [phase('ph1')],
    });
    const none = buildClientActivity(data, {
      expenseScope: 'none',
      payments: false,
      debts: false,
      workers: false,
      custody: false,
      projects: false,
    });
    expect(none.items).toEqual([]);
    const onlyPayments = buildClientActivity(data, { ...ALL, expenseScope: 'none', debts: false, workers: false, custody: false, projects: false });
    expect(onlyPayments.items.map((i) => i.kind)).toEqual(['payment']);
  });

  it('shows worker payments from the workers permission even without expense access', () => {
    const w = expense('e2', { workerId: 'w1', workerName: 'عمر' });
    const { items } = buildClientActivity(input({ expenses: [], workerPayments: [w] }), {
      ...ALL,
      expenseScope: 'none',
      payments: false,
    });
    expect(items.map((i) => [i.kind, i.id])).toEqual([['worker', 'e2']]);
  });

  it('falls back to the creation day when the record date is unusable, and counts what has no day at all', () => {
    const { items, skipped } = buildClientActivity(
      input({
        expenses: [
          expense('e1', { date: 'غير صالح', createdAt: '2026-08-15T09:00:00.000Z' }),
          expense('e2', { date: '', createdAt: '' }),
        ],
      }),
      ALL,
    );
    expect(items.map((i) => [i.id, i.day.slice(0, 7)])).toEqual([['e1', '2026-08']]);
    expect(skipped).toBe(1);
  });

  it('sorts newest day first, then newest creation time, then a stable key', () => {
    const { items } = buildClientActivity(
      input({
        expenses: [
          expense('a', { date: '2026-10-10', createdAt: '2026-10-10T08:00:00.000Z' }),
          expense('b', { date: '2026-10-10', createdAt: '2026-10-10T10:00:00.000Z' }),
          expense('c', { date: '2026-10-12', createdAt: '2026-10-09T10:00:00.000Z' }),
          expense('d', { date: '2026-10-10', createdAt: '2026-10-10T10:00:00.000Z' }),
        ],
      }),
      ALL,
    );
    expect(items.map((i) => i.id)).toEqual(['c', 'b', 'd', 'a']);
  });

  it('derives phase events only from real dates and states', () => {
    const { items } = buildClientActivity(
      input({
        phases: [
          phase('started', { status: 'in_progress', startDate: '2026-09-01' }),
          phase('done', { status: 'completed', startDate: '2026-07-01', endDate: '2026-08-15', name: 'الحفر' }),
          phase('planned', { status: 'planned', startDate: '2026-12-01' }),
          phase('nodates', { status: 'in_progress', startDate: undefined }),
          phase('doneNoEnd', { status: 'completed', startDate: '2026-06-01', endDate: undefined }),
        ],
      }),
      ALL,
    );
    const rows = items.map((i) => `${i.id}@${i.day}:${i.title}`).sort();
    expect(rows).toEqual(
      [
        'done@2026-07-01:بدأت مرحلة الحفر',
        'done@2026-08-15:اكتملت مرحلة الحفر',
        'doneNoEnd@2026-06-01:بدأت مرحلة الهيكل',
        'started@2026-09-01:بدأت مرحلة الهيكل',
      ].sort(),
    );
    const keys = items.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps the original ids so a row can open its record', () => {
    const { items } = buildClientActivity(input({ payments: [payment('p-77')], custodies: [custody('ub-3')] }), ALL);
    expect(items.map((i) => `${i.kind}:${i.id}`).sort()).toEqual(['custody:ub-3', 'payment:p-77']);
  });

  it('describes a site report by progress and crew, and finds it by those words', () => {
    const { items } = buildClientActivity(input({ siteReports: [report('r1', { progressPercent: 92, workersOnSite: 8 })] }), ALL);
    expect(items[0].detail.replace(/[\u2066\u2069]/g, '')).toBe('إنجاز 92% · 8 عامل');
    const hit = (query: string) => filterActivity(items, { kinds: [], range: { from: null, to: null }, query }).length;
    expect(hit('إنجاز 92%')).toBe(1);
    expect(hit('92%')).toBe(1);
    expect(hit('93%')).toBe(0);
  });

  it('never shows a raw category key, and does not repeat the worker name the description already has', () => {
    const { items } = buildClientActivity(
      input({
        expenses: [
          expense('e1', { category: 'government_fees' }),
          expense('e2', { workerId: 'w1', workerName: 'أبو سالم', description: 'دفعة حساب: أبو سالم' }),
          expense('e3', { workerId: 'w1', workerName: 'عمر', description: 'دفعة أولى' }),
        ],
      }),
      ALL,
    );
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(byId.e1.detail).toBe('رسوم حكومية');
    expect(byId.e2.detail).toBe('');
    expect(byId.e3.detail).toBe('عمر');
  });

  it('describes a debt by what is still owed', () => {
    const { items } = buildClientActivity(
      input({ debts: [debt('d1'), debt('d2', { remainingAmount: 0, paidAmount: 500, status: 'paid' })] }),
      ALL,
    );
    const d1 = items.find((i) => i.id === 'd1')!;
    const d2 = items.find((i) => i.id === 'd2')!;
    expect(d1.detail).toContain('400');
    expect(d2.detail).toBe('مسدد بالكامل');
  });
});

describe('filterActivity', () => {
  const data = buildClientActivity(
    input({
      expenses: [
        expense('e1', { description: 'أسمنت 200 كيس', amount: 5400, date: '2026-10-03', createdAt: '2026-10-03T09:00:00.000Z' }),
        expense('e2', { description: 'ضيافة موقع', amount: 180.5, date: '2026-09-30', createdAt: '2026-09-30T09:00:00.000Z', createdBy: 'فاطمة' }),
      ],
      payments: [payment('p1', { amount: 1500, paymentDate: '2026-10-31', createdAt: '2026-10-31T09:00:00.000Z', notes: 'شيك رقم 4471' })],
    }),
    ALL,
  ).items;
  const noRange = { from: null, to: null };

  it('returns everything for an empty filter', () => {
    expect(filterActivity(data, { kinds: [], range: noRange, query: '' })).toHaveLength(3);
  });

  it('filters by kind', () => {
    expect(filterActivity(data, { kinds: ['payment'], range: noRange, query: '' }).map((i) => i.id)).toEqual(['p1']);
    expect(filterActivity(data, { kinds: ['payment', 'expense'], range: noRange, query: '' })).toHaveLength(3);
  });

  it('includes both ends of the date range', () => {
    const r = filterActivity(data, { kinds: [], range: { from: '2026-09-30', to: '2026-10-03' }, query: '' });
    expect(r.map((i) => i.id).sort()).toEqual(['e1', 'e2']);
    const open = filterActivity(data, { kinds: [], range: { from: '2026-10-04', to: null }, query: '' });
    expect(open.map((i) => i.id)).toEqual(['p1']);
    const upTo = filterActivity(data, { kinds: [], range: { from: null, to: '2026-09-30' }, query: '' });
    expect(upTo.map((i) => i.id)).toEqual(['e2']);
  });

  it('searches text, notes, author and amounts, ignoring Arabic spelling variants and digit scripts', () => {
    const ids = (query: string) => filterActivity(data, { kinds: [], range: noRange, query }).map((i) => i.id);
    expect(ids('اسمنت')).toEqual(['e1']);
    expect(ids('ضيافه')).toEqual(['e2']);
    expect(ids('4471')).toEqual(['p1']);
    expect(ids('٤٤٧١')).toEqual(['p1']);
    expect(ids('فاطمة')).toEqual(['e2']);
    expect(ids('1500')).toEqual(['p1']);
    expect(ids('1,500')).toEqual(['p1']);
    expect(ids('180.5')).toEqual(['e2']);
    expect(ids('31/10/2026')).toEqual(['p1']);
  });

  it('needs every word of the query to match', () => {
    const ids = (query: string) => filterActivity(data, { kinds: [], range: noRange, query }).map((i) => i.id);
    expect(ids('اسمنت كيس')).toEqual(['e1']);
    expect(ids('اسمنت ضيافة')).toEqual([]);
    expect(ids('   ')).toHaveLength(3);
  });
});

describe('normalizeSearch', () => {
  it('folds hamza, ta marbuta, alef maqsura, diacritics and digit scripts', () => {
    expect(normalizeSearch('أسمنت')).toBe('اسمنت');
    expect(normalizeSearch('إيجار')).toBe('ايجار');
    expect(normalizeSearch('مدرسة')).toBe('مدرسه');
    expect(normalizeSearch('مستشفى')).toBe('مستشفي');
    expect(normalizeSearch('مُحَمَّد')).toBe('محمد');
    expect(normalizeSearch('١٢٣۴')).toBe('1234');
    expect(normalizeSearch('  ABC  ')).toBe('abc');
  });
});

describe('countByKind', () => {
  it('counts each kind and the total', () => {
    const { items } = buildClientActivity(
      input({ expenses: [expense('e1'), expense('e2')], payments: [payment('p1')] }),
      ALL,
    );
    expect(countByKind(items)).toMatchObject({ all: 3, expense: 2, payment: 1, debt: 0, worker: 0 });
  });
});

describe('groupActivityByMonth', () => {
  it('groups newest month first with exact in, out and net', () => {
    const { items } = buildClientActivity(
      input({
        expenses: [
          expense('e1', { amount: 0.1, date: '2026-10-02' }),
          expense('e2', { amount: 0.2, date: '2026-10-03', createdAt: '2026-10-03T09:00:00.000Z' }),
          expense('e3', { amount: 50, date: '2026-09-15', createdAt: '2026-09-15T09:00:00.000Z' }),
        ],
        payments: [payment('p1', { amount: 1000.1, paymentDate: '2026-10-04', createdAt: '2026-10-04T09:00:00.000Z' })],
        custodies: [custody('b1', { date: '2026-10-05', createdAt: '2026-10-05T09:00:00.000Z' })],
      }),
      ALL,
    );
    const months = groupActivityByMonth(items);
    expect(months.map((m) => m.key)).toEqual(['2026-10', '2026-09']);
    expect(months[0]).toMatchObject({ in: 1000.1, out: 0.3, net: 999.8 });
    expect(months[0].items).toHaveLength(4);
    expect(months[1]).toMatchObject({ in: 0, out: 50, net: -50 });
  });

  it('returns nothing for no items', () => {
    expect(groupActivityByMonth([])).toEqual([]);
  });
});

describe('activityAvailability', () => {
  it('lists every kind and no notes for someone who holds everything', () => {
    const a = activityAvailability(ALL);
    expect(a.kinds).toEqual(['expense', 'worker', 'payment', 'debt', 'custody', 'siteReport', 'phase']);
    expect(a.notes).toEqual([]);
    expect(a.netComplete).toBe(true);
  });

  it('says other people expenses are not included for own scope, and drops what is not held', () => {
    const a = activityAvailability({
      expenseScope: 'own',
      payments: false,
      debts: false,
      workers: false,
      custody: true,
      custodyScope: 'own',
      projects: false,
    });
    expect(a.kinds).toEqual(['expense', 'worker', 'custody']);
    expect(a.netComplete).toBe(false);
    expect(a.notes.join(' ')).toContain('لا تظهر مصروفات الآخرين');
    expect(a.notes.join(' ')).toContain('عهدتك');
    expect(a.notes.join(' ')).toContain('المدفوعات');
    expect(a.notes.join(' ')).toContain('الديون');
  });

  it('keeps the worker kind for people with the workers permission and no expense access', () => {
    const a = activityAvailability({
      expenseScope: 'none',
      payments: true,
      debts: false,
      workers: true,
      custody: false,
      projects: true,
    });
    expect(a.kinds).toEqual(['worker', 'payment', 'siteReport', 'phase']);
    expect(a.notes.join(' ')).toContain('المصروفات');
    expect(a.netComplete).toBe(false);
  });

  it('the net is complete only with every payment and every expense', () => {
    expect(activityAvailability({ ...ALL, payments: false }).netComplete).toBe(false);
    expect(activityAvailability({ ...ALL, expenseScope: 'own' }).netComplete).toBe(false);
    expect(activityAvailability({ ...ALL, debts: false, workers: false }).netComplete).toBe(true);
  });
});
