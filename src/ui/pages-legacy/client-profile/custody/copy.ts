import { toMilli } from '../../../../core/finance/money';

/** Arabic count words for custody screens: one, two, 3-10 (plural), 11+ (singular accusative). */
function count(n: number, none: string, one: string, two: string, few: string, many: string): string {
  if (n <= 0) return none;
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n} ${n <= 10 ? few : many}`;
}

/** «عهدة واحدة»، «عهدتان»، «5 عهد»، «12 عهدة». */
export const custodyCount = (n: number): string => count(n, 'لا عهد بعد', 'عهدة واحدة', 'عهدتان', 'عهد', 'عهدة');

/** «مستخدم واحد»، «مستخدمان»، «3 مستخدمين»، «12 مستخدماً». */
export const holdersCount = (n: number): string => count(n, 'لا مستخدمين', 'مستخدم واحد', 'مستخدمان', 'مستخدمين', 'مستخدماً');

/** «بلا مصروفات»، «مصروف واحد»، «مصروفان»، «4 مصروفات»، «15 مصروفاً». */
export const expensesCount = (n: number): string => count(n, 'بلا مصروفات', 'مصروف واحد', 'مصروفان', 'مصروفات', 'مصروفاً');

/** Percent of a custody used: whole numbers, and anything under 1% reads «أقل من 1%». */
export function usedText(pct: number): string {
  if (!Number.isFinite(pct) || pct <= 0) return '0%';
  if (pct < 1) return 'أقل من 1%';
  return `${Math.round(pct)}%`;
}

/** Tone of a balance: a deficit is danger, a positive balance success, exactly zero stays neutral. */
export function balanceTone(remaining: number): 'success' | 'neutral' | 'danger' {
  const r = toMilli(remaining);
  if (r < 0) return 'danger';
  if (r === 0) return 'neutral';
  return 'success';
}
