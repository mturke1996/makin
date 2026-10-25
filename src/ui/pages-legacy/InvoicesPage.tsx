import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Add, ReceiptLong, Search } from '../../design-system/icons';
import { useDataStore } from '../../stores/useDataStore';
import { useAccess } from '../../core/access/useAccess';
import {
  Amount, Button, EmptyState, FigureStrip, Input, ListGroup, PageHeader, PageShell, Segmented, Skeleton,
} from '../../design-system/primitives';
import { toMills, fromMills, sumMoney } from './invoices/invoiceMath';
import { InvoiceRow, type InvoiceRowData } from './invoices/InvoiceRow';
import type { Invoice } from '../../types';

type StatusFilter = 'all' | Exclude<Invoice['status'], 'cancelled'>;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'draft', label: 'مسودة' },
  { value: 'sent', label: 'مرسلة' },
  { value: 'partially_paid', label: 'مدفوعة جزئياً' },
  { value: 'paid', label: 'مدفوعة' },
  { value: 'overdue', label: 'متأخرة' },
];

function InvoicesSkeleton() {
  return (
    <ListGroup aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2.5 px-4 py-4">
          <div className="flex justify-between">
            <Skeleton height={16} width={120} />
            <Skeleton height={16} width={80} />
          </div>
          <div className="flex justify-between">
            <Skeleton height={13} width="40%" />
            <Skeleton height={24} width={84} pill />
          </div>
          <Skeleton height={6} pill className="mt-3" />
        </div>
      ))}
    </ListGroup>
  );
}

export const InvoicesPage = () => {
  const navigate = useNavigate();
  const { invoices, clients, payments, isLoading } = useDataStore();
  const access = useAccess();
  const canCreate = access.can('invoices.manage');
  // What was collected and what is left come from the payments; without them those figures are left out.
  const hasPayments = access.can('payments.view');
  const hasClients = access.can('clients.view');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const rows = useMemo<InvoiceRowData[]>(() => {
    const clientName = new Map(clients.map((c) => [c.id, c.name]));
    const paidMills = new Map<string, number>();
    for (const p of payments) {
      paidMills.set(p.invoiceId, (paidMills.get(p.invoiceId) || 0) + toMills(p.amount));
    }
    return invoices
      .map((invoice) => {
        const paid = fromMills(paidMills.get(invoice.id) || 0);
        const remaining = Math.max(0, fromMills(toMills(invoice.total) - toMills(paid)));
        const progressPct = invoice.total > 0 ? Math.min(100, Math.round((paid / invoice.total) * 100)) : 0;
        return {
          invoice,
          clientName: clientName.get(invoice.clientId) || invoice.tempClientName || (hasClients ? 'عميل غير معروف' : ''),
          paid,
          remaining,
          progressPct,
          collection: hasPayments,
        };
      })
      .sort((a, b) => b.invoice.issueDate.localeCompare(a.invoice.issueDate) || b.invoice.createdAt.localeCompare(a.invoice.createdAt));
  }, [invoices, clients, payments, hasPayments, hasClients]);

  const totals = useMemo(() => {
    const live = rows.filter((r) => r.invoice.status !== 'cancelled');
    return {
      invoiced: sumMoney(live.map((r) => r.invoice.total)),
      collected: sumMoney(live.map((r) => r.paid)),
      outstanding: sumMoney(live.map((r) => r.remaining)),
      overdue: sumMoney(live.filter((r) => r.invoice.status === 'overdue').map((r) => r.remaining)),
      overdueCount: live.filter((r) => r.invoice.status === 'overdue').length,
      paidCount: live.filter((r) => r.invoice.status === 'paid').length,
    };
  }, [rows]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: rows.length };
    for (const r of rows) out[r.invoice.status] = (out[r.invoice.status] || 0) + 1;
    return out;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === 'all' || r.invoice.status === status) &&
        (!q || r.invoice.invoiceNumber.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q))
    );
  }, [rows, status, query]);

  const newInvoice = () => navigate('/invoices/new');
  const showSkeleton = isLoading && invoices.length === 0;

  return (
    <PageShell>
      <PageHeader
        title="الفواتير"
        subtitle={invoices.length ? `${invoices.length} فاتورة` : 'فواتير العملاء ومتابعة تحصيلها'}
        actions={
          canCreate ? (
            <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={newInvoice}>
              فاتورة جديدة
            </Button>
          ) : undefined
        }
      />

      {invoices.length > 0 && (
        <>
          <FigureStrip
            mobileCols={2}
            figures={
              hasPayments
                ? [
                    { label: 'المفوتر', value: <Amount amount={totals.invoiced} /> },
                    { label: 'المحصّل', value: <Amount amount={totals.collected} />, tone: 'success' },
                    { label: 'المتبقي', value: <Amount amount={totals.outstanding} />, tone: totals.outstanding > 0 ? 'warning' : 'neutral' },
                    { label: 'المتأخر', value: <Amount amount={totals.overdue} />, tone: totals.overdue > 0 ? 'danger' : 'neutral' },
                  ]
                : [
                    // Without the payments, what was collected is unknown: only what the invoices themselves say.
                    { label: 'المفوتر', value: <Amount amount={totals.invoiced} /> },
                    { label: 'الفواتير', value: <span className="tabular-nums">{rows.length}</span> },
                    { label: 'مدفوعة', value: <span className="tabular-nums">{totals.paidCount}</span>, tone: 'success' },
                    { label: 'متأخرة', value: <span className="tabular-nums">{totals.overdueCount}</span>, tone: totals.overdueCount > 0 ? 'danger' : 'neutral' },
                  ]
            }
          />
          <div className="space-y-3">
            <Input
              aria-label="بحث في الفواتير"
              leftIcon={<Search sx={{ fontSize: 20 }} />}
              placeholder={hasClients ? 'ابحث برقم الفاتورة أو اسم العميل' : 'ابحث برقم الفاتورة'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              enterKeyHint="search"
              autoComplete="off"
            />
            <Segmented<StatusFilter>
              layout="scroll"
              aria-label="تصفية الفواتير حسب الحالة"
              value={status}
              onChange={setStatus}
              options={FILTERS.map((f) => ({ ...f, count: counts[f.value] || 0 }))}
            />
          </div>
        </>
      )}

      {showSkeleton ? (
        <InvoicesSkeleton />
      ) : invoices.length === 0 ? (
        <EmptyState
          Icon={ReceiptLong}
          title="لا توجد فواتير بعد"
          description={
            canCreate ? 'أنشئ فاتورة لعميل، ثم سجّل دفعاته عليها لتعرف المتبقي في أي وقت.' : 'فواتير العملاء تظهر هنا عند إنشائها.'
          }
          action={
            canCreate ? (
              <Button variant="secondary" leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={newInvoice}>
                أنشئ أول فاتورة
              </Button>
            ) : undefined
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          Icon={Search}
          title="لا توجد فواتير مطابقة"
          description="غيّر الحالة أو جرّب رقماً أو اسماً آخر."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery('');
                setStatus('all');
              }}
            >
              مسح التصفية
            </Button>
          }
        />
      ) : (
        <ListGroup>
          {visible.map((r) => (
            <InvoiceRow key={r.invoice.id} data={r} onOpen={() => navigate(`/invoices/${r.invoice.id}`)} />
          ))}
        </ListGroup>
      )}
    </PageShell>
  );
};
