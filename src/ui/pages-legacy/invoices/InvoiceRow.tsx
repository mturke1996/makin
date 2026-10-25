import { ChevronRight } from '../../../design-system/icons';
import { Amount, Badge, ProgressBar, cn } from '../../../design-system/primitives';
import { formatCurrencyDisplay, formatDate, getStatusLabel } from '../../../core/utils-formatters';
import type { Invoice } from '../../../types';
import { PROGRESS_TONE, STATUS_TONE } from './invoiceStatus';

export type InvoiceRowData = {
  invoice: Invoice;
  /** Empty when the person may not see the clients list and the invoice has no temporary client name. */
  clientName: string;
  paid: number;
  remaining: number;
  progressPct: number;
  /**
   * Whether the payments behind `paid`, `remaining` and `progressPct` are available. Without them those
   * numbers would claim nothing was collected, so the row leaves the collection line out.
   */
  collection: boolean;
};

interface InvoiceRowProps {
  data: InvoiceRowData;
  onOpen: () => void;
}

function StatusBadge({ invoice }: { invoice: Invoice }) {
  return (
    <Badge tone={STATUS_TONE[invoice.status]} dot className="flex-none">
      {getStatusLabel(invoice.status)}
    </Badge>
  );
}

function Progress({ data }: { data: InvoiceRowData }) {
  const { invoice, remaining, progressPct, collection } = data;
  if (invoice.status === 'cancelled' || !collection) return null;
  return (
    <span className="block">
      <ProgressBar value={progressPct} tone={PROGRESS_TONE[invoice.status]} label={`المحصّل ${progressPct}%`} />
      <span className="mt-1.5 flex items-center justify-between gap-3 text-xs text-fg-muted">
        <span>
          محصّل <bdi dir="ltr">{progressPct}%</bdi>
        </span>
        {remaining > 0 && (
          <span>
            المتبقي <bdi dir="ltr">{formatCurrencyDisplay(remaining)}</bdi>
          </span>
        )}
      </span>
    </span>
  );
}

function Total({ invoice }: { invoice: Invoice }) {
  return (
    <Amount
      amount={invoice.total}
      className={cn('text-md font-bold', invoice.status === 'cancelled' && 'text-fg-muted line-through')}
    />
  );
}

/**
 * One invoice: number, client, dates, total, collected share, status.
 * Phones stack it; desktop lays it out as scannable columns.
 */
export function InvoiceRow({ data, onOpen }: InvoiceRowProps) {
  const { invoice, clientName } = data;
  const overdue = invoice.status === 'overdue';
  const issue = <bdi dir="ltr">{formatDate(invoice.issueDate)}</bdi>;
  const due = <bdi dir="ltr">{formatDate(invoice.dueDate)}</bdi>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-4 text-start',
        'transition-colors duration-fast ease-out hover:bg-surface-hover active:bg-surface-hover',
        'focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]'
      )}
    >
      {/* Phone / tablet */}
      <span className="min-w-0 flex-1 lg:hidden">
        <span className="flex items-baseline justify-between gap-3">
          <bdi dir="ltr" className="truncate text-base font-semibold text-fg">
            {invoice.invoiceNumber}
          </bdi>
          <Total invoice={invoice} />
        </span>
        <span className="mt-1 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm text-fg-subtle">{clientName}</span>
          <StatusBadge invoice={invoice} />
        </span>
        <span className="mt-1 block text-xs text-fg-muted">
          الإصدار {issue}
          <span aria-hidden> · </span>
          <span className={cn(overdue && 'font-semibold text-danger-ink')}>الاستحقاق {due}</span>
        </span>
        {data.collection && (
          <span className="mt-3 block">
            <Progress data={data} />
          </span>
        )}
      </span>

      {/* Desktop columns */}
      <span
        className={cn(
          'hidden min-w-0 flex-1 items-center gap-8 lg:grid',
          data.collection
            ? 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,0.9fr)]'
            : 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)]'
        )}
      >
        <span className="min-w-0">
          <span className="block truncate text-start text-base font-semibold text-fg">
            <bdi dir="ltr">{invoice.invoiceNumber}</bdi>
          </span>
          <span className="block truncate text-sm text-fg-subtle">{clientName}</span>
        </span>
        <span className="block text-xs leading-relaxed text-fg-muted">
          <span className="block">الإصدار {issue}</span>
          <span className={cn('block', overdue && 'font-semibold text-danger-ink')}>الاستحقاق {due}</span>
        </span>
        {data.collection && <Progress data={data} />}
        <span className="flex flex-col items-end gap-1.5">
          <Total invoice={invoice} />
          <StatusBadge invoice={invoice} />
        </span>
      </span>

      <ChevronRight sx={{ fontSize: 20 }} className="flex-none text-fg-muted rtl-flip" aria-hidden />
    </button>
  );
}
