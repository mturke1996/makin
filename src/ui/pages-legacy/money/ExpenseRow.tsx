import { AttachFile, Check, PersonOutline, Shield, VisibilityOutlined } from '../../../design-system/icons';
import { isAwaitingApproval } from '../../../core/finance/expenseApproval';
import { Amount, Avatar, Badge, Button } from '../../../design-system/primitives';
import {
  expenseHasQuantityLine,
  formatCurrencyDisplay,
  formatQuantityWithUnit,
  getExpenseCategoryLabel,
} from '../../../core/utils-formatters';
import type { Role } from '../../../core/access/principal';
import type { Expense } from '../../../types';
import { ApprovalBadge } from './ApprovalBadge';
import { MoneyRow } from './moneyUi';

interface Props {
  expense: Expense;
  clientName: string;
  /**
   * Whether to show who recorded it. Only people who see everyone's expenses need that; a person
   * who sees just their own would read their own name on every row.
   */
  showAuthor: boolean;
  /** The author's role from the users directory, or null when unknown. */
  authorRole: Role | null;
  /** The access policy's answer for this expense; false opens it read-only. */
  canEdit: boolean;
  onOpen: () => void;
  /** Omitted when the policy does not let this person delete the expense. */
  onDelete?: () => void;
  /** Given to someone who may approve: a waiting expense then offers a one-press approval on wide screens. */
  onApprove?: () => void;
  /** The approval is on its way: the buttons wait and say so, so a second press cannot repeat it. */
  approving?: boolean;
}

export function ExpenseRow({ expense: e, clientName, showAuthor, authorRole, canEdit, onOpen, onDelete, onApprove, approving = false }: Props) {
  const author = e.createdBy || (authorRole === 'employee' ? 'موظف' : 'الإدارة');
  const hasQty = expenseHasQuantityLine({ quantity: e.quantity, unitPrice: e.unitPrice });

  const leading = showAuthor ? (
    <Avatar name={author} tone={authorRole === 'employee' ? 'info' : 'neutral'} />
  ) : (
    <Avatar name={clientName} shape="entity" />
  );

  return (
    <MoneyRow
      leading={leading}
      title={e.description}
      subtitle={clientName}
      meta={
        <>
          <Badge>{getExpenseCategoryLabel(e.category)}</Badge>
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
          {hasQty && (
            <Badge>
              {formatQuantityWithUnit(e.quantity!, e.unit)} × {formatCurrencyDisplay(e.unitPrice!)}
            </Badge>
          )}
          <ApprovalBadge expense={e} />
          {e.isClosed && <Badge tone="info">مغلق</Badge>}
          {e.invoiceNumber && <span className="text-xs text-fg-muted">فاتورة {e.invoiceNumber}</span>}
          {e.attachmentUrl && (
            <span className="inline-flex items-center gap-0.5 text-xs text-fg-muted">
              <AttachFile aria-hidden sx={{ fontSize: 14 }} />
              مرفق
            </span>
          )}
        </>
      }
      trailing={<Amount amount={e.amount} tone="danger" className="text-md font-bold" />}
      onOpen={onOpen}
      onDelete={onDelete}
      openIcon={canEdit ? undefined : <VisibilityOutlined sx={{ fontSize: 20 }} />}
      editLabel={canEdit ? `تعديل مصروف ${e.description}` : `عرض مصروف ${e.description}`}
      deleteLabel={`حذف مصروف ${e.description}`}
      phoneAction={
        onApprove && isAwaitingApproval(e) ? (
          <Button
            size="sm"
            variant="outline"
            block
            loading={approving}
            leftIcon={<Check sx={{ fontSize: 18 }} />}
            onClick={onApprove}
            aria-label={`اعتماد مصروف ${e.description}`}
          >
            اعتماد
          </Button>
        ) : undefined
      }
      desktopActions={
        <>
          {onApprove && isAwaitingApproval(e) && (
            <button
              type="button"
              onClick={onApprove}
              disabled={approving}
              aria-busy={approving || undefined}
              aria-label={`اعتماد مصروف ${e.description}`}
              title="اعتماد"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-success-ink transition-colors duration-fast ease-out hover:bg-success-soft focus:outline-none focus-visible:shadow-focus disabled:opacity-50"
            >
              {approving ? <span aria-hidden className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-e-transparent" /> : <Check sx={{ fontSize: 20 }} />}
            </button>
          )}
          {e.attachmentUrl && (
          <a
            href={e.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`فتح مرفق ${e.attachmentName || e.description}`}
            title={e.attachmentName || 'فتح المرفق'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:shadow-focus"
          >
            <AttachFile sx={{ fontSize: 20 }} />
          </a>
          )}
        </>
      }
    />
  );
}
