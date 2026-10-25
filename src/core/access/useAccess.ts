import { useMemo } from 'react';
import type { Expense } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import { canAccessModule, type AppModule } from './modules';
import {
  canDeleteExpense,
  canEditExpense,
  canListExpense,
  canSeeWorkerPayment,
  canUseExpenseInvoices,
  canViewDirectory,
  custodyScope,
  expenseScope,
} from './policy';
import { buildPrincipal, can, canAll, canAny, isAdmin, type Principal } from './principal';
import type { Permission } from './permissions';

/** The signed-in person's principal, rebuilt only when their role or permissions really change. */
export function usePrincipal(): Principal | null {
  const user = useAuthStore((s) => s.user);
  const permissionsKey = JSON.stringify(user?.permissions ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `permissionsKey` stands for user.permissions
  return useMemo(() => buildPrincipal(user), [user?.id, user?.role, permissionsKey]);
}

/**
 * The one hook screens use to ask "may I?". Everything here is a pure decision from src/core/access;
 * the Firestore rules take the same decisions on the server, so what a screen offers is what works.
 */
export function useAccess() {
  const principal = usePrincipal();
  return useMemo(
    () => ({
      principal,
      isAdmin: isAdmin(principal),
      can: (permission: Permission) => can(principal, permission),
      canAny: (permissions: readonly Permission[]) => canAny(principal, permissions),
      canAll: (permissions: readonly Permission[]) => canAll(principal, permissions),
      canAccessModule: (module: AppModule) => canAccessModule(principal, module),

      /** Expenses: which ones this person may list, edit and delete. */
      expenseScope: expenseScope(principal),
      canListExpense: (expense: Pick<Expense, 'userId'>) => canListExpense(principal, expense),
      canEditExpense: (expense: Pick<Expense, 'userId' | 'isClosed'>) => canEditExpense(principal, expense),
      canDeleteExpense: (expense: Pick<Expense, 'userId' | 'isClosed'>) => canDeleteExpense(principal, expense),
      /** The expenses that belong in this person's lists and totals (the store may also hold worker payments). */
      listableExpenses: (expenses: readonly Expense[]) => expenses.filter((e) => canListExpense(principal, e)),
      canSeeWorkerPayment: (expense: Pick<Expense, 'workerId'>) => canSeeWorkerPayment(principal, expense),

      custodyScope: custodyScope(principal),
      canViewDirectory: canViewDirectory(principal),
      canUseExpenseInvoices: canUseExpenseInvoices(principal),
    }),
    [principal],
  );
}

export type Access = ReturnType<typeof useAccess>;
