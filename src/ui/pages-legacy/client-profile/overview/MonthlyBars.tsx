import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Amount } from '../../../../design-system/primitives';
import { anchorAt, compactNumber, niceAxis } from '../../../../design-system/charts';
import { useElementWidth, useIsRtl } from '../../../../design-system/charts/useChart';
import { monthName, monthTitle, type MonthlyFlow } from '../../../../core/finance/clientAnalytics';
import { subtractMoney, sumMoney } from '../../../../core/finance/money';
import { formatCurrencyDisplay } from '../../../../core/utils-formatters';

const PAD = { top: 12, bottom: 26 };
/** Extra room under the month names when the window crosses a year and the year goes on a second line. */
const YEAR_ROW = 16;
const BAR_MAX = 14;
const BAR_GAP = 2;
const RADIUS = 4;

const COLLECTED = 'var(--chart-income)';
const SPENT = 'var(--chart-expense)';

/** A column with the two top corners rounded and a square foot on the baseline. */
function barPath(x: number, top: number, width: number, height: number): string {
  if (height <= 0 || width <= 0) return '';
  const r = Math.min(RADIUS, width / 2, height);
  const f = (v: number) => Math.round(v * 100) / 100;
  return `M${f(x)},${f(top + height)}V${f(top + r)}Q${f(x)},${f(top)} ${f(x + r)},${f(top)}H${f(x + width - r)}Q${f(x + width)},${f(top)} ${f(x + width)},${f(top + r)}V${f(top + height)}Z`;
}

/** One sentence that stands in for the picture: the totals and the strongest month of each kind. */
export function flowSummary(flow: MonthlyFlow): string {
  const n = flow.months.length;
  if (n === 0) return 'لا توجد بيانات شهرية.';
  const collected = sumMoney(flow.collected);
  const spent = sumMoney(flow.expenses);
  const best = (values: readonly number[]) => values.reduce((bi, v, i) => (v > values[bi] ? i : bi), 0);
  const bc = best(flow.collected);
  const be = best(flow.expenses);
  const parts = [
    `المحصّل والمصروفات الشهرية خلال ${n} شهراً: المحصّل ${formatCurrencyDisplay(collected)}، المصروفات ${formatCurrencyDisplay(spent)}`,
  ];
  if (flow.collected[bc] > 0) parts.push(`أعلى تحصيل في ${monthTitle(flow.months[bc])} بقيمة ${formatCurrencyDisplay(flow.collected[bc])}`);
  if (flow.expenses[be] > 0) parts.push(`وأعلى مصروف في ${monthTitle(flow.months[be])} بقيمة ${formatCurrencyDisplay(flow.expenses[be])}`);
  return `${parts.join('، ')}.`;
}

interface MonthlyBarsProps {
  flow: MonthlyFlow;
  height?: number;
}

/**
 * Collected next to spent for every month: two thin columns per month, a hairline grid with round axis
 * values, and a tooltip that follows a finger, the pointer or the arrow keys. Time reads from the right in a
 * right-to-left page (the newest month is on the left). A hidden table repeats every value for screen readers.
 */
export function MonthlyBars({ flow, height = 200 }: MonthlyBarsProps) {
  const rtl = useIsRtl();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const n = flow.months.length;
  // Axis text is sized in rem, so it follows the reader's text size; the room it needs follows too.
  const [textScale, setTextScale] = useState(1);
  useEffect(() => {
    setTextScale(parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1);
  }, [width]);

  const axis = useMemo(() => niceAxis([...flow.collected, ...flow.expenses], 3), [flow]);
  const crossesYears = flow.months.length > 0 && flow.months[0].slice(0, 4) !== flow.months[flow.months.length - 1].slice(0, 4);
  const padBottom = (PAD.bottom + (crossesYears ? YEAR_ROW : 0)) * textScale;
  const plotH = height - PAD.top - padBottom;
  const y = (v: number) => PAD.top + (1 - (v - axis.min) / (axis.max - axis.min || 1)) * plotH;
  const baseline = y(0);

  if (n < 1) return null;

  // The axis values live in a gutter at the start side (the right in RTL), so no bar ever covers one.
  const gutter = Math.max(28, Math.max(0, ...axis.ticks.map((t) => compactNumber(t).length)) * 6.6 * textScale + 8);
  const plotX = rtl ? 0 : gutter;
  const plotW = Math.max(1, width - gutter);
  const slot = plotW / n;
  const slotStart = (i: number) => plotX + (rtl ? plotW - (i + 1) * slot : i * slot);
  const slotCenter = (i: number) => slotStart(i) + slot / 2;
  const barW = Math.max(3, Math.min(BAR_MAX, (slot * 0.6 - BAR_GAP) / 2));

  // How many months apart the labels are, so two neighbours never touch.
  const step = Math.max(1, Math.ceil((42 * textScale) / slot));
  const labelled = flow.months.map((m, i) => ({ m, i })).filter(({ i }) => (n - 1 - i) % step === 0);

  const indexAt = (clientX: number, rect: DOMRect) => {
    const t = Math.min(0.999999, Math.max(0, (clientX - rect.left - plotX) / plotW));
    return Math.floor((rtl ? 1 - t : t) * n);
  };
  const onHover = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setActive(indexAt(e.clientX, e.currentTarget.getBoundingClientRect()));
  };
  // A tap picks a month and a second tap on it lets go (a finger has no hover to end).
  const onPress = (e: PointerEvent<HTMLDivElement>) => {
    const i = indexAt(e.clientX, e.currentTarget.getBoundingClientRect());
    setActive((cur) => (e.pointerType !== 'mouse' && cur === i ? null : i));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') return setActive(null);
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    // The newest month is on the left in RTL and on the right otherwise.
    const towardNewer = rtl ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
    // The first key press lands on the newest month, the one people ask about first.
    setActive((cur) => (cur === null ? n - 1 : Math.min(n - 1, Math.max(0, cur + (towardNewer ? 1 : -1)))));
  };

  const activeCenter = active === null ? 0 : slotCenter(active);
  const tipOnLeft = active !== null && activeCenter > width / 2;
  const tipStyle: CSSProperties | undefined =
    active === null ? undefined : tipOnLeft ? { right: width - activeCenter + slot / 2 + 6 } : { left: activeCenter + slot / 2 + 6 };

  return (
    <div>
      <div
        ref={ref}
        className="relative touch-pan-y select-none rounded-md outline-none focus-visible:shadow-focus"
        style={{ height }}
        role="img"
        aria-label={flowSummary(flow)}
        tabIndex={0}
        onPointerMove={onHover}
        onPointerDown={onPress}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 overflow-visible" aria-hidden>
          {active !== null && (
            <rect
              x={slotStart(active)}
              y={PAD.top - 6}
              width={slot}
              height={baseline - PAD.top + 6}
              rx={RADIUS}
              fill="var(--surface-sunken)"
            />
          )}

          {axis.ticks.map((t) => (
            <g key={t}>
              <line
                x1={plotX}
                x2={plotX + plotW}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? 'var(--surface-border-strong)' : 'var(--surface-border)'}
                strokeWidth={1}
              />
              {t !== 0 && (
                <text
                  x={rtl ? width : 0}
                  y={y(t)}
                  dy="0.35em"
                  textAnchor={anchorAt(rtl ? 'right' : 'left', rtl)}
                  className="fill-fg-muted"
                  style={{ fontSize: '0.75rem' }}
                >
                  {compactNumber(t)}
                </text>
              )}
            </g>
          ))}

          {flow.months.map((month, i) => {
            const c = slotCenter(i);
            // The first series (collected) sits on the reading-start side: the right in RTL.
            const first = rtl ? c + BAR_GAP / 2 : c - BAR_GAP / 2 - barW;
            const second = rtl ? c - BAR_GAP / 2 - barW : c + BAR_GAP / 2;
            const hc = Math.max(0, baseline - y(flow.collected[i]));
            const he = Math.max(0, baseline - y(flow.expenses[i]));
            return (
              <g key={month}>
                <path d={barPath(first, baseline - hc, barW, hc)} fill={COLLECTED} />
                <path d={barPath(second, baseline - he, barW, he)} fill={SPENT} />
              </g>
            );
          })}

          {labelled.map(({ m, i }, k) => {
            // The year goes under the first label of each year, so a window across two years is never ambiguous.
            const showYear = crossesYears && (k === 0 || labelled[k - 1].m.slice(0, 4) !== m.slice(0, 4));
            return (
              <g key={m}>
                <text x={slotCenter(i)} y={height - padBottom + 18 * textScale} textAnchor="middle" className="fill-fg-muted" style={{ fontSize: '0.75rem' }}>
                  {monthName(m)}
                </text>
                {showYear && (
                  <text x={slotCenter(i)} y={height - 4} textAnchor="middle" className="fill-fg-muted" style={{ fontSize: '0.75rem' }}>
                    {m.slice(0, 4)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {active !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-md border border-border bg-surface-panel px-3 py-2 shadow-md"
            style={tipStyle}
          >
            <p className="text-2xs font-semibold text-fg-subtle">{monthTitle(flow.months[active])}</p>
            <Row color={COLLECTED} label="المحصّل" amount={flow.collected[active]} />
            <Row color={SPENT} label="المصروف" amount={flow.expenses[active]} />
            <p className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1 text-sm">
              <span className="text-fg-subtle">الصافي</span>
              <Amount amount={subtractMoney(flow.collected[active], flow.expenses[active])} tone="auto" className="font-semibold" />
            </p>
          </div>
        )}
      </div>

      <div className="sr-only">
        <table>
          <caption>المحصّل والمصروفات لكل شهر</caption>
          <thead>
            <tr>
              <th scope="col">الشهر</th>
              <th scope="col">المحصّل</th>
              <th scope="col">المصروفات</th>
              <th scope="col">الصافي</th>
            </tr>
          </thead>
          <tbody>
            {flow.months.map((m, i) => (
              <tr key={m}>
                <th scope="row">{monthTitle(m)}</th>
                <td>{formatCurrencyDisplay(flow.collected[i])}</td>
                <td>{formatCurrencyDisplay(flow.expenses[i])}</td>
                <td>{formatCurrencyDisplay(subtractMoney(flow.collected[i], flow.expenses[i]))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ color, label, amount }: { color: string; label: string; amount: number }) {
  return (
    <p className="mt-1 flex items-center justify-between gap-4 text-sm">
      <span className="flex items-center gap-1.5 text-fg-subtle">
        <span className="size-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <Amount amount={amount} className="font-semibold text-fg" />
    </p>
  );
}
