import { describe, expect, it } from 'vitest';
import { buildAuthorRoleIndex, countByAuthorRole, expenseAuthorRole, matchesAuthorFilter } from './expenseBadge';
import { canDeleteExpense, canEditExpense, canListExpense } from './policy';
import { buildPrincipal } from './principal';

const directory = [
  { id: 'u-admin', role: 'admin' },
  { id: 'doc-salem', uid: 'u-salem', role: 'employee' },
  { id: 'u-owner' }, // legacy profile without a role is the original owner, so an admin
  { id: 'u-ali', role: 'accountant' }, // any role that is not 'admin' is an employee
];
const index = buildAuthorRoleIndex(directory);

describe('expense author role from the users directory', () => {
  it('maps a userId to admin or employee, by profile id or auth uid', () => {
    expect(expenseAuthorRole({ userId: 'u-admin' }, index)).toBe('admin');
    expect(expenseAuthorRole({ userId: 'u-salem' }, index)).toBe('employee');
    expect(expenseAuthorRole({ userId: 'doc-salem' }, index)).toBe('employee');
    expect(expenseAuthorRole({ userId: 'u-ali' }, index)).toBe('employee');
  });

  it('treats a profile without a role as the owner, like the rules do', () => {
    expect(expenseAuthorRole({ userId: 'u-owner' }, index)).toBe('admin');
  });

  it('says nothing about an expense with no owner or an owner outside the directory', () => {
    expect(expenseAuthorRole({}, index)).toBeNull();
    expect(expenseAuthorRole({ userId: 'u-deleted' }, index)).toBeNull();
  });

  it('never reads a role off the expense itself', () => {
    const legacy = { userId: 'u-salem', createdByRole: 'admin' } as { userId: string };
    expect(expenseAuthorRole(legacy, index)).toBe('employee');
  });
});

describe('author filter and counts', () => {
  const list = [{ userId: 'u-admin' }, { userId: 'u-salem' }, { userId: 'u-salem' }, { userId: 'u-deleted' }, {}];

  it('filters by role, and unknown authors only show under "all"', () => {
    expect(list.filter((e) => matchesAuthorFilter(e, index, 'all'))).toHaveLength(5);
    expect(list.filter((e) => matchesAuthorFilter(e, index, 'employee'))).toHaveLength(2);
    expect(list.filter((e) => matchesAuthorFilter(e, index, 'admin'))).toHaveLength(1);
  });

  it('counts each role and keeps the total honest', () => {
    expect(countByAuthorRole(list, index)).toEqual({ all: 5, employee: 2, admin: 1 });
    expect(countByAuthorRole([], index)).toEqual({ all: 0, employee: 0, admin: 0 });
  });
});

/**
 * Ported from the old expensePermissions tests: what they pinned down still holds, now decided by
 * ownership (`userId`) and permissions instead of the per-expense visibility fields old documents carry.
 */
describe('legacy visibility fields on old expenses', () => {
  const field = buildPrincipal({ id: 'u-emp', role: 'employee' })!;
  const viewer = buildPrincipal({ id: 'u-view', role: 'employee', permissions: ['expenses.view.all'] })!;
  const admin = buildPrincipal({ id: 'u-admin', role: 'admin' })!;
  const legacy = (o: object) => ({ isClosed: false, ...o }) as { userId?: string; isClosed: boolean };

  it('an employee lists exactly their own expenses, whatever the old flags say', () => {
    expect(canListExpense(field, legacy({ userId: 'u-emp', createdByRole: 'employee' }))).toBe(true);
    expect(canListExpense(field, legacy({ userId: 'u-emp', isHiddenFromEmployees: true }))).toBe(true);
    expect(canListExpense(field, legacy({ userId: 'u-emp2', createdByRole: 'employee' }))).toBe(false);
    expect(canListExpense(field, legacy({ userId: 'u-admin', createdByRole: 'admin', isHiddenFromEmployees: false }))).toBe(false);
  });

  it('a record with no owner id is never matched by name, so nobody can claim it by mistake', () => {
    expect(canListExpense(field, legacy({ createdBy: 'سالم' }))).toBe(false);
    expect(canListExpense(field, legacy({ createdBy: 'سالم', userId: 'u-other' }))).toBe(false);
  });

  it('whoever sees all lists everything, hidden flag or not; editing still needs its own permission', () => {
    const hidden = legacy({ userId: 'u-admin', isHiddenFromEmployees: true });
    expect(canListExpense(viewer, hidden)).toBe(true);
    expect(canListExpense(admin, hidden)).toBe(true);
    expect(canEditExpense(viewer, hidden)).toBe(false);
    expect(canDeleteExpense(viewer, hidden)).toBe(false);
  });

  it('nobody is signed in: nothing is listed', () => {
    expect(canListExpense(null, legacy({ userId: 'u-emp' }))).toBe(false);
  });
});
