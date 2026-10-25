import React, { ReactNode } from 'react';
import { ChevronLeft } from '../../../design-system/icons';
import { cn } from '../../../design-system/primitives/cn';

export type ProfileTone = 'brand' | 'success' | 'danger' | 'warning' | 'info' | 'amber';

/**
 * Semantic tone classes. `tile` = soft tinted tile (icon holder, highlighted cell),
 * `ink` = readable text color for figures of that tone. `amber` is kept as an alias of `warning`.
 */
export const PROFILE_TONE: Record<ProfileTone, { tile: string; ink: string }> = {
  brand: { tile: 'bg-accent-soft text-accent-ink', ink: 'text-accent-ink' },
  success: { tile: 'bg-success-soft text-success-ink', ink: 'text-success-ink' },
  danger: { tile: 'bg-danger-soft text-danger-ink', ink: 'text-danger-ink' },
  warning: { tile: 'bg-warning-soft text-warning-ink', ink: 'text-warning-ink' },
  info: { tile: 'bg-info-soft text-info-ink', ink: 'text-info-ink' },
  amber: { tile: 'bg-warning-soft text-warning-ink', ink: 'text-warning-ink' },
};

/**
 * Client section entry: touch-sized icon, section name and record count, without a financial card.
 */
export function ProfileModuleRow({
  title,
  subtitle,
  amountLabel: _amountLabel,
  amount: _amount,
  Icon,
  tone,
  onClick,
  amountDisplay: _amountDisplay,
  layout = 'icon',
}: {
  title: string;
  /** Muted line under the title: the record count in words, or the rule for the percentage row. */
  subtitle: ReactNode;
  /** Tiny caption above the figure that says what the number is (المتبقي, الميزانية...). */
  amountLabel?: string;
  amount: number;
  Icon: React.ElementType;
  tone: ProfileTone;
  onClick: () => void;
  /** Replaces the money figure (a progress percentage, a short phrase). */
  amountDisplay?: ReactNode;
  layout?: 'icon' | 'row';
}) {
  return (
    <button
      type="button"
      aria-label={`فتح ${title}`}
      onClick={onClick}
      className={cn('group flex min-w-0 items-center rounded-lg transition-colors hover:bg-surface-sunken focus:outline-none focus-visible:shadow-focus', layout === 'icon' ? 'flex-col gap-1.5 px-1 py-2.5 text-center' : 'min-h-16 gap-3 px-3 py-2 text-start')}
    >
      <span className={cn('grid shrink-0 place-items-center rounded-lg transition-colors group-hover:brightness-95', layout === 'icon' ? 'size-11' : 'size-9', PROFILE_TONE[tone].tile)}>
        <Icon sx={{ fontSize: 22 }} aria-hidden />
      </span>
      <span className={cn('min-w-0', layout === 'icon' ? 'space-y-1.5' : 'flex-1 space-y-0.5')}>
        <span className={cn('block break-words font-semibold leading-relaxed text-fg', layout === 'icon' ? 'text-2xs' : 'text-sm')}>{title}</span>
        <span className="block break-words text-3xs leading-relaxed text-fg-muted">{subtitle}</span>
      </span>
      {layout === 'row' && <ChevronLeft className="shrink-0 text-fg-muted ltr:rotate-180" sx={{ fontSize: 18 }} aria-hidden />}
    </button>
  );
}

/**
 * Compact summary at the top of a module sheet: one main figure and, optionally, a strip
 * of secondary figures split by hairlines. `children` sits under the main figure (e.g. a ProgressBar).
 */
export function ProfileModuleHero({
  eyebrow,
  headline,
  subline,
  stats,
  Icon,
  tone = 'brand',
  children,
}: {
  eyebrow: string;
  headline: ReactNode;
  subline?: ReactNode;
  stats?: { label: string; value: ReactNode }[];
  Icon?: React.ElementType;
  tone?: ProfileTone;
  children?: ReactNode;
}) {
  const t = PROFILE_TONE[tone];
  const hasStats = !!stats && stats.length > 0;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-panel">
      <div className="flex items-center gap-3 px-4 py-3">
        {Icon && (
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-md', t.tile)}>
            <Icon sx={{ fontSize: 20 }} aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-fg-subtle">{eyebrow}</p>
          <div className={cn('text-xl font-bold leading-tight tabular-nums', t.ink)}>{headline}</div>
          {subline && <p className="text-2xs text-fg-muted">{subline}</p>}
        </div>
      </div>
      {children && <div className="px-4 pb-3">{children}</div>}
      {hasStats && (
        <dl
          className="grid border-t border-border"
          style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))` }}
        >
          {stats.map((s, i) => (
            <div key={i} className="min-w-0 px-4 py-2.5 [&:not(:first-child)]:border-s [&:not(:first-child)]:border-border">
              <dt className="truncate text-2xs text-fg-muted">{s.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

type CalloutTone = 'success' | 'danger' | 'warning' | 'info';

const CALLOUT_TONE: Record<CalloutTone, string> = {
  success: 'bg-success-soft text-success-ink',
  danger: 'bg-danger-soft text-danger-ink',
  warning: 'bg-warning-soft text-warning-ink',
  info: 'bg-info-soft text-info-ink',
};

/**
 * Calm tinted callout: soft tone background, ink text, an icon, a one-line message,
 * an optional figure (with a small label) and an optional action. Meaning is carried
 * by the icon and the words, never by color alone.
 */
export function ProfileCallout({
  tone,
  icon,
  title,
  children,
  figure,
  figureLabel,
  action,
  className,
  role = 'status',
}: {
  tone: CalloutTone;
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  figure?: ReactNode;
  figureLabel?: string;
  action?: ReactNode;
  className?: string;
  role?: 'status' | 'alert';
}) {
  return (
    <div
      role={role}
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-4 py-3', CALLOUT_TONE[tone], className)}
    >
      <span aria-hidden className="flex flex-none items-center">
        {icon}
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        {children && <div className="mt-0.5 text-xs leading-relaxed text-fg-subtle">{children}</div>}
      </div>
      {figure != null && (
        <div className="flex-none text-end">
          {figureLabel && <p className="text-2xs text-fg-subtle">{figureLabel}</p>}
          <p className="text-lg font-bold leading-tight tabular-nums">{figure}</p>
        </div>
      )}
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}
