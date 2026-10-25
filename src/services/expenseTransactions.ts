import { doc, runTransaction, type Firestore } from 'firebase/firestore';
import type { Expense } from '../types';

/** These are server-owned lifecycle/display fields, not the identity of a submitted operation. */
const MUTABLE_AFTER_SAVE = new Set(['id', '_docId', 'isClosed', 'closedAt', 'expenseInvoiceId', 'updatedAt', 'createdBy', 'workerName']);

export function sameSubmittedExpense(existing: Record<string, unknown>, submitted: Record<string, unknown>): boolean {
  return Object.entries(submitted).every(([key, value]) => value === undefined || MUTABLE_AFTER_SAVE.has(key)
    || JSON.stringify(existing[key]) === JSON.stringify(value));
}

/** A stable operation ID can be retried safely; a retry can never rewrite a saved financial record. */
export async function addExpenseConfirmedOnce(db: Firestore, expense: Expense): Promise<string> {
  if (!expense.id) throw new Error('معرف عملية المصروف مفقود');
  const ref = doc(db, 'expenses', expense.id);
  const payload = Object.fromEntries(Object.entries(expense).filter(([, value]) => value !== undefined));
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists()) {
      if (!sameSubmittedExpense(existing.data(), payload)) {
        throw Object.assign(new Error('هذه العملية محفوظة ببيانات مختلفة. راجع المصروف المسجل قبل المحاولة مجدداً.'), { code: 'operation-conflict' });
      }
      return;
    }
    transaction.set(ref, payload);
  });
  return expense.id;
}
