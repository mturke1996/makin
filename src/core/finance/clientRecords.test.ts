import { describe, expect, it } from 'vitest';
import type { Expense, Payment, StandaloneDebt } from '../../types';
import {
  EMPTY_DEBT_QUERY,
  EMPTY_EXPENSE_QUERY,
  EMPTY_PAYMENT_QUERY,
  EMPTY_RANGE,
  type ExpenseContext,
  amountSearchText,
  buildShares,
  collapseShares,
  dayOf,
  debtFacets,
  debtPartyKey,
  debtStateOf,
  expenseFacets,
  expensePersonKey,
  expenseSerials,
  filterDebts,
  filterExpenses,
  filterPayments,
  formatDayText,
  groupRecords,
  inRange,
  isDebtSettled,
  limitGroups,
  matchPreset,
  matchesSearch,
  monthOf,
  normalizeSearchText,
  paymentFacets,
  presetRange,
  sortExpenses,
  splitDebts,
  summarizeDebts,
  summarizeExpenses,
  summarizePayments,
} from './clientRecords';

const LABELS: Record<string, string> = { materials: 'مواد', labor: 'أجور عمالة', transport: 'نقل', other: 'أخرى' };
const ctx: ExpenseContext = { categoryLabel: (c: string) => LABELS[c] ?? c };

let seq = 0;
const expense = (over: Partial<Expense> = {}): Expense => ({
  id: `e${++seq}`,
  clientId: 'c1',
  description: 'أسمنت',
  amount: 100,
  category: 'materials',
  date: '2026-10-10',
  isClosed: false,
  createdAt: '2026-10-10T08:00:00.000Z',
  updatedAt: '2026-10-10T08:00:00.000Z',
  createdBy: 'علي',
  userId: 'u-ali',
  ...over,
});
const payment = (over: Partial<Payment> = {}): Payment => ({
  id: `p${++seq}`,
  invoiceId: '',
  clientId: 'c1',
  amount: 1000,
  paymentMethod: 'cash',
  paymentDate: '2026-10-10',
  createdAt: '2026-10-10T08:00:00.000Z',
  updatedAt: '2026-10-10T08:00:00.000Z',
  ...over,
});
const debt = (over: Partial<StandaloneDebt> = {}): StandaloneDebt => ({
  id: `d${++seq}`,
  clientId: 'c1',
  partyType: 'external',
  partyName: 'مورد الحديد',
  description: 'متأخرات',
  amount: 1000,
  paidAmount: 0,
  remainingAmount: 1000,
  status: 'unpaid',
  date: '2026-10-01',
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  ...over,
});

describe('search text', () => {
  it('folds the spellings people mix up and the digits they type', () => {
    expect(normalizeSearchText('أَحمد  إبراهيم')).toBe('احمد ابراهيم');
    expect(normalizeSearchText('مدرسة')).toBe('مدرسه');
    expect(normalizeSearchText('على')).toBe(normalizeSearchText('علي'));
    expect(normalizeSearchText('١٢٣٫٥')).toBe('123٫5');
    expect(normalizeSearchText('١٢٣')).toBe('123');
    expect(normalizeSearchText('1,500')).toBe('1500');
    expect(normalizeSearchText('كـــتاب')).toBe('كتاب');
    expect(normalizeSearchText(null)).toBe('');
  });

  it('needs every word, in any order, in any of the fields', () => {
    const fields = ['دفعة حساب: أبو سالم', 'أجور عمالة', 4000];
    expect(matchesSearch('', () => fields)).toBe(true);
    expect(matchesSearch('   ', () => fields)).toBe(true);
    expect(matchesSearch('ابو سالم', () => fields)).toBe(true);
    expect(matchesSearch('عمالة سالم', () => fields)).toBe(true);
    expect(matchesSearch('سالم نقل', () => fields)).toBe(false);
    expect(matchesSearch('4000', () => fields)).toBe(true);
    expect(matchesSearch('٤٠٠٠', () => fields)).toBe(true);
  });
});

describe('amount search text', () => {
  it('offers an amount as typed, grouped, and with its decimals', () => {
    expect(amountSearchText(1500)).toBe('1500 1,500');
    expect(amountSearchText(1234567.891)).toBe('1234567.891 1,234,567.891');
    expect(amountSearchText(0.5)).toBe('0.5 0.5');
    expect(amountSearchText(-250.25)).toBe('-250.25 -250.25');
    expect(amountSearchText(0.1 + 0.2)).toBe('0.3 0.3');
  });
});

describe('dates', () => {
  it('reads the day of a date or timestamp and rejects dates that do not exist', () => {
    expect(dayOf('2026-10-24')).toBe('2026-10-24');
    expect(dayOf('2026-10-24T22:30:00Z')).toBe('2026-10-24');
    expect(dayOf('2026-02-30')).toBeNull();
    expect(dayOf('2026-13-01')).toBeNull();
    expect(dayOf('2024-02-29')).toBe('2024-02-29');
    expect(dayOf('soon')).toBeNull();
    expect(dayOf('')).toBeNull();
    expect(dayOf(undefined)).toBeNull();
    expect(monthOf('2026-10-24')).toBe('2026-10');
    expect(monthOf('x')).toBeNull();
  });

  it('writes a day with Latin digits', () => {
    expect(formatDayText('2026-03-05')).toBe('05/03/2026');
    expect(formatDayText('bad')).toBe('');
  });

  it('keeps days inside a range, edges included', () => {
    const range = { from: '2026-10-05', to: '2026-10-10' };
    expect(inRange('2026-10-05', range)).toBe(true);
    expect(inRange('2026-10-10', range)).toBe(true);
    expect(inRange('2026-10-04', range)).toBe(false);
    expect(inRange('2026-10-11', range)).toBe(false);
    expect(inRange(null, range)).toBe(false);
  });

  it('treats a range open on one side or both as unbounded there', () => {
    expect(inRange('2020-01-01', { from: '', to: '2026-10-10' })).toBe(true);
    expect(inRange('2030-01-01', { from: '', to: '2026-10-10' })).toBe(false);
    expect(inRange('2030-01-01', { from: '2026-10-10', to: '' })).toBe(true);
    expect(inRange(null, EMPTY_RANGE)).toBe(true);
  });

  it('does not lose records when the two dates were typed the wrong way round', () => {
    expect(inRange('2026-10-07', { from: '2026-10-10', to: '2026-10-05' })).toBe(true);
  });

  it('turns quick periods into days, across year ends and leap years', () => {
    expect(presetRange('thisMonth', '2026-10-24')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(presetRange('lastMonth', '2026-10-24')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(presetRange('lastMonth', '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(presetRange('lastMonth', '2024-03-10')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(presetRange('last30', '2026-10-24')).toEqual({ from: '2026-09-25', to: '2026-10-24' });
    expect(presetRange('last30', '2026-03-05')).toEqual({ from: '2026-02-04', to: '2026-03-05' });
  });

  it('knows which quick period a range is', () => {
    expect(matchPreset(presetRange('lastMonth', '2026-10-24'), '2026-10-24')).toBe('lastMonth');
    expect(matchPreset({ from: '2026-10-02', to: '2026-10-31' }, '2026-10-24')).toBeNull();
    expect(matchPreset(EMPTY_RANGE, '2026-10-24')).toBeNull();
  });
});

describe('shares', () => {
  it('ranks the slices and makes the percents add up to exactly 100', () => {
    const rows = buildShares([
      { key: 'a', label: 'أ', amount: 1 },
      { key: 'b', label: 'ب', amount: 1 },
      { key: 'c', label: 'ج', amount: 1 },
    ]);
    expect(rows.map((r) => r.percent).reduce((s, p) => s + p, 0)).toBe(100);
    expect(rows.map((r) => r.percent).sort()).toEqual([33, 33, 34]);
  });

  it('orders by amount, keeps exact amounts and drops empty slices', () => {
    const rows = buildShares([
      { key: 'small', label: 'صغير', amount: 0.1, count: 2 },
      { key: 'big', label: 'كبير', amount: 0.2, count: 1 },
      { key: 'none', label: 'لا شيء', amount: 0 },
    ]);
    expect(rows.map((r) => r.key)).toEqual(['big', 'small']);
    expect(rows[0]).toMatchObject({ amount: 0.2, count: 1, percent: 67 });
    expect(rows[1]).toMatchObject({ amount: 0.1, count: 2, percent: 33 });
  });

  it('has no slices for a zero total', () => {
    expect(buildShares([])).toEqual([]);
    expect(buildShares([{ key: 'a', label: 'أ', amount: 0 }])).toEqual([]);
  });

  it('merges everything after the first slices into one other slice', () => {
    const rows = buildShares([
      { key: 'a', label: 'أ', amount: 50 },
      { key: 'b', label: 'ب', amount: 30 },
      { key: 'c', label: 'ج', amount: 10.1 },
      { key: 'd', label: 'د', amount: 9.9 },
    ]);
    const collapsed = collapseShares(rows, 2, 'غير ذلك');
    expect(collapsed.map((r) => r.key)).toEqual(['a', 'b', '__other']);
    expect(collapsed[2]).toMatchObject({ label: 'غير ذلك', amount: 20, count: 2, percent: 20 });
    expect(collapsed.reduce((s, r) => s + r.percent, 0)).toBe(100);
    expect(collapseShares(rows, 4, 'x')).toHaveLength(4);
  });
});

describe('groups', () => {
  const items = [
    { id: 1, date: '2026-10-20', amount: 0.1 },
    { id: 2, date: '2026-10-20', amount: 0.2 },
    { id: 3, date: '2026-09-02', amount: 5 },
    { id: 4, date: 'bad', amount: 7 },
    { id: 5, date: '2026-10-01', amount: 1 },
  ];
  const group = (by: 'month' | 'day' | 'none') =>
    groupRecords(
      items,
      (i) => i.date,
      (i) => i.amount,
      by
    );

  it('groups by month in order of appearance with exact totals and the undated last', () => {
    const groups = group('month');
    expect(groups.map((g) => g.key)).toEqual(['2026-10', '2026-09', 'undated']);
    expect(groups[0]).toMatchObject({ kind: 'month', count: 3, total: 1.3 });
    expect(groups[2]).toMatchObject({ kind: 'undated', count: 1, total: 7 });
  });

  it('groups by day', () => {
    const groups = group('day');
    expect(groups.map((g) => g.key)).toEqual(['2026-10-20', '2026-09-02', '2026-10-01', 'undated']);
    expect(groups[0].total).toBe(0.3);
  });

  it('can leave everything in one group, undated records included', () => {
    const groups = group('none');
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'all', kind: 'all', count: 5, total: 13.3 });
  });

  it('cuts the rows shown but not the totals of a group', () => {
    const { groups, shown, hidden } = limitGroups(group('month'), 2);
    expect(shown).toBe(2);
    expect(hidden).toBe(3);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0]).toMatchObject({ count: 3, total: 1.3 });
    expect(limitGroups(group('month'), 99).hidden).toBe(0);
    expect(limitGroups(group('month'), 0).groups).toEqual([]);
  });
});

describe('expenses', () => {
  const list = [
    expense({
      id: 'a',
      description: 'أسمنت 200 كيس',
      amount: 5400,
      category: 'materials',
      date: '2026-08-02',
      userId: 'u-admin',
      createdBy: 'محمد',
    }),
    expense({
      id: 'b',
      description: 'نقل مواد',
      amount: 1200,
      category: 'transport',
      date: '2026-09-15',
      userId: 'u-salem',
      createdBy: 'سالم',
    }),
    expense({
      id: 'c',
      description: 'دفعة حساب: أبو سالم',
      amount: 4000,
      category: 'labor',
      date: '2026-10-04',
      userId: 'u-admin',
      createdBy: 'محمد',
      workerName: 'أبو سالم',
    }),
    expense({
      id: 'd',
      description: 'ضيافة',
      amount: 180.5,
      category: 'other',
      date: '2026-10-20',
      userId: 'u-ali',
      createdBy: 'علي',
      invoiceNumber: 'F-77',
    }),
    expense({
      id: 'e',
      description: 'مواد كهرباء',
      amount: 3150,
      category: 'materials',
      date: '2026-10-20',
      userId: 'u-ali',
      createdBy: 'علي',
      createdAt: '2026-10-20T15:00:00.000Z',
    }),
  ];
  const run = (q: Partial<typeof EMPTY_EXPENSE_QUERY>, extra = ctx) =>
    filterExpenses(list, { ...EMPTY_EXPENSE_QUERY, ...q }, extra).map((e) => e.id);

  it('keeps everything with no filters, newest first and later entries first on a tie', () => {
    expect(run({})).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  it('sorts oldest first and by size', () => {
    expect(run({ sort: 'oldest' })).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(run({ sort: 'largest' })).toEqual(['a', 'c', 'e', 'b', 'd']);
  });

  it('sends expenses without a valid day last in both directions', () => {
    const odd = [expense({ id: 'x', date: 'bad' }), ...list];
    expect(sortExpenses(odd, 'newest')[odd.length - 1].id).toBe('x');
    expect(sortExpenses(odd, 'oldest')[odd.length - 1].id).toBe('x');
  });

  it('filters by category, person and period, all of them together', () => {
    expect(run({ categories: ['materials'] })).toEqual(['e', 'a']);
    expect(run({ people: ['u-ali'] })).toEqual(['e', 'd']);
    expect(run({ categories: ['materials'], people: ['u-ali'] })).toEqual(['e']);
    expect(run({ range: { from: '2026-10-01', to: '2026-10-31' } })).toEqual(['e', 'd', 'c']);
    expect(run({ categories: ['materials', 'transport'] })).toEqual(['e', 'b', 'a']);
  });

  it('searches the description, the category name, the invoice, the person, the worker and the amount', () => {
    expect(run({ search: 'اسمنت' })).toEqual(['a']);
    expect(run({ search: 'نقل' })).toEqual(['b']);
    expect(run({ search: 'f-77' })).toEqual(['d']);
    expect(run({ search: 'محمد' })).toEqual(['c', 'a']);
    expect(run({ search: 'ابو سالم' })).toEqual(['c']);
    expect(run({ search: '5400' })).toEqual(['a']);
    expect(run({ search: '5,400' })).toEqual(['a']);
    expect(run({ search: '180.5' })).toEqual(['d']);
    expect(run({ search: '20/10/2026' })).toEqual(['e', 'd']);
    expect(run({ search: 'مواد علي' })).toEqual(['e']);
  });

  it('applies the screen predicate before everything else', () => {
    expect(run({}, { ...ctx, predicate: (e) => e.userId === 'u-admin' })).toEqual(['c', 'a']);
  });

  it('numbers expenses by when they were recorded, whatever order they are shown in', () => {
    const entered = [
      expense({ id: 'late', createdAt: '2026-10-20T09:00:00.000Z', date: '2026-08-01' }),
      expense({ id: 'first', createdAt: '2026-08-01T09:00:00.000Z', date: '2026-08-01' }),
      expense({ id: 'tie-b', createdAt: '2026-09-01T09:00:00.000Z', date: '2026-09-02' }),
      expense({ id: 'tie-a', createdAt: '2026-09-01T09:00:00.000Z', date: '2026-09-01' }),
    ];
    const serials = expenseSerials(entered);
    expect([...serials.entries()].sort((a, b) => a[1] - b[1])).toEqual([
      ['first', 1],
      ['tie-a', 2],
      ['tie-b', 3],
      ['late', 4],
    ]);
  });

  it('names a person by the account, or by the recorded name when there is no account', () => {
    expect(expensePersonKey({ userId: 'u1', createdBy: 'علي' })).toBe('u1');
    expect(expensePersonKey({ createdBy: ' سالم ' })).toBe('name:سالم');
    expect(expensePersonKey({})).toBe('unknown');
  });

  it('counts the choices of a facet with the other filters applied, and keeps a selected empty choice', () => {
    const none = expenseFacets(list, EMPTY_EXPENSE_QUERY, ctx);
    expect(none.categories.map((c) => [c.key, c.count])).toEqual([
      ['materials', 2],
      ['labor', 1],
      ['transport', 1],
      ['other', 1],
    ]);
    expect(none.categories[0]).toMatchObject({ label: 'مواد', amount: 8550 });
    expect(none.people.map((p) => [p.key, p.count])).toEqual([
      ['u-admin', 2],
      ['u-ali', 2],
      ['u-salem', 1],
    ]);

    const alis = expenseFacets(list, { ...EMPTY_EXPENSE_QUERY, people: ['u-ali'] }, ctx);
    expect(alis.categories.map((c) => c.key).sort()).toEqual(['materials', 'other']);
    expect(alis.people.map((p) => p.key)).toContain('u-admin');

    const stale = expenseFacets(list, { ...EMPTY_EXPENSE_QUERY, categories: ['transport'], people: ['u-ali'] }, ctx);
    expect(stale.categories.find((c) => c.key === 'transport')).toMatchObject({ count: 0, amount: 0 });
    expect(stale.people.find((p) => p.key === 'u-ali')).toMatchObject({ count: 0 });
    expect(stale.people.find((p) => p.key === 'u-salem')).toMatchObject({ count: 1 });
  });

  it('adds up exactly and ranks where the money went', () => {
    const summary = summarizeExpenses(list, ctx);
    expect(summary.count).toBe(5);
    expect(summary.total).toBe(13930.5);
    expect(summary.byCategory.map((r) => r.key)).toEqual(['materials', 'labor', 'transport', 'other']);
    expect(summary.byCategory[0]).toMatchObject({ amount: 8550, count: 2 });
    expect(summary.byCategory.reduce((s, r) => s + r.percent, 0)).toBe(100);
    expect(summary.byPerson[0]).toMatchObject({ key: 'u-admin', label: 'محمد', amount: 9400 });
  });

  it('does not drift on decimals', () => {
    const cents = [expense({ amount: 0.1 }), expense({ amount: 0.2 }), expense({ amount: 0.001 })];
    expect(summarizeExpenses(cents, ctx).total).toBe(0.301);
  });

  it('summarises nothing without failing', () => {
    expect(summarizeExpenses([], ctx)).toEqual({ count: 0, total: 0, byCategory: [], byPerson: [] });
  });

  it('labels a person from the directory when the expense carries no name', () => {
    const anon = [expense({ createdBy: undefined, userId: 'u9' })];
    const withDirectory = { ...ctx, nameOfUser: (id: string) => (id === 'u9' ? 'خالد' : undefined) };
    expect(summarizeExpenses(anon, withDirectory).byPerson[0].label).toBe('خالد');
    expect(summarizeExpenses(anon, ctx).byPerson[0].label).toBe('مستخدم غير معروف');
  });
});

describe('payments', () => {
  const methodLabel = (m: string) => ({ cash: 'نقدي', check: 'شيك', bank_transfer: 'تحويل بنكي' })[m] ?? m;
  const pctx = { methodLabel };
  const list = [
    payment({ id: 'p1', amount: 30000, paymentMethod: 'bank_transfer', paymentDate: '2026-08-03', notes: 'دفعة أولى' }),
    payment({ id: 'p2', amount: 20000, paymentMethod: 'check', paymentDate: '2026-09-12', notes: 'شيك رقم 4471' }),
    payment({ id: 'p3', amount: 2500.5, paymentMethod: 'cash', paymentDate: '2026-10-05' }),
    payment({ id: 'p4', amount: 7000, paymentMethod: 'cash', paymentDate: '2026-10-19', createdBy: 'فاطمة' }),
  ];
  const run = (q: Partial<typeof EMPTY_PAYMENT_QUERY>) =>
    filterPayments(list, { ...EMPTY_PAYMENT_QUERY, ...q }, pctx).map((p) => p.id);

  it('lists newest first, oldest first or largest first', () => {
    expect(run({})).toEqual(['p4', 'p3', 'p2', 'p1']);
    expect(run({ sort: 'oldest' })).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(run({ sort: 'largest' })).toEqual(['p1', 'p2', 'p4', 'p3']);
  });

  it('filters by method and month', () => {
    expect(run({ methods: ['cash'] })).toEqual(['p4', 'p3']);
    expect(run({ month: '2026-10' })).toEqual(['p4', 'p3']);
    expect(run({ month: '2026-10', methods: ['check'] })).toEqual([]);
  });

  it('searches the method name, the notes, the amount and the person', () => {
    expect(run({ search: 'شيك' })).toEqual(['p2']);
    expect(run({ search: 'تحويل' })).toEqual(['p1']);
    expect(run({ search: 'اولى' })).toEqual(['p1']);
    expect(run({ search: '30,000' })).toEqual(['p1']);
    expect(run({ search: '2500.5' })).toEqual(['p3']);
    expect(run({ search: 'فاطمه' })).toEqual(['p4']);
  });

  it('offers months newest first and methods with their counts', () => {
    const facets = paymentFacets(list, EMPTY_PAYMENT_QUERY, pctx);
    expect(facets.months.map((m) => [m.key, m.count])).toEqual([
      ['2026-10', 2],
      ['2026-09', 1],
      ['2026-08', 1],
    ]);
    expect(facets.methods.map((m) => [m.key, m.count])).toEqual([
      ['cash', 2],
      ['bank_transfer', 1],
      ['check', 1],
    ]);
    const cashOnly = paymentFacets(list, { ...EMPTY_PAYMENT_QUERY, methods: ['cash'] }, pctx);
    expect(cashOnly.months.map((m) => m.key)).toEqual(['2026-10']);
    expect(cashOnly.methods).toHaveLength(3);
  });

  it('adds up exactly and splits by method', () => {
    const summary = summarizePayments(list, pctx);
    expect(summary.total).toBe(59500.5);
    expect(summary.count).toBe(4);
    expect(summary.byMethod[0]).toMatchObject({ key: 'bank_transfer', amount: 30000, percent: 50 });
    expect(summary.byMethod.find((m) => m.key === 'cash')).toMatchObject({ amount: 9500.5, count: 2 });
    expect(summary.byMethod.reduce((s, m) => s + m.percent, 0)).toBe(100);
  });
});

describe('debts', () => {
  const list = [
    debt({
      id: 'd1',
      partyName: 'مورد الحديد',
      amount: 9800,
      paidAmount: 0,
      remainingAmount: 9800,
      status: 'overdue',
      date: '2026-08-01',
    }),
    debt({
      id: 'd2',
      partyName: 'شركة النور',
      amount: 6000,
      paidAmount: 2000,
      remainingAmount: 4000,
      status: 'partially_paid',
      date: '2026-09-01',
    }),
    debt({
      id: 'd3',
      partyName: 'شركة النور',
      amount: 1500.25,
      paidAmount: 1500.25,
      remainingAmount: 0,
      status: 'paid',
      date: '2026-07-01',
    }),
    debt({
      id: 'd4',
      partyName: 'مقاول الباطن',
      amount: 800,
      paidAmount: 0,
      remainingAmount: 800,
      status: 'unpaid',
      date: '2026-10-01',
    }),
  ];
  const run = (q: Partial<typeof EMPTY_DEBT_QUERY>) => filterDebts(list, { ...EMPTY_DEBT_QUERY, ...q }).map((d) => d.id);

  it('reads the state of a debt the way the sheet always has', () => {
    expect(debtStateOf(list[0])).toBe('overdue');
    expect(debtStateOf(list[1])).toBe('partial');
    expect(debtStateOf(list[2])).toBe('settled');
    expect(debtStateOf(list[3])).toBe('unpaid');
    expect(isDebtSettled(debt({ status: 'unpaid', remainingAmount: 0 }))).toBe(true);
    expect(isDebtSettled(debt({ status: 'paid', remainingAmount: 5 }))).toBe(true);
    expect(isDebtSettled(debt({ status: 'unpaid', remainingAmount: 0.0004 }))).toBe(true);
  });

  it('filters by status: open includes the overdue ones', () => {
    expect(run({ status: 'open' })).toEqual(['d4', 'd2', 'd1']);
    expect(run({ status: 'overdue' })).toEqual(['d1']);
    expect(run({ status: 'settled' })).toEqual(['d3']);
    expect(run({ status: 'all' })).toEqual(['d4', 'd2', 'd1', 'd3']);
  });

  it('filters by party and searches the party, the description and the amount', () => {
    expect(run({ parties: [debtPartyKey(list[1])] })).toEqual(['d2', 'd3']);
    expect(run({ search: 'حديد' })).toEqual(['d1']);
    expect(run({ search: '9800' })).toEqual(['d1']);
    expect(run({ search: '1500.25' })).toEqual(['d3']);
  });

  it('sorts the largest debt as the one with the most still owed', () => {
    expect(run({ sort: 'largest' })).toEqual(['d1', 'd2', 'd4', 'd3']);
    expect(run({ sort: 'oldest' })).toEqual(['d3', 'd1', 'd2', 'd4']);
  });

  it('counts the status chips with the party and search applied', () => {
    expect(debtFacets(list, EMPTY_DEBT_QUERY).status).toEqual({ all: 4, open: 3, overdue: 1, settled: 1 });
    const nour = debtFacets(list, { ...EMPTY_DEBT_QUERY, parties: [debtPartyKey(list[1])] });
    expect(nour.status).toEqual({ all: 2, open: 1, overdue: 0, settled: 1 });
    expect(nour.parties.map((p) => [p.label, p.count])).toEqual([
      ['شركة النور', 2],
      ['مورد الحديد', 1],
      ['مقاول الباطن', 1],
    ]);
  });

  it('puts open debts before settled ones', () => {
    const { open, settled } = splitDebts(list);
    expect(open.map((d) => d.id)).toEqual(['d1', 'd2', 'd4']);
    expect(settled.map((d) => d.id)).toEqual(['d3']);
  });

  it('adds up what the debts were worth, what was paid and what is left, exactly', () => {
    const summary = summarizeDebts(list);
    expect(summary).toMatchObject({ count: 4, openCount: 3, overdueCount: 1, value: 18100.25, paid: 3500.25, remaining: 14600 });
    expect(summary.paidPercent).toBe(19);
    expect(summarizeDebts([])).toMatchObject({ count: 0, value: 0, paid: 0, remaining: 0, paidPercent: 0 });
  });
});
