import { ReactNode, useRef } from 'react';
import { cn } from './cn';

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Small count shown after the label. */
  count?: number;
};

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `equal`: fixed equal columns with a sliding thumb (2–4 options). `scroll`: chips that scroll horizontally. */
  layout?: 'equal' | 'scroll';
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

/**
 * Segmented control / filter chips.
 * `equal` slides a thumb with transform (RTL-aware); `scroll` is for long filter rows.
 */
export function Segmented<T extends string>({
  options, value, onChange, layout = 'equal', size = 'md', className, ...aria
}: SegmentedProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const listRef = useRef<HTMLDivElement>(null);
  const h = size === 'sm' ? 'min-h-9 text-xs' : 'min-h-11 text-sm';

  const onKey = (e: React.KeyboardEvent) => {
    const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
    let next = index;
    if (e.key === 'ArrowRight') next = index + dir;
    else if (e.key === 'ArrowLeft') next = index - dir;
    else return;
    e.preventDefault();
    const o = options[(next + options.length) % options.length];
    onChange(o.value);
    (listRef.current?.children[(next + options.length) % options.length + (layout === 'equal' ? 1 : 0)] as HTMLElement | undefined)?.focus();
  };

  if (layout === 'scroll') {
    return (
      <div ref={listRef} role="tablist" onKeyDown={onKey} {...aria} className={cn('no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4', className)}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(o.value)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 font-semibold',
                'transition-[background-color,color,border-color] duration-fast ease-out active:scale-[0.97]',
                h,
                active
                  ? 'border-transparent bg-accent text-accent-on'
                  : 'border-border bg-surface-panel text-fg-subtle hover:border-border-strong hover:text-fg'
              )}
            >
              {o.label}
              {o.count !== undefined && (
                <span className={cn('tabular-nums', active ? 'opacity-80' : 'text-fg-muted')}>{o.count}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={onKey}
      {...aria}
      className={cn('relative grid rounded-lg bg-surface-sunken p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-1 start-1 rounded-md bg-surface-panel shadow-xs',
          'transition-transform duration-base ease-out',
          size === 'sm' ? '' : ''
        )}
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(calc(${index * 100}% * var(--dir-sign, 1)))`,
        }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative z-10 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-semibold leading-snug',
              'transition-colors duration-fast ease-out',
              h,
              active ? 'text-fg' : 'text-fg-muted hover:text-fg-subtle'
            )}
          >
            <span className="text-center">{o.label}</span>
            {o.count !== undefined && <span className="tabular-nums text-fg-muted">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
