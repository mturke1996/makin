import { CancelOutlined, CheckCircleOutline, DeleteOutline, EditOutlined, MailOutline } from '@mui/icons-material';
import { ListGroup, ListRow, Sheet } from '../../../design-system/primitives';
import type { Invoice } from '../../../types';

interface InvoiceActionsSheetProps {
  open: boolean;
  onClose: () => void;
  status: Invoice['status'];
  /** Change the status and edit: `invoices.manage`. */
  canManage: boolean;
  /** Delete the invoice (and its payments): offered only when the whole deletion is allowed. */
  canDelete: boolean;
  onStatus: (status: Invoice['status']) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const icon = (node: React.ReactNode, tone: string) => (
  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone}`}>{node}</span>
);

/** Status changes, edit and delete. Delete is last and asks for confirmation elsewhere. */
export function InvoiceActionsSheet({ open, onClose, status, canManage, canDelete, onStatus, onEdit, onDelete }: InvoiceActionsSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} mobile="bottom" maxWidth="sm" title="إجراءات الفاتورة">
      <div className="space-y-4 p-4 lg:p-6">
        {canManage && (
        <ListGroup>
          <ListRow
            density="compact"
            leading={icon(<CheckCircleOutline sx={{ fontSize: 22 }} />, 'bg-success-soft text-success-ink')}
            title="تعليم كمدفوعة"
            disabled={status === 'paid'}
            onClick={() => onStatus('paid')}
          />
          <ListRow
            density="compact"
            leading={icon(<MailOutline sx={{ fontSize: 22 }} />, 'bg-info-soft text-info-ink')}
            title="تعليم كمرسلة"
            disabled={status === 'sent'}
            onClick={() => onStatus('sent')}
          />
          <ListRow
            density="compact"
            leading={icon(<CancelOutlined sx={{ fontSize: 22 }} />, 'bg-warning-soft text-warning-ink')}
            title="إلغاء الفاتورة"
            disabled={status === 'cancelled'}
            onClick={() => onStatus('cancelled')}
          />
          <ListRow
            density="compact"
            leading={icon(<EditOutlined sx={{ fontSize: 22 }} />, 'bg-accent-soft text-accent-ink')}
            title="تعديل الفاتورة"
            chevron
            onClick={onEdit}
          />
        </ListGroup>
        )}
        {canDelete && (
          <ListGroup>
            <ListRow
              density="compact"
              leading={icon(<DeleteOutline sx={{ fontSize: 22 }} />, 'bg-danger-soft text-danger-ink')}
              title={<span className="text-danger-ink">حذف الفاتورة</span>}
              onClick={onDelete}
            />
          </ListGroup>
        )}
      </div>
    </Sheet>
  );
}
