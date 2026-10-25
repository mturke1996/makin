// @ts-nocheck
/**
 * Arabic helpers for @react-pdf/renderer + Tajawal (turki-dairy-erp pattern).
 * Logical Unicode only — no Presentation Forms (U+FE70+).
 */

const HAS_ARABIC = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Arabic text — pass-through logical Unicode. */
export function ar(text: string | number | null | undefined): string {
  if (text == null) return '';
  return String(text);
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
