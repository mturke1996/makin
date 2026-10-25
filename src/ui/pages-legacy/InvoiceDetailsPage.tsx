import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MoreHoriz, PictureAsPdfOutlined, PrintOutlined, Receipt, ShareOutlined, Add,
} from '../../design-system/icons';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAccess } from '../../core/access/useAccess';
import { useDataSlice } from '../../stores/useDataStore';
import { PrintableInvoice } from '../../features/print/PrintableInvoice';
import { InvoicePDF } from '../../features/pdf/InvoicePDF';
import { withDocumentLanguage } from '../../features/pdf/pdfI18n';
import { downloadPdf, sharePdf } from '../../features/pdf/pdfService';
import { formatCurrencyDisplay, getStatusLabel } from '../../core/utils-formatters';
import { getInvoicePaymentSummary } from '../../core/finance/invoicePayments';
import {
  Amount, Badge, Button, EmptyState, Modal, PageHeader, PageShell, ProgressBar, Section, Skeleton,
} from '../../design-system/primitives';
import type { Client, Payment } from '../../types';
import { useReceipt } from './money/useReceipt';
import { InvoiceDocument } from './invoices/InvoiceDocument';
import { InvoiceActionsSheet } from './invoices/InvoiceActionsSheet';
import { PaymentSheet, type PaymentDraft } from './invoices/PaymentSheet';
import { PaymentsTimeline } from './invoices/PaymentsTimeline';
import { PROGRESS_TONE, STATUS_TONE } from './invoices/invoiceStatus';
import { canDeleteInvoice } from './invoices/invoiceAccess';

/** While this page is open, printing shows only the invoice paper (everything else is hidden). */
const PRINT_ONLY_INVOICE = '@media print { body > *:not(.invoice-print-root) { display: none !important; } }';

function DetailsSkeleton() {
  return (
    <PageShell>
      <div aria-hidden className="space-y-6">
        <div className="space-y-2 pt-2">
          <Skeleton height={30} width="55%" />
          <Skeleton height={16} width="35%" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton height={420} className="order-last rounded-lg lg:order-none" />
          <div className="space-y-6">
            <Skeleton height={190} className="rounded-lg" />
            <Skeleton height={96} className="rounded-lg" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export const InvoiceDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const access = useAccess();
  const receipt = useReceipt();
  const canManage = access.can('invoices.manage');
  // Payments are shown, summed and recorded only by people who may read them: without them "what is
  // left" would just be the whole total.
  const hasPayments = access.can('payments.view');
  const canPay = access.can('payments.manage');
  const { invoices, clients, payments, updateInvoice, deleteInvoice, addPayment, isLoading } = useDataSlice('invoices', 'clients', 'payments', 'updateInvoice', 'deleteInvoice', 'addPayment', 'isLoading');

  const [actionsOpen, setActionsOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const invoice = invoices.find((inv) => inv.id === id);

  const client: Client | undefined = useMemo(() => {
    if (!invoice) return undefined;
    const registered = clients.find((c) => c.id === invoice.clientId);
    if (registered) return registered;
    return {
      id: 'temp',
      name: invoice.tempClientName || 'عميل غير معروف',
      type: 'individual',
      phone: invoice.tempClientPhone || '',
      address: invoice.tempClientAddress || '',
      createdAt: '',
      updatedAt: '',
    };
  }, [invoice, clients]);

  const invoicePayments = useMemo(
    () => (invoice ? payments.filter((p) => p.invoiceId === invoice.id) : []),
    [payments, invoice]
  );
  const summary = useMemo(() => (invoice ? getInvoicePaymentSummary(invoice, payments) : null), [invoice, payments]);

  if (!invoice || !client || !summary) {
    if (isLoading && !invoice) return <DetailsSkeleton />;
    return (
      <PageShell width="4xl">
        <EmptyState
          Icon={Receipt}
          title="الفاتورة غير موجودة"
          description="ربما حُذفت أو أن الرابط غير صحيح."
          action={
            <Button variant="secondary" onClick={() => navigate('/invoices')}>
              العودة إلى الفواتير
            </Button>
          }
        />
      </PageShell>
    );
  }

  const cancelled = invoice.status === 'cancelled';
  const canRecordPayment = !cancelled && hasPayments && canPay && summary.remaining > 0;
  const mayDelete = canDeleteInvoice(access.principal, invoicePayments.length);

  const handleRecordPayment = async (draft: PaymentDraft) => {
    if (!user) return;
    const now = new Date().toISOString();
    const created: Payment = {
      id: crypto.randomUUID(),
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      amount: draft.amount,
      paymentMethod: draft.method,
      paymentDate: now,
      notes: draft.notes,
      createdAt: now,
      updatedAt: now,
      createdBy: user.displayName || user.email || 'المستخدم',
    };
    await addPayment(created);
    // Every payment taken in leaves with its receipt: numbered, signed, opened as a PDF.
    void receipt.issue(created, 'download');
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadPdf(withDocumentLanguage(React.createElement(InvoicePDF, { invoice, client }), client), `فاتورة-${invoice.invoiceNumber}`);
      toast.success('تم تحميل PDF بنجاح');
    } catch {
      toast.error('فشل في إنشاء PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSharePdf = async () => {
    setPdfLoading(true);
    try {
      await sharePdf(withDocumentLanguage(React.createElement(InvoicePDF, { invoice, client }), client), `فاتورة-${invoice.invoiceNumber}`, {
        title: `فاتورة #${invoice.invoiceNumber} - ${client.name}`,
        text: `مرفق: فاتورة رقم ${invoice.invoiceNumber} - ${client.name}`,
      });
    } catch {
      toast.error('فشل في مشاركة PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteInvoice(invoice.id);
      setDeleteOpen(false);
      navigate('/invoices');
    } catch {
      toast.error('فشل في حذف الفاتورة');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (status: typeof invoice.status) => {
    setActionsOpen(false);
    await updateInvoice(invoice.id, { status });
  };

  const settled = hasPayments && summary.remaining <= 0 && invoice.total > 0;
  const remainingTone = cancelled ? 'neutral' : settled ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning';

  return (
    <PageShell width="6xl">
      <PageHeader
        title={
          <>
            فاتورة <bdi dir="ltr">{invoice.invoiceNumber}</bdi>
          </>
        }
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Badge tone={STATUS_TONE[invoice.status]} dot>
              {getStatusLabel(invoice.status)}
            </Badge>
            <span>{client.name}</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        <div className="min-w-0">
          <InvoiceDocument invoice={invoice} client={client} />
        </div>

        <aside className="order-first space-y-6 lg:order-none">
          <section className="rounded-lg border border-border bg-surface-panel p-5">
            {cancelled ? (
              <p className="text-base font-semibold text-fg">هذه الفاتورة ملغاة</p>
            ) : hasPayments ? (
              <>
                <p className="text-sm text-fg-subtle">{settled ? 'الفاتورة مسددة بالكامل' : 'المتبقي للتحصيل'}</p>
                <p className="mt-1 text-4xl font-bold leading-tight">
                  <Amount amount={summary.remaining} tone={remainingTone} />
                </p>
                <ProgressBar
                  className="mt-4"
                  size="md"
                  value={summary.progressPct}
                  tone={PROGRESS_TONE[invoice.status]}
                  label={`المحصّل ${summary.progressPct}%`}
                />
                <p className="mt-2 flex items-center justify-between gap-3 text-xs text-fg-muted">
                  <span>
                    محصّل <bdi dir="ltr">{formatCurrencyDisplay(summary.paid)}</bdi> من{' '}
                    <bdi dir="ltr">{formatCurrencyDisplay(invoice.total)}</bdi>
                  </span>
                  <bdi dir="ltr">{summary.progressPct}%</bdi>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-fg-subtle">إجمالي الفاتورة</p>
                <p className="mt-1 text-4xl font-bold leading-tight">
                  <Amount amount={invoice.total} />
                </p>
              </>
            )}
            {canRecordPayment && (
              <Button block className="mt-4" leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={() => setPayOpen(true)}>
                تسجيل دفعة
              </Button>
            )}
          </section>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              loading={pdfLoading}
              leftIcon={<PictureAsPdfOutlined sx={{ fontSize: 20 }} />}
              onClick={handleDownloadPdf}
            >
              PDF
            </Button>
            <Button
              variant="outline"
              disabled={pdfLoading}
              leftIcon={<ShareOutlined sx={{ fontSize: 20 }} />}
              onClick={handleSharePdf}
            >
              مشاركة
            </Button>
            <Button
              variant="outline"
              leftIcon={<PrintOutlined sx={{ fontSize: 20 }} />}
              onClick={() => window.print()}
            >
              طباعة
            </Button>
            {(canManage || mayDelete) && (
              <Button
                variant="outline"
                leftIcon={<MoreHoriz sx={{ fontSize: 20 }} />}
                onClick={() => setActionsOpen(true)}
              >
                المزيد
              </Button>
            )}
          </div>

          {hasPayments && (
            <Section title="الدفعات">
              <PaymentsTimeline payments={invoicePayments} invoiceTotal={invoice.total} />
            </Section>
          )}
        </aside>
      </div>

      {canRecordPayment && (
        <PaymentSheet
          open={payOpen}
          onClose={() => setPayOpen(false)}
          invoiceNumber={invoice.invoiceNumber}
          remaining={summary.remaining}
          onSubmit={handleRecordPayment}
        />
      )}

      <InvoiceActionsSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        status={invoice.status}
        canManage={canManage}
        onStatus={handleStatusChange}
        onEdit={() => navigate(`/invoices/new?edit=${invoice.id}`)}
        canDelete={mayDelete}
        onDelete={() => {
          setActionsOpen(false);
          setDeleteOpen(true);
        }}
      />

      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        maxWidth="sm"
        title={`حذف الفاتورة ${invoice.invoiceNumber}؟`}
        description={
          invoicePayments.length > 0
            ? `ستُحذف الفاتورة مع ${invoicePayments.length} دفعة مسجلة عليها. لا يمكن التراجع.`
            : 'ستُحذف الفاتورة نهائياً. لا يمكن التراجع.'
        }
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            حذف نهائياً
          </Button>
        </div>
      </Modal>

      {/* Print layout: the printable paper, shown only when printing. */}
      <style>{PRINT_ONLY_INVOICE}</style>
      {createPortal(
        <div className="invoice-print-root hidden print:block">
          <PrintableInvoice invoice={invoice} client={client} />
        </div>,
        document.body
      )}
    </PageShell>
  );
};
