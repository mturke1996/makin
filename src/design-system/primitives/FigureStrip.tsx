import { ReactNode } from 'react';
import { cn } from './cn';
import { StatCard } from './StatCard';

export type Figure = {
  label: ReactNode;
  value: ReactNode;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'brand';
  /** Small muted line under the value. */
  hint?: ReactNode;
};

const toneText: Record<NonNullable<Figure['tone']>, string> = {
  neutral: 'text-fg',
  success: 'text-success-ink',
  danger: 'text-danger-ink',
  warning: 'text-warning-ink',
  info: 'text-info-ink',
  brand: 'text-accent-ink',
};

interface FigureStripProps {
  figures: Figure[];
  /** Columns on phones (default 2). From sm up, all figures sit in one row. */
  mobileCols?: 1 | 2 | 3;
  className?: string;
}

/**
 * Key figures in Linda's separate statistic cards; label, exact value, then hint.
 */
export function FigureStrip({ figures, mobileCols = 2, className }: FigureStripProps) {
  const mobile = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[mobileCols];
  return (
    <dl
      className={cn(
        'grid gap-2.5 sm:grid-cols-[repeat(var(--n),minmax(0,1fr))]',
        mobile,
        className
      )}
      style={{ ['--n' as string]: figures.length }}
    >
      {figures.map((f, i) => (
        <StatCard
          key={i}
          definition label={f.label} value={f.value} hint={f.hint}
          valueClassName={toneText[f.tone || 'neutral']}
          className={cn(mobileCols === 2 && figures.length % 2 === 1 && i === figures.length - 1 && 'max-sm:col-span-2')}
        />
      ))}
    </dl>
  );
}
