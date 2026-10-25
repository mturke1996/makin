import { useId, useMemo, useState } from 'react';
import { EditOutlined, ExpandMore } from '../../../design-system/icons';
import { Amount, Badge, Button, IconButton } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import { formatAmountDisplay } from '../../../core/utils-formatters';
import { buildCustodyLog, toMilli, type CustodyBatch } from '../../../core/finance/custodyProfile';
import { LogRow } from './LogRow';
import { RefTag, StackedBar, formatFundDate, type BarSegment } from './fundUi';

const PAGE = 20;

type Props = {
  batch: CustodyBatch;
  /** Whether the log starts open. */
  defaultOpen: boolean;
  /** `custody.manage`: edit (and from there delete) this custody. */
  onEdit?: (batch: CustodyBatch) => void;
};

function Figure({ label, children, tone }: { label: string; children: React.ReactNode; tone?: 'danger' | 'warning' | 'success' }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 break-words text-base font-bold tabular-nums',
          tone === 'danger' ? 'text-danger-ink' : tone === 'warning' ? 'text-warning-ink' : tone === 'success' ? 'text-success-ink' : 'text-fg'
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/** What this custody has used: spending in the accent, an earlier deficit deducted from it in amber. */
function usage(batch: CustodyBatch): { segments: BarSegment[]; label: string } {
  const amount = toMilli(batch.amount);
  const used = toMilli(batch.spent) + toMilli(batch.carryOver);
  const base = Math.max(amount, used);
  const pct = (v: number) => (base > 0 ? (toMilli(v) / base) * 100 : 0);
  return {
    segments: [
      { key: 'spent', pct: pct(batch.spent), className: toMilli(batch.remaining) < 0 ? 'bg-danger' : 'bg-accent' },
      { key: 'carry', pct: pct(batch.carryOver), className: 'bg-warning' },
    ],
    label: `صُرف ${formatAmountDisplay(batch.spent)} من ${formatAmountDisplay(batch.amount)}`,
  };
}

/**
 * One custody with its own log underneath: the header says what it is and where it stands, and the list below
 * is every movement of THIS custody only (deposit, deficit deducted, each expense, deficit carried on), each
 * with the custody's balance right after it.
 */
export function CustodySection({ batch, defaultOpen, onEdit }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [limit, setLimit] = useState(PAGE);
  const logId = useId();

  const rows = useMemo(() => buildCustodyLog(batch), [batch]);
  const bar = usage(batch);
  const short = toMilli(batch.remaining) < 0;
  const deducted = toMilli(batch.carryOver) > 0;
  const movements = rows.filter((r) => r.kind === 'expense').length;

  return (
    <section aria-label={`عهدة ${batch.ref}`} className="overflow-hidden rounded-xl border border-border bg-surface-panel">
      <div className="flex items-start gap-1 p-4 sm:p-5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={logId}
          onClick={() => setOpen((v) => !v)}
          className="-m-1 flex min-w-0 flex-1 items-start gap-3 rounded-md p-1 text-start transition-colors duration-fast ease-out hover:bg-surface-hover focus:outline-none focus-visible:shadow-focus"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-lg font-bold text-fg">
                عهدة <RefTag value={batch.ref} />
              </span>
              <Badge tone={batch.badge.tone} dot>
                {batch.badge.label}
              </Badge>
            </span>
            <span className="mt-0.5 block text-xs text-fg-muted">
              <span className="tabular-nums">{formatFundDate(batch.date)}</span>
              {batch.description ? ` · ${batch.description}` : ''}
            </span>
          </span>
          <ExpandMore
            aria-hidden
            sx={{ fontSize: 24 }}
            className={cn('mt-0.5 flex-none text-fg-muted transition-transform duration-base ease-out', open && 'rotate-180')}
          />
        </button>
        {onEdit && (
          <IconButton label={`تعديل العهدة ${batch.ref}`} variant="ghost" onClick={() => onEdit(batch)}>
            <EditOutlined sx={{ fontSize: 20 }} />
          </IconButton>
        )}
      </div>

      <dl className={cn('grid gap-x-4 gap-y-3 px-4 pb-4 sm:px-5', deducted ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
        <Figure label="مبلغ العهدة">
          <Amount amount={batch.amount} bare />
        </Figure>
        {deducted && (
          <Figure label="عجز مخصوم" tone="warning">
            <Amount amount={-batch.carryOver} bare />
          </Figure>
        )}
        <Figure label="صُرف منها">
          <Amount amount={batch.spent} bare />
        </Figure>
        <Figure label={short ? 'العجز' : 'المتبقي'} tone={short ? 'danger' : toMilli(batch.remaining) > 0 ? 'success' : undefined}>
          <Amount amount={batch.remaining} bare />
        </Figure>
      </dl>

      <div className="px-4 pb-4 sm:px-5">
        <StackedBar thin segments={bar.segments} label={bar.label} />
        {batch.notes && <p className="mt-3 text-xs leading-relaxed text-fg-subtle">{batch.notes}</p>}
      </div>

      <div id={logId} hidden={!open}>
        <div className="flex items-baseline justify-between gap-3 border-t border-border bg-surface-sunken px-4 py-2.5 sm:px-5">
          <h3 className="text-sm font-bold text-fg">سجل هذه العهدة</h3>
          <span className="text-xs text-fg-muted">
            {movements === 0 ? 'لا مصروفات بعد' : movements === 1 ? 'مصروف واحد' : movements === 2 ? 'مصروفان' : `${movements} ${movements <= 10 ? 'مصروفات' : 'مصروفاً'}`}
          </span>
        </div>
        <ol className="divide-y divide-border">
          {rows.slice(0, limit).map((r) => (
            <LogRow key={r.id} row={r} />
          ))}
        </ol>
        {rows.length > limit && (
          <div className="border-t border-border p-3">
            <Button variant="outline" block onClick={() => setLimit((l) => l + PAGE)}>
              عرض المزيد ({rows.length - limit})
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
