/**
 * Exact money math. The app shows three decimals (د.ل), so every amount is handled as an
 * integer count of thousandths: sums never drift (0.1 + 0.2), and "paid in full" really is equal.
 */

const SCALE = 1000;

/** Amount to whole thousandths (handles float edges such as 1.0005 × 1000). Non-finite is 0. */
export function toMilli(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(Number((amount * SCALE).toPrecision(12)));
}

export function fromMilli(milli: number): number {
  return milli / SCALE;
}

/** Round to the nearest 0.001. */
export function roundMoney(amount: number): number {
  return fromMilli(toMilli(amount));
}

/** Exact sum: every term is rounded to a thousandth before adding. */
export function sumMoney(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += toMilli(v);
  return fromMilli(total);
}

/** a + b to the thousandth. */
export function addMoney(a: number, b: number): number {
  return fromMilli(toMilli(a) + toMilli(b));
}

/** a - b to the thousandth. */
export function subtractMoney(a: number, b: number): number {
  return fromMilli(toMilli(a) - toMilli(b));
}

/* ── Typed amounts ─────────────────────────────────────────────────────── */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/**
 * Parses an amount the way people type it, with ONE rule everywhere in the app:
 *  - Arabic-Indic digits and the Arabic decimal mark (٫) are accepted;
 *  - when both "," and "." appear, the LAST one is the decimal mark and the other groups thousands;
 *  - a lone "," groups thousands when it splits clean groups of three ("1,500" is 1500, as the app
 *    prints it), otherwise it is the decimal mark ("12,5" is 12.5);
 *  - a lone "." is the decimal mark.
 * Returns undefined for empty or unreadable text.
 */
export function parseMoneyText(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;

  let s = String(raw)
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EXTENDED_INDIC.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/[٬،]/g, ',')
    .replace(/\s/g, '');
  if (!s || s === '-' || s === '+' || s === '.' || s === ',') return undefined;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (hasComma) {
    s = /^[-+]?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(/,/g, '.');
  }

  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
