/**
 * Whole-number percentages of `amounts` that add up to exactly 100 (largest remainder), so a chart's labels
 * never total 101 or 99 because every row was rounded on its own. The base is the amounts themselves, so the
 * shares are always of what is shown. Negative or non-finite amounts count as zero.
 */
export function shareOfTotal(amounts: number[]): number[] {
  const safe = amounts.map((a) => (Number.isFinite(a) && a > 0 ? a : 0));
  const total = safe.reduce((sum, a) => sum + a, 0);
  if (total <= 0) return safe.map(() => 0);
  const exact = safe.map((a) => (a / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((sum, f) => sum + f, 0);
  const byRemainder = exact.map((e, i) => ({ i, rest: e - floors[i] })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}

/** «34%», or «<1%» for a share that exists but would round to nothing, so a real amount never reads as 0. */
export function percentLabel(percent: number, exact?: number): string {
  if (percent <= 0 && exact != null && exact > 0) return '<1%';
  return `${percent}%`;
}

/**
 * How much of a budget is used, as a whole percent that never contradicts the state of the line:
 * not «100%» while there is money left, and not «100%» once it has been exceeded. Null when there is no budget.
 */
export function usedPercentLabel(actual: number, budget: number): string {
  if (!(budget > 0) || !Number.isFinite(actual)) return '—';
  const ratio = (actual / budget) * 100;
  let rounded = Math.round(ratio);
  if (rounded === 100 && ratio > 100) rounded = 101;
  if (rounded === 100 && ratio < 100) rounded = 99;
  return `${rounded}%`;
}
