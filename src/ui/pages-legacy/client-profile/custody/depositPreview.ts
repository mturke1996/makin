import { fromMilli, toMilli } from '../../../../core/finance/money';

export interface DepositPreview {
  /** The holder's balance on the client once this custody is saved (negative = still in deficit). */
  after: number;
  /** Deficit that will be deducted from the new custody on the day it is given (add only). */
  deducted: number;
}

/**
 * What saving a custody does to a holder's balance on the client, for the form to show before saving.
 * `remaining` is the holder's balance now (negative = deficit). When an existing custody is being edited,
 * pass its current amount as `replacing`: it is taken out before the typed amount goes in. A new custody
 * absorbs any standing deficit on the day it is given (`deducted`).
 * Returns null while the typed amount is not a positive number.
 */
export function depositPreview(remaining: number, typed: number | undefined, replacing = 0): DepositPreview | null {
  if (typed == null || !(toMilli(typed) > 0)) return null;
  const typedMilli = toMilli(typed);
  const deducted = replacing === 0 ? Math.max(0, -toMilli(remaining)) : 0;
  return {
    after: fromMilli(toMilli(remaining) - toMilli(replacing) + typedMilli),
    deducted: fromMilli(deducted),
  };
}
