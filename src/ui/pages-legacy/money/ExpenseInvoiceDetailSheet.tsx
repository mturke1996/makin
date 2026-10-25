import { useRef } from 'react';
import { Delete } from '@mui/icons-material';
import { Amount, Badge, Button, ListGroup, Sheet } from '../../../design-system/primitives';
import { formatDate, getExpenseCategoryLabel } from '../../../core/utils-formatters';
import type { Expense, ExpenseInvoice } from '../../../types';
import { FormBody, FormSection } from './moneyUi';

interface Props {
  open: boolean;
  invoice: ExpenseInvoice | null;
  clientName: string;
  onClose: () => void;
  /** Omitted when this person may not delete expense invoices (`expenses.edit.all`). */
  onDelete?: (invoice: ExpenseInvoice) => void;
}

/** Read-only view of a saved bundle: who, when, which expenses. Delete lives at the end, quiet. */
export function ExpenseInvoiceDetailSheet({ open, invoice, clientName, onClose, onDelete }: Props) {
  // keep the last invoice while the sheet animates out
  const last = useRef<{ invoice: ExpenseInvoice; clientName: string } | null>(null);
  if (invoice) last.current = { invoice, clientName };
  const shown = invoice ?? last.current?.invoice ?? null;
  const name = invoice ? clientName : last.current?.clientName ?? '';
  if (!shown) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  // Whoever opens expense invoices sees every expense (`expenses.view.all`), so the bundle is shown whole.
  const included: Expense[] = shown.expenses || [];

  const rows: [string, string][] = [
    ['العميل', name],
    ['تاريخ الإصدار', formatDate(shown.issueDate)],
    ['فترة المصروفات', `${formatDate(shown.startDate)} إلى ${formatDate(shown.endDate)}`],
    ...(shown.createdBy ? ([['أنشأها', shown.createdBy]] as [string, string][]) : []),
    ...(shown.notes ? ([['ملاحظات', shown.notes]] as [string, string][]) : []),
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`فاتورة ${shown.invoiceNumber}`}
      subtitle={name}
      maxWidth="md"
      footer={
        onDelete ? (
          <Button variant="danger-soft" block leftIcon={<Delete sx={{ fontSize: 20 }} />} onClick={() => onDelete(shown)}>
            حذف الفاتورة
          </Button>
        ) : undefined
      }
    >
      <FormBody>
        <section className="flex items-center justify-between gap-3">
          <Badge tone="success" dot>
            {shown.status === 'saved' ? 'محفوظة' : shown.status === 'sent' ? 'مرسلة' : 'مسودة'}
          </Badge>
          <Amount amount={shown.totalAmount} tone="danger" className="text-xl font-bold" />
        </section>

        <dl className="divide-y divide-border rounded-md border border-border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex min-h-12 items-start justify-between gap-4 px-3.5 py-3">
              <dt className="flex-none text-sm text-fg-subtle">{label}</dt>
              <dd className="min-w-0 text-end text-sm font-medium text-fg">{value}</dd>
            </div>
          ))}
        </dl>

        <FormSection title={`المصروفات المشمولة (${included.length})`}>
          <ListGroup>
            {included.map((e) => (
              <div key={e.id} className="flex min-h-16 items-center gap-3 px-3.5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-base font-medium leading-snug text-fg">{e.description}</span>
                  <span className="mt-0.5 block truncate text-xs text-fg-muted">
                    {formatDate(e.date)} · {getExpenseCategoryLabel(e.category)}
                  </span>
                </span>
                <Amount amount={e.amount} tone="danger" className="flex-none text-md font-semibold" />
              </div>
            ))}
          </ListGroup>
        </FormSection>
      </FormBody>
    </Sheet>
  );
}
