import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { cn } from '../../../design-system/primitives/cn';

/** A tint of the text colour that sits on the brand surface: stays readable in light and dark themes. */
const tint = (pct: number): CSSProperties => ({ backgroundColor: `color-mix(in srgb, var(--on-accent) ${pct}%, transparent)` });
const hairline: CSSProperties = { borderColor: 'color-mix(in srgb, var(--on-accent) 20%, transparent)' };

export type HeroSegment = { key: string; pct: number; tone: 'spent' | 'left' | 'deficit' };
export type HeroStat = { label: string; value: ReactNode };

type Props = {
  /** Avatar, shown before the title. */
  leading?: ReactNode;
  /** Small row above the title (the back link). */
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** The one primary action of the screen. */
  actions?: ReactNode;
  figureLabel: ReactNode;
  /** The headline amount. */
  figure: ReactNode;
  /** A short status next to the amount (deficit, finished...). */
  badge?: ReactNode;
  segments?: HeroSegment[];
  barLabel?: string;
  stats: HeroStat[];
};

const SEGMENT: Record<HeroSegment['tone'], CSSProperties> = {
  spent: tint(55),
  left: tint(100),
  // a red that reads on the dark brand surface (the regular danger token is too deep for it)
  deficit: { backgroundColor: 'oklch(72% 0.15 25)' },
};

/**
 * The top of the custody screens: who or what this is, the one figure that matters, a bar of how it splits, and
 * three supporting figures. One solid brand surface (no gradient, no glow), used once per screen.
 */
export function HeroPanel({ leading, eyebrow, title, subtitle, actions, figureLabel, figure, badge, segments, barLabel, stats }: Props) {
  return (
    <section className="overflow-hidden rounded-xl bg-accent text-accent-on">
      <div className="p-5 sm:p-6">
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {leading}
          <div className="min-w-0 flex-1 basis-44">
            <h1 className="break-words text-2xl font-bold leading-tight">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm opacity-75">{subtitle}</p>}
          </div>
          {actions}
        </div>

        <div className="mt-6">
          <p className="text-sm opacity-75">{figureLabel}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-4xl font-bold leading-none tabular-nums sm:text-5xl">{figure}</p>
            {badge}
          </div>
        </div>

        {segments && segments.some((s) => s.pct > 0) && (
          <div
            role="img"
            aria-label={barLabel}
            className="mt-5 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
            style={tint(18)}
          >
            {segments
              .filter((s) => s.pct > 0)
              .map((s) => (
                <span
                  key={s.key}
                  className="block h-full min-w-1 rounded-full"
                  style={{ ...SEGMENT[s.tone], flex: `0 1 ${Math.min(100, s.pct)}%` }}
                />
              ))}
          </div>
        )}
      </div>

      <dl className="grid border-t" style={{ ...hairline, gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
        {stats.map((s, i) => (
          <div key={i} className={cn('min-w-0 px-4 py-3.5 sm:px-6', i > 0 && 'border-s')} style={hairline}>
            <dt className="text-xs opacity-75">{s.label}</dt>
            <dd className="mt-0.5 break-words text-base font-bold tabular-nums sm:text-lg">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** A button that reads on the brand surface (the regular primary button would vanish into it). */
export function HeroButton({ className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-11 w-full flex-none items-center justify-center gap-2 rounded-lg bg-accent-on px-4 text-sm font-semibold text-accent sm:w-auto',
        'transition-[opacity,transform] duration-fast ease-out hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:shadow-focus',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
