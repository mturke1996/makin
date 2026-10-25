import { useEffect, useMemo, useState } from 'react';
import { AccountBalance, EditNote, PhoneAndroid, Payments as PaymentsIcon } from '../../../design-system/icons';
import { Input, Select, Sheet, Textarea } from '../../../design-system/primitives';
import { getInvoicePaymentSummary } from '../../../core/finance/invoicePayments';
import { formatCurrencyDisplay, isPartialDecimalInput, parseDecimalInput } from '../../../core/utils-formatters';
import type { Client, Invoice, Payment } from '../../../types';
import { ChoiceGrid, FormBody, FormFooter, FormSection } from './moneyUi';
import { isoDay, toMilli } from './moneyUtils';

export type PaymentMethod = Payment['paymentMethod'];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'نقدي',
  check: 'شيك',
  bank_transfer: 'تحويل بنكي',
  credit_card: 'بطاقة',
  mobile_payment: 'إلكتروني',
};

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: JSX.Element }[] = [
  { value: 'cash', label: PAYMENT_METHOD_LABEL.cash, icon: <PaymentsIcon sx={{ fontSize: 20 }} /> },
  { value: 'check', label: PAYMENT_METHOD_LABEL.check, icon: <EditNote sx={{ fontSize: 20 }} /> },
  { value: 'bank_transfer', label: PAYMENT_METHOD_LABEL.bank_transfer, icon: <AccountBalance sx={{ fontSize: 20 }} /> },
  { value: 'mobile_payment', label: PAYMENT_METHOD_LABEL.mobile_payment, icon: <PhoneAndroid sx={{ fontSize: 20 }} /> },
];

export interface PaymentFormData {
  clientId: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes: string;
}

interface Props {
  open: boolean;
  edit: Payment | null;
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  /** Omitted when this user may not delete payments. */
  onDelete?: (payment: Payment) => void;
}

type FormState = {
  clientId: string;
  invoiceId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes: string;
};

const blank = (): FormState => ({
  clientId: '',
  invoiceId: '',
  amount: '',
  paymentMethod: 'cash',
  paymentDate: isoDay(),
  notes: '',
});

export function PaymentFormSheet({ open, edit, clients, invoices, payments, onClose, onSubmit, onDelete }: Props) {
  const [form, setForm] = useState<FormState>(blank);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAttempted(false);
    setSaving(false);
    setForm(
      edit
        ? {
            clientId: edit.clientId || '',
            invoiceId: edit.invoiceId || '',
            amount: String(edit.amount),
            paymentMethod: edit.paymentMethod,
            paymentDate: isoDay(edit.paymentDate),
            notes: edit.notes || '',
          }
        : blank()
    );
  }, [open, edit]);

  /** Remaining on an invoice, not counting the payment being edited. */
  const remainingFor = (inv: Invoice) => {
    let paid = getInvoicePaymentSummary(inv, payments).paid;
    if (edit && edit.invoiceId === inv.id) paid -= edit.amount;
    return Math.max(0, (toMilli(inv.total) - toMilli(paid)) / 1000);
  };

  const clientInvoices = useMemo(
    () =>
      invoices
        .filter((i) => i.clientId === form.clientId && (i.status !== 'cancelled' || i.id === form.invoiceId))
        .sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()),
    [invoices, form.clientId, form.invoiceId]
  );

  const setClient = (clientId: string) => {
    const keep = edit && edit.clientId === clientId ? edit.invoiceId || '' : '';
    const next = keep || invoices
      .filter((i) => i.clientId === clientId && i.status !== 'cancelled' && i.status !== 'draft' && remainingFor(i) > 0)
      .sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime())[0]?.id || '';
    setForm((f) => ({ ...f, clientId, invoiceId: next }));
  };

  const amount = parseDecimalInput(form.amount) ?? 0;
  const selectedInvoice = clientInvoices.find((i) => i.id === form.invoiceId);
  const remaining = selectedInvoice ? remainingFor(selectedInvoice) : null;
  const over = remaining != null && amount > 0 && toMilli(amount) > toMilli(remaining);

  const needsClient = !edit || !!edit.clientId;
  const errors = {
    client: needsClient && !form.clientId ? 'اختر العميل' : undefined,
    amount: !(amount > 0) ? 'أدخل مبلغاً أكبر من صفر' : undefined,
  };
  const invalid = !!(errors.client || errors.amount);

  const handleSave = async () => {
    setAttempted(true);
    if (invalid) return;
    setSaving(true);
    try {
      await onSubmit({
        clientId: form.clientId,
        invoiceId: form.invoiceId,
        amount,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate || isoDay(),
        notes: form.notes.trim(),
      });
      onClose();
    } catch {
      /* the store already toasted the error; keep the form so nothing is lost */
    } finally {
      setSaving(false);
    }
  };

  const methodOptions =
    edit && !METHOD_OPTIONS.some((m) => m.value === edit.paymentMethod)
      ? [...METHOD_OPTIONS, { value: edit.paymentMethod, label: PAYMENT_METHOD_LABEL[edit.paymentMethod] || edit.paymentMethod, icon: <PaymentsIcon sx={{ fontSize: 20 }} /> }]
      : METHOD_OPTIONS;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={edit ? 'تعديل الدفعة' : 'دفعة جديدة'}
      subtitle={edit ? undefined : 'سجّل ما استلمته من العميل'}
      maxWidth="sm"
      footer={
        <FormFooter
          saveLabel={edit ? 'حفظ التعديلات' : 'حفظ الدفعة'}
          saving={saving}
          onSave={handleSave}
          onDelete={edit && onDelete ? () => onDelete(edit) : undefined}
          deleteLabel="حذف"
        />
      }
    >
      <FormBody>
        <FormSection title="المبلغ">
          <Input
            label="مبلغ الدفعة"
            placeholder="0"
            value={form.amount}
            onChange={(e) => isPartialDecimalInput(e.target.value) && setForm((f) => ({ ...f, amount: e.target.value }))}
            error={attempted ? errors.amount : undefined}
            fieldSize="lg"
            inputMode="decimal"
            autoComplete="off"
            className="text-xl font-bold"
            rightIcon={<span className="text-sm font-semibold">د.ل</span>}
            calculator="حاسبة المبلغ"
            calculatorUnit="د.ل"
          />
          <div>
            <span className="mb-1.5 block text-sm font-medium text-fg-subtle">طريقة الدفع</span>
            <ChoiceGrid
              label="طريقة الدفع"
              options={methodOptions}
              value={form.paymentMethod}
              onChange={(paymentMethod) => setForm((f) => ({ ...f, paymentMethod }))}
            />
          </div>
          <Input
            label="تاريخ الدفعة"
            type="date"
            value={form.paymentDate}
            onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
          />
        </FormSection>

        <FormSection title="العميل والفاتورة">
          <Select
            label="العميل"
            value={form.clientId}
            onChange={(e) => setClient(e.target.value)}
            error={attempted ? errors.client : undefined}
          >
            <option value="">اختر العميل</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="الفاتورة"
            value={form.invoiceId}
            onChange={(e) => setForm((f) => ({ ...f, invoiceId: e.target.value }))}
            disabled={!form.clientId}
            hint={
              !form.clientId
                ? 'اختر العميل أولاً لعرض فواتيره'
                : over
                  ? undefined
                  : remaining != null && amount > 0
                    ? `المتبقي على الفاتورة بعد هذه الدفعة: ${formatCurrencyDisplay((toMilli(remaining) - toMilli(amount)) / 1000)}`
                    : 'تُحتسب الدفعة على الفاتورة المختارة'
            }
          >
            <option value="">بدون فاتورة</option>
            {clientInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {`#${inv.invoiceNumber} · المتبقي ${formatCurrencyDisplay(remainingFor(inv))}`}
              </option>
            ))}
          </Select>
          {over && remaining != null && (
            <p role="status" className="rounded-md bg-warning-soft px-3.5 py-2.5 text-sm text-warning-ink">
              المبلغ أكبر من المتبقي على الفاتورة ({formatCurrencyDisplay(remaining)}). تأكد من المبلغ قبل الحفظ.
            </p>
          )}
          <Textarea
            label="ملاحظات"
            rows={2}
            placeholder="مثال: شيك رقم 4471"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </FormSection>
      </FormBody>
    </Sheet>
  );
}
