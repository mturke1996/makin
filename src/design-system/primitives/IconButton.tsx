import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'soft' | 'outline' | 'solid';
  label: string; // required for a11y
}

/** 40 / 44 / 48 — never below a comfortable touch target. */
const sizes = {
  sm: 'h-11 w-11 rounded-md',
  md: 'h-11 w-11 rounded-md',
  lg: 'h-12 w-12 rounded-lg',
} as const;

const variants = {
  ghost: 'text-fg-subtle hover:text-fg hover:bg-surface-hover',
  soft: 'text-fg bg-surface-sunken hover:bg-surface-hover',
  outline: 'text-fg border border-border-strong bg-surface-panel hover:bg-surface-sunken',
  solid: 'bg-accent text-accent-on hover:bg-accent-hover shadow-xs',
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 'md', variant = 'ghost', label, className, children, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center select-none',
        'transition-[transform,background-color,color,border-color] duration-fast ease-out',
        'active:scale-[0.94] disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus-visible:shadow-focus',
        sizes[size],
        variants[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
