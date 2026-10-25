import { cn } from './cn';

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}

const fill = {
  brand: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
} as const;

/** Thin progress track. Animates with transform (not width) and respects RTL. */
export function ProgressBar({ value, tone = 'brand', size = 'sm', className, label }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
      className={cn('w-full overflow-hidden rounded-full bg-surface-sunken', size === 'sm' ? 'h-1.5' : 'h-2.5', className)}
    >
      <div
        className={cn('h-full w-full rounded-full transition-transform duration-slow ease-out ltr:origin-left rtl:origin-right', fill[tone])}
        style={{ transform: `scaleX(${v / 100})` }}
      />
    </div>
  );
}
