import { describe, expect, it } from 'vitest';
import type { Invoice, Payment } from '../../types';
import { buildClientInsights, daysWord, type InsightInput } from './clientInsights';

const TODAY = '2026-10-24';

const totals = (over: Partial<InsightInput['totals']> = {}): InsightInput['totals'] => ({
  expenses: 1000,
  paid: 1000,
  clientDeficit: 0,
  agreedPercentageDeficit: 0,
  profitPercentage: 0,
  profitBase: 'expenses',
  ...over,
});

const base = (over: Partial<InsightInput> = {}): InsightInput => ({
  today: TODAY,
  totals: totals(),
  expenses: [],
  payments: [],
  ...over,
});

const ids = (input: InsightInput) => buildClientInsights(input).map((i) => i.id);
const one = (input: InsightInput, id: string) => buildClientInsights(input).find((i) => i.id === id);

const payment = (paymentDate: string, amount: number, invoiceId = 'i0'): Payment =>
  ({ id: `p-${paymentDate}`, invoiceId, clientId: 'c', amount, paymentMethod: 'cash', paymentDate, createdAt: paymentDate, updatedAt: paymentDate }) as Payment;

const expense = (id: string, date: string, amount: number, description = 'مصروف') => ({ id, date, amount, description });

const invoice = (over: Partial<Invoice> & Pick<Invoice, 'id' | 'total'>): Invoice =>
  ({
    invoiceNumber: `INV-${over.id}`,
    clientId: 'c',
    items: [],
    subtotal: over.total,
    taxRate: 0,
    taxAmount: 0,
    status: 'sent',
    issueDate: '2026-08-01',
    dueDate: '2026-09-01',
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as Invoice;

describe('a healthy account', () => {
  it('has nothing to say', () => {
    expect(buildClientInsights(base())).toEqual([]);
  });

  it('is deterministic', () => {
    const input = base({ totals: totals({ expenses: 3000, paid: 1000, agreedPercentageDeficit: 100, clientDeficit: 2000 }) });
    expect(buildClientInsights(input)).toEqual(buildClientInsights(input));
  });
});

describe('collection rules', () => {
  it('warns when expenses exceed what was collected, with the gap', () => {
    const i = one(base({ totals: totals({ expenses: 1000, paid: 800, clientDeficit: 200 }) }), 'expenses-exceed-collections')!;
    expect(i.severity).toBe('warning');
    expect(i.action).toBe('statement');
    expect(i.reason).toContain('200');
    expect(i.reason).not.toContain('ومع الديون');
  });

  it('adds the deficit with debts when it is larger than the gap', () => {
    const i = one(base({ totals: totals({ expenses: 1000, paid: 800, clientDeficit: 500 }) }), 'expenses-exceed-collections')!;
    expect(i.reason).toContain('ومع الديون يبلغ العجز');
    expect(i.reason).toContain('500');
  });

  it('turns into a danger when less than half was collected', () => {
    const list = buildClientInsights(base({ totals: totals({ expenses: 1000, paid: 400, clientDeficit: 600 }) }));
    expect(list[0]).toMatchObject({ id: 'low-collection', severity: 'danger', action: 'payments' });
    expect(list[0].reason).toContain('40%');
    expect(list.map((i) => i.id)).not.toContain('expenses-exceed-collections');
  });

  it('says plainly that nothing was collected', () => {
    const i = one(base({ totals: totals({ expenses: 500, paid: 0, clientDeficit: 500 }) }), 'low-collection')!;
    expect(i.reason).toContain('لم يُحصَّل أي مبلغ');
  });

  it('treats exactly half as the warning, not the danger', () => {
    expect(ids(base({ totals: totals({ expenses: 1000, paid: 500, clientDeficit: 500 }) }))).toEqual(['expenses-exceed-collections']);
  });

  it('flags a deficit that comes from debts or the percentage while expenses are covered', () => {
    const i = one(base({ totals: totals({ expenses: 800, paid: 1000, clientDeficit: 150 }) }), 'account-deficit')!;
    expect(i).toMatchObject({ severity: 'warning', action: 'statement' });
    expect(i.reason).toContain('150');
  });

  it('writes amounts rounded to the thousandth', () => {
    const i = one(base({ totals: totals({ agreedPercentageDeficit: 1627.602273, profitPercentage: 12, profitBase: 'payments' }) }), 'percentage-deficit')!;
    expect(i.reason).toContain('1,627.602');
    expect(i.reason).not.toContain('1,627.6022');
  });

  it('compares in thousandths', () => {
    expect(ids(base({ totals: totals({ expenses: 0.1 + 0.2, paid: 0.3 }) }))).toEqual([]);
  });
});

describe('agreed percentage deficit', () => {
  it('names the percentage and explains it by the base', () => {
    const onExpenses = one(base({ totals: totals({ agreedPercentageDeficit: 120, profitPercentage: 10, profitBase: 'expenses' }) }), 'percentage-deficit')!;
    expect(onExpenses.title).toContain('10%');
    expect(onExpenses.reason).toContain('لم تُغطَّ من النسبة المحتسبة على المصروفات');
    expect(onExpenses.action).toBe('profit');

    const onPayments = one(base({ totals: totals({ agreedPercentageDeficit: 120, profitPercentage: 12, profitBase: 'payments' }) }), 'percentage-deficit')!;
    expect(onPayments.reason).toContain('عند تحصيله');
  });

  it('is silent without a deficit', () => {
    expect(ids(base({ totals: totals({ profitPercentage: 10 }) }))).toEqual([]);
  });
});

describe('custody', () => {
  const line = (over: Partial<{ name: string; given: number; spent: number; remaining: number; exact: boolean }>) => ({
    name: 'سالم',
    given: 1000,
    spent: 400,
    remaining: 600,
    exact: true,
    ...over,
  });

  it('alerts when a custody ran out', () => {
    const i = one(base({ custody: [line({ spent: 1000, remaining: 0 })] }), 'custody-depleted')!;
    expect(i).toMatchObject({ severity: 'warning', action: 'balances' });
    expect(i.title).toBe('نفد رصيد عهدة سالم');
  });

  it('alerts with danger when a custody is overdrawn and says by how much', () => {
    const i = one(base({ custody: [line({ spent: 1250, remaining: -250 })] }), 'custody-overdrawn')!;
    expect(i.severity).toBe('danger');
    expect(i.reason).toContain('250');
    expect(ids(base({ custody: [line({ spent: 1250, remaining: -250 })] }))).not.toContain('custody-depleted');
  });

  it('groups several overdrawn custodies and names the largest', () => {
    const i = one(
      base({
        custody: [
          line({ name: 'علي', remaining: -100, spent: 1100 }),
          line({ name: 'سالم', remaining: -900, spent: 1900 }),
          line({ name: 'خالد', remaining: -20, spent: 1020 }),
        ],
      }),
      'custody-overdrawn',
    )!;
    expect(i.title).toBe('3 عهد تجاوزت رصيدها');
    expect(i.reason).toContain('سالم');
  });

  it('agrees the verb with the count', () => {
    const lines = (n: number) => Array.from({ length: n }, (_, k) => line({ name: `م${k}`, remaining: -10 - k, spent: 1010 + k }));
    expect(one(base({ custody: lines(2) }), 'custody-overdrawn')!.title).toBe('عهدتان تجاوزتا رصيدهما');
    expect(one(base({ custody: lines(4) }), 'custody-overdrawn')!.title).toBe('4 عهد تجاوزت رصيدها');
  });

  it('joins the names of several depleted custodies', () => {
    const i = one(base({ custody: [line({ name: 'علي', remaining: 0 }), line({ name: 'سالم', remaining: 0 })] }), 'custody-depleted')!;
    expect(i.title).toBe('نفد رصيد عهدتين');
    expect(i.reason).toContain('علي وسالم');
  });

  it('never alerts on a line whose spending the viewer cannot see in full, or on custody never given', () => {
    expect(ids(base({ custody: [line({ exact: false, remaining: -500 })] }))).toEqual([]);
    expect(ids(base({ custody: [line({ given: 0, spent: 0, remaining: 0 })] }))).toEqual([]);
  });

  it('is silent while there is balance left', () => {
    expect(ids(base({ custody: [line({})] }))).toEqual([]);
  });
});

describe('phase budgets', () => {
  const row = (name: string, budget: number, actual: number) => ({ phase: { id: name, name }, budget, actual });

  it('names a phase over its budget', () => {
    const i = one(base({ phases: [row('الهيكل', 1000, 1100)] }), 'phase-over-budget')!;
    expect(i.title).toBe('مرحلة الهيكل تجاوزت ميزانيتها');
    expect(i.severity).toBe('warning');
    expect(i.reason).toContain('100');
    expect(i.reason).toContain('10%');
    expect(i.action).toBe('phases');
  });

  it('is a danger from 20 percent over', () => {
    expect(one(base({ phases: [row('الهيكل', 1000, 1200)] }), 'phase-over-budget')!.severity).toBe('danger');
    expect(one(base({ phases: [row('الهيكل', 1000, 1199)] }), 'phase-over-budget')!.severity).toBe('warning');
  });

  it('groups several phases and names the worst', () => {
    const i = one(base({ phases: [row('أ', 100, 130), row('ب', 100, 105), row('ج', 100, 90)] }), 'phase-over-budget')!;
    expect(i.title).toBe('مرحلتان تجاوزتا ميزانيتهما');
    expect(i.reason).toContain('أ');
  });

  it('ignores phases without a budget or comfortably within it', () => {
    expect(ids(base({ phases: [row('أ', 0, 500), row('ب', 100, 79), row('ج', 100, 40)] }))).toEqual([]);
  });

  it('warns early, from 80 percent of the budget up to the budget itself', () => {
    const i = one(base({ phases: [row('الهيكل', 1000, 850)] }), 'phase-near-budget')!;
    expect(i).toMatchObject({ severity: 'warning', action: 'phases', title: 'مرحلة الهيكل قاربت ميزانيتها' });
    expect(i.reason).toContain('85%');
    expect(one(base({ phases: [row('الهيكل', 1000, 1000)] }), 'phase-near-budget')).toBeDefined();
    expect(one(base({ phases: [row('الهيكل', 1000, 1001)] }), 'phase-near-budget')).toBeUndefined(); // that one is over
  });

  it('keeps near and over apart when both exist', () => {
    expect(ids(base({ phases: [row('أ', 100, 130), row('ب', 100, 90)] }))).toEqual(['phase-over-budget', 'phase-near-budget']);
  });
});

describe('the estimate by category', () => {
  const cat = (label: string, budget: number, actual: number, state: 'ok' | 'near' | 'over' | 'unbudgeted') => ({ label, budget, actual, state });

  it('names a category that went past its estimate and leads to the bill of quantities', () => {
    const i = one(base({ categories: [cat('حديد تسليح', 50000, 52000, 'over')] }), 'category-over-budget')!;
    expect(i).toMatchObject({ severity: 'warning', action: 'boq', title: 'بند حديد تسليح تجاوز تقديره' });
    expect(i.reason).toContain('2,000');
  });

  it('is a danger from 20 percent over, and groups several', () => {
    expect(one(base({ categories: [cat('أ', 100, 125, 'over')] }), 'category-over-budget')!.severity).toBe('danger');
    expect(one(base({ categories: [cat('أ', 100, 125, 'over'), cat('ب', 100, 110, 'over')] }), 'category-over-budget')!.title).toBe('تصنيفان تجاوزت تقديرها');
  });

  it('warns when a category nears its estimate, and says nothing for fine or unbudgeted ones', () => {
    expect(one(base({ categories: [cat('خرسانة', 20000, 16500, 'near')] }), 'category-near-budget')!.title).toBe('بند خرسانة قارب تقديره');
    expect(ids(base({ categories: [cat('أ', 100, 10, 'ok'), cat('ب', 0, 300, 'unbudgeted')] }))).toEqual([]);
  });
});

describe('a quiet stretch without payments', () => {
  const spendingGrew = [expense('e1', '2026-10-20', 800), expense('e2', '2026-09-10', 100)];

  it('fires after 30 days without a payment when spending grew', () => {
    const i = one(base({ payments: [payment('2026-09-10', 500)], expenses: spendingGrew }), 'no-recent-payment')!;
    expect(i).toMatchObject({ severity: 'warning', action: 'payments' });
    expect(i.title).toBe('لا دفعات منذ 44 يوماً');
    expect(i.reason).toContain('10/09/2026');
  });

  it('is a danger after 60 days', () => {
    const i = one(base({ payments: [payment('2026-08-01', 500)], expenses: spendingGrew }), 'no-recent-payment')!;
    expect(i.severity).toBe('danger');
  });

  it('does not fire when the last payment is recent, or spending did not grow, or there is no payment at all', () => {
    expect(ids(base({ payments: [payment('2026-10-01', 500)], expenses: spendingGrew }))).not.toContain('no-recent-payment');
    expect(ids(base({ payments: [payment('2026-09-10', 500)], expenses: [expense('e1', '2026-10-20', 100), expense('e2', '2026-09-20', 900)] }))).not.toContain(
      'no-recent-payment',
    );
    expect(ids(base({ payments: [], expenses: spendingGrew }))).not.toContain('no-recent-payment');
    expect(ids(base({ payments: [payment('2026-09-10', 500)], expenses: [] }))).not.toContain('no-recent-payment');
  });

  it('counts exactly 30 days as quiet and 29 as not', () => {
    expect(ids(base({ payments: [payment('2026-09-24', 500)], expenses: spendingGrew }))).toContain('no-recent-payment');
    expect(ids(base({ payments: [payment('2026-09-25', 500)], expenses: spendingGrew }))).not.toContain('no-recent-payment');
  });

  it('ignores payments dated in the future', () => {
    expect(ids(base({ payments: [payment('2026-09-10', 500), payment('2027-01-01', 5)], expenses: spendingGrew }))).toContain('no-recent-payment');
  });
});

describe('one big expense', () => {
  it('notices an expense that makes up 40 percent of the month', () => {
    const expenses = [expense('a', '2026-10-02', 800, 'حديد تسليح'), expense('b', '2026-10-05', 100), expense('c', '2026-10-09', 100)];
    const i = one(base({ expenses }), 'large-expense')!;
    expect(i.severity).toBe('info');
    expect(i.action).toBe('expenses');
    expect(i.title).toContain('80%');
    expect(i.title).toContain('هذا الشهر');
    expect(i.reason).toContain('حديد تسليح');
  });

  it('needs at least three expenses in the month', () => {
    expect(ids(base({ expenses: [expense('a', '2026-10-02', 900), expense('b', '2026-10-05', 100)] }))).toEqual([]);
  });

  it('falls back to the previous month when this month has too few', () => {
    const expenses = [
      expense('a', '2026-09-02', 900),
      expense('b', '2026-09-05', 50),
      expense('c', '2026-09-09', 50),
      expense('d', '2026-10-01', 10),
    ];
    const i = one(base({ expenses }), 'large-expense')!;
    expect(i.title).toContain('الشهر الماضي');
  });

  it('stays quiet when spending is spread out', () => {
    const expenses = [expense('a', '2026-10-02', 300), expense('b', '2026-10-05', 350), expense('c', '2026-10-09', 350)];
    expect(ids(base({ expenses }))).toEqual([]);
  });

  it('shortens a very long description', () => {
    const long = 'ا'.repeat(80);
    const i = one(base({ expenses: [expense('a', '2026-10-02', 900, long), expense('b', '2026-10-05', 50), expense('c', '2026-10-09', 50)] }), 'large-expense')!;
    expect(i.reason.length).toBeLessThan(160);
    expect(i.reason).toContain('…');
  });
});

describe('workers and debts', () => {
  it('mentions what workers are still owed, only when the figure is given', () => {
    const i = one(base({ totals: totals({ workersDue: 4500 }) }), 'workers-due')!;
    expect(i).toMatchObject({ severity: 'info', action: 'workers' });
    expect(i.reason).toContain('4,500');
    expect(ids(base({ totals: totals({ workersDue: 0 }) }))).toEqual([]);
    expect(ids(base())).toEqual([]);
  });

  it('flags debts past their due date with the oldest', () => {
    const i = one(
      base({
        debts: [
          { remainingAmount: 400, dueDate: '2026-10-14' },
          { remainingAmount: 600, dueDate: '2026-09-24' },
          { remainingAmount: 900, dueDate: '2026-12-01' },
          { remainingAmount: 0, dueDate: '2026-01-01' },
        ],
      }),
      'debts-overdue',
    )!;
    expect(i).toMatchObject({ severity: 'warning', action: 'debts' });
    expect(i.reason).toContain('1,000');
    expect(i.reason).toContain('30 يوماً');
    expect(i.reason).toContain('من دينان');
  });

  it('words a single late debt without a count', () => {
    const i = one(base({ debts: [{ remainingAmount: 400, dueDate: '2026-10-14' }] }), 'debts-overdue')!;
    expect(i.reason).toBe(`المتبقي 400\u00A0د.ل وهو متأخر 10 أيام.`);
  });

  it('ignores debts without a due date or not yet due', () => {
    expect(ids(base({ debts: [{ remainingAmount: 100 }, { remainingAmount: 100, dueDate: TODAY }] }))).toEqual([]);
  });
});

describe('invoices', () => {
  it('flags overdue invoices with the remaining amount and the oldest', () => {
    const invoices = [
      invoice({ id: 'a', total: 1000, dueDate: '2026-10-04' }),
      invoice({ id: 'b', total: 500, dueDate: '2026-10-20' }),
    ];
    const i = one(base({ invoices, payments: [payment('2026-10-10', 300, 'a')] }), 'invoices-overdue')!;
    expect(i).toMatchObject({ severity: 'warning', action: 'invoices' });
    expect(i.title).toBe('فاتورتان متأخرتان عن السداد');
    expect(i.reason).toContain('1,200');
    expect(i.reason).toContain('INV-\u2060a');
    expect(i.reason).toContain('20 يوماً');
  });

  it('agrees the title with the count', () => {
    const many = (n: number) => Array.from({ length: n }, (_, k) => invoice({ id: `x${k}`, total: 10, dueDate: '2026-10-01' }));
    expect(one(base({ invoices: many(1) }), 'invoices-overdue')!.title).toBe('فاتورة واحدة متأخرة عن السداد');
    expect(one(base({ invoices: many(5) }), 'invoices-overdue')!.title).toBe('5 فواتير متأخرة عن السداد');
    expect(one(base({ invoices: many(12) }), 'invoices-overdue')!.title).toBe('12 فاتورة متأخرة عن السداد');
  });

  it('is a danger from 30 days overdue', () => {
    const i = one(base({ invoices: [invoice({ id: 'a', total: 1000, dueDate: '2026-09-20' })] }), 'invoices-overdue')!;
    expect(i.severity).toBe('danger');
  });

  it('lists open invoices that are not due yet separately, as information', () => {
    const invoices = [invoice({ id: 'a', total: 1000, dueDate: '2026-12-01' }), invoice({ id: 'b', total: 400, dueDate: '2026-11-15', status: 'partially_paid' })];
    const list = buildClientInsights(base({ invoices, payments: [payment('2026-10-01', 100, 'b')] }));
    expect(list.map((i) => i.id)).toEqual(['invoices-unpaid']);
    expect(list[0]).toMatchObject({ severity: 'info', action: 'invoices' });
    expect(list[0].reason).toContain('1,300');
  });

  it('skips drafts, cancelled and fully paid invoices', () => {
    const invoices = [
      invoice({ id: 'd', total: 100, status: 'draft', dueDate: '2026-01-01' }),
      invoice({ id: 'x', total: 100, status: 'cancelled', dueDate: '2026-01-01' }),
      invoice({ id: 'p', total: 100, dueDate: '2026-01-01' }),
    ];
    expect(ids(base({ invoices, payments: [payment('2026-02-01', 100, 'p')] }))).toEqual([]);
  });

  it('does nothing without invoices', () => {
    expect(ids(base({ invoices: [] }))).toEqual([]);
    expect(ids(base({ invoices: undefined }))).toEqual([]);
  });

  it('does not count an invoice overdue and open twice', () => {
    const list = ids(base({ invoices: [invoice({ id: 'a', total: 1000, dueDate: '2026-10-01' })] }));
    expect(list).toEqual(['invoices-overdue']);
  });
});

describe('ranking', () => {
  it('puts danger before warning before info, in a fixed rule order', () => {
    const list = buildClientInsights(
      base({
        totals: totals({ expenses: 3000, paid: 1000, clientDeficit: 2500, agreedPercentageDeficit: 300, profitPercentage: 10, workersDue: 900 }),
        custody: [{ name: 'علي', given: 100, spent: 100, remaining: 0, exact: true }],
        phases: [{ phase: { id: 'p', name: 'ب' }, budget: 100, actual: 130 }],
      }),
    );
    expect(list.map((i) => i.id)).toEqual(['low-collection', 'phase-over-budget', 'percentage-deficit', 'custody-depleted', 'workers-due']);
    const ranks = list.map((i) => ({ danger: 0, warning: 1, info: 2 })[i.severity]);
    expect([...ranks].sort()).toEqual(ranks);
  });

  it('gives every insight a title, a reason and an action', () => {
    const list = buildClientInsights(
      base({
        totals: totals({ expenses: 3000, paid: 1000, clientDeficit: 2500, agreedPercentageDeficit: 300, workersDue: 5 }),
        debts: [{ remainingAmount: 5, dueDate: '2020-01-01' }],
      }),
    );
    expect(list.length).toBeGreaterThan(2);
    for (const i of list) {
      expect(i.title).not.toBe('');
      expect(i.reason).not.toBe('');
      expect(i.reason).not.toContain('—');
      expect(i.title).not.toContain('—');
      expect(i.id).toBeTruthy();
    }
  });
});

describe('daysWord', () => {
  it('uses the Arabic forms', () => {
    expect(daysWord(1)).toBe('يوم واحد');
    expect(daysWord(2)).toBe('يومان');
    expect(daysWord(5)).toBe('5 أيام');
    expect(daysWord(10)).toBe('10 أيام');
    expect(daysWord(11)).toBe('11 يوماً');
    expect(daysWord(30)).toBe('30 يوماً');
  });
});
