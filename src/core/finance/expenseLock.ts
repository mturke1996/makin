import type { Expense } from '../../types';
import { isExpenseClosed } from '../access/policy';

export const EXPENSE_CLOSED_MESSAGE = 'هذا المصروف مُغلق ضمن فاتورة مصروفات. احذف الفاتورة أولاً لإعادة فتحه.';

export const EXPENSE_READ_ONLY_MESSAGE = 'تستطيع الاطلاع على هذا المصروف فقط، فتعديله ليس من صلاحياتك.';

/**
 * An expense bundled into an expense invoice is locked: editing or deleting it would leave the
 * invoice's total and its snapshot of the expenses stale. Deleting the invoice reopens them.
 * The rule itself lives in the access policy (`isExpenseClosed`); this is its null-tolerant form.
 */
export const isExpenseLocked = (expense: Pick<Expense, 'isClosed'> | null | undefined): boolean =>
  !!expense && isExpenseClosed(expense);

/**
 * Why an expense opens read-only for this person, or null when they may change it.
 * `canEdit` is the access policy's answer (`access.canEditExpense(expense)`); a closed expense
 * always explains the lock first, because that is the reason nobody can change it.
 */
export function expenseReadOnlyNotice(expense: Pick<Expense, 'isClosed'>, canEdit: boolean): string | null {
  if (isExpenseLocked(expense)) return EXPENSE_CLOSED_MESSAGE;
  return canEdit ? null : EXPENSE_READ_ONLY_MESSAGE;
}
