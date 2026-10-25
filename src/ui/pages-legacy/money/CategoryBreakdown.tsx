import { useState } from 'react';
import { ExpandMore } from '../../../design-system/icons';
import { Amount, Badge, Button, ProgressBar, cn } from '../../../design-system/primitives';

export interface CategoryTotal {
  key: string;
  label: string;
  value: number;
  count: number;
}

interface Props {
  data: CategoryTotal[];
  total: number;
  active: string;
  /** Tapping a row filters the list; tapping it again clears the filter. */
  onSelect: (key: string) => void;
  /** Rows shown before «عرض الكل». */
  initialRows?: number;
}

const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

/**
 * Spending by category as a ranked list: label, share, amount and a thin bar.
 * Collapsed behind its header on phones (the list is the main content); always open on desktop.
 */
export function CategoryBreakdown({ data, total, active, onSelect, initialRows = 4 }: Props) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  if (data.length === 0) return null;
  const rows = all ? data : data.slice(0, initialRows);
  const activeLabel = active !== 'all' ? data.find((d) => d.key === active)?.label : undefined;

  const select = (key: string) => {
    onSelect(key);
    if (!isDesktop()) setOpen(false);
  };

  return (
    <section aria-label="المصروفات حسب التصنيف" className="rounded-lg border border-border bg-surface-panel">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-4 text-start focus:outline-none focus-visible:shadow-focus lg:pointer-events-none"
      >
        <span className="flex min-w-0 items-center gap-2">
          <h2 className="text-md font-bold text-fg">حسب التصنيف</h2>
          {activeLabel && <Badge tone="brand" className="max-w-[10rem] truncate">{activeLabel}</Badge>}
        </span>
        <span className="flex flex-none items-center gap-1 text-xs text-fg-muted">
          {data.length} تصنيف
          <span aria-hidden className="lg:hidden">
            <ExpandMore
              sx={{ fontSize: 22 }}
              className={cn('transition-transform duration-base ease-out', open && 'rotate-180')}
            />
          </span>
        </span>
      </button>
      <div className={cn(open ? 'block' : 'hidden lg:block')}>
        <ul className="border-t border-border p-2">
          {rows.map((row) => {
            const share = total > 0 ? (row.value / total) * 100 : 0;
            const selected = active === row.key;
            return (
              <li key={row.key}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => select(selected ? 'all' : row.key)}
                  className={cn(
                    'flex min-h-14 w-full flex-col justify-center gap-2 rounded-md px-2.5 py-2.5 text-start',
                    'transition-colors duration-fast ease-out focus:outline-none focus-visible:shadow-focus',
                    selected ? 'bg-accent-soft' : 'hover:bg-surface-hover'
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-fg">
                      {row.label}
                      <span className="ms-2 text-xs text-fg-muted">{Math.round(share)}%</span>
                    </span>
                    <Amount amount={row.value} className="flex-none text-md font-semibold" />
                  </span>
                  <ProgressBar value={share} tone="brand" label={`${row.label}: ${Math.round(share)}% من الإجمالي`} />
                </button>
              </li>
            );
          })}
        </ul>
        {data.length > initialRows && (
          <div className="border-t border-border p-1.5">
            <Button variant="ghost" block onClick={() => setAll((v) => !v)} aria-expanded={all}>
              {all ? 'عرض أقل' : `عرض كل التصنيفات (${data.length})`}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
