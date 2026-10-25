import { useMemo } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useDataStore } from '../../stores/useDataStore';
import { useGlobalFundStore } from '../../stores/useGlobalFundStore';
import { useAccess } from '../../core/access/useAccess';
import { useMyFundStats } from '../../core/hooks/useMyFundStats';
import { buildUserCustodyLedger, custodyTotals } from '../../core/finance/custodyFifo';
import { useUsersDirectory } from '../pages-legacy/client-profile/useUsersDirectory';
import { listOtherPeople, type Person } from './quickExpenseLogic';

/**
 * Everything the quick expense sheet reads, in one place and gated by what the person may see:
 *  - who I am and whether I may record for someone else (edit-all AND the users directory);
 *  - the clients and my own expenses (the store only holds what I may download);
 *  - the custody of the person the expense is for.
 */
export function useQuickExpenseModel(ownerId: string) {
  const user = useAuthStore((s) => s.user);
  const access = useAccess();
  const clients = useDataStore((s) => s.clients);
  const expenses = useDataStore((s) => s.expenses);
  const loading = useDataStore((s) => s.isLoading);
  const transactions = useGlobalFundStore((s) => s.transactions);
  const myFund = useMyFundStats();

  const me: Person = useMemo(
    () => ({ id: user?.id ?? '', name: user?.displayName?.trim() || 'غير معروف' }),
    [user?.id, user?.displayName],
  );

  // Recording for someone else is `expenses.edit.all`; the list of colleagues is the directory.
  // Everyone else never subscribes to `users` (the rules would refuse it).
  const canPickPerson = access.can('expenses.edit.all') && access.canViewDirectory;
  const directory = useUsersDirectory(canPickPerson);
  const people = useMemo(() => (canPickPerson ? listOtherPeople(directory, me.id, expenses) : []), [canPickPerson, directory, me.id, expenses]);

  // The person the expense is for: me unless I picked a colleague from the directory.
  const owner: Person = people.find((p) => p.id === ownerId) ?? me;
  const ownerIsMe = owner.id === me.id;

  // Another person's custody can be computed only from everybody's deposits and expenses.
  const canSeeOthersCustody = access.custodyScope === 'all' && access.expenseScope === 'all';

  /** The custody left for the owner, or null when they hold none or this person may not see it. */
  const remaining = useMemo(() => {
    if (ownerIsMe) return myFund ? myFund.remaining : null;
    if (!canSeeOthersCustody) return null;
    const ledger = buildUserCustodyLedger(transactions, expenses, { userId: owner.id, userName: owner.name });
    return ledger.length > 0 ? custodyTotals(ledger).remaining : null;
  }, [ownerIsMe, myFund, canSeeOthersCustody, transactions, expenses, owner.id, owner.name]);

  return { user, access, me, owner, ownerIsMe, clients, expenses, loading, canPickPerson, people, remaining };
}
