import type { ProjectPhase, BoqLineItem, Expense } from '../../types';
import { roundMoney, subtractMoney, sumMoney } from './money';

export function computeBoqLineTotal(quantity: number, unitPrice: number): number {
  // Thousandths, like every other amount in the app (cents would drop the third decimal).
  return roundMoney(quantity * unitPrice);
}

export function sumBoqItems(items: BoqLineItem[]): number {
  return sumMoney(items.map((i) => i.total));
}

export function sumPhaseBudgets(phases: ProjectPhase[]): number {
  return sumMoney(phases.map((p) => p.budgetAmount || 0));
}

export function sumExpensesByPhase(expenses: Expense[], phaseId: string): number {
  return sumMoney(expenses.filter((e) => e.phaseId === phaseId).map((e) => e.amount));
}

export function sumExpensesForClient(expenses: Expense[], clientId: string, phaseId?: string): number {
  return sumMoney(
    expenses.filter((e) => e.clientId === clientId && (!phaseId || e.phaseId === phaseId)).map((e) => e.amount),
  );
}

export interface PhaseBudgetRow {
  phase: ProjectPhase;
  budget: number;
  actual: number;
  variance: number;
  pctUsed: number;
}

export function buildPhaseBudgetRows(
  phases: ProjectPhase[],
  expenses: Expense[],
  clientId: string
): PhaseBudgetRow[] {
  return phases
    .filter((p) => p.clientId === clientId)
    .sort((a, b) => a.order - b.order)
    .map((phase) => {
      const budget = phase.budgetAmount || 0;
      const actual = sumExpensesByPhase(expenses, phase.id);
      return {
        phase,
        budget,
        actual,
        variance: subtractMoney(budget, actual),
        pctUsed: budget > 0 ? Math.min(100, (actual / budget) * 100) : 0,
      };
    });
}
