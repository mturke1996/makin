import { useEffect, useState } from 'react';
import { AttachFile, Delete, LockOutlined } from '../../../design-system/icons';
import {
  Amount,
  Button,
  cn,
  Input,
  Select,
  Sheet,
  Textarea,
} from '../../../design-system/primitives';
import {
  EXPENSE_MEASURE_UNIT_GROUPS,
  expenseCategories,
  expenseHasQuantityLine,
  formatMeasureUnit,
  isPartialDecimalInput,
  multiplyQuantityPrice,
  parseDecimalInput,
} from '../../../core/utils-formatters';
import type { Client, Expense, ProjectPhase } from '../../../types';
import { CustodyOverdraftNotice } from '../client-profile/profileBanners';
import { ProfileCallout } from '../client-profile/profileUi';
import { ExpenseReviewPanel } from './ExpenseReviewPanel';
import { FormBody, FormSection } from './moneyUi';
import { isoDay } from './moneyUtils';

export interface ExpenseFormData {
  description: string;
  amount: number;
  category: string;
  date: string;
  clientId: string;
  /** The project phase this spending belongs to ('' for none): it is what the phase budget is measured against. */
  phaseId: string;
  invoiceNumber: string;
  notes: string;
  /** Present only when a quantity x price line is filled in. */
  quantity?: number;
  unitPrice?: number;
  unit?: string;
  /** Editing an expense that had a quantity line and the user removed it. */
  clearQuantity: boolean;
}

interface Props {
  open: boolean;
  edit: Expense | null;
  clients: Client[];
  /** Every phase this person may read; the field appears only when the chosen project has some. */
  phases?: ProjectPhase[];
  userId?: string;
  fundStats: { remaining: number } | null;
  /**
   * Set when this person may look at the expense but not change it (it is closed in an expense
   * invoice, or it is not theirs). The form then shows the reason and offers no save or delete.
   */
  readOnlyNotice?: string | null;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  /** Omitted when the access policy does not let this person delete the expense. */
  onDelete?: (expense: Expense) => void;
  /** Where the expense stands in review, with the decisions for someone who may take them. */
  review?: { canDecide: boolean; onApprove: () => Promise<void>; onReject: (reason: string) => Promise<void> };
}

type FormState = {
  description: string;
  amount: string;
  category: string;
  date: string;
  clientId: string;
  phaseId: string;
  invoiceNumber: string;
  notes: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  qtyOpen: boolean;
};

const blank = (clientId: string): FormState => ({
  description: '',
  amount: '',
  category: 'materials',
  date: isoDay(),
  clientId,
  phaseId: '',
  invoiceNumber: '',
  notes: '',
  quantity: '',
  unit: '',
  unitPrice: '',
  qtyOpen: false,
});

export function ExpenseFormSheet({ open, edit, clients, phases = [], userId, fundStats, readOnlyNotice, onClose, onSubmit, onDelete, review }: Props) {
  const [form, setForm] = useState<FormState>(() => blank(''));
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  const firstClientId = clients[0]?.id || '';
  useEffect(() => {
    if (!open) return;
    setAttempted(false);
    setSaving(false);
    setForm(
      edit
        ? {
            description: edit.description,
            amount: String(edit.amount),
            category: edit.category,
            date: isoDay(edit.date),
            clientId: edit.clientId,
            phaseId: edit.phaseId || '',
            invoiceNumber: edit.invoiceNumber || '',
            notes: edit.notes || '',
            quantity: edit.quantity != null ? String(edit.quantity) : '',
            unit: edit.unit || '',
            unitPrice: edit.unitPrice != null ? String(edit.unitPrice) : '',
            qtyOpen: expenseHasQuantityLine({ quantity: edit.quantity, unitPrice: edit.unitPrice }),
          }
        : blank(firstClientId)
    );
  }, [open, edit, firstClientId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  /** Quantity x price drives the total whenever both are valid. */
  const setQtyField = (key: 'quantity' | 'unitPrice', value: string) => {
    if (!isPartialDecimalInput(value)) return;
    setForm((f) => {
      const next = { ...f, [key]: value };
      const q = parseDecimalInput(next.quantity);
      const p = parseDecimalInput(next.unitPrice);
      if (q != null && q > 0 && p != null && p >= 0) next.amount = String(multiplyQuantityPrice(q, p));
      return next;
    });
  };

  const clearQuantity = () => setForm((f) => ({ ...f, quantity: '', unit: '', unitPrice: '', qtyOpen: false }));

  const clientPhases = phases.filter((p) => p.clientId === form.clientId).sort((a, b) => a.order - b.order);
  const amount = parseDecimalInput(form.amount) ?? 0;
  const quantity = parseDecimalInput(form.quantity);
  const unitPrice = parseDecimalInput(form.unitPrice);
  const hasQty = expenseHasQuantityLine({ quantity, unitPrice });
  const computed = hasQty ? multiplyQuantityPrice(quantity!, unitPrice!) : 0;

  const errors = {
    description: !form.description.trim() ? 'اكتب وصف المصروف' : undefined,
    amount: !(amount > 0) ? 'أدخل مبلغاً أكبر من صفر' : undefined,
    client: !form.clientId ? 'اختر العميل أو المشروع' : undefined,
  };
  const invalid = !!(errors.description || errors.amount || errors.client);

  const handleSave = async () => {
    setAttempted(true);
    if (readOnlyNotice || invalid) return;
    setSaving(true);
    try {
      await onSubmit({
        description: form.description.trim(),
        amount,
        category: form.category,
        date: form.date || isoDay(),
        clientId: form.clientId,
        phaseId: clientPhases.some((p) => p.id === form.phaseId) ? form.phaseId : '',
        invoiceNumber: form.invoiceNumber.trim(),
        notes: form.notes.trim(),
        ...(hasQty ? { quantity, unitPrice, unit: form.unit.trim() || undefined } : {}),
        clearQuantity: !hasQty && !!edit && expenseHasQuantityLine({ quantity: edit.quantity, unitPrice: edit.unitPrice }),
      });
      onClose();
    } catch {
      /* the store already toasted the error; keep the form so nothing is lost */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={readOnlyNotice ? 'تفاصيل المصروف' : edit ? 'تعديل المصروف' : 'مصروف جديد'}
      subtitle={edit ? undefined : 'سجّل ما صُرف على مشروع'}
      maxWidth="md"
      footer={
        readOnlyNotice ? (
          <Button variant="outline" block onClick={onClose}>
            إغلاق
          </Button>
        ) : (
          // Delete beside save: save takes what is left (a full-width save next to a fixed delete would
          // push past the screen edge on a phone).
          <div className="flex items-center gap-3">
            {edit && onDelete && (
              <Button
                variant="danger-soft"
                className="shrink-0"
                onClick={() => onDelete(edit)}
                disabled={saving}
                leftIcon={<Delete sx={{ fontSize: 20 }} />}
              >
                حذف
              </Button>
            )}
            <Button className="min-w-0 flex-1" loading={saving} onClick={handleSave}>
              {edit ? 'حفظ التعديلات' : 'حفظ المصروف'}
            </Button>
          </div>
        )
      }
    >
      <FormBody>
        {edit && review && <ExpenseReviewPanel expense={edit} {...review} />}
        {readOnlyNotice && (
          <ProfileCallout tone="info" icon={<LockOutlined sx={{ fontSize: 22 }} />} title="للاطلاع فقط">
            {readOnlyNotice}
          </ProfileCallout>
        )}
        <fieldset disabled={!!readOnlyNotice} className="m-0 min-w-0 space-y-7 border-0 p-0">
          <FormSection title="البيانات الأساسية">
            <Input
              label="وصف المصروف"
              placeholder="مثال: شراء مواد بناء"
              autoComplete="off"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              error={attempted ? errors.description : undefined}
            />
            <Input
              label="المبلغ"
              placeholder="0"
              value={form.amount}
              onChange={(e) => isPartialDecimalInput(e.target.value) && set('amount', e.target.value)}
              error={attempted ? errors.amount : undefined}
              fieldSize="lg"
              inputMode="decimal"
              autoComplete="off"
              className="text-xl font-bold"
              rightIcon={<span className="text-sm font-semibold">د.ل</span>}
              calculator={readOnlyNotice ? undefined : 'حاسبة المبلغ'}
              calculatorUnit="د.ل"
            />
            <CustodyOverdraftNotice
              stats={readOnlyNotice ? null : !edit || edit.userId === userId ? fundStats : null}
              amount={form.amount}
              originalAmount={edit?.amount || 0}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="التصنيف" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {Object.entries(expenseCategories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                label="تاريخ المصروف"
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
          </FormSection>

          {(!readOnlyNotice || form.qtyOpen) && (
            <FormSection
              title="الكمية والتسعير"
              hint={readOnlyNotice ? undefined : 'اختياري. أدخل الكمية وسعر الوحدة ويُحسب المبلغ تلقائياً.'}
              action={
                readOnlyNotice ? undefined : form.qtyOpen ? (
                  <Button variant="ghost" size="sm" onClick={clearQuantity}>
                    إزالة
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => set('qtyOpen', true)}>
                    إضافة
                  </Button>
                )
              }
            >
              <div
                className={cn(
                  'grid transition-[grid-template-rows,visibility] duration-base ease-out',
                  form.qtyOpen ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'
                )}
              >
                <div className="-m-1 min-h-0 overflow-hidden p-1">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="الكمية"
                        placeholder="مثال: 2.5"
                        value={form.quantity}
                        onChange={(e) => setQtyField('quantity', e.target.value)}
                        inputMode="decimal"
                        autoComplete="off"
                        calculator={readOnlyNotice ? undefined : 'حاسبة الكمية'}
                        calculatorUnit={form.unit ? formatMeasureUnit(form.unit) : undefined}
                      />
                      <Select
                        label="الوحدة"
                        value={form.unit}
                        onChange={(e) => set('unit', e.target.value)}
                      >
                        <option value="">بدون وحدة</option>
                        {EXPENSE_MEASURE_UNIT_GROUPS.map((group) => (
                          <optgroup key={group.title} label={group.title}>
                            {group.units.map((u) => (
                              <option key={u} value={u}>
                                {formatMeasureUnit(u)}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        {form.unit && !EXPENSE_MEASURE_UNIT_GROUPS.some((g) => g.units.includes(form.unit)) && (
                          <option value={form.unit}>{form.unit}</option>
                        )}
                      </Select>
                    </div>
                    <Input
                      label={form.unit ? 'سعر الوحدة' : 'سعر القطعة'}
                      placeholder="0"
                      value={form.unitPrice}
                      onChange={(e) => setQtyField('unitPrice', e.target.value)}
                      inputMode="decimal"
                      autoComplete="off"
                      rightIcon={<span className="text-sm font-semibold">د.ل</span>}
                      calculator={readOnlyNotice ? undefined : 'حاسبة السعر'}
                      calculatorUnit="د.ل"
                    />
                    <div className="flex min-h-12 items-center justify-between gap-3 rounded-md bg-surface-sunken px-3.5">
                      <span className="text-sm text-fg-subtle">الإجمالي المحسوب</span>
                      {hasQty ? (
                        <Amount amount={computed} tone="danger" className="text-md font-bold" />
                      ) : (
                        <span className="text-sm text-fg-muted">يظهر بعد إدخال الكمية والسعر</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </FormSection>
          )}

          <FormSection title="الربط والمستندات">
            <Select
              label="العميل / المشروع"
              value={form.clientId}
              onChange={(e) => set('clientId', e.target.value)}
              error={attempted ? errors.client : undefined}
            >
              {!form.clientId && <option value="">اختر العميل</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {clientPhases.length > 0 && (
              <Select label="المرحلة" value={form.phaseId} onChange={(e) => set('phaseId', e.target.value)}>
                <option value="">بدون مرحلة</option>
                {clientPhases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
            <Input
              label="رقم الفاتورة"
              autoComplete="off"
              placeholder="الرقم الإشاري للفاتورة (اختياري)"
              value={form.invoiceNumber}
              onChange={(e) => set('invoiceNumber', e.target.value)}
            />
            {edit?.attachmentUrl && (
              <a
                href={edit.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-ink"
              >
                <AttachFile aria-hidden sx={{ fontSize: 18 }} />
                عرض {edit.attachmentName || 'المرفق المحفوظ'}
              </a>
            )}
            <Textarea
              label="ملاحظات"
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </FormSection>

        </fieldset>
      </FormBody>
    </Sheet>
  );
}
