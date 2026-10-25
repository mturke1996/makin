import { normalizeDigits } from '../workers/format';

/** Libya. Numbers typed the local way (0912345678) are sent to WhatsApp with this country code. */
export const DEFAULT_COUNTRY_CODE = '218';

/** The fewest digits that can be a phone number at all. */
const MIN_DIGITS = 7;

/** Local numbers (without the leading zero) are at most this long; longer ones already carry a country code. */
const MAX_LOCAL_DIGITS = 10;

/**
 * Digits for `https://wa.me/<digits>`: the international number with no +, no spaces and no leading zeros.
 *  - `+218 91 234 5678`, `00218912345678` and `218912345678` keep their country code;
 *  - `0912345678`, `091-234-5678` and `912345678` are local, so `countryCode` goes in front;
 *  - another country's number (`+20 101 234 5678`) is kept as typed;
 *  - the trunk zero people write after the code (`+218 0912345678`) is dropped.
 * Arabic-Indic digits are accepted. Null when there are too few digits to be a number.
 */
export function whatsappNumber(raw: string | null | undefined, countryCode: string = DEFAULT_COUNTRY_CODE): string | null {
  if (!raw) return null;
  const typed = normalizeDigits(raw).trim();
  let digits = typed.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS) return null;

  const international = typed.startsWith('+') || digits.startsWith('00');
  if (digits.startsWith('00')) digits = digits.replace(/^0+/, '');

  if (!international) {
    if (digits.startsWith('0')) {
      // A local number: the trunk zero(s) are replaced by the country code.
      digits = countryCode + digits.replace(/^0+/, '');
    } else if (!digits.startsWith(countryCode) && digits.length <= MAX_LOCAL_DIGITS) {
      digits = countryCode + digits;
    }
  }

  // "+218 0912345678": nobody dials the trunk zero after the country code.
  if (digits.startsWith(`${countryCode}0`)) digits = countryCode + digits.slice(countryCode.length).replace(/^0+/, '');
  return digits.length >= MIN_DIGITS ? digits : null;
}

export function whatsappHref(raw: string | null | undefined, countryCode?: string): string | null {
  const number = whatsappNumber(raw, countryCode);
  return number ? `https://wa.me/${number}` : null;
}

/** `tel:` link: digits and a leading +. Null when there is no number to dial. */
export function phoneHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const typed = normalizeDigits(raw).trim();
  const digits = typed.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS) return null;
  return `tel:${typed.startsWith('+') ? '+' : ''}${digits}`;
}

/** Google Maps search for a written address. Null for an empty one. */
export function mapsHref(address: string | null | undefined): string | null {
  const q = address?.replace(/\s+/g, ' ').trim();
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}
