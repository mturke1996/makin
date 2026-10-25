import { describe, expect, it } from 'vitest';
import { buildPrincipal, canEditExpense } from '../access';
import {
  EXPENSE_CLOSED_MESSAGE,
  EXPENSE_READ_ONLY_MESSAGE,
  expenseReadOnlyNotice,
  isExpenseLocked,
} from './expenseLock';

describe('isExpenseLocked', () => {
  it('locks only closed expenses', () => {
    expect(isExpenseLocked({ isClosed: true })).toBe(true);
    expect(isExpenseLocked({ isClosed: false })).toBe(false);
    expect(isExpenseLocked(undefined)).toBe(false);
    expect(isExpenseLocked(null)).toBe(false);
  });

  it('has a message that tells the user how to unlock', () => {
    expect(EXPENSE_CLOSED_MESSAGE).toContain('احذف الفاتورة');
  });
});

describe('expenseReadOnlyNotice', () => {
  const field = buildPrincipal({ id: 'u-emp', role: 'employee' });
  const accountant = buildPrincipal({ id: 'u-acc', role: 'employee', permissions: ['expenses.edit.all'] });
  const mine = { userId: 'u-emp', isClosed: false };
  const theirs = { userId: 'u-other', isClosed: false };

  it('opens an editable expense normally', () => {
    expect(expenseReadOnlyNotice(mine, canEditExpense(field, mine))).toBeNull();
    expect(expenseReadOnlyNotice(theirs, canEditExpense(accountant, theirs))).toBeNull();
  });

  it('explains the lock on a closed expense, whoever asks', () => {
    const closed = { ...mine, isClosed: true };
    expect(expenseReadOnlyNotice(closed, canEditExpense(field, closed))).toBe(EXPENSE_CLOSED_MESSAGE);
    expect(expenseReadOnlyNotice({ ...theirs, isClosed: true }, canEditExpense(accountant, { ...theirs, isClosed: true }))).toBe(
      EXPENSE_CLOSED_MESSAGE
    );
  });

  it('says it is view-only when the policy refuses an open expense', () => {
    expect(expenseReadOnlyNotice(theirs, canEditExpense(field, theirs))).toBe(EXPENSE_READ_ONLY_MESSAGE);
  });
});
