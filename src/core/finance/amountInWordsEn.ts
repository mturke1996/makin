/**
 * An amount in English words, for the bilingual receipt: «Thirty thousand five hundred Libyan dinars only».
 * Same thousandths as the Arabic wording: 1 dinar = 1000 dirhams.
 */

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES: [number, string][] = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];

/** 1..999 */
function below1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(`${ONES[h]} hundred`);
  if (r) {
    const tail = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : '');
    parts.push(h ? `and ${tail}` : tail);
  }
  return parts.join(' ');
}

/** A whole number (1 ≤ n < 1e12) in words. */
function whole(n: number): string {
  const parts: string[] = [];
  let rest = n;
  for (const [value, name] of SCALES) {
    const g = Math.floor(rest / value);
    if (g > 0) parts.push(`${below1000(g)} ${name}`);
    rest -= g * value;
  }
  if (rest > 0) parts.push(parts.length > 0 && rest < 100 ? `and ${below1000(rest)}` : below1000(rest));
  return parts.join(' ');
}

const counted = (n: number, one: string, many: string) => `${whole(n)} ${n === 1 ? one : many}`;

/** Dinars and dirhams in words. `amount` is rounded to the thousandth and the sign is ignored. */
export function amountInWordsEn(amount: number, { closing = true }: { closing?: boolean } = {}): string {
  const milli = Math.round(Math.abs(Number.isFinite(amount) ? amount : 0) * 1000);
  const dinars = Math.floor(milli / 1000);
  const dirhams = milli % 1000;
  const parts: string[] = [];
  if (dinars > 0) parts.push(counted(dinars, 'Libyan dinar', 'Libyan dinars'));
  else if (dirhams === 0) parts.push('zero Libyan dinars');
  if (dirhams > 0) parts.push(counted(dirhams, 'dirham', 'dirhams'));
  const text = parts.join(' and ');
  const sentence = text.charAt(0).toUpperCase() + text.slice(1);
  return closing ? `${sentence} only` : sentence;
}
