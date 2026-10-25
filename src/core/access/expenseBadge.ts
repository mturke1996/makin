import type { Expense } from '../../types';
import { normalizeRole, type Role } from './principal';

/**
 * Who recorded an expense (admin or employee), derived from the users directory by `userId`.
 *
 * Expenses no longer carry their author's role: it would be a copy that goes stale the day someone
 * is promoted. The directory is only readable by people who may see everyone's expenses
 * (`canViewDirectory`), which is exactly who needs the distinction; everyone else sees their own.
 */

/** A row of the users directory, as far as expense badges need it. */
export interface DirectoryUser {
  id: string;
  uid?: string;
  role?: string | null;
}

/** Auth uid / profile id -> role. */
export type AuthorRoleIndex = ReadonlyMap<string, Role>;

export function buildAuthorRoleIndex(users: readonly DirectoryUser[]): AuthorRoleIndex {
  const index = new Map<string, Role>();
  for (const user of users) {
    const role = normalizeRole(user.role);
    index.set(user.id, role);
    if (user.uid && user.uid !== user.id) index.set(user.uid, role);
  }
  return index;
}

/** The author's role, or null when the expense has no owner or the owner is not in the directory. */
export function expenseAuthorRole(expense: Pick<Expense, 'userId'>, index: AuthorRoleIndex): Role | null {
  return expense.userId ? (index.get(expense.userId) ?? null) : null;
}

export type AuthorFilter = 'all' | 'employee' | 'admin';

export function matchesAuthorFilter(expense: Pick<Expense, 'userId'>, index: AuthorRoleIndex, filter: AuthorFilter): boolean {
  return filter === 'all' || expenseAuthorRole(expense, index) === filter;
}

export interface AuthorRoleCounts {
  all: number;
  employee: number;
  admin: number;
}

/** `all` also counts expenses whose author is unknown, so it can exceed `employee + admin`. */
export function countByAuthorRole(expenses: readonly Pick<Expense, 'userId'>[], index: AuthorRoleIndex): AuthorRoleCounts {
  const counts: AuthorRoleCounts = { all: expenses.length, employee: 0, admin: 0 };
  for (const expense of expenses) {
    const role = expenseAuthorRole(expense, index);
    if (role) counts[role] += 1;
  }
  return counts;
}
