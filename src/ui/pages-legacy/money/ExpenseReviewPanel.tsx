import { useState } from 'react';
import { Check, CancelOutlined, HourglassEmpty, VerifiedUserOutlined } from '../../../design-system/icons';
import { Button, Textarea } from '../../../design-system/primitives';
import { approvalStatusOf, REJECTION_REASON_REQUIRED } from '../../../core/finance/expenseApproval';
import { arDateLabel } from './approvalDates';
import { ProfileCallout } from '../client-profile/profileUi';
import type { Expense } from '../../../types';

interface Props {
  expense: Expense;
  /** May this person decide (they hold `expenses.edit.all`, and the expense is not locked)? */
  canDecide: boolean;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

/**
 * Where an expense stands in review, and, for someone who may decide, the two decisions.
 * An approved expense only says who approved it; pending and rejected ones explain what happens next.
 */
export function ExpenseReviewPanel({ expense, canDecide, onApprove, onReject }: Props) {
  const status = approvalStatusOf(expense);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const run = async (kind: 'approve' | 'reject', work: () => Promise<void>) => {
    setBusy(kind);
    try {
      await work();
    } catch {
      /* the store already toasted the error */
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = () => {
    if (!reason.trim()) {
      setError(REJECTION_REASON_REQUIRED);
      return;
    }
    setError('');
    void run('reject', async () => {
      await onReject(reason.trim());
      setRejecting(false);
      setReason('');
    });
  };

  if (status === 'approved') {
    if (!expense.reviewedByName) return null;
    return (
      <ProfileCallout tone="success" icon={<VerifiedUserOutlined sx={{ fontSize: 22 }} />} title="معتمد">
        اعتمده {expense.reviewedByName}
        {expense.reviewedAt ? ` · ${arDateLabel(expense.reviewedAt)}` : ''}
      </ProfileCallout>
    );
  }

  const decisions = canDecide && (
    <div className="mt-3 space-y-3">
      {rejecting ? (
        <>
          <Textarea
            label="سبب الرفض"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={error || undefined}
            placeholder="مثال: الفاتورة غير واضحة، أرفق صورة أخرى"
          />
          <div className="flex gap-2">
            <Button variant="danger-soft" className="flex-1" loading={busy === 'reject'} onClick={confirmReject}>
              تأكيد الرفض
            </Button>
            <Button variant="ghost" onClick={() => { setRejecting(false); setError(''); }} disabled={busy !== null}>
              تراجع
            </Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <Button className="flex-1" loading={busy === 'approve'} leftIcon={<Check sx={{ fontSize: 18 }} />} onClick={() => void run('approve', onApprove)}>
            اعتماد
          </Button>
          {status === 'pending' && (
            <Button variant="outline" disabled={busy !== null} leftIcon={<CancelOutlined sx={{ fontSize: 18 }} />} onClick={() => setRejecting(true)}>
              رفض
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return status === 'pending' ? (
    <ProfileCallout tone="warning" icon={<HourglassEmpty sx={{ fontSize: 22 }} />} title="بانتظار الاعتماد">
      {expense.createdBy ? `سجّله ${expense.createdBy}. ` : ''}
      {canDecide ? 'راجع المبلغ والمرفق ثم اعتمده أو ارفضه مع السبب.' : 'سيُعتمد بعد مراجعة المحاسب أو المدير.'}
      {decisions}
    </ProfileCallout>
  ) : (
    <ProfileCallout tone="danger" icon={<CancelOutlined sx={{ fontSize: 22 }} />} title="مرفوض">
      {expense.rejectionReason ? `السبب: ${expense.rejectionReason}` : ''}
      {expense.reviewedByName ? ` · رفضه ${expense.reviewedByName}` : ''}
      <span className="mt-1 block">
        {canDecide ? 'يمكنك اعتماده إن زال السبب.' : 'عدّل المصروف واحفظه ليعود إلى المراجعة.'}
      </span>
      {decisions}
    </ProfileCallout>
  );
}
