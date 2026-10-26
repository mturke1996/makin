import type { Expense, ProjectPhase } from '../../types';
import { localISODate, type QuickForm } from './quickExpenseLogic';
import { sumMoney, subtractMoney } from '../../core/finance/money';

/** Copy business inputs only; the owner, operation ID, date and paper invoice are reviewed anew. */
export function repeatExpenseDraft(
  expense: Expense,
  phases: readonly ProjectPhase[],
  canUsePhases: boolean,
  now = new Date(),
): Partial<QuickForm> {
  const hasQuantity = expense.quantity > 0 && expense.unitPrice > 0;
  return {
    clientId: expense.clientId,
    category: expense.category,
    description: expense.description,
    mode: hasQuantity ? 'quantity' : 'amount',
    amount: String(expense.amount),
    quantity: hasQuantity ? String(expense.quantity) : '',
    unitPrice: hasQuantity ? String(expense.unitPrice) : '',
    unit: hasQuantity ? (expense.unit ?? '') : '',
    date: localISODate(now),
    phaseId:
      canUsePhases &&
      phases.some(
        (phase) =>
          phase.id === expense.phaseId && phase.clientId === expense.clientId,
      )
        ? expense.phaseId
        : '',
    invoiceNumber: '',
    notes: '',
    personId: '',
  };
}
export function quickPhaseBudget(
  phase: ProjectPhase | undefined,
  expenses: readonly Expense[],
  clientId: string,
  amount: number,
) {
  if (!phase || phase.clientId !== clientId || !(phase.budgetAmount > 0))
    return null;
  const spent = sumMoney(
    expenses
      .filter(
        (expense) =>
          expense.clientId === clientId && expense.phaseId === phase.id,
      )
      .map((expense) => expense.amount),
  );
  const after = sumMoney([spent, amount]);
  return {
    budget: phase.budgetAmount,
    spent,
    after,
    remaining: subtractMoney(phase.budgetAmount, after),
    over: Math.max(0, subtractMoney(after, phase.budgetAmount)),
  };
}
