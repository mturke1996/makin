import { forwardRef, ReactNode, HTMLAttributes } from 'react';
import { ChevronRight } from '../icons';
import { cn } from './cn';

/** One surface, rows separated by hairlines. Replaces stacks of individual cards. */
export const ListGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function ListGroup(
  { className, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn('overflow-hidden rounded-lg border border-border bg-surface-panel divide-y divide-border', className)}
      {...rest}
    >
      {children}
    </div>
  );
});

interface ListRowProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Extra line under the subtitle (badges, meta). */
  meta?: ReactNode;
  trailing?: ReactNode;
  /** Show a navigation chevron (flips in RTL). */
  chevron?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** Comfortable (default) or compact density. */
  density?: 'comfortable' | 'compact';
}

/**
 * Standard list row: leading · title/subtitle/meta · trailing (+ chevron).
 * Interactive rows are real buttons (focus, keyboard, press feedback).
 */
export function ListRow({
  leading, title, subtitle, meta, trailing, chevron, onClick, disabled, density = 'comfortable', className, ...rest
}: ListRowProps) {
  const inner = (
    <>
      {leading && <span className="flex-none">{leading}</span>}
      <span className="min-w-0 flex-1 text-start">
        <span className="block break-words text-base font-semibold leading-snug text-fg">{title}</span>
        {subtitle && <span className="mt-1 block break-words text-xs leading-relaxed text-fg-muted">{subtitle}</span>}
        {meta && <span className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</span>}
      </span>
      {trailing && <span className="flex-none text-end">{trailing}</span>}
      {chevron && <ChevronRight sx={{ fontSize: 20 }} className="flex-none text-fg-muted rtl-flip" aria-hidden />}
    </>
  );
  const cls = cn(
    'flex w-full items-center gap-3 px-4',
    density === 'compact' ? 'min-h-14 py-2.5' : 'min-h-[4.5rem] py-3.5',
    onClick && 'cursor-pointer transition-colors duration-fast ease-out hover:bg-surface-hover active:bg-surface-hover focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]',
    disabled && 'opacity-50',
    className
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={cls} {...(rest as HTMLAttributes<HTMLButtonElement>)}>
        {inner}
      </button>
    );
  }
  return (
    <div className={cls} {...(rest as HTMLAttributes<HTMLDivElement>)}>
      {inner}
    </div>
  );
}
