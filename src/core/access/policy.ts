import type { Expense } from '../../types';
import { can, isAdmin, type Principal } from './principal';

/**
 * Resource-level decisions. They look at the record, not just the person, and they are the same
 * decisions the Firestore rules take (the rules decide what is ALLOWED, this decides what the
 * screens OFFER, so the two never disagree).
 */

export type Scope = 'all' | 'own' | 'none';

/** Which expenses a person may list: everyone's, only their own, or none. */
export function expenseScope(p: Principal | null | undefined): Scope {
  if (can(p, 'expenses.view.all')) return 'all';
  if (can(p, 'expenses.create')) return 'own';
  return 'none';
}

export const ownsExpense = (p: Principal | null | undefined, expense: Pick<Expense, 'userId'>): boolean =>
  !!p && !!expense.userId && expense.userId === p.id;

/** May this expense appear in the expense lists and totals? */
export function canListExpense(p: Principal | null | undefined, expense: Pick<Expense, 'userId'>): boolean {
  const scope = expenseScope(p);
  return scope === 'all' || (scope === 'own' && ownsExpense(p, expense));
}

/** An expense bundled into an expense invoice is locked for everybody until the invoice is deleted. */
export const isExpenseClosed = (expense: Pick<Expense, 'isClosed'>): boolean => !!expense.isClosed;

export function canEditExpense(p: Principal | null | undefined, expense: Pick<Expense, 'userId' | 'isClosed' | 'workerId'>): boolean {
  if (isExpenseClosed(expense)) return false;
  if (expense.workerId && !can(p, 'workers.manage')) return false;
  if (can(p, 'expenses.edit.all')) return true;
  return can(p, 'expenses.create') && ownsExpense(p, expense);
}

export function canDeleteExpense(p: Principal | null | undefined, expense: Pick<Expense, 'userId' | 'isClosed' | 'workerId'>): boolean {
  if (isExpenseClosed(expense)) return false;
  if (expense.workerId && !can(p, 'workers.manage')) return false;
  if (can(p, 'expenses.delete.all')) return true;
  return can(p, 'expenses.create') && ownsExpense(p, expense);
}

/**
 * Worker payments are expenses with a workerId. Whoever may view workers sees every payment made to
 * a worker, so the balance owed to them is exact; this is separate from the expense lists above.
 */
export const canSeeWorkerPayment = (p: Principal | null | undefined, expense: Pick<Expense, 'workerId'>): boolean =>
  can(p, 'workers.view') && !!expense.workerId;

/** Whether the person may read the directory of users (names and roles of colleagues). */
export const canViewDirectory = (p: Principal | null | undefined): boolean =>
  isAdmin(p) || can(p, 'expenses.view.all') || can(p, 'custody.manage');

/** Custody: everyone's, only their own, or none. */
export function custodyScope(p: Principal | null | undefined): Scope {
  if (can(p, 'custody.manage')) return 'all';
  if (can(p, 'custody.view.own')) return 'own';
  return 'none';
}

/** Expense invoices embed copies of expenses, so only people who may see all expenses may use them. */
export const canUseExpenseInvoices = (p: Principal | null | undefined): boolean => can(p, 'expenses.view.all');
