import { areaPath, smoothPath, xAt, type Point } from './scale';
import { useIsRtl } from './useChart';

export type ChartTone = 'income' | 'expense' | 'net';
export const toneColor = (tone: ChartTone) => `var(--chart-${tone})`;

interface SparklineProps {
  values: readonly number[];
  tone: ChartTone;
  /** Pixel height of the drawing. */
  height?: number;
  /** Soft flat fill under the line. */
  area?: boolean;
  /** Describes the series for assistive technology, e.g. "المبيعات خلال 30 يوماً". */
  label: string;
}

const PAD_TOP = 8;
const PAD_BOTTOM = 8;

/**
 * A small trend line with a soft fill and a dot on the newest day. Stretches to the width of its
 * card; the stroke keeps a constant thickness however wide that is.
 */
export function Sparkline({ values, tone, height = 56, area = true, label }: SparklineProps) {
  const rtl = useIsRtl();
  const n = values.length;
  const color = toneColor(tone);

  if (n < 2) {
    return (
      <div role="img" aria-label={label} className="flex items-center" style={{ height }}>
        <span className="h-px w-full border-t border-dashed border-border-strong" />
      </div>
    );
  }

  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  const y = (v: number) => (span === 0 ? 50 : 100 - PAD_BOTTOM - ((v - lo) / span) * (100 - PAD_TOP - PAD_BOTTOM));
  const points: Point[] = values.map((v, i) => [xAt(i, n, 100, rtl), y(v)]);
  // In a right-to-left page time reads from the right, so the line is drawn newest-first.
  const ordered = rtl ? [...points].reverse() : points;
  const newest = points[n - 1];

  return (
    <div className="relative" style={{ height }} role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        {area && <path d={areaPath(ordered, 100)} fill={color} fillOpacity={0.1} />}
        <path
          d={smoothPath(ordered)}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        aria-hidden
        className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_var(--surface-panel)]"
        style={{ left: `${newest[0]}%`, top: `${newest[1]}%`, background: color }}
      />
    </div>
  );
}
