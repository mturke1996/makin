import { multiplyQuantityPrice } from '../../../core/utils-formatters';
import { fromMilli, parseMoneyText, sumMoney as sumExactMoney, toMilli } from '../../../core/finance/money';

/** Forgiving parser for typed amounts and quantities. Empty or invalid text is 0. */
export function parseAmount(raw: string | number | null | undefined): number {
  return parseMoneyText(raw) ?? 0;
}

/** Money is summed as integer thousandths so 0.1 + 0.2 never drifts (see core/finance/money). */
export const toMills = toMilli;
export const fromMills = fromMilli;

export function lineTotal(quantity: number, unitPrice: number): number {
  return fromMills(toMills(multiplyQuantityPrice(quantity, unitPrice)));
}

export function computeInvoiceTotals(lineTotals: number[], taxRate: number) {
  const subtotalM = lineTotals.reduce((sum, t) => sum + toMills(t), 0);
  const taxM = Math.round((subtotalM * Math.max(0, taxRate)) / 100);
  return {
    subtotal: fromMills(subtotalM),
    taxAmount: fromMills(taxM),
    total: fromMills(subtotalM + taxM),
  };
}

/** Sum of money values without float drift. */
export function sumMoney(values: number[]): number {
  return sumExactMoney(values);
}
