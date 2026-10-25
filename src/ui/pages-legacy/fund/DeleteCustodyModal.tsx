import { Button, Modal } from '../../../design-system/primitives';
import type { CustodyBatch } from '../../../core/finance/custodyProfile';
import { Money, RefTag, expenseCountLabel, formatFundDate } from './fundUi';

type Props = {
  batch: CustodyBatch | null;
  userName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** تأكيد حذف عهدة: يذكر ما سيُحذف وأثره على الأرصدة. */
export function DeleteCustodyModal({ batch, userName, busy, onCancel, onConfirm }: Props) {
  return (
    <Modal
      open={batch !== null}
      onClose={busy ? () => undefined : onCancel}
      maxWidth="sm"
      title={batch ? `حذف العهدة ${batch.ref}؟` : undefined}
      dismissible={!busy}
    >
      {batch && (
        <div className="space-y-4">
          <p className="text-base leading-relaxed text-fg">
            ستُحذف عهدة <RefTag value={batch.ref} /> بمبلغ <Money value={batch.amount} /> بتاريخ {formatFundDate(batch.date)}
            {userName ? <> للمستخدم {userName}</> : null} نهائياً.
          </p>
          <p className="text-sm leading-relaxed text-fg-subtle">
            تُعاد حسابات الأرصدة تلقائياً، وقد يظهر عجز إن لم تكفِ بقية العهد.
            {batch.expenses.length > 0 && <> المصروفات المخصومة منها ({expenseCountLabel(batch.expenses.length)}) لا تُحذف، وتُحتسب من جديد على بقية العهد.</>}
          </p>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onCancel} disabled={busy}>
              إلغاء
            </Button>
            <Button variant="danger" onClick={onConfirm} loading={busy}>
              حذف العهدة
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
