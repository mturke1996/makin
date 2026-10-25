import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'danger-soft';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const base =
  'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-normal font-medium select-none [&>svg]:!text-[18px] [&>svg]:shrink-0 ' +
  'transition-[transform,background-color,border-color,color,box-shadow] duration-fast ease-out ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ' +
  'active:scale-[0.98] focus:outline-none focus-visible:shadow-focus';

/** Compact visible controls with a 44px minimum touch target. */
const sizes: Record<Size, string> = {
  sm: 'min-h-11 px-4 text-sm rounded-md',
  md: 'min-h-11 px-4 py-2 text-sm rounded-md',
  lg: 'min-h-12 px-5 py-2 text-md rounded-lg',
};

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-on hover:bg-accent-hover shadow-xs',
  secondary: 'bg-accent-soft text-accent-ink hover:bg-[color:var(--brand-primary-tint)]',
  ghost: 'text-fg-subtle hover:bg-surface-hover hover:text-fg',
  outline: 'border border-border bg-surface-panel text-fg hover:bg-surface-sunken hover:border-border-strong',
  danger: 'bg-danger text-accent-on hover:brightness-95 shadow-xs',
  'danger-soft': 'bg-danger-soft text-danger-ink hover:brightness-95',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, loading, leftIcon, rightIcon, className, children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, sizes[size], variants[variant], block && 'w-full', className)}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="inline-block h-4 w-4 rounded-full border-2 border-current border-e-transparent animate-spin"
        />
      ) : (
        leftIcon
      )}
      <span className="inline-flex min-w-0 items-center justify-center text-center leading-snug">{children}</span>
      {!loading && rightIcon}
    </button>
  );
});
