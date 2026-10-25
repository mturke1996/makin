import { HTMLAttributes } from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Soft tinted pill (default) or a solid fill. */
  subtle?: boolean;
  /** Leading status dot. */
  dot?: boolean;
}

const soft: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-fg-subtle',
  brand: 'bg-accent-soft text-accent-ink',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
};
const solid: Record<Tone, string> = {
  neutral: 'bg-fg text-fg-inverse',
  brand: 'bg-accent text-accent-on',
  success: 'bg-success text-accent-on',
  warning: 'bg-warning text-warning-on',
  danger: 'bg-danger text-accent-on',
  info: 'bg-info text-accent-on',
};
const dotColor: Record<Tone, string> = {
  neutral: 'bg-fg-muted',
  brand: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

/** Status pill — 12px minimum text, meaning carried by text + color together. */
export function Badge({ tone = 'neutral', subtle = true, dot, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-2xs font-semibold',
        subtle ? soft[tone] : solid[tone],
        className
      )}
      {...rest}
    >
      {dot && <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', dotColor[tone])} />}
      {children}
    </span>
  );
}
