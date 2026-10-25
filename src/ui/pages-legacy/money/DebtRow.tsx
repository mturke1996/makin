import { Delete, Edit } from '../../../design-system/icons';
import { Amount, Avatar, Badge, Button, IconButton, ProgressBar } from '../../../design-system/primitives';
import { formatCurrencyDisplay, formatDate } from '../../../core/utils-formatters';
import type { StandaloneDebt } from '../../../types';
import { DEBT_STATUS_LABEL, type DebtState } from './debtState';

const STATUS_TONE = {
  unpaid: 'warning',
  partially_paid: 'info',
  paid: 'success',
  overdue: 'danger',
} as const;

interface Props {
  debt: StandaloneDebt;
  state: DebtState;
  showType: boolean;
  /** Omitted when this user may not change debts (the row is then read-only). */
  onEdit?: () => void;
  /** Omitted when this user may not record repayments. */
  onPay?: () => void;
  /** Omitted when this user may not delete. */
  onDelete?: () => void;
}

/**
 * One debt: identity + status on the first line, paid share + "تسديد" on the second.
 * From md up everything sits on one fixed-column line so rows align.
 */
export function DebtRow({ debt, state, showType, onEdit, onPay, onDelete }: Props) {
  const settled = state.status === 'paid';
  const identity = (
    <>
      <Avatar name={debt.partyName} shape={debt.partyType === 'external' ? 'entity' : 'person'} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold leading-snug text-fg">{debt.partyName}</span>
        <span className="mt-0.5 block truncate text-xs text-fg-muted">
          {showType && `${debt.partyType === 'client' ? 'عميل' : 'طرف خارجي'} · `}
          {debt.description || 'بدون وصف'}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={STATUS_TONE[state.status]} dot>
            {DEBT_STATUS_LABEL[state.status]}
            {state.overdueDays > 0 && ` منذ ${state.overdueDays} ${state.overdueDays === 1 ? 'يوم' : 'أيام'}`}
          </Badge>
          {debt.dueDate && !settled && (
            <span className="text-xs text-fg-muted">الاستحقاق {formatDate(debt.dueDate)}</span>
          )}
        </span>
      </span>
    </>
  );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors duration-fast ease-out hover:bg-surface-hover md:grid-cols-[minmax(0,1fr)_13rem_9rem_6.5rem_5.5rem]">
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="order-1 flex min-w-0 items-center gap-3 rounded-md text-start focus:outline-none focus-visible:shadow-focus"
        >
          {identity}
        </button>
      ) : (
        <div className="order-1 flex min-w-0 items-center gap-3 text-start">{identity}</div>
      )}

      <div className="order-2 text-end md:order-3">
        <Amount
          amount={state.remaining}
          tone={settled ? 'neutral' : 'danger'}
          className="text-md font-bold"
        />
        <span className="mt-0.5 block text-xs text-fg-muted">{settled ? 'لا متبقي' : 'المتبقي'}</span>
      </div>

      <div className={`order-3 md:order-2 md:col-span-1 ${settled ? 'col-span-2' : ''}`}>
        <ProgressBar
          value={state.pct}
          tone={settled ? 'success' : state.status === 'overdue' ? 'danger' : 'brand'}
          label={`نسبة المسدد من دين ${debt.partyName}`}
        />
        <span className="mt-1.5 block text-xs text-fg-muted">
          مسدد {formatCurrencyDisplay(state.paid)} من {formatCurrencyDisplay(debt.amount)}
        </span>
      </div>

      <div className="order-4 flex justify-end">
        {!settled && onPay && (
          <Button variant="outline" size="sm" onClick={onPay} aria-label={`تسديد دين ${debt.partyName}`}>
            تسديد
          </Button>
        )}
      </div>

      <div className="order-5 hidden items-center justify-end gap-1 md:flex">
        {onEdit && (
          <IconButton label={`تعديل دين ${debt.partyName}`} onClick={onEdit}>
            <Edit sx={{ fontSize: 20 }} />
          </IconButton>
        )}
        {onDelete && (
          <IconButton label={`حذف دين ${debt.partyName}`} onClick={onDelete} className="hover:bg-danger-soft hover:text-danger-ink">
            <Delete sx={{ fontSize: 20 }} />
          </IconButton>
        )}
      </div>
    </div>
  );
}
