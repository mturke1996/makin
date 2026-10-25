import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Add, LockOutlined } from '@mui/icons-material';
import { useDataStore } from '../../stores/useDataStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAccess } from '../../core/access/useAccess';
import { Button, EmptyState, Input, PageHeader, PageShell, Section, Select, Textarea } from '../../design-system/primitives';
import type { Invoice } from '../../types';
import { formatDate } from '../../core/utils-formatters';
import { ClientFormSheet } from './clients/ClientFormSheet';
import { InvoiceItemsEditor, draftItemTotal, newDraftItem, type DraftItem, type ItemErrors } from './invoices/InvoiceItemsEditor';
import { InvoiceSaveBar, InvoiceSummaryPanel } from './invoices/InvoiceSummary';
import { computeInvoiceTotals, lineTotal, parseAmount } from './invoices/invoiceMath';

const DATE_FORMAT = 'YYYY-MM-DD';
const toIso = (value: string) => (value ? dayjs(value).toISOString() : new Date().toISOString());

export const NewInvoicePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { clients, addInvoice, updateInvoice, invoices } = useDataStore();
  const { user } = useAuthStore();
  const access = useAccess();
  const canManage = access.can('invoices.manage');
  // The clients list needs `clients.view`; adding a client from here needs `clients.manage`.
  const canPickClient = access.can('clients.view');
  const canAddClient = access.can('clients.manage');

  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [clientSheetOpen, setClientSheetOpen] = useState(false);

  // Form state (kept as typed; nothing is cleared when saving fails)
  const [clientId, setClientId] = useState(searchParams.get('clientId') || (canPickClient ? '' : 'temp'));
  const [tempClientName, setTempClientName] = useState('');
  const [tempClientPhone, setTempClientPhone] = useState('');
  const [tempClientAddress, setTempClientAddress] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(dayjs().format(DATE_FORMAT));
  const [dueDate, setDueDate] = useState(dayjs().add(7, 'day').format(DATE_FORMAT));
  const [items, setItems] = useState<DraftItem[]>(() => [newDraftItem()]);
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');

  // Auto-number new invoices; hydrate the form once when editing.
  useEffect(() => {
    if (editId) {
      if (hasInitialized) return; // never overwrite what the user is typing when invoices reload
      const existing = invoices.find((inv) => inv.id === editId);
      if (existing) {
        setClientId(existing.clientId);
        setTempClientName(existing.tempClientName || '');
        setTempClientPhone(existing.tempClientPhone || '');
        setTempClientAddress(existing.tempClientAddress || '');
        setInvoiceNumber(existing.invoiceNumber);
        setIssueDate(dayjs(existing.issueDate).format(DATE_FORMAT));
        setDueDate(dayjs(existing.dueDate).format(DATE_FORMAT));
        setItems(
          existing.items.length
            ? existing.items.map((it) => ({
                id: it.id,
                description: it.description,
                quantity: String(it.quantity),
                unitPrice: String(it.unitPrice),
              }))
            : [newDraftItem()]
        );
        setTaxRate(String(existing.taxRate ?? 0));
        setNotes(existing.notes || '');
        setHasInitialized(true);
      }
    } else {
      let maxNum = 1000;
      invoices.forEach((inv) => {
        const match = inv.invoiceNumber.match(/\d+$/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      setInvoiceNumber(`INV-${maxNum + 1}`);
    }
  }, [invoices, editId, hasInitialized]);

  const taxRateValue = Math.min(100, Math.max(0, parseAmount(taxRate)));
  const totals = useMemo(
    () => computeInvoiceTotals(items.map(draftItemTotal), taxRateValue),
    [items, taxRateValue]
  );

  // ── Validation (shown only after the first save attempt, then live) ──
  const errors = useMemo(() => {
    const itemErrors: Record<string, ItemErrors> = {};
    for (const item of items) {
      const e: ItemErrors = {};
      if (!item.description.trim()) e.description = 'اكتب وصف البند';
      if (!(parseAmount(item.quantity) > 0)) e.quantity = 'الكمية يجب أن تكون أكبر من صفر';
      if (e.description || e.quantity) itemErrors[item.id] = e;
    }
    return {
      client: !clientId ? 'اختر العميل أو أضف عميلاً مؤقتاً' : undefined,
      tempName: clientId === 'temp' && !tempClientName.trim() ? 'اكتب اسم العميل' : undefined,
      issueDate: !issueDate ? 'حدد تاريخ الإصدار' : undefined,
      dueDate: !dueDate
        ? 'حدد تاريخ الاستحقاق'
        : issueDate && dayjs(dueDate).isBefore(dayjs(issueDate), 'day')
          ? 'الاستحقاق قبل تاريخ الإصدار'
          : undefined,
      tax: parseAmount(taxRate) > 100 ? 'النسبة لا تتجاوز 100%' : undefined,
      items: itemErrors,
      total: totals.total > 0 ? undefined : 'أدخل سعراً لبند واحد على الأقل',
    };
  }, [items, clientId, tempClientName, issueDate, dueDate, taxRate, totals.total]);

  const hasErrors =
    !!(errors.client || errors.tempName || errors.issueDate || errors.dueDate || errors.tax || errors.total) ||
    Object.keys(errors.items).length > 0;
  const show = submitted;

  const handleSubmit = async () => {
    setSubmitted(true);
    if (hasErrors) {
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
        first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        first?.focus({ preventScroll: true });
      });
      return;
    }

    setSaving(true);
    try {
      const builtItems = items.map((item) => {
        const quantity = parseAmount(item.quantity);
        const unitPrice = parseAmount(item.unitPrice);
        return {
          id: item.id,
          description: item.description.trim(),
          quantity,
          unitPrice,
          total: lineTotal(quantity, unitPrice),
        };
      });
      const invoiceData = {
        invoiceNumber,
        clientId,
        ...(clientId === 'temp'
          ? {
              tempClientName: tempClientName.trim(),
              tempClientPhone: tempClientPhone.trim(),
              tempClientAddress: tempClientAddress.trim(),
            }
          : { tempClientName: '', tempClientPhone: '', tempClientAddress: '' }),
        items: builtItems,
        subtotal: totals.subtotal,
        taxRate: taxRateValue,
        taxAmount: totals.taxAmount,
        total: totals.total,
        issueDate: toIso(issueDate),
        dueDate: toIso(dueDate),
        notes,
        updatedAt: new Date().toISOString(),
      };

      if (editId) {
        await updateInvoice(editId, invoiceData);
      } else {
        const invoice: Invoice = {
          id: crypto.randomUUID(),
          ...invoiceData,
          status: 'draft', // new invoices start as drafts
          createdAt: new Date().toISOString(),
          createdBy: user?.displayName || 'غير معروف',
        };
        await addInvoice(invoice);
      }
      navigate('/invoices');
    } catch (error) {
      console.error(error); // the store already toasted; the form keeps everything typed
    } finally {
      setSaving(false);
    }
  };

  const selectedClientName =
    clientId === 'temp' ? tempClientName.trim() : clients.find((c) => c.id === clientId)?.name;
  const saveLabel = editId ? 'حفظ التعديلات' : 'حفظ الفاتورة';
  const sortedClients = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name, 'ar')), [clients]);

  if (!canManage) {
    return (
      <PageShell width="4xl">
        <EmptyState
          Icon={LockOutlined}
          title="لا تملك صلاحية إنشاء الفواتير"
          description="يمكنك الاطلاع على الفواتير فقط. اطلب من مدير النظام إضافة هذه الصلاحية إن كنت تحتاجها."
          action={
            <Button variant="secondary" onClick={() => navigate('/invoices')}>
              العودة إلى الفواتير
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell width="6xl" className="pb-32 lg:pb-12">
      <PageHeader
        title={editId ? 'تعديل الفاتورة' : 'فاتورة جديدة'}
        subtitle={invoiceNumber ? <bdi dir="ltr">{invoiceNumber}</bdi> : undefined}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-8">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="min-w-0 space-y-8"
        >
          <Section
            title="العميل"
            action={
              canAddClient ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11"
                  leftIcon={<Add sx={{ fontSize: 18 }} />}
                  onClick={() => setClientSheetOpen(true)}
                >
                  عميل جديد
                </Button>
              ) : undefined
            }
          >
            <div className="space-y-4">
              <Select
                aria-label="العميل"
                value={clientId}
                error={show ? errors.client : undefined}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="" disabled>
                  اختر العميل
                </option>
                {sortedClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                {/* An invoice of a client this person may not list keeps its client when edited. */}
                {clientId && clientId !== 'temp' && !sortedClients.some((c) => c.id === clientId) && (
                  <option value={clientId}>العميل المسجّل على الفاتورة</option>
                )}
                <option value="temp">عميل مؤقت (لا يُحفظ في القائمة)</option>
              </Select>

              {clientId === 'temp' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      label="اسم العميل"
                      required
                      autoComplete="off"
                      value={tempClientName}
                      error={show ? errors.tempName : undefined}
                      onChange={(e) => setTempClientName(e.target.value)}
                    />
                  </div>
                  <Input
                    label="رقم الهاتف"
                    hint="اختياري"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    className="text-right"
                    autoComplete="off"
                    value={tempClientPhone}
                    onChange={(e) => setTempClientPhone(e.target.value)}
                  />
                  <Input
                    label="العنوان"
                    hint="اختياري"
                    autoComplete="off"
                    value={tempClientAddress}
                    onChange={(e) => setTempClientAddress(e.target.value)}
                  />
                </div>
              )}
            </div>
          </Section>

          <Section title="تفاصيل الفاتورة">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="رقم الفاتورة"
                  hint="يُرقَّم تلقائياً"
                  value={invoiceNumber}
                  readOnly
                  dir="ltr"
                  className="text-right text-fg-subtle"
                />
              </div>
              <Input
                label="تاريخ الإصدار"
                type="date"
                value={issueDate}
                error={show ? errors.issueDate : undefined}
                onChange={(e) => setIssueDate(e.target.value)}
              />
              <Input
                label="تاريخ الاستحقاق"
                type="date"
                value={dueDate}
                error={show ? errors.dueDate : undefined}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </Section>

          <Section title="البنود" description={show && errors.total ? undefined : 'الوصف والكمية وسعر الوحدة لكل بند'}>
            <InvoiceItemsEditor items={items} onChange={setItems} errors={show ? errors.items : {}} />
            {show && errors.total && (
              <p role="alert" className="px-1 text-xs text-danger-ink">
                {errors.total}
              </p>
            )}
          </Section>

          <Section title="الضريبة والملاحظات">
            <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
              <Input
                label="نسبة الضريبة (%)"
                inputMode="decimal"
                autoComplete="off"
                value={taxRate}
                error={show ? errors.tax : undefined}
                onChange={(e) => setTaxRate(e.target.value)}
              />
              <Textarea
                label="ملاحظات وشروط"
                hint="اختياري، تظهر في الفاتورة"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </Section>
        </form>

        <InvoiceSummaryPanel
          {...totals}
          taxRate={taxRateValue}
          clientName={selectedClientName}
          dueDateText={dueDate ? formatDate(dueDate) : undefined}
          saving={saving}
          saveLabel={saveLabel}
          onSave={() => void handleSubmit()}
          onCancel={() => navigate('/invoices')}
        />
      </div>

      <InvoiceSaveBar total={totals.total} saving={saving} saveLabel={saveLabel} onSave={() => void handleSubmit()} />

      {canAddClient && (
        <ClientFormSheet
          open={clientSheetOpen}
          onClose={() => setClientSheetOpen(false)}
          client={null}
          onSaved={(c) => setClientId(c.id)}
        />
      )}
    </PageShell>
  );
};
