import { describe, expect, it } from 'vitest';
import { budgetRatio, budgetState, buildCategoryBudgetRows, categoryBudgetTotals } from './budgetStatus';

describe('budgetState', () => {
  it('has nothing to say without a budget', () => {
    expect(budgetState(0, 500)).toBe('none');
    expect(budgetState(-5, 0)).toBe('none');
  });

  it('warns from 80% and flags only what goes past the budget', () => {
    expect(budgetState(1000, 0)).toBe('ok');
    expect(budgetState(1000, 799.999)).toBe('ok');
    expect(budgetState(1000, 800)).toBe('near');
    expect(budgetState(1000, 1000)).toBe('near'); // spent exactly the budget: not yet over
    expect(budgetState(1000, 1000.001)).toBe('over');
  });

  it('compares in exact thousandths', () => {
    expect(budgetState(0.3, 0.1 + 0.2)).toBe('near');
  });
});

describe('budgetRatio', () => {
  it('is uncapped and null without a budget', () => {
    expect(budgetRatio(1000, 250)).toBe(25);
    expect(budgetRatio(1000, 1500)).toBe(150);
    expect(budgetRatio(0, 10)).toBeNull();
  });
});

describe('category budgets', () => {
  const label = (c: string) => `label:${c}`;
  const boq = [
    { category: 'rebar', total: 40000 },
    { category: 'rebar', total: 10000 },
    { category: 'concrete', total: 20000 },
    { category: 'plaster', total: 5000 },
    { total: 9999 }, // no category: not part of any category budget
  ];
  const spent = [
    { category: 'rebar', amount: 52000 },
    { category: 'concrete', amount: 16500 },
    { category: 'labor', amount: 3000 },
  ];

  it('stays silent when no BOQ line carries a category', () => {
    expect(buildCategoryBudgetRows([{ total: 5 }], spent, label)).toEqual([]);
  });

  it('adds the estimate per category and sets it against the spending', () => {
    const rows = buildCategoryBudgetRows(boq, spent, label);
    const rebar = rows.find((r) => r.category === 'rebar')!;
    expect(rebar).toMatchObject({ budget: 50000, actual: 52000, variance: -2000, state: 'over', label: 'label:rebar' });
    expect(rebar.ratio).toBeCloseTo(104);
    expect(rows.find((r) => r.category === 'concrete')!.state).toBe('near'); // 82.5%
    expect(rows.find((r) => r.category === 'plaster')!).toMatchObject({ actual: 0, state: 'ok' });
  });

  it('flags spending on a category the estimate does not cover', () => {
    const labor = buildCategoryBudgetRows(boq, spent, label).find((r) => r.category === 'labor')!;
    expect(labor).toMatchObject({ budget: 0, actual: 3000, state: 'unbudgeted', ratio: null });
  });

  it('lists what needs a look first: over, then near, then unbudgeted, then fine', () => {
    expect(buildCategoryBudgetRows(boq, spent, label).map((r) => r.state)).toEqual(['over', 'near', 'unbudgeted', 'ok']);
  });

  it('totals only what the estimate can speak for, and keeps the unbudgeted spending apart', () => {
    const totals = categoryBudgetTotals(buildCategoryBudgetRows(boq, spent, label));
    expect(totals).toEqual({ budget: 75000, actual: 68500, unbudgeted: 3000, variance: 6500 });
  });
});
