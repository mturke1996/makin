import type { ReactNode } from 'react';
import { Info } from '@mui/icons-material';
import { Button, Skeleton } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';

/** A titled month: a small header with optional figures at the end, then one hairline list. */
export function MonthSection({ title, figures, children }: { title: string; figures?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <header className="flex min-h-9 flex-wrap items-end justify-between gap-x-3 px-1">
        <h3 className="text-sm font-semibold text-fg-subtle">{title}</h3>
        {figures && <div className="flex flex-wrap items-center gap-x-3 text-xs text-fg-muted">{figures}</div>}
      </header>
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-panel">{children}</div>
    </section>
  );
}

/** «المحصّل 1,200 د.ل»: a labeled figure for a month header. */
export function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{children}</span>
    </span>
  );
}

/** What this viewer's list leaves out or shows only in part: stated, never silent. */
export function ScopeNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div role="note" className="flex items-start gap-2.5 rounded-md bg-info-soft px-3.5 py-3 text-info-ink">
      <Info aria-hidden sx={{ fontSize: 20 }} className="mt-px flex-none" />
      <div className="min-w-0 space-y-1 text-xs leading-relaxed">
        {notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
    </div>
  );
}

/** The "show more" control under a windowed list. */
export function ShowMore({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" block onClick={onClick}>
      {label}
    </Button>
  );
}

/** Rows shaped like the real ones, while the stores are still loading. */
export function RowsSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div aria-busy="true" aria-label="جارٍ التحميل" className={cn('space-y-6', className)}>
      {[0, 1].map((g) => (
        <div key={g} className="space-y-2">
          <Skeleton height={14} width={96} className="ms-1" />
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-panel">
            {Array.from({ length: Math.ceil(rows / 2) }).map((_, i) => (
              <div key={i} className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3">
                <Skeleton circle width={44} height={44} />
                <div className="flex-1 space-y-2">
                  <Skeleton height={14} width="62%" />
                  <Skeleton height={11} width="38%" />
                </div>
                <div className="space-y-2">
                  <Skeleton height={14} width={64} />
                  <Skeleton height={11} width={56} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

