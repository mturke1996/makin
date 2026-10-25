import type { Client, ClientProfitBase, Expense, Payment } from '../../types';
import { roundMoney } from './money';

/** أساس احتساب النسبة الافتراضي عند عدم تحديده في سجل العميل. */
export const DEFAULT_PROFIT_BASE: ClientProfitBase = 'expenses';

export const PROFIT_BASE_LABELS: Record<ClientProfitBase, string> = {
  expenses: 'من المصروفات',
  payments: 'من المدفوعات',
};

export function resolveProfitBase(client?: Pick<Client, 'profitBase'> | null): ClientProfitBase {
  return client?.profitBase === 'payments' ? 'payments' : DEFAULT_PROFIT_BASE;
}

/** قيمة النسبة المتفق عليها وفق أساس الاحتساب. */
export function computeProfitAmount(
  base: ClientProfitBase,
  pct: number,
  totals: { totalExpenses: number; totalPaid: number },
): number {
  if (!(pct > 0)) return 0;
  const baseAmount = base === 'payments' ? totals.totalPaid : totals.totalExpenses;
  // To the thousandth, like every other amount, so 33.3% of 73,390 is not 24,438.087000000003.
  return baseAmount > 0 ? roundMoney((baseAmount * pct) / 100) : 0;
}

export type ClientAccountSummary = {
  profit: number;
  profitPercentage: number;
  profitBase: ClientProfitBase;
  totalObligations: number;
  remaining: number;
  /** العجز العام: نقص تغطية المصروفات والديون. */
  clientDeficit: number;
  /** عجز النسبة المتفق عليها. */
  agreedPercentageDeficit: number;
  /** إجمالي ما يلزم تحصيله لإغلاق العجز = العجز العام + عجز النسبة. */
  requiredCollection: number;
};

/**
 * حساب العميل — النسبة من المصروفات (افتراضي) أو من المدفوعات.
 *
 * - من المصروفات: النسبة مبلغ ثابت معروف بمجرد الصرف، فتُضاف كالتزام مستقل،
 *   ويُقسَّم العجز الإجمالي بدقة إلى عجز عام (المصروفات + الديون غير المغطاة)
 *   وعجز نسبة (ما تبقى من العمولة بعد استهلاك أي فائض في تغطية التكاليف).
 * - من المدفوعات: النسبة تُقتطع من كل دفعة، بما فيها دفعة سداد العجز نفسه،
 *   فيلزم تحصيل العجز ÷ (1 − النسبة) لإغلاقه فعلياً.
 */
export function computeClientAccount(input: {
  totalExpenses: number;
  totalDebts: number;
  totalPaid: number;
  profitPercentage?: number;
  profitBase?: ClientProfitBase;
}): ClientAccountSummary {
  const { totalExpenses, totalDebts, totalPaid } = input;
  const pct = input.profitPercentage || 0;
  const base = input.profitBase === 'payments' ? 'payments' : DEFAULT_PROFIT_BASE;
  const profit = computeProfitAmount(base, pct, { totalExpenses, totalPaid });
  const baseObligations = totalExpenses + totalDebts;

  let totalObligations: number;
  let remaining: number;
  let clientDeficit: number;
  let agreedPercentageDeficit: number;

  if (base === 'payments') {
    totalObligations = baseObligations;
    remaining = totalPaid - profit - totalObligations;
    clientDeficit = Math.max(0, -remaining);
    const rate = pct / 100;
    agreedPercentageDeficit =
      clientDeficit > 0 && rate > 0 && rate < 1 ? (clientDeficit * rate) / (1 - rate) : 0;
  } else {
    totalObligations = baseObligations + profit;
    remaining = totalPaid - totalObligations;
    clientDeficit = Math.max(0, baseObligations - totalPaid);
    const surplusAfterBaseCosts = Math.max(0, totalPaid - baseObligations);
    agreedPercentageDeficit = Math.max(0, profit - surplusAfterBaseCosts);
  }

  return {
    profit,
    profitPercentage: pct,
    profitBase: base,
    totalObligations,
    remaining,
    clientDeficit,
    agreedPercentageDeficit,
    requiredCollection: clientDeficit + agreedPercentageDeficit,
  };
}

/**
 * إجمالي النسب المستحقة لكل العملاء — مطابق لصفحة العميل
 * (كل عميل حسب أساس احتسابه: المصروفات أو المدفوعات).
 */
export function computeClientsProfitSummary(
  clients: Client[],
  payments: Payment[],
  expenses: Pick<Expense, 'clientId' | 'amount'>[] = [],
) {
  const paidByClient = new Map<string, number>();
  for (const p of payments) {
    paidByClient.set(p.clientId, (paidByClient.get(p.clientId) || 0) + p.amount);
  }
  const spentByClient = new Map<string, number>();
  for (const e of expenses) {
    if (!e.clientId) continue;
    spentByClient.set(e.clientId, (spentByClient.get(e.clientId) || 0) + e.amount);
  }

  let totalGrossProfit = 0;
  let clientsWithProfitRule = 0;

  for (const c of clients) {
    const profit = computeProfitAmount(resolveProfitBase(c), c.profitPercentage ?? 0, {
      totalPaid: paidByClient.get(c.id) || 0,
      totalExpenses: spentByClient.get(c.id) || 0,
    });
    if (profit > 0) {
      totalGrossProfit += profit;
      clientsWithProfitRule++;
    }
  }

  return { totalGrossProfit, clientsWithProfitRule };
}
