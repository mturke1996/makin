import type { ReactNode } from 'react';
import { Button, Modal } from '../../../../design-system/primitives';

export interface ConfirmRequest {
  title: string;
  description?: ReactNode;
  /** سطور توضح النتيجة بالضبط (ماذا سيُحذف وماذا سيبقى). */
  details?: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
  /** يُنفَّذ بعد انتهاء إغلاق التأكيد، حتى لا تُغلق طبقتان في اللحظة نفسها (سجل الرجوع). */
  afterClose?: () => void;
}

interface ConfirmModalProps {
  open: boolean;
  request: ConfirmRequest | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** تأكيد صغير للعمليات التي لا رجعة فيها. يقول ماذا سيحدث قبل أن يُنفَّذ. */
export function ConfirmModal({ open, request, busy, onClose, onConfirm }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} title={request?.title} description={request?.description} maxWidth="sm" dismissible={!busy}>
      {request?.details && <div className="mb-5 rounded-md bg-surface-sunken p-3.5 text-sm leading-relaxed text-fg-subtle">{request.details}</div>}
      <div className="grid grid-cols-2 gap-3">
        <Button variant={request?.tone === 'primary' ? 'primary' : 'danger'} loading={busy} onClick={onConfirm}>
          {request?.confirmLabel}
        </Button>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </Modal>
  );
}
