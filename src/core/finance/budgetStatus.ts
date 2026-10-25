import { fromMilli, subtractMoney, sumMoney, toMilli } from './money';

/**
 * Budget against what was actually spent, for a phase or a category.
 *
 *   none     no budget was set, so there is nothing to compare with
 *   ok       under 80% of the budget
 *   near     80% or more, up to the budget itself: time to look before it is spent
 *   over     more than the budget
 *   unbudgeted  money was spent on something the estimate does not cover (categories only)
 */
export const NEAR_BUDGET_RATIO = 0.8;

export type BudgetState = 'none' | 'ok' | 'near' | 'over';

export function budgetState(budget: number, actual: number): BudgetState {
  const b = toMilli(budget);
  const a = toMilli(actual);
  if (b <= 0) return 'none';
  if (a > b) return 'over';
  return a >= b * NEAR_BUDGET_RATIO ? 'near' : 'ok';
}

/** Share of the budget used, uncapped (150 means half as much again), or null when there is no budget. */
export function budgetRatio(budget: number, actual: number): number | null {
  const b = toMilli(budget);
  return b > 0 ? (toMilli(actual) / b) * 100 : null;
}

export interface CategoryBudgetRow {
  category: string;
  label: string;
  /** The estimate: the bill of quantities lines filed under this category. */
  budget: number;
  actual: number;
  /** Budget minus actual; negative once it is exceeded. */
  variance: number;
  /** Percent of the budget used, uncapped; null when the category has no estimate. */
  ratio: number | null;
  state: BudgetState | 'unbudgeted';
}

const STATE_ORDER: Record<CategoryBudgetRow['state'], number> = { over: 0, near: 1, unbudgeted: 2, ok: 3, none: 4 };

/**
 * The estimate (bill of quantities, by category) against the expenses of the same categories.
 * Silent until at least one BOQ line carries a category: without an estimate there is nothing to compare.
 */
export function buildCategoryBudgetRows(
  boq: readonly { category?: string; total: number }[],
  expenses: readonly { category: string; amount: number }[],
  labelOf: (category: string) => string,
): CategoryBudgetRow[] {
  const planned = new Map<string, number[]>();
  for (const line of boq) {
    if (!line.category) continue;
    planned.set(line.category, [...(planned.get(line.category) ?? []), line.total]);
  }
  if (planned.size === 0) return [];

  const spent = new Map<string, number[]>();
  for (const e of expenses) spent.set(e.category, [...(spent.get(e.category) ?? []), e.amount]);

  const keys = new Set([...planned.keys(), ...spent.keys()]);
  const rows: CategoryBudgetRow[] = [];
  for (const category of keys) {
    const budget = sumMoney(planned.get(category) ?? []);
    const actual = sumMoney(spent.get(category) ?? []);
    if (toMilli(budget) <= 0 && toMilli(actual) <= 0) continue;
    const hasBudget = toMilli(budget) > 0;
    rows.push({
      category,
      label: labelOf(category),
      budget,
      actual,
      variance: subtractMoney(budget, actual),
      ratio: budgetRatio(budget, actual),
      state: hasBudget ? (budgetState(budget, actual) as CategoryBudgetRow['state']) : 'unbudgeted',
    });
  }
  return rows.sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || toMilli(b.actual) - toMilli(a.actual));
}

/** Total estimate against total spent over the rows that have an estimate (what the estimate can speak for). */
export function categoryBudgetTotals(rows: readonly CategoryBudgetRow[]) {
  const budgeted = rows.filter((r) => r.state !== 'unbudgeted');
  const budget = sumMoney(budgeted.map((r) => r.budget));
  const actual = sumMoney(budgeted.map((r) => r.actual));
  const unbudgeted = sumMoney(rows.filter((r) => r.state === 'unbudgeted').map((r) => r.actual));
  return { budget, actual, unbudgeted, variance: fromMilli(toMilli(budget) - toMilli(actual)) };
}
