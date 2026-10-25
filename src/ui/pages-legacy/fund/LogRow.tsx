import { ArrowDownward, ArrowUpward, RemoveCircleOutline, Sync } from '@mui/icons-material';
import { Amount } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import { toMilli, type CustodyLogRow } from '../../../core/finance/custodyProfile';
import { RefTag, formatFundDate, formatFundTime } from './fundUi';

const KIND = {
  deposit: { Icon: ArrowDownward, tile: 'bg-success-soft text-success-ink', label: 'إيداع', amount: 'text-success-ink' },
  'carry-in': { Icon: RemoveCircleOutline, tile: 'bg-warning-soft text-warning-ink', label: 'خصم عجز', amount: 'text-warning-ink' },
  expense: { Icon: ArrowUpward, tile: 'bg-danger-soft text-danger-ink', label: 'مصروف', amount: 'text-danger-ink' },
  'carry-out': { Icon: Sync, tile: 'bg-surface-sunken text-fg-subtle', label: 'ترحيل عجز', amount: 'text-fg-subtle' },
} as const;

/**
 * One line of a custody's own log: what happened, for which client, when, the amount with its sign, and the
 * balance of THIS custody right after it (always shown).
 */
export function LogRow({ row }: { row: CustodyLogRow }) {
  const kind = KIND[row.kind];
  const time = formatFundTime(row.createdAt, row.date);
  const showAmount = row.kind !== 'carry-out';

  // A row fully past the balance says nothing extra (the negative balance already tells it); only the expense that
  // crosses the line says by how much.
  const crossing = row.overdrawnAmount != null && row.overdrawnAmount > 0 && toMilli(row.overdrawnAmount) < toMilli(-row.amount);

  return (
    <li className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
      <span aria-hidden className={cn('mt-0.5 grid size-9 flex-none place-items-center rounded-full', kind.tile)}>
        <kind.Icon sx={{ fontSize: 18 }} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 break-words text-sm font-semibold leading-snug text-fg">{row.title}</p>
          {showAmount && <Amount amount={row.amount} showSign bare className={cn('flex-none text-base font-bold', kind.amount)} />}
        </div>

        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-fg-muted">
          <span className="font-medium text-fg-subtle">{kind.label}</span>
          {row.clientName && (
            <>
              <span aria-hidden>·</span>
              <span>{row.clientName}</span>
            </>
          )}
          {row.otherRef && (
            <>
              <span aria-hidden>·</span>
              <span>
                {row.kind === 'carry-in' ? 'كان على عهدة' : 'إلى عهدة'} <RefTag value={row.otherRef} />
              </span>
            </>
          )}
        </p>
        <p className="text-xs tabular-nums text-fg-muted">
          {formatFundDate(row.date)}
          {time && ` ${time}`}
        </p>

        {crossing && (
          <p className="mt-1 text-xs font-medium text-danger-ink">
            تجاوز الرصيد بمقدار <Amount amount={row.overdrawnAmount!} bare className="font-semibold" />
          </p>
        )}
        {row.notes && <p className="mt-1 text-xs leading-relaxed text-fg-subtle">{row.notes}</p>}

        <p className="mt-2 flex items-baseline justify-between gap-3 border-t border-dashed border-border pt-2 text-xs text-fg-muted">
          <span>الرصيد بعد العملية</span>
          <Amount
            amount={row.balanceAfter}
            bare
            tone={row.balanceAfter < 0 ? 'danger' : 'inherit'}
            className={cn('text-sm font-bold', row.balanceAfter >= 0 && 'text-fg')}
          />
        </p>
      </div>
    </li>
  );
}
