import { useId, useRef, useState, type ReactNode } from 'react';
import { Close, Search, Tune } from '../../../../design-system/icons';
import { Button, IconButton, Input } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';

/** One applied filter, shown as a removable chip under the bar. */
export interface ActiveFilter {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * Height of the sticky search row in rem (12px + the 48px field + 12px). The month headers of a list
 * stick right under it, so both use the same rem value and follow the user's font size together.
 */
export const RECORDS_BAR_OFFSET = 'top-[4.5rem]';

interface RecordsFilterBarProps {
  searchLabel: string;
  placeholder: string;
  search: string;
  onSearchChange: (value: string) => void;
  /** Filters in force besides the search text (and a non-default sort). */
  active: readonly ActiveFilter[];
  onClearAll: () => void;
  /** Records that pass the filters, and records in total. */
  shown: number;
  total: number;
  /** The filter groups. With none, the bar is only a search field. */
  children?: ReactNode;
}

/**
 * Search field and filter panel shared by every record list of the client profile.
 *
 * The search row stays at the top while the list scrolls; the panel under it opens in place (grid rows,
 * so only opacity and transform animate) and scrolls on its own when it is tall. What is applied stays
 * visible as chips with a count, so an empty list is never a mystery.
 */
export function RecordsFilterBar({
  searchLabel,
  placeholder,
  search,
  onSearchChange,
  active,
  onClearAll,
  shown,
  total,
  children,
}: RecordsFilterBarProps) {
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const filtering = active.length > 0 || search.trim() !== '';

  return (
    <>
      <div ref={barRef} className="sticky top-0 z-[3] border-b border-border bg-surface-canvas px-4 lg:px-6">
        <div className="flex items-center gap-2 py-3">
          <div className="min-w-0 flex-1">
            <Input
              type="search"
              aria-label={searchLabel}
              placeholder={placeholder}
              autoComplete="off"
              enterKeyHint="search"
              className="[&::-webkit-search-cancel-button]:hidden"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              leftIcon={<Search sx={{ fontSize: 20 }} aria-hidden />}
              rightIcon={
                search ? (
                  <IconButton label="مسح البحث" size="md" className="-me-2" onClick={() => onSearchChange('')}>
                    <Close sx={{ fontSize: 18 }} />
                  </IconButton>
                ) : undefined
              }
            />
          </div>
          {children && (
            <Button
              ref={toggleRef}
              variant={open || active.length > 0 ? 'secondary' : 'outline'}
              aria-expanded={open}
              aria-controls={panelId}
              leftIcon={<Tune sx={{ fontSize: 20 }} aria-hidden />}
              onClick={() => {
                setOpen((v) => !v);
                // Opening at the top of a long sheet would push the panel below the fold: dock the bar first.
                if (!open) {
                  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  barRef.current?.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
                }
              }}
              className="flex-none"
            >
              تصفية
              {active.length > 0 && (
                <span className="ms-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-2xs font-bold tabular-nums text-accent-on">
                  {active.length}
                </span>
              )}
            </Button>
          )}
        </div>

        {children && (
          <div
            id={panelId}
            data-records-panel
            className={cn(
              'grid transition-[grid-template-rows,visibility] duration-base ease-out',
              open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex max-h-[min(62dvh,32rem)] flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
                  <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">{children}</div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border py-3">
                  {filtering ? (
                    <Button variant="ghost" onClick={onClearAll}>
                      مسح التصفية
                    </Button>
                  ) : (
                    <span />
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setOpen(false);
                      // The panel is about to be hidden: keep the keyboard where the person started.
                      toggleRef.current?.focus();
                    }}
                  >
                    عرض {shown} من {total}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {filtering && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pt-2 lg:px-6" aria-live="polite">
          <span className="text-xs text-fg-muted">
            عرض <bdi className="tabular-nums">{shown}</bdi> من <bdi className="tabular-nums">{total}</bdi>
          </span>
          {active.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              aria-label={`إزالة ${chip.label}`}
              className={cn(
                'inline-flex min-h-11 max-w-full items-center gap-1 rounded-full bg-accent-soft ps-3.5 pe-2.5 text-sm font-semibold text-accent-ink',
                'transition-colors duration-fast ease-out hover:brightness-95 active:scale-[0.97] focus:outline-none focus-visible:shadow-focus'
              )}
            >
              <span className="truncate">{chip.label}</span>
              <Close sx={{ fontSize: 16 }} aria-hidden className="flex-none" />
            </button>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="min-h-11 rounded-md px-2 text-sm font-semibold text-fg-subtle hover:text-fg focus:outline-none focus-visible:shadow-focus"
          >
            مسح الكل
          </button>
        </div>
      )}
    </>
  );
}
