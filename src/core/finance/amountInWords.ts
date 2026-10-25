/**
 * An amount in Arabic words, for receipts: «ثلاثون ألفاً وخمسمائة دينار ليبي فقط لا غير».
 * The dinar is split into 1000 dirhams, the same thousandths every amount in the app carries.
 *
 * Counting rules followed here:
 *  - 1 and 2 take their own forms (ألف، ألفان / دينار واحد، ديناران); 3 to 10 take the plural (آلاف، دنانير);
 *    11 to 99 take the accusative singular (ألفاً، ديناراً); a whole hundred takes the bare noun (مائة دينار).
 *  - A scale word that comes right before the currency is in construct («اثنا عشر ألف دينار», «ألفا دينار»);
 *    when more follows it takes the accusative («اثنا عشر ألفاً وخمسمائة دينار»).
 *  - «مئتان» becomes «مئتا» in front of the noun it counts.
 */

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const TEENS = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

/** 1..999 in words (masculine). */
function below1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (r > 0) {
    if (r < 10) parts.push(ONES[r]);
    else if (r < 20) parts.push(TEENS[r - 10]);
    else parts.push(r % 10 ? `${ONES[r % 10]} و${TENS[Math.floor(r / 10)]}` : TENS[Math.floor(r / 10)]);
  }
  return parts.join(' و');
}

/** «مئتان» is «مئتا» in front of the noun it counts, and only when the group is exactly 200. */
const beforeNoun = (g: number) => (g === 200 ? 'مئتا' : below1000(g));

interface Noun {
  one: string;
  two: string;
  /** The dual in construct, in front of another noun: «ألفا دينار». */
  twoConstruct: string;
  few: string;
  many: string;
  bare: string;
}

/** The plural / accusative / bare form a group asks for, from its last two digits. */
function formFor(g: number, noun: Noun, construct: boolean): string {
  const m = g % 100;
  if (m >= 3 && m <= 10) return noun.few;
  if (m >= 11) return construct ? noun.bare : noun.many;
  return noun.bare;
}

const SCALES: { value: number; noun: Noun }[] = [
  { value: 1e9, noun: { one: 'مليار', two: 'ملياران', twoConstruct: 'مليارا', few: 'مليارات', many: 'ملياراً', bare: 'مليار' } },
  { value: 1e6, noun: { one: 'مليون', two: 'مليونان', twoConstruct: 'مليونا', few: 'ملايين', many: 'مليوناً', bare: 'مليون' } },
  { value: 1e3, noun: { one: 'ألف', two: 'ألفان', twoConstruct: 'ألفا', few: 'آلاف', many: 'ألفاً', bare: 'ألف' } },
];

/** The part of a number made of whole thousands/millions/billions; `construct` when the currency comes straight after. */
function scaleWords(above: number, construct: boolean): string {
  const groups = SCALES.map(({ value, noun }) => ({ noun, g: Math.floor((above % (value * 1000)) / value) })).filter((x) => x.g > 0);
  return groups
    .map(({ noun, g }, i) => {
      const last = construct && i === groups.length - 1;
      if (g === 1) return noun.one;
      if (g === 2) return last ? noun.twoConstruct : noun.two;
      return `${beforeNoun(g)} ${formFor(g, noun, last)}`;
    })
    .join(' و');
}

interface Currency {
  noun: Noun;
  /** The adjective that follows the noun, in agreement with its form (for the dinar: ليبي). */
  adjective?: (form: string) => string;
}

const DINAR: Currency = {
  noun: { one: 'دينار', two: 'ديناران', twoConstruct: 'ديناران', few: 'دنانير', many: 'ديناراً', bare: 'دينار' },
  adjective: (form) => ({ دينار: 'ليبي', ديناران: 'ليبيان', دنانير: 'ليبية', ديناراً: 'ليبياً' })[form] ?? 'ليبي',
};
const DIRHAM: Currency = { noun: { one: 'درهم', two: 'درهمان', twoConstruct: 'درهما', few: 'دراهم', many: 'درهماً', bare: 'درهم' } };

/** A whole number (1 ≤ n < 1e12) counting a currency: «خمسة وعشرون ديناراً ليبياً»، «دينار ليبي واحد»، «ألفا دينار ليبي». */
function counted(n: number, { noun, adjective }: Currency): string {
  const rest = n % 1000;
  const above = n - rest;
  const dressed = (form: string) => (adjective ? `${form} ${adjective(form)}` : form);

  const segments: string[] = [];
  if (above > 0 && rest === 0) return `${scaleWords(above, true)} ${dressed(noun.bare)}`;
  if (above > 0) segments.push(scaleWords(above, false));

  // The last part carries the noun. One and two stand as «دينار ليبي واحد» / «ديناران ليبيان».
  if (rest === 1) segments.push(`${dressed(noun.one)} واحد`);
  else if (rest === 2) segments.push(dressed(noun.two));
  else segments.push(`${beforeNoun(rest)} ${dressed(formFor(rest, noun, false))}`);
  return segments.join(' و');
}

export interface AmountWordsOptions {
  /** Append «فقط لا غير» (default). */
  closing?: boolean;
}

/**
 * Dinars and dirhams in words. `amount` is rounded to the thousandth and the sign is ignored.
 * Zero reads «صفر دينار ليبي».
 */
export function amountInWords(amount: number, { closing = true }: AmountWordsOptions = {}): string {
  const milli = Math.round(Math.abs(Number.isFinite(amount) ? amount : 0) * 1000);
  const dinars = Math.floor(milli / 1000);
  const dirhams = milli % 1000;
  const parts: string[] = [];

  if (dinars > 0) parts.push(counted(dinars, DINAR));
  else if (dirhams === 0) parts.push('صفر دينار ليبي');
  if (dirhams > 0) parts.push(counted(dirhams, DIRHAM));

  const text = parts.join(' و');
  return closing ? `${text} فقط لا غير` : text;
}
