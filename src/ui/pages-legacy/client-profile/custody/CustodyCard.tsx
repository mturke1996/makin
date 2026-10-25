import { useId, useState, type ReactNode } from 'react';
import { Delete, Edit, ExpandMore, WarningAmber } from '../../../../design-system/icons';
import { Amount, Badge, IconButton } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import type { ClientCustodyRow } from '../../../../core/finance/clientCustody';
import { formatCurrencyDisplay, formatDate } from '../../../../core/utils-formatters';
import { CustodyBar, custodyParts } from './CustodyBar';
import { CustodyExpenseList } from './CustodyExpenseList';
import { balanceTone, expensesCount, usedText } from './copy';

/** A custody's own number, isolated so «#2» never flips inside Arabic text. */
function CustodyNo({ n, className }: { n: number; className?: string }) {
  return (
    <bdi dir="ltr" className={cn('whitespace-nowrap font-bold tabular-nums', className)}>
      #{n}
    </bdi>
  );
}

/** The one pill on the card: low balance reads more usefully than «active», a deficit more than anything. */
function statusPill(row: ClientCustodyRow) {
  if (!row.status || !row.badge) return null;
  if (row.badge.key === 'deficit') return row.badge;
  if (row.status.key === 'low') return { label: row.status.label, tone: row.status.tone };
  return row.badge;
}

function Note({ tone, children }: { tone: 'warning' | 'danger'; children: ReactNode }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-md px-3 py-2.5 text-sm leading-relaxed',
        tone === 'danger' ? 'bg-danger-soft text-danger-ink' : 'bg-warning-soft text-warning-ink'
      )}
    >
      <WarningAmber sx={{ fontSize: 20 }} aria-hidden className="mt-0.5 flex-none" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

const Fig = ({ label, strong, children }: { label: string; strong?: boolean; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium text-fg-muted">{label}</dt>
    <dd className={cn('mt-0.5 font-bold leading-snug tabular-nums', strong ? 'text-lg' : 'text-md')}>{children}</dd>
  </div>
);

interface CustodyCardProps {
  row: ClientCustodyRow;
  /** Open the list of expenses when it first shows (a person with a single custody). */
  defaultOpen?: boolean;
  /** The custody the next expense will be charged to (only said when the person holds several). */
  isCurrent?: boolean;
  /** Present only for who may manage custody (`custody.manage`). */
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * ONE custody (one deposit) with everything about it: when and by whom it was given, the amount, what was
 * spent from it, what is left, whether a deficit was deducted from it or moved on to the next custody, and
 * the expenses charged to it. Figures are shown only when the viewer sees all of that person's expenses.
 */
export function CustodyCard({ row, defaultOpen = false, isCurrent = false, onEdit, onDelete }: CustodyCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const uid = useId();
  const pill = statusPill(row);
  const titleId = `${uid}-t`;
  const listId = `${uid}-l`;
  const manage = !!onEdit || !!onDelete;
  const count = row.expenses.length;
  const tone = balanceTone(row.remaining);

  const barLabel = `استُهلك ${usedText(row.usedPct)} من عهدة رقم ${row.number}: صُرف ${formatCurrencyDisplay(row.spent)} من ${formatCurrencyDisplay(row.amount)}`;
  const byLine = [formatDate(row.date), row.createdBy ? `بواسطة ${row.createdBy}` : ''].filter(Boolean).join(' · ');

  return (
    <article aria-labelledby={titleId} className="overflow-hidden rounded-lg border border-border bg-surface-panel">
      <div className="space-y-3 p-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={titleId} className="text-md font-bold leading-snug text-fg">
              عهدة <CustodyNo n={row.number} />
            </h3>
            <p className="mt-0.5 text-xs text-fg-muted">{byLine}</p>
            {isCurrent && <p className="mt-0.5 text-xs font-semibold text-accent-ink">تُخصم منها المصروفات الجديدة</p>}
          </div>
          {pill && (
            <Badge tone={pill.tone} dot className="flex-none">
              {pill.label}
            </Badge>
          )}
        </header>

        {row.notes && <p className="break-words text-sm leading-relaxed text-fg-subtle">{row.notes}</p>}

        {row.exact ? (
          <>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(6.25rem,1fr))] gap-x-3 gap-y-2.5">
              <Fig label="المبلغ">
                <Amount amount={row.amount} />
              </Fig>
              <Fig label="المصروف">
                <Amount amount={row.spent} />
              </Fig>
              <Fig strong label={row.remaining < 0 ? 'العجز' : 'المتبقي'}>
                <Amount amount={row.remaining} tone={tone} />
              </Fig>
            </dl>

            <div className="space-y-1.5">
              <CustodyBar parts={custodyParts(row)} label={barLabel} />
              <p className="text-xs text-fg-muted">استُهلك {usedText(row.usedPct)} من العهدة</p>
            </div>

            {row.carryIn && (
              <Note tone="warning">
                خُصم منها عجز <Amount amount={row.carryIn.amount} className="font-bold" /> كان على{' '}
                {row.carryIn.otherNumber ? (
                  <>
                    العهدة <CustodyNo n={row.carryIn.otherNumber} />
                  </>
                ) : (
                  'عهدة سابقة'
                )}
                ، فبدأت برصيد <Amount amount={row.opening} className="font-bold" />
              </Note>
            )}
            {row.carryOut && (
              <Note tone="warning">
                تجاوزت رصيدها ورُحّل الفرق <Amount amount={row.carryOut.amount} className="font-bold" /> إلى{' '}
                {row.carryOut.otherNumber ? (
                  <>
                    العهدة <CustodyNo n={row.carryOut.otherNumber} />
                  </>
                ) : (
                  'العهدة التالية'
                )}
              </Note>
            )}
            {row.overdrawn > 0 && (
              <Note tone="danger">
                تجاوزت رصيدها بمقدار <Amount amount={row.overdrawn} className="font-bold" />. يُخصم الفرق تلقائياً من العهدة القادمة عند منحها.
              </Note>
            )}
          </>
        ) : (
          <div>
            <p className="text-xs font-medium text-fg-muted">المبلغ</p>
            <Amount amount={row.amount} tone="success" className="text-md font-bold" />
          </div>
        )}
      </div>

      {(row.exact || manage) && (
        <div className="flex items-center border-t border-border ps-1 pe-2">
          {row.exact && count > 0 ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => setOpen((v) => !v)}
              className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-md px-3 text-start text-sm font-semibold text-fg-subtle transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:shadow-focus"
            >
              <ExpandMore
                aria-hidden
                sx={{ fontSize: 22 }}
                className={cn('flex-none transition-transform duration-base ease-out', open && 'rotate-180')}
              />
              <span className="truncate">{open ? 'إخفاء المصروفات' : `عرض ${expensesCount(count)}`}</span>
            </button>
          ) : row.exact ? (
            <p className="min-h-12 min-w-0 flex-1 px-3 py-3 text-sm text-fg-muted">لا مصروفات على هذه العهدة بعد</p>
          ) : (
            <span className="flex-1" />
          )}
          {onEdit && (
            <IconButton label={`تعديل عهدة ${row.userName} رقم ${row.number}`} onClick={onEdit}>
              <Edit sx={{ fontSize: 20 }} />
            </IconButton>
          )}
          {onDelete && (
            <IconButton
              label={`حذف عهدة ${row.userName} رقم ${row.number}`}
              onClick={onDelete}
              className="hover:bg-danger-soft hover:text-danger-ink"
            >
              <Delete sx={{ fontSize: 20 }} />
            </IconButton>
          )}
        </div>
      )}

      {row.exact && count > 0 && (
        <div
          className={cn(
            'grid transition-[grid-template-rows,visibility] duration-base ease-out',
            open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-border bg-surface-sunken">
              <CustodyExpenseList id={listId} expenses={row.expenses} />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
