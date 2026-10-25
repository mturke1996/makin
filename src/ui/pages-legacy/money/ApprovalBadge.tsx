import { HourglassEmpty, CancelOutlined } from '../../../design-system/icons';
import { Badge } from '../../../design-system/primitives';
import { APPROVAL_LABEL, approvalStatusOf } from '../../../core/finance/expenseApproval';
import type { Expense } from '../../../types';

/** Shown only when the expense still needs somebody's attention: an approved expense carries no badge. */
export function ApprovalBadge({ expense }: { expense: Pick<Expense, 'approvalStatus'> }) {
  const status = approvalStatusOf(expense);
  if (status === 'approved') return null;
  return status === 'pending' ? (
    <Badge tone="warning">
      <HourglassEmpty aria-hidden sx={{ fontSize: 14 }} />
      {APPROVAL_LABEL.pending}
    </Badge>
  ) : (
    <Badge tone="danger">
      <CancelOutlined aria-hidden sx={{ fontSize: 14 }} />
      {APPROVAL_LABEL.rejected}
    </Badge>
  );
}
