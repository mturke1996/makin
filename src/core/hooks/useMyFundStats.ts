import { useMemo } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useDataStore } from '../../stores/useDataStore';
import { useGlobalFundStore } from '../../stores/useGlobalFundStore';
import { useAccess } from '../access/useAccess';
import { buildUserCustodyLedger, custodyTotals } from '../finance/custodyFifo';

export type MyFundStats = { deposited: number; spent: number; remaining: number };

/**
 * Per-user custody (عهدة) balance: FIFO across the person's deposits vs their expenses.
 *
 * Built only from what this person may read: their own custody transactions and the expenses they may
 * list. A balance is "deposits minus what I spent", so it is only exact when the person can see their
 * own expenses; without that it is unknown, and unknown is `null` (never "everything is left").
 */
export function useMyFundStats(): MyFundStats | null {
  const access = useAccess();
  const expenses = useDataStore((s) => s.expenses);
  const user = useAuthStore((s) => s.user);
  const transactions = useGlobalFundStore((s) => s.transactions);

  const canSeeCustody = access.custodyScope !== 'none';
  const canSeeOwnSpending = access.expenseScope !== 'none';

  return useMemo(() => {
    if (!user || !canSeeCustody || !canSeeOwnSpending) return null;

    const custodies = buildUserCustodyLedger(transactions, access.listableExpenses(expenses), {
      userId: user.id,
      userName: user.displayName || '',
    });

    // No deposit for this person means no custody: nothing to report (never a made-up balance).
    if (custodies.length === 0) return null;

    return custodyTotals(custodies);
  }, [transactions, expenses, user, access, canSeeCustody, canSeeOwnSpending]);
}
