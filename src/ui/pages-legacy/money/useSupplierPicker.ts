import { useCallback } from 'react';
import { useAccess } from '../../../core/access/useAccess';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useDataSlice } from '../../../stores/useDataStore';
import type { Supplier } from '../../../types';

/** What an expense form needs to name a supplier and to hint at prices: the directory, how to add to it, and the history. */
export function useSupplierPicker() {
  const access = useAccess();
  const user = useAuthStore((s) => s.user);
  const { suppliers, expenses, addSupplier } = useDataSlice('suppliers', 'expenses', 'addSupplier');

  const create = useCallback(
    async (name: string): Promise<Supplier> => {
      const now = new Date().toISOString();
      const supplier: Supplier = { id: crypto.randomUUID(), name: name.trim(), createdAt: now, updatedAt: now, createdBy: user?.displayName || user?.email || 'المستخدم' };
      await addSupplier(supplier);
      return supplier;
    },
    [addSupplier, user],
  );

  return {
    suppliers,
    expenses,
    create: access.can('expenses.create') ? create : undefined,
    /** Prices are compared only against the complete history, never a person's own slice of it. */
    complete: access.expenseScope === 'all',
  };
}
