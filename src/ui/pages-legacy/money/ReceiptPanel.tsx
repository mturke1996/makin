import { FileDownload, IosShare, Receipt } from '../../../design-system/icons';
import { Button } from '../../../design-system/primitives';
import type { Payment } from '../../../types';
import { ProfileCallout } from '../client-profile/profileUi';

interface Props {
  payment: Payment;
  busy: boolean;
  canIssue: boolean;
  onDownload: () => void;
  onShare: () => void;
}

/** The receipt of a saved payment: its number once issued, and the way to download or send it. */
export function ReceiptPanel({ payment, busy, canIssue, onDownload, onShare }: Props) {
  const number = payment.receiptNumber;
  const canAct = !!number || canIssue;
  return (
    <ProfileCallout tone="info" icon={<Receipt sx={{ fontSize: 22 }} />} title={number ? `إيصال الاستلام ${number}` : 'إيصال الاستلام'}>
      {number
        ? 'يُنشأ الملف من بيانات الدفعة المحفوظة. بعد تعديل الدفعة أعد تحميله ليطابقها.'
        : canIssue
          ? 'لم يُصدر إيصال لهذه الدفعة بعد. يأخذ رقمه التسلسلي عند أول إصدار ولا يتغير بعدها.'
          : 'لم يُصدر إيصال لهذه الدفعة بعد، ويُصدره من يملك صلاحية إدارة المدفوعات.'}
      {canAct && (
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" loading={busy} leftIcon={<FileDownload sx={{ fontSize: 18 }} />} onClick={onDownload}>
            {number ? 'تحميل الإيصال' : 'إصدار الإيصال'}
          </Button>
          <Button variant="outline" disabled={busy} leftIcon={<IosShare sx={{ fontSize: 18 }} />} onClick={onShare}>
            مشاركة
          </Button>
        </div>
      )}
    </ProfileCallout>
  );
}
