import { buildClientCustody } from '../../../core/finance/clientCustody';
import type { Expense, UserBalance } from '../../../types';
import type { SystemUser, UserBalanceInfo, UserBalancesSummary } from './types';

interface Input {
  /** The custody movements of this client the viewer may read. */
  balances: readonly UserBalance[];
  /** The expenses of this client the viewer may list (everyone's, or only their own). */
  expenses: readonly Expense[];
  /** The users directory, when the viewer may read it (empty otherwise). */
  users: readonly SystemUser[];
  expenseScope: 'all' | 'own' | 'none';
  viewerId: string | undefined;
  /** When given, only this client's custody and expenses count, whatever the lists hold. */
  clientId?: string;
}

/**
 * Custody per user on one client, keyed by Auth UID (a Firestore doc id and a display name resolve to the
 * same person). Every line is derived from the ledger in `core/finance/clientCustody.ts`, the same
 * allocation the fund page uses, so a balance is computed once and read everywhere.
 *
 * `spent` is built from the expenses the viewer can list, so it is only the truth for a user whose
 * expenses the viewer sees in full: everybody's when the viewer sees all expenses, otherwise only the
 * viewer's own. Every other line keeps `given` (always true) and is marked `exact: false`, so the
 * screens show what was handed over and say the rest is not available instead of inventing a balance.
 */
export function buildUserBalancesSummary({ balances, expenses, users, expenseScope, viewerId, clientId }: Input): UserBalancesSummary {
  const { users: holders } = buildClientCustody({ balances, expenses, users, expenseScope, viewerId, clientId });
  return Object.fromEntries(holders.map((h) => [h.key, h]));
}

/** Lines whose balance is real and has run out (what the "نفد رصيد عهدة" alerts are made of). */
export const depletedLines = (summary: UserBalancesSummary): [string, UserBalanceInfo][] =>
  Object.entries(summary).filter(([, b]) => b.exact && b.given > 0 && b.remaining <= 0);

/** Every line is complete, so the client's custody balance can be shown as one real figure. */
export const custodyIsExact = (summary: UserBalancesSummary): boolean => Object.values(summary).every((b) => b.exact);
