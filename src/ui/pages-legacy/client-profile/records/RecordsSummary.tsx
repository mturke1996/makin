import { useState, type ReactNode } from 'react';
import { ExpandMore, InfoOutlined } from '../../../../design-system/icons';
import { Amount, ProgressBar } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import { collapseShares, type ShareRow } from '../../../../core/finance/clientRecords';

type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'brand';

const FIGURE_TONE: Record<Tone, string> = {
  neutral: 'text-fg',
  success: 'text-success-ink',
  danger: 'text-danger-ink',
  warning: 'text-warning-ink',
  brand: 'text-accent-ink',
};

interface RecordsSummaryProps {
  /** What the figure is: «إجمالي المصروفات», or «المطابق للتصفية» while a filter is on. */
  eyebrow: string;
  figure: ReactNode;
  tone?: Tone;
  /** Count line at the opposite end: «12 من 60 مصروفاً». */
  caption: ReactNode;
  /** One quiet line under the figure (the total before filtering). */
  context?: ReactNode;
  /** Says that the figures are not the whole picture («ما سجّلته أنت فقط»). */
  partialNote?: ReactNode;
  /** A thin bar under the figure (progress of the project). */
  meter?: ReactNode;
  /** Secondary figures split by hairlines (debts: value, paid, remaining). */
  stats?: { label: string; value: ReactNode }[];
  /** The breakdown that teaches (shares, budget bar). */
  children?: ReactNode;
}

/**
 * The strip at the top of a record list: one figure, how many records stand behind it, and a breakdown.
 * It is computed from the filtered records, so it always matches the list below. One surface, no nested
 * cards: hairlines separate the parts.
 */
export function RecordsSummary({
  eyebrow,
  figure,
  tone = 'neutral',
  caption,
  context,
  partialNote,
  meter,
  stats,
  children,
}: RecordsSummaryProps) {
  return (
    <section aria-label={eyebrow} className="overflow-hidden rounded-lg border border-border bg-surface-panel">
      <div className="px-4 py-3.5">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-subtle">{eyebrow}</p>
            <p className={cn('mt-0.5 text-xl font-bold leading-tight tabular-nums', FIGURE_TONE[tone])}>{figure}</p>
          </div>
          <div className="text-end">
            <p className="text-xs text-fg-muted">{caption}</p>
            {context && <p className="mt-0.5 text-xs text-fg-muted">{context}</p>}
          </div>
        </div>
        {meter && <div className="mt-3">{meter}</div>}
      </div>
      {partialNote && (
        <p className="flex items-start gap-2 border-t border-border bg-info-soft px-4 py-2.5 text-xs leading-relaxed text-info-ink">
          <InfoOutlined sx={{ fontSize: 18 }} aria-hidden className="mt-px flex-none" />
          <span>{partialNote}</span>
        </p>
      )}
      {stats && stats.length > 0 && (
        <dl
          className="grid border-t border-border"
          style={{
            gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))`,
          }}
        >
          {stats.map((s) => (
            <div key={s.label} className="min-w-0 px-4 py-2.5 [&:not(:first-child)]:border-s [&:not(:first-child)]:border-border">
              <dt className="truncate text-2xs text-fg-muted">{s.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children && <div className="border-t border-border px-4 py-3.5">{children}</div>}
    </section>
  );
}

/** Tonal steps of the one accent: the first slice is the strongest, «other» a neutral stroke tone that stays visible in both themes. Words and numbers say the rest. */
const TIERS = [
  'bg-accent',
  'bg-[color-mix(in_oklab,var(--accent)_72%,var(--surface-sunken))]',
  'bg-[color-mix(in_oklab,var(--accent)_52%,var(--surface-sunken))]',
  'bg-[color-mix(in_oklab,var(--accent)_34%,var(--surface-sunken))]',
] as const;
const OTHER_TIER = 'bg-border-strong';
const tierOf = (row: ShareRow, index: number) => (row.key === '__other' ? OTHER_TIER : (TIERS[index] ?? OTHER_TIER));

/**
 * Where a total went. Closed, it is one stacked bar and a legend with the first slices and their
 * percent (enough to read at a glance and cheap in height); open, every slice is a row with its amount.
 * Callers show it only for two slices or more: one slice is 100% of everything and teaches nothing.
 */
export function ShareList({
  rows,
  title,
  top = 3,
  otherLabel = 'غيرها',
  expandLabel,
  switcher,
}: {
  rows: readonly ShareRow[];
  title: string;
  /** Slices named in the closed legend; the rest are merged into «other». */
  top?: number;
  otherLabel?: string;
  /** The open button: «عرض التفاصيل». */
  expandLabel: string;
  /** Under the title when open: a switch between two breakdowns of the same records. */
  switcher?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = collapseShares(rows, top, otherLabel);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-fg-muted">{title}</h3>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex min-h-11 items-center gap-0.5 rounded-md ps-2 pe-1 text-sm font-semibold text-accent-ink hover:bg-surface-hover focus:outline-none focus-visible:shadow-focus"
        >
          {expanded ? 'إخفاء التفاصيل' : expandLabel}
          <ExpandMore
            sx={{ fontSize: 20 }}
            aria-hidden
            className={cn('transition-transform duration-base ease-out', expanded && 'rotate-180')}
          />
        </button>
      </div>

      {preview.length === 0 ? (
        <p className="pb-1 text-sm text-fg-muted">لا مبالغ ضمن هذه التصفية.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={preview.map((r) => `${r.label} ${r.percent}%`).join('، ')}
            className="flex h-2 gap-0.5 overflow-hidden rounded-full"
          >
            {preview.map((row, i) => (
              <span
                key={row.key}
                className={cn('h-full min-w-1 first:rounded-s-full last:rounded-e-full', tierOf(row, i))}
                style={{ flexGrow: row.percent, flexBasis: 0 }}
              />
            ))}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {preview.map((row, i) => (
              <li key={row.key} className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs text-fg-subtle">
                <span aria-hidden className={cn('size-2 flex-none rounded-full', tierOf(row, i))} />
                <span className="truncate">{row.label}</span>
                <bdi dir="ltr" className="flex-none tabular-nums text-fg-muted">
                  {row.percent}%
                </bdi>
              </li>
            ))}
          </ul>
        </>
      )}

      {expanded && preview.length > 0 && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {switcher}
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.key}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{row.label}</span>
                  <span className="flex-none text-xs tabular-nums text-fg-muted">
                    <bdi dir="ltr">{row.percent}%</bdi>
                  </span>
                  <Amount amount={row.amount} className="flex-none text-sm font-semibold text-fg" />
                </div>
                <ProgressBar value={row.percent} label={`حصة ${row.label}`} className="mt-1.5" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
