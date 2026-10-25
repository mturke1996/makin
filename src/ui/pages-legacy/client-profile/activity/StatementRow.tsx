import { Amount } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import type { StatementRow as Row } from '../../../../core/finance/clientStatement';

/** DD/MM on top, the year quiet underneath: the left column of a statement. */
function DateCell({ day }: { day: string }) {
  const [y, m, d] = day.split('-');
  return (
    <span className="flex w-11 flex-none flex-col items-center leading-tight tabular-nums" dir="ltr">
      <span className="text-sm font-semibold text-fg">
        {d}/{m}
      </span>
      <span className="text-2xs text-fg-muted">{y}</span>
    </span>
  );
}

/** One movement: date, what it was, the signed amount and the balance after it. */
export function StatementEntry({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const incoming = row.amount > 0;
  const sub = [row.detail, row.by].filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex min-h-[4.25rem] w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-start',
        'transition-colors duration-fast ease-out hover:bg-surface-hover active:bg-surface-hover',
        'focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]'
      )}
    >
      <DateCell day={row.day} />
      <span className="min-w-0 flex-1 basis-32">
        <span className="line-clamp-2 text-base font-semibold leading-snug text-fg [overflow-wrap:anywhere]">
          {row.title}
        </span>
        {sub && <span className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{sub}</span>}
      </span>
      <span className="ms-auto flex-none text-end">
        <Amount amount={row.amount} tone={incoming ? 'success' : 'danger'} showSign className="text-md font-bold" />
        <span className="mt-0.5 flex items-baseline justify-end gap-1.5 text-xs text-fg-muted">
          <span>الرصيد</span>
          <Amount amount={row.balance} bare tone={row.balance < 0 ? 'danger' : 'inherit'} className="tabular-nums" />
        </span>
      </span>
    </button>
  );
}

/** Month label inside the statement list. */
export function MonthDivider({ title }: { title: string }) {
  return (
    <div className="flex min-h-9 items-center bg-surface-panel px-4 pt-1">
      <h3 className="text-xs font-semibold text-fg-muted">{title}</h3>
    </div>
  );
}
