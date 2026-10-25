import { useMemo, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Amount } from '../primitives/CurrencyAmount';
import { anchorAt, areaPath, compactNumber, niceAxis, smoothPath, xAt, type Point } from './scale';
import { toneColor, type ChartTone } from './Sparkline';
import { useElementWidth, useIsRtl } from './useChart';

export interface FlowSeries {
  id: string;
  label: string;
  values: readonly number[];
  tone: ChartTone;
}

interface FlowChartProps {
  /** One `YYYY-MM-DD` per value, oldest first. */
  days: readonly string[];
  series: readonly FlowSeries[];
  height?: number;
  /** Plain-language summary for assistive technology. */
  label: string;
  /** How a value reads in the tooltip. Defaults to money. */
  formatValue?: (value: number) => ReactNode;
}

const PAD = { top: 22, bottom: 24 };
const dayLabel = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/**
 * Income-versus-expense style chart: smooth lines with a faint fill, dashed grid, round axis values and a
 * crosshair that follows a finger or the pointer (arrow keys too). Newest day on the left in RTL.
 */
export function FlowChart({ days, series, height = 200, label, formatValue }: FlowChartProps) {
  const rtl = useIsRtl();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const n = days.length;

  const axis = useMemo(() => niceAxis(series.flatMap((s) => s.values), 3), [series]);
  const plotH = height - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + (1 - (v - axis.min) / (axis.max - axis.min || 1)) * plotH;

  const drawn = useMemo(
    () =>
      series.map((s) => {
        const pts: Point[] = s.values.map((v, i) => [xAt(i, n, width, rtl), y(v)]);
        const ordered = rtl ? [...pts].reverse() : pts;
        return { s, pts, ordered };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `y` is derived from axis, plotH
    [series, n, width, rtl, axis, plotH],
  );

  if (n < 2) return null;

  const at = (clientX: number, rect: DOMRect) => {
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const idx = Math.round((rtl ? 1 - t : t) * (n - 1));
    setActive(idx);
  };
  const onPointer = (e: PointerEvent<HTMLDivElement>) => at(e.clientX, e.currentTarget.getBoundingClientRect());
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return;
    if (e.key === 'Escape') return setActive(null);
    e.preventDefault();
    // Left arrow moves toward the left edge, which is the newest day in RTL and the oldest otherwise.
    const towardLeft = e.key === 'ArrowLeft';
    const step = (rtl ? towardLeft : !towardLeft) ? 1 : -1;
    setActive((cur) => Math.min(n - 1, Math.max(0, (cur ?? (step > 0 ? 0 : n - 1)) + step)));
  };

  const labelIdx = [0, Math.floor((n - 1) / 2), n - 1];
  const anchorFor = (x: number) => anchorAt(x < 28 ? 'left' : x > width - 28 ? 'right' : 'middle', rtl);
  const activeX = active === null ? 0 : xAt(active, n, width, rtl);
  const tipOnLeft = active !== null && activeX > width / 2;

  return (
    <div
      ref={ref}
      className="relative touch-pan-y select-none outline-none focus-visible:shadow-focus rounded-md"
      style={{ height }}
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerMove={onPointer}
      onPointerDown={onPointer}
      onPointerLeave={() => setActive(null)}
      onBlur={() => setActive(null)}
      onKeyDown={onKey}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 overflow-visible" aria-hidden>
        {axis.ticks.map((t) => (
          <g key={t}>
            <line
              x1={0}
              x2={width}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--surface-border-strong)"
              strokeWidth={1}
              strokeDasharray={t === 0 ? undefined : '3 5'}
              opacity={t === 0 ? 0.9 : 0.8}
            />
            {t !== 0 && (
              <text
                x={rtl ? width : 0}
                y={y(t) - 6}
                textAnchor={anchorAt(rtl ? 'right' : 'left', rtl)}
                className="fill-fg-muted"
                style={{ fontSize: 12 }}
              >
                {compactNumber(t)}
              </text>
            )}
          </g>
        ))}

        {drawn.map(({ s, ordered }) => (
          <g key={s.id}>
            <path d={areaPath(ordered, y(Math.max(axis.min, 0)))} fill={toneColor(s.tone)} fillOpacity={0.07} />
            <path
              d={smoothPath(ordered)}
              fill="none"
              stroke={toneColor(s.tone)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}

        {labelIdx.map((i) => {
          const x = xAt(i, n, width, rtl);
          return (
            <text key={i} x={x} y={height - 4} textAnchor={anchorFor(x)} className="fill-fg-muted" style={{ fontSize: 12 }}>
              {dayLabel(days[i])}
            </text>
          );
        })}

        {active !== null && (
          <g>
            <line x1={activeX} x2={activeX} y1={PAD.top - 6} y2={height - PAD.bottom} stroke="var(--text-tertiary)" strokeWidth={1} />
            {drawn.map(({ s, pts }) => (
              <circle key={s.id} cx={pts[active][0]} cy={pts[active][1]} r={4.5} fill={toneColor(s.tone)} stroke="var(--surface-panel)" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>

      {active !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-md border border-border bg-surface-panel px-3 py-2 shadow-md"
          style={{ [tipOnLeft ? 'right' : 'left']: tipOnLeft ? width - activeX + 10 : activeX + 10 } as React.CSSProperties}
        >
          <p className="text-2xs font-semibold text-fg-subtle">{dayLabel(days[active])}</p>
          {series.map((s) => (
            <p key={s.id} className="mt-1 flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-fg-subtle">
                <span className="size-2 rounded-full" style={{ background: toneColor(s.tone) }} />
                {s.label}
              </span>
              <span className="font-semibold text-fg">{formatValue ? formatValue(s.values[active]) : <Amount amount={s.values[active]} />}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Legend row for a FlowChart ("الوارد", "الصادر"), outside the chart so it wraps on narrow screens. */
export function ChartLegend({ items }: { items: readonly { label: string; tone: ChartTone }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-sm text-fg-subtle">
          <span className="size-2.5 rounded-full" style={{ background: toneColor(item.tone) }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
