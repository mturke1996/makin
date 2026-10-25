import { describe, expect, it } from 'vitest';
import type { Expense, ProjectPhase } from '../../types';
import { buildPhaseBudgetRows, computeBoqLineTotal, sumExpensesByPhase } from './projectBudget';

const phase = (id: string, budgetAmount: number): ProjectPhase =>
  ({ id, clientId: 'c1', name: id, order: 1, budgetAmount }) as ProjectPhase;
const exp = (amount: number, phaseId: string): Expense => ({ id: `${amount}-${phaseId}`, clientId: 'c1', amount, phaseId }) as Expense;

describe('project budget', () => {
  it('keeps the third decimal of a BOQ line', () => {
    expect(computeBoqLineTotal(3, 33.333)).toBe(99.999);
    expect(computeBoqLineTotal(2.5, 0.001)).toBe(0.003);
  });

  it('sums phase expenses without float drift', () => {
    expect(sumExpensesByPhase([exp(50.1, 'p'), exp(50.2, 'p')], 'p')).toBe(100.3);
  });

  it('reports a spent-to-the-penny phase as exactly on budget', () => {
    const [row] = buildPhaseBudgetRows([phase('p', 100.3)], [exp(50.1, 'p'), exp(50.2, 'p')], 'c1');
    expect(row.variance).toBe(0);
    expect(row.actual).toBe(100.3);
  });
});
