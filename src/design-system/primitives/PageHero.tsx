import { ReactNode } from 'react';
import { cn } from './cn';

export type PageHeroAccent = 'brand' | 'success' | 'danger' | 'warning';

const accentText: Record<PageHeroAccent, string> = {
  brand: 'text-fg',
  success: 'text-success-ink',
  danger: 'text-danger-ink',
  warning: 'text-warning-ink',
};

export type PageHeroStat = { label: string; value: ReactNode; valueClassName?: string };

export interface PageHeroProps {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  headlineLabel?: ReactNode;
  headline?: ReactNode;
  accent?: PageHeroAccent;
  footerStats?: [PageHeroStat, PageHeroStat];
  footerStatsTriple?: [PageHeroStat, PageHeroStat, PageHeroStat];
  trailing?: ReactNode;
  className?: string;
  /** @deprecated ignored */
  rounded?: '2xl' | '3xl';
  /** Tighter density. */
  compact?: boolean;
  /** @deprecated ignored (no decorative variants). */
  featured?: boolean;
  reveal?: boolean;
  brand?: ReactNode;
}

/**
 * PageHero (compat) — now a calm summary panel: title block, optional key figure
 * and a stat strip. New screens should compose PageHeader + FigureStrip directly.
 */
export function PageHero({
  eyebrow, title, subtitle, headlineLabel, headline, accent = 'brand',
  footerStats, footerStatsTriple, trailing, className, compact = false, reveal, brand: brandSlot,
}: PageHeroProps) {
  const stats = footerStatsTriple || footerStats;
  return (
    <section
      {...(reveal ? { 'data-reveal': '' as const } : {})}
      className={cn('overflow-hidden rounded-xl border border-border bg-surface-panel', className)}
    >
      <div className={cn('flex flex-wrap items-start gap-4', compact ? 'p-4' : 'p-5')}>
        {brandSlot && <div className="flex-none">{brandSlot}</div>}
        <div className="min-w-0 flex-1 basis-56">
          <div className="text-xs font-medium text-fg-muted">{eyebrow}</div>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-fg">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-fg-subtle">{subtitle}</p>}
          {headline !== undefined && (
            <div className="mt-4">
              {headlineLabel && <div className="text-xs font-medium text-fg-muted">{headlineLabel}</div>}
              <div className={cn('mt-0.5 text-4xl font-bold leading-none tabular-nums', accentText[accent])}>{headline}</div>
            </div>
          )}
        </div>
        {trailing && <div className="flex flex-none items-center gap-2">{trailing}</div>}
      </div>
      {stats && (
        <dl className="grid divide-x divide-border border-t border-border rtl:divide-x-reverse" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
          {stats.map((s, i) => (
            <div key={i} className="min-w-0 px-4 py-3">
              <dt className="truncate text-xs font-medium text-fg-muted">{s.label}</dt>
              <dd className={cn('mt-0.5 truncate text-lg font-bold tabular-nums text-fg', s.valueClassName)}>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
