import { forwardRef, HTMLAttributes } from 'react';
import { cn } from './cn';

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article' | 'aside' | 'main';
  variant?: 'panel' | 'raised' | 'sunken' | 'canvas';
  padded?: boolean | 'sm' | 'md' | 'lg';
  bordered?: boolean;
}

const variants = {
  panel: 'bg-surface-panel',
  raised: 'bg-surface-raised shadow-xs',
  sunken: 'bg-surface-sunken',
  canvas: 'bg-surface-canvas',
} as const;

const paddings = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

/**
 * Generic surface container. Use instead of hand-rolled styled divs.
 * Enforces the design-system surface palette and spacing.
 */
export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { as: Tag = 'div', variant = 'panel', padded = false, bordered = true, className, ...rest },
  ref
) {
  const padClass = padded === true ? paddings.md : padded ? paddings[padded] : '';
  return (
    <Tag
      ref={ref as any}
      className={cn(
        'rounded-lg',
        variants[variant],
        bordered && 'border border-border',
        padClass,
        className
      )}
      {...rest}
    />
  );
});
