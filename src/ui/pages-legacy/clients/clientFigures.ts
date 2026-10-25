import { computeClientAccount } from '../../../core/finance/clientProfitTotals';
import { sumMoney } from '../invoices/invoiceMath';
import type { Client, Expense, Payment, StandaloneDebt } from '../../../types';

export type ClientFigure = {
  /** What still has to be collected to close the client's account (deficit + agreed-percentage deficit). */
  required: number;
  /** Surplus left after all obligations (negative means short). */
  remaining: number;
  /** Any expense or payment recorded. */
  active: boolean;
};

const EPS = 0.0005;
export const hasDeficit = (f: ClientFigure) => f.required > EPS;

function groupBy<T>(rows: T[], key: (row: T) => string | undefined): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    if (!k) continue;
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/**
 * One account figure per client, using the same inputs as the client profile
 * (expenses, remaining debts, payments) so the list and the profile agree.
 *
 * Only call this with COMPLETE data sets (see `canShowClientFigures`): a figure built from some of a
 * client's expenses or payments is a wrong number, not a smaller one.
 */
export function buildClientFigures(input: {
  clients: Client[];
  expenses: Expense[];
  payments: Payment[];
  debts: StandaloneDebt[];
}): Map<string, ClientFigure> {
  const { clients, expenses, payments, debts } = input;
  const spentBy = groupBy(expenses, (e) => e.clientId);
  const paidBy = groupBy(payments, (p) => p.clientId);
  const debtsBy = groupBy(debts, (d) => d.clientId);

  const out = new Map<string, ClientFigure>();
  for (const c of clients) {
    const totalExpenses = sumMoney((spentBy.get(c.id) || []).map((e) => e.amount));
    const totalPaid = sumMoney((paidBy.get(c.id) || []).map((p) => p.amount));
    const totalDebts = sumMoney((debtsBy.get(c.id) || []).map((d) => d.remainingAmount));
    const account = computeClientAccount({
      totalExpenses,
      totalDebts,
      totalPaid,
      profitPercentage: c.profitPercentage,
      profitBase: c.profitBase,
    });
    out.set(c.id, {
      required: account.requiredCollection,
      remaining: account.remaining,
      active: totalExpenses > 0 || totalPaid > 0 || totalDebts > 0,
    });
  }
  return out;
}
