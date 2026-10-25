import type { ClientAccountSummary } from '../../../core/finance/clientProfitTotals';
import type { ClientCustodyUser } from '../../../core/finance/clientCustody';

/** A document of the Firestore `users` collection, as far as the custody screens need it. */
export interface SystemUser {
  id: string;
  uid?: string;
  displayName?: string;
  role?: string;
}

/**
 * Custody given to one user on this client: totals, status and every custody (one deposit) with its own
 * expenses. Built once by `buildClientCustody` (core/finance/clientCustody.ts), so the screens, the
 * module row, the callouts and the expense forms all read the same figures.
 *
 * `spent`, `remaining`, `deficit` and the per-custody details are true only when `exact`; otherwise only
 * `given` (and each custody's amount and date) is, and the screen must say the rest is not available.
 */
export type UserBalanceInfo = ClientCustodyUser;

export type { ClientCustodyExpense, ClientCustodyRow } from '../../../core/finance/clientCustody';

export type UserBalancesSummary = Record<string, UserBalanceInfo>;

/** Remaining custody pool of the signed-in user (the part the forms and banners read). */
export interface FundStats {
  remaining: number;
}

/** Every figure of the client page: the totals plus computeClientAccount's result. */
export interface ClientSummary extends ClientAccountSummary {
  totalExpenses: number;
  totalDebts: number;
  totalPaid: number;
  totalWorkersDue: number;
  totalWorkersOverpaid?: number;
  totalWorkersAgreed: number;
  totalWorkersPaid: number;
}

/** What this person may see on the client page: each module's data is complete only if its permission is held. */
export interface ClientProfileCaps {
  /** Expenses listed here: everyone's, only the viewer's, or none. */
  expenseScope: 'all' | 'own' | 'none';
  payments: boolean;
  debts: boolean;
  workers: boolean;
  /** Custody of any kind (their own, or everyone's with `custody.manage`). */
  custody: boolean;
  projects: boolean;
  /** `invoices.view`: this client's invoices may be listed. */
  invoices: boolean;
  /** `letters.view`: this client's letters may be listed. */
  letters: boolean;
  /**
   * The client's money summary needs the whole picture: payments, every expense and debts.
   * With less, the figures would be partial totals presented as complete, so a personal panel replaces it.
   */
  showSummary: boolean;
}
