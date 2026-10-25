import { toneColor, type ChartTone } from './Sparkline';

interface MiniBarsProps {
  values: readonly number[];
  tone: ChartTone;
  height?: number;
  /** Dashed line at the average of the values. */
  showAverage?: boolean;
  /** Bars come in alternating shades per block of this many days, so weeks are easy to tell apart. */
  groupSize?: number;
  label: string;
}

/** One bar per day, newest on the left in a right-to-left page (the flex row follows the page direction). */
export function MiniBars({ values, tone, height = 56, showAverage = true, groupSize = 7, label }: MiniBarsProps) {
  const color = toneColor(tone);
  const max = Math.max(0, ...values);
  const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  const pct = (v: number) => (max > 0 ? Math.max(v > 0 ? 4 : 0, (v / max) * 100) : 0);
  // Oldest first in the data: in RTL that puts the oldest at the right edge.
  const chronological = values;

  return (
    <div className="relative flex items-end gap-[2px]" style={{ height }} role="img" aria-label={label}>
      {chronological.map((v, i) => {
        const group = Math.floor((chronological.length - 1 - i) / groupSize);
        return (
          <span
            key={i}
            aria-hidden
            className="min-w-0 flex-1 rounded-t-[2px]"
            style={{
              height: `${pct(v)}%`,
              background: color,
              opacity: group % 2 === 0 ? 1 : 0.42,
              minHeight: v > 0 ? 2 : 1,
            }}
          />
        );
      })}
      {showAverage && max > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-fg-muted/70"
          style={{ bottom: `${pct(avg)}%` }}
        />
      )}
    </div>
  );
}
