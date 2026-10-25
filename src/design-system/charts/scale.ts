/** Pure helpers for the chart components: scales, ticks, smooth paths, compact Arabic numbers. */

const trim = (n: number) => String(Math.round(n * 10) / 10).replace(/\.0$/, '');

export interface CompactParts {
  /** "−" or "". */
  sign: string;
  /** Latin digits: "17.5". */
  number: string;
  /** "ألف", "مليون", or "" for small numbers. */
  unit: string;
}

/** 17500 becomes 17.5 + ألف, 1200000 becomes 1.2 + مليون, small numbers stay whole with no unit. */
export function compactParts(value: number): CompactParts {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1_000_000) return { sign, number: trim(abs / 1_000_000), unit: 'مليون' };
  if (abs >= 1_000) return { sign, number: trim(abs / 1_000), unit: 'ألف' };
  return { sign, number: Math.round(abs).toLocaleString('en-US'), unit: '' };
}

/** "17.5 ألف", "1.2 مليون", "950". */
export function compactNumber(value: number): string {
  const { sign, number, unit } = compactParts(value);
  return `${sign}${number}${unit ? ` ${unit}` : ''}`;
}

/**
 * SVG `text-anchor` follows the text direction: in a right-to-left page `start` is the RIGHT end.
 * This takes the side you mean on screen and returns the anchor that produces it.
 */
export function anchorAt(side: 'left' | 'middle' | 'right', rtl: boolean): 'start' | 'middle' | 'end' {
  if (side === 'middle') return 'middle';
  const wantsStart = (side === 'left') !== rtl;
  return wantsStart ? 'start' : 'end';
}

/** A readable step (1, 2, 2.5 or 5 times a power of ten) so that `count` steps cover `max`. */
export function niceStep(max: number, count: number): number {
  if (!(max > 0) || count < 1) return 1;
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
}

export interface Axis {
  min: number;
  max: number;
  ticks: number[];
}

/** A y-axis covering all values (and zero), with round tick values. */
export function niceAxis(values: readonly number[], count = 3): Axis {
  const hi = Math.max(0, ...values);
  const lo = Math.min(0, ...values);
  if (hi === 0 && lo === 0) return { min: 0, max: 1, ticks: [0, 1] };
  const step = niceStep(Math.max(hi, -lo) || 1, hi > 0 && lo < 0 ? count - 1 : count);
  const max = hi > 0 ? Math.ceil(hi / step) * step : 0;
  const min = lo < 0 ? Math.floor(lo / step) * step : 0;
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 1000; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return { min, max, ticks };
}

export type Point = readonly [number, number];

/** Monotone cubic path through the points (no overshoot, so a flat stretch stays flat). */
export function smoothPath(points: readonly Point[]): string {
  const n = points.length;
  if (n === 0) return '';
  const f = (v: number) => Math.round(v * 100) / 100;
  if (n === 1) return `M${f(points[0][0])},${f(points[0][1])}`;
  if (n === 2) return `M${f(points[0][0])},${f(points[0][1])}L${f(points[1][0])},${f(points[1][1])}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1][0] - points[i][0]);
    slope.push(dx[i] === 0 ? 0 : (points[i + 1][1] - points[i][1]) / dx[i]);
  }
  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
    } else {
      const a = tangent[i] / slope[i];
      const b = tangent[i + 1] / slope[i];
      const h = Math.hypot(a, b);
      if (h > 3) {
        tangent[i] = (3 * a * slope[i]) / h;
        tangent[i + 1] = (3 * b * slope[i]) / h;
      }
    }
  }

  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const c = dx[i] / 3;
    d += `C${f(x0 + c)},${f(y0 + tangent[i] * c)},${f(x1 - c)},${f(y1 - tangent[i + 1] * c)},${f(x1)},${f(y1)}`;
  }
  return d;
}

/** The line closed down to a baseline, for the soft fill under it. */
export function areaPath(points: readonly Point[], baselineY: number): string {
  if (points.length === 0) return '';
  const line = smoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line}L${Math.round(last[0] * 100) / 100},${baselineY}L${Math.round(first[0] * 100) / 100},${baselineY}Z`;
}

/**
 * x position of point i of n inside [0, width]. In a right-to-left page the newest point sits on the
 * left (time reads from the right), so the order is mirrored.
 */
export const xAt = (i: number, n: number, width: number, rtl: boolean): number => {
  const t = n <= 1 ? 0.5 : i / (n - 1);
  return (rtl ? 1 - t : t) * width;
};
