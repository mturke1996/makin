import { create } from 'zustand';
import { globalFundTransactionsService, toConstraints } from '../services/firebaseService';
import { SOURCES, mergeById, queriesFor, sortRecords } from '../core/access/dataPlan';
import type { Principal } from '../core/access/principal';
import type { GlobalFundTransaction } from '../types';
import toast from 'react-hot-toast';
import { useNotificationStore } from './useNotificationStore';
import { formatFirebaseError } from '../core/formatFirebaseError';
import { writeAuditLog } from '../services/auditService';

interface GlobalFundState {
  transactions: GlobalFundTransaction[];
  isLoading: boolean;

  // Computed getters
  getTotalDeposits: () => number;
  getTotalWithdrawals: () => number;
  getCurrentBalance: () => number;
  getUserBalance: (userId: string) => number;
  getUserStats: (userId: string) => { deposited: number; withdrawn: number; remaining: number };

  // Actions
  /** Custody transactions this person may see: all of them for managers, only their own otherwise. */
  initialize: (principal: Principal | null) => () => void;
  addTransaction: (tx: GlobalFundTransaction) => Promise<void>;
  updateTransaction: (id: string, data: Partial<GlobalFundTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useGlobalFundStore = create<GlobalFundState>((set, get) => ({
  transactions: [],
  isLoading: true,

  // ─── Computed ─────────────────────────────────
  getTotalDeposits: () =>
    get().transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0),

  getTotalWithdrawals: () =>
    get().transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0),

  getCurrentBalance: () => {
    const { transactions } = get();
    return transactions.reduce((sum, t) => {
      return t.type === 'deposit' ? sum + t.amount : sum - t.amount;
    }, 0);
  },

  getUserBalance: (userId: string) => {
    const { transactions } = get();
    return transactions
      .filter(t => t.userId === userId)
      .reduce((sum, t) => (t.type === 'deposit' ? sum + t.amount : sum - t.amount), 0);
  },

  getUserStats: (userId: string) => {
    const { transactions } = get();
    const userTxs = transactions.filter(t => t.userId === userId);
    const deposited = userTxs.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const withdrawn = userTxs.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);
    return { deposited, withdrawn, remaining: deposited - withdrawn };
  },

  // ─── Initialize ────────────────────────────────
  initialize: (principal) => {
    const queries = queriesFor(principal, 'fundTransactions');
    if (queries.length === 0) {
      set({ transactions: [], isLoading: false });
      return () => undefined;
    }
    set({ isLoading: true });
    const parts: GlobalFundTransaction[][] = queries.map(() => []);
    const unsubs = queries.map((spec, i) =>
      globalFundTransactionsService.subscribe(
        (rows) => {
          parts[i] = rows;
          set({ transactions: sortRecords(mergeById(parts), SOURCES.fundTransactions.sort), isLoading: false });
        },
        toConstraints(spec),
        (error) => {
          console.warn('[fund] subscription failed:', error?.code || error?.message);
          set({ isLoading: false });
        },
      ),
    );
    return () => unsubs.forEach((u) => u());
  },

  // ─── Actions ───────────────────────────────────
  addTransaction: async (tx) => {
    const ok = tx.type === 'deposit' ? 'تم إيداع الرصيد بنجاح' : 'تم تسجيل السحب بنجاح';
    try {
      await globalFundTransactionsService.add(tx);
      toast.success(ok);
      useNotificationStore.getState().push({ type: 'success', title: ok });
      void writeAuditLog({ summary: ok, entity: 'balance' });
    } catch (e) {
      const msg = formatFirebaseError(e);
      toast.error(msg);
      useNotificationStore.getState().push({ type: 'error', title: msg });
      throw e;
    }
  },

  updateTransaction: async (id, data) => {
    const ok = 'تم التحديث بنجاح';
    try {
      await globalFundTransactionsService.update(id, data);
      toast.success(ok);
      useNotificationStore.getState().push({ type: 'success', title: ok });
      void writeAuditLog({ summary: ok, entity: 'balance' });
    } catch (e) {
      const msg = formatFirebaseError(e);
      toast.error(msg);
      useNotificationStore.getState().push({ type: 'error', title: msg });
      throw e;
    }
  },

  deleteTransaction: async (id) => {
    const ok = 'تم الحذف';
    try {
      await globalFundTransactionsService.delete(id);
      toast.success(ok);
      useNotificationStore.getState().push({ type: 'success', title: ok });
      void writeAuditLog({ summary: ok, entity: 'balance' });
    } catch (e) {
      const msg = formatFirebaseError(e);
      toast.error(msg);
      useNotificationStore.getState().push({ type: 'error', title: msg });
      throw e;
    }
  },
}));
