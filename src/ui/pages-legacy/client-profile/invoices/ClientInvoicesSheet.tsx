import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, PostAdd, ReceiptLong } from '@mui/icons-material';
import {
  Amount,
  Badge,
  Button,
  EmptyState,
  FigureStrip,
  type Figure,
  ListGroup,
  ProgressBar,
  Segmented,
  Sheet,
  Skeleton,
} from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import { formatCurrencyDisplay, getStatusLabel } from '../../../../core/utils-formatters';
import type { Client, Invoice, Payment } from '../../../../types';
import { daysPhrase } from '../details/projectCopy';
import { extrasCountPhrase } from '../extrasCopy';
import { formatDay } from '../workers/format';
import { buildClientInvoices, type ClientInvoiceRow, type InvoiceStatus } from './clientInvoices';
import { PROGRESS_TONE, STATUS_TONE } from '../../invoices/invoiceStatus';

export interface ClientInvoicesSheetProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  /** The client's invoices (`useClientExtras().clientInvoices`). */
  invoices: Invoice[];
  /** The client's payments (`data.clientPayments`), used to see what each invoice has collected. */
  payments: Payment[];
  /** `caps.payments`. Without it collected and remaining are not shown, only totals and statuses. */
  paymentsKnown: boolean;
  /** The data is still loading and there is nothing to show yet. */
  loading?: boolean;
  /** Opens the invoice page (`/invoices/:id`). */
  onOpenInvoice: (invoiceId: string) => void;
  /** Starts a new invoice for this client (`/invoices/new?clientId=`). Leave out without `invoices.manage`. */
  onCreate?: () => void;
}

type Filter = 'all' | 'overdue' | 'open' | 'closed';

type Group = Exclude<Filter, 'all'>;

const GROUPS: readonly Group[] = ['overdue', 'open', 'closed'];
const OPEN: InvoiceStatus[] = ['sent', 'partially_paid', 'draft'];
const GROUP_OF = (s: InvoiceStatus): Group => (s === 'overdue' ? 'overdue' : OPEN.includes(s) ? 'open' : 'closed');

const GROUP_TITLE: Record<Group, string> = {
  overdue: 'متأخرة',
  open: 'مفتوحة',
  closed: 'مغلقة',
};

function InvoiceRowButton({ row, paymentsKnown, onOpen }: { row: ClientInvoiceRow; paymentsKnown: boolean; onOpen: () => void }) {
  const { invoice, status } = row;
  const cancelled = status === 'cancelled';
  const overdue = status === 'overdue';
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
      <span className="min-w-0 flex-1 space-y-2">
        <span className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <bdi dir="ltr" className="whitespace-nowrap text-base font-semibold text-fg">
              {invoice.invoiceNumber}
            </bdi>
            <span className="whitespace-nowrap text-xs text-fg-muted">
              <span className="sr-only">الإصدار </span>
              <bdi dir="ltr" className="tabular-nums">{formatDay(invoice.issueDate)}</bdi>
            </span>
          </span>
          <Amount amount={invoice.total} className={cn('text-md font-bold', cancelled && 'text-fg-muted line-through')} />
        </span>
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Badge tone={STATUS_TONE[status]} dot>
            {getStatusLabel(status)}
            {overdue && row.daysOverdue > 0 && <> {daysPhrase(row.daysOverdue)}</>}
          </Badge>
          <span className={cn('text-xs', overdue ? 'font-semibold text-danger-ink' : 'text-fg-muted')}>
            الاستحقاق <bdi dir="ltr" className="tabular-nums">{formatDay(invoice.dueDate)}</bdi>
          </span>
        </span>
        {paymentsKnown && !cancelled && row.progressPct != null && (
          <span className="block">
            <ProgressBar value={row.progressPct} tone={PROGRESS_TONE[status]} label={`المحصّل ${row.progressPct}%`} />
            <span className="mt-1.5 flex items-center justify-between gap-3 text-xs text-fg-muted">
              <span>
                محصّل <bdi dir="ltr" className="tabular-nums">{row.progressPct}%</bdi>
              </span>
              {row.remaining != null && row.remaining > 0 && (
                <span>
                  المتبقي <bdi dir="ltr" className="tabular-nums">{formatCurrencyDisplay(row.remaining)}</bdi>
                </span>
              )}
            </span>
          </span>
        )}
      </span>
      <ChevronRight sx={{ fontSize: 20 }} className="flex-none text-fg-muted rtl-flip" aria-hidden />
    </button>
  );
}

function InvoicesSkeleton() {
  return (
    <ListGroup aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2.5 px-4 py-4">
          <div className="flex justify-between">
            <Skeleton height={16} width={120} />
            <Skeleton height={16} width={80} />
          </div>
          <Skeleton height={24} width={96} pill />
          <Skeleton height={6} pill />
        </div>
      ))}
    </ListGroup>
  );
}

/**
 * The client's invoices: what was billed, collected and is still due, overdue ones first. Collected and
 * remaining come from the client's payments and are left out for people who do not hold them.
 */
export function ClientInvoicesSheet({
  open,
  onClose,
  client,
  invoices,
  payments,
  paymentsKnown,
  loading,
  onOpenInvoice,
  onCreate,
}: ClientInvoicesSheetProps) {
  const [filter, setFilter] = useState<Filter>('all');
  // A sheet that was closed opens fresh next time.
  useEffect(() => {
    if (!open) setFilter('all');
  }, [open]);
  const view = useMemo(() => buildClientInvoices({ invoices, payments, paymentsKnown }), [invoices, payments, paymentsKnown]);
  const { rows, totals } = view;

  const counts = useMemo(() => {
    const out: Record<Filter, number> = { all: rows.length, overdue: 0, open: 0, closed: 0 };
    for (const r of rows) out[GROUP_OF(r.status)] += 1;
    return out;
  }, [rows]);

  // A filter that no longer matches anything (the last overdue invoice was paid) falls back to all.
  const active: Filter = filter !== 'all' && counts[filter] === 0 ? 'all' : filter;
  const present = GROUPS.filter((g) => counts[g] > 0);
  const groups = present
    .filter((g) => active === 'all' || active === g)
    .map((g) => ({ key: g, rows: rows.filter((r) => GROUP_OF(r.status) === g) }));

  const showSkeleton = !!loading && invoices.length === 0;
  const empty = !showSkeleton && invoices.length === 0;
  const hasOverdue = totals.overdueCount > 0;

  const figures: Figure[] = paymentsKnown
    ? [
        { label: 'المفوتر', value: <Amount amount={totals.invoiced} />, hint: extrasCountPhrase('invoices', totals.count) },
        { label: 'المحصّل', value: <Amount amount={totals.paid ?? 0} />, tone: 'success' },
        { label: 'المتبقي للتحصيل', value: <Amount amount={totals.remaining ?? 0} /> },
        { label: 'المتأخر', value: <Amount amount={totals.overdueRemaining ?? 0} />, tone: hasOverdue ? 'danger' : 'neutral', hint: hasOverdue ? extrasCountPhrase('invoices', totals.overdueCount) : undefined },
      ]
    : [
        { label: 'إجمالي الفواتير', value: <Amount amount={totals.invoiced} /> },
        { label: 'عدد الفواتير', value: totals.count },
        { label: 'المتأخرة', value: totals.overdueCount, tone: hasOverdue ? 'danger' : 'neutral' },
        { label: 'الملغاة', value: totals.cancelledCount },
      ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="الفواتير"
      subtitle={client.name}
      maxWidth="md"
      footer={
        onCreate ? (
          <Button block leftIcon={<PostAdd sx={{ fontSize: 20 }} />} onClick={onCreate}>
            فاتورة جديدة
          </Button>
        ) : undefined
      }
    >
      <div className="min-h-[40vh] space-y-5 px-4 pb-8 pt-4 lg:px-6">
        {showSkeleton ? (
          <InvoicesSkeleton />
        ) : empty ? (
          <EmptyState
            Icon={ReceiptLong}
            title="لا توجد فواتير لهذا العميل"
            description={
              onCreate
                ? 'أصدر فاتورة بما يستحقه المشروع، وتابع هنا ما حُصِّل منها وما تأخر. اضغط فاتورة جديدة للبدء.'
                : 'الفواتير المصدرة لهذا العميل تظهر هنا مع حالة كل واحدة.'
            }
          />
        ) : (
          <>
            <FigureStrip figures={figures} mobileCols={2} />

            {present.length > 1 && (
              <Segmented<Filter>
                layout="scroll"
                aria-label="تصفية الفواتير"
                value={active}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'الكل', count: counts.all },
                  ...present.map((g) => ({ value: g, label: GROUP_TITLE[g], count: counts[g] })),
                ]}
              />
            )}

            {groups.map((g) => (
              <section key={g.key} className="space-y-2">
                {(groups.length > 1 || active !== 'all') && (
                  <h3 className="px-1 text-sm font-semibold text-fg-subtle">{GROUP_TITLE[g.key]}</h3>
                )}
                <ListGroup>
                  {g.rows.map((row) => (
                    <InvoiceRowButton
                      key={row.invoice.id}
                      row={row}
                      paymentsKnown={paymentsKnown}
                      onOpen={() => onOpenInvoice(row.invoice.id)}
                    />
                  ))}
                </ListGroup>
              </section>
            ))}

            {paymentsKnown && (totals.unlinked ?? 0) > 0 && (
              <p className="rounded-md bg-surface-sunken px-4 py-3 text-xs leading-relaxed text-fg-subtle">
                دفعات بقيمة <span className="font-semibold text-fg">{formatCurrencyDisplay(totals.unlinked ?? 0)}</span>{' '}
                سُجّلت على حساب العميل دون ربطها بفاتورة، ولا تدخل في المحصّل أعلاه.
              </p>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
