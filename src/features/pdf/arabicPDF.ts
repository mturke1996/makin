// @ts-nocheck
/**
 * Arabic helpers for @react-pdf/renderer + Tajawal (turki-dairy-erp pattern).
 * Logical Unicode only — no Presentation Forms (U+FE70+).
 */

const HAS_ARABIC = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const RLM = '\u200F';

/**
 * Arabic text, logical Unicode, fenced by right-to-left marks (zero width).
 *
 * The PDF engine lays a line out left to right unless told otherwise, which misplaces whatever is not
 * Arabic: «10 سجلات» leaves the figure at the far end of the line, and the full stop closing a sentence
 * lands at its start. A mark at each end makes the whole line read right to left. Text with no Arabic
 * (references, dates, amounts) is left exactly as it is.
 */
export function ar(text: string | number | null | undefined): string {
  if (text == null) return '';
  const str = String(text);
  if (!HAS_ARABIC.test(str)) return str;
  return `${str.startsWith(RLM) ? '' : RLM}${str}${str.endsWith(RLM) ? '' : RLM}`;
}

function groupNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? Math.abs(n) : 0);
}

/** LTR money string: «د.ل 1,234» */
export function ltrAmountCurrency(amount: number, currency = 'د.ل', decimals = 0): string {
  const sign = Math.round(amount) < 0 ? '-' : '';
  const curr = String(currency ?? '').trim();
  return `${sign}${curr}\u00A0${groupNumber(amount, decimals)}`;
}

export function arMoney(amount: number, currency = 'د.ل', decimals = 0): string {
  return ltrAmountCurrency(amount, currency, decimals);
}

export function pdfDisplayValue(text: string | number | null | undefined): string {
  if (text == null) return '';
  const str = String(text);
  if (!str) return '';
  if (!HAS_ARABIC.test(str)) return str;
  if (/[0-9]/.test(str)) return str;
  return ar(str);
}

export function arDate(d: string | Date): string {
  try {
    const dt = typeof d === 'string' ? new Date(d.includes('T') ? d : `${d.slice(0, 10)}T12:00:00`) : d;
    if (Number.isNaN(dt.getTime())) return '—';
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  } catch {
    return String(d ?? '');
  }
}

export function arDateMedium(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date.includes('T') ? date : `${date.slice(0, 10)}T12:00:00`) : date;
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('ar-LY-u-ca-gregory', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return arDate(d);
  }
}
