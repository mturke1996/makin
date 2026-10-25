import { parseMoneyText } from './money';

export const PROFIT_PERCENT_RANGE_MESSAGE = 'النسبة يجب أن تكون بين 0 وأقل من 100';
export const PROFIT_PERCENT_UNREADABLE_MESSAGE = 'اكتب رقماً مثل 10 أو 12.5';

/** `value` is meaningful when `ok`; `message` says why not when it is not. (A plain shape, as the project does not narrow unions.) */
export interface ProfitPercentageInput {
  ok: boolean;
  value: number;
  message?: string;
}

/**
 * What was typed in the agreed-percentage field, read the way people write it: «10», «١٢٫٥», «12,5», «10%», «١٠٪».
 * An empty field means no percentage (0). The result is a number from 0 up to, not including, 100, kept to two
 * decimals; anything else says why it cannot be saved.
 */
export function readProfitPercentage(raw: string | null | undefined): ProfitPercentageInput {
  const text = String(raw ?? '').replace(/[%٪]/g, '').trim();
  if (text === '') return { ok: true, value: 0 };
  const parsed = parseMoneyText(text);
  if (parsed == null) return { ok: false, value: 0, message: PROFIT_PERCENT_UNREADABLE_MESSAGE };
  // Checked after rounding: 99.999 would otherwise be saved as 100.
  const value = Math.round(parsed * 100) / 100;
  if (value < 0 || value >= 100) return { ok: false, value: 0, message: PROFIT_PERCENT_RANGE_MESSAGE };
  return { ok: true, value };
}
