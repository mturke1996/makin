import { HTMLAttributes } from 'react';
import { cn } from './cn';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  /** Pill-shape (h=auto width=full rounded) */
  pill?: boolean;
  /** Circle shape */
  circle?: boolean;
}

/**
 * Skeleton — shimmering placeholder. Uses `.skeleton` class from index.css
 * which carries a brand-tinted gradient shimmer. Much nicer perceived load
 * than spinners per UI/UX Pro Max guidelines.
 */
export function Skeleton({ width, height, pill, circle, className, style, ...rest }: SkeletonProps) {
  const w = width ?? (circle ? 40 : '100%');
  const h = height ?? (circle ? 40 : 16);
  return (
    <div
      aria-hidden
      className={cn('skeleton', pill && 'rounded-full', circle && 'rounded-full', className)}
      style={{
        width: typeof w === 'number' ? `${w}px` : w,
        height: typeof h === 'number' ? `${h}px` : h,
        ...style,
      }}
      {...rest}
    />
  );
}

/** Row of text-line skeletons. */
export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '64%' : '100%'} />
      ))}
    </div>
  );
}

/** Card skeleton — mirrors the Module tile layout on the dashboard. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface-panel border border-border rounded-lg p-4 flex items-start gap-3',
        className
      )}
    >
      <Skeleton circle width={36} height={36} />
      <div className="flex-1">
        <Skeleton height={14} width="60%" className="mb-2" />
        <Skeleton height={10} width="40%" />
      </div>
    </div>
  );
}
