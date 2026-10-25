import { memo } from 'react';
import { AttachFile, Lock, PersonOutline, Shield, Visibility } from '../../../../design-system/icons';
import { Amount, Avatar, Badge } from '../../../../design-system/primitives';
import type { Role } from '../../../../core/access/principal';
import { formatDayText } from '../../../../core/finance/clientRecords';
import { expenseHasQuantityLine } from '../../../../core/utils-formatters';
import type { Expense } from '../../../../types';
import { ExpenseQuantityChip } from '../ExpenseQuantityBlock';
import { LedgerRow } from '../LedgerParts';
import { expenseCategoryLabel } from './recordLabels';

interface ExpenseRowProps {
  expense: Expense;
  /** #1 is the oldest expense of the client; the newest gets the largest number. */
  serial: number;
  /** Who recorded it matters only to people who see everyone's expenses. */
  showAuthor: boolean;
  authorRole: Role | null;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

/**
 * One expense: what, when, which category, who recorded it, and a lock notice once it is closed in an invoice.
 * Memoised: a client can have hundreds of expenses, and typing in the search box or opening the next page
 * must only draw the rows that changed.
 */
export const ExpenseRow = memo(function ExpenseRow({
  expense: e,
  serial,
  showAuthor,
  authorRole,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ExpenseRowProps) {
  const author = e.createdBy || (authorRole === 'employee' ? 'موظف' : 'الإدارة');
  const hasQuantity = expenseHasQuantityLine(e);
  const date = formatDayText(e.date);

  return (
    <LedgerRow
      leading={<Avatar name={author} tone={authorRole === 'employee' ? 'info' : 'neutral'} />}
      title={e.description}
      subtitle={
        <>
          {date && (
            <bdi dir="ltr" className="tabular-nums">
              {date}
            </bdi>
          )}
          {date && ' · '}
          {expenseCategoryLabel(e.category)}
          {e.invoiceNumber ? ` · فاتورة ${e.invoiceNumber}` : ''}
        </>
      }
      note={e.notes}
      meta={
        (showAuthor || e.isClosed) && (
          <>
            {showAuthor &&
              (authorRole === 'employee' ? (
                <Badge tone="info">
                  <PersonOutline aria-hidden sx={{ fontSize: 14 }} />
                  موظف: {author}
                </Badge>
              ) : authorRole === 'admin' ? (
                <Badge>
                  <Shield aria-hidden sx={{ fontSize: 14 }} />
                  الإدارة
                </Badge>
              ) : (
                e.createdBy && <span className="text-xs text-fg-muted">بواسطة {e.createdBy}</span>
              ))}
            {e.isClosed && (
              <Badge tone="info">
                <Lock aria-hidden sx={{ fontSize: 14 }} />
                مغلق في فاتورة
              </Badge>
            )}
          </>
        )
      }
      trailing={
        <span className="block">
          <Amount amount={e.amount} tone="danger" className="text-md font-bold" />
          <bdi dir="ltr" className="block text-xs tabular-nums text-fg-muted">
            #{serial}
          </bdi>
        </span>
      }
      extra={
        (hasQuantity || e.attachmentUrl) && (
          <div className="space-y-1">
            {hasQuantity && <ExpenseQuantityChip quantity={e.quantity} unit={e.unit} unitPrice={e.unitPrice} amount={e.amount} />}
            {e.attachmentUrl && (
              <a
                href={e.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-accent-ink hover:underline focus:outline-none focus-visible:shadow-focus"
              >
                <AttachFile aria-hidden sx={{ fontSize: 18 }} />
                عرض {e.attachmentName || 'المرفق'}
              </a>
            )}
          </div>
        )
      }
      onOpen={() => onEdit(e)}
      onDelete={canDelete ? () => onDelete(e) : undefined}
      editLabel={canEdit ? `تعديل مصروف ${e.description}` : `عرض مصروف ${e.description}`}
      deleteLabel={`حذف مصروف ${e.description}`}
      openIcon={canEdit ? undefined : <Visibility sx={{ fontSize: 20 }} />}
    />
  );
});
