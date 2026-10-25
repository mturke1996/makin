import { forwardRef, useCallback, type KeyboardEvent, type ReactNode } from 'react';
import { Check } from '../../design-system/icons';
import { cn } from '../../design-system/primitives/cn';

/**
 * Choice chips for the quick expense sheet. A group is a real radio group: one chip is in the tab
 * order, arrow keys move (and choose), and the chosen chip says so with a check mark as well as its
 * fill, so the state never rests on color alone.
 */

export interface ChipOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Plain text for the accessible name when `label` is not text. */
  name?: string;
  leading?: ReactNode;
}

interface ChipGroupProps<T extends string> {
  label: string;
  options: ChipOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  className?: string;
  chipClassName?: string;
  /** Do not wrap the label text onto several lines (horizontally scrolling rows). */
  nowrap?: boolean;
}

export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  chipClassName,
  nowrap,
}: ChipGroupProps<T>) {
  const selectedIndex = options.findIndex((o) => o.value === value);
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const rtl = document.documentElement.dir === 'rtl';
      let step = 0;
      if (e.key === 'ArrowRight') step = rtl ? -1 : 1;
      else if (e.key === 'ArrowLeft') step = rtl ? 1 : -1;
      else if (e.key === 'ArrowDown') step = 1;
      else if (e.key === 'ArrowUp') step = -1;
      else if (e.key === 'Home') step = -options.length;
      else if (e.key === 'End') step = options.length;
      else return;
      e.preventDefault();
      const from = selectedIndex >= 0 ? selectedIndex : 0;
      const next = Math.min(options.length - 1, Math.max(0, from + step));
      const radios = e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]');
      radios[next]?.focus();
      onChange(options[next].value);
    },
    [onChange, options, selectedIndex],
  );

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={className}>
      {options.map((o, i) => (
        <Chip
          key={o.value}
          selected={o.value === value}
          tabIndex={i === tabStop ? 0 : -1}
          onClick={() => onChange(o.value)}
          leading={o.leading}
          aria-label={o.name}
          className={chipClassName}
          nowrap={nowrap}
        >
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  leading?: ReactNode;
  tabIndex?: number;
  className?: string;
  nowrap?: boolean;
  'aria-label'?: string;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected, onClick, children, leading, tabIndex, className, nowrap, ...aria },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      onClick={onClick}
      {...aria}
      className={cn(
        'inline-flex min-h-11 max-w-full shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-start text-sm font-semibold leading-snug',
        'transition-[transform,background-color,border-color,color] duration-[120ms] ease-out active:scale-[0.97]',
        'focus:outline-none focus-visible:shadow-focus',
        selected
          ? 'border-transparent bg-accent text-accent-on'
          : 'border-border bg-surface-panel text-fg hover:border-border-strong hover:bg-surface-hover',
        className,
      )}
    >
      {leading}
      <span className={cn('min-w-0', nowrap && 'truncate')}>{children}</span>
      {selected && <Check aria-hidden sx={{ fontSize: 18 }} className="-me-1 shrink-0" />}
    </button>
  );
});

/** A chip that opens something (not a choice): same size and shape, outlined, no radio role. */
export function ActionChip({
  children,
  onClick,
  leading,
  className,
  ...aria
}: {
  children: ReactNode;
  onClick: () => void;
  leading?: ReactNode;
  className?: string;
  'aria-haspopup'?: 'dialog';
  'aria-expanded'?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...aria}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border-strong bg-transparent px-4 py-1.5 text-sm font-semibold text-fg-subtle',
        'transition-[transform,background-color,color] duration-[120ms] ease-out hover:bg-surface-hover hover:text-fg active:scale-[0.97]',
        'focus:outline-none focus-visible:shadow-focus',
        className,
      )}
    >
      {leading}
      {children}
    </button>
  );
}
