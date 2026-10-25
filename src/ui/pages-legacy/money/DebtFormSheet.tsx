import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Input, Segmented, Select, Sheet, Textarea } from '../../../design-system/primitives';
import { formatCurrencyDisplay, isPartialDecimalInput, parseDecimalInput } from '../../../core/utils-formatters';
import type { Client, DebtParty, StandaloneDebt } from '../../../types';
import { FormBody, FormFooter, FormSection } from './moneyUi';
import { isoDay, toMilli } from './moneyUtils';

export interface DebtFormData {
  partyType: 'client' | 'external';
  clientId: string;
  partyName: string;
  description: string;
  amount: number;
  date: string;
  dueDate: string;
  notes: string;
}

interface Props {
  open: boolean;
  edit: StandaloneDebt | null;
  clients: Client[];
  parties: DebtParty[];
  onClose: () => void;
  /**
   * Whether the clients list is available (it needs `clients.view`). Without it a debt can only be
   * recorded against an external party; an existing client debt keeps the client it already has.
   */
  canPickClient?: boolean;
  onSubmit: (data: DebtFormData) => Promise<void>;
  /** Omitted when this user may not delete debts. */
  onDelete?: (debt: StandaloneDebt) => void;
}

type FormState = {
  partyType: 'client' | 'external';
  clientId: string;
  partyName: string;
  description: string;
  amount: string;
  date: string;
  dueDate: string;
  notes: string;
};

const blank = (): FormState => ({
  partyType: 'client',
  clientId: '',
  partyName: '',
  description: '',
  amount: '',
  date: isoDay(),
  dueDate: dayjs().add(1, 'month').locale('en').format('YYYY-MM-DD'),
  notes: '',
});

export function DebtFormSheet({ open, edit, clients, parties, canPickClient = true, onClose, onSubmit, onDelete }: Props) {
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
            partyType: edit.partyType,
            clientId: edit.clientId || '',
            partyName: edit.partyName,
            description: edit.description || '',
            amount: String(edit.amount),
            date: isoDay(edit.date),
            dueDate: edit.dueDate ? isoDay(edit.dueDate) : '',
            notes: edit.notes || '',
          }
        : { ...blank(), partyType: canPickClient ? 'client' : 'external' }
    );
  }, [open, edit, canPickClient]);

  const amount = parseDecimalInput(form.amount) ?? 0;
  const paid = edit?.paidAmount || 0;
  const errors = {
    party:
      form.partyType === 'client'
        ? !form.clientId
          ? 'اختر العميل'
          : undefined
        : !form.partyName.trim()
          ? 'أدخل اسم الطرف'
          : undefined,
    amount: !(amount > 0) ? 'أدخل مبلغاً أكبر من صفر' : undefined,
  };
  const invalid = !!(errors.party || errors.amount);

  const handleSave = async () => {
    setAttempted(true);
    if (invalid) return;
    setSaving(true);
    try {
      await onSubmit({
        partyType: form.partyType,
        clientId: form.clientId,
        partyName: form.partyName.trim(),
        description: form.description.trim(),
        amount,
        date: form.date || isoDay(),
        dueDate: form.dueDate,
        notes: form.notes.trim(),
      });
      onClose();
    } catch {
      /* toasted by the store; the form keeps its values */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={edit ? 'تعديل الدين' : 'دين جديد'}
      subtitle={edit ? edit.partyName : 'سجّل دَيناً على عميل أو طرف خارجي'}
      maxWidth="sm"
      footer={
        <FormFooter
          saveLabel={edit ? 'حفظ التعديلات' : 'حفظ الدين'}
          saving={saving}
          onSave={handleSave}
          onDelete={edit && onDelete ? () => onDelete(edit) : undefined}
        />
      }
    >
      <FormBody>
        <FormSection title="الطرف">
          {canPickClient && (
            <Segmented
              aria-label="نوع الطرف"
              options={[
                { value: 'client', label: 'عميل' },
                { value: 'external', label: 'طرف خارجي' },
              ]}
              value={form.partyType}
              onChange={(partyType) => setForm((f) => ({ ...f, partyType }))}
            />
          )}
          {form.partyType === 'client' && !canPickClient ? (
            <Input label="العميل" value={form.partyName} readOnly hint="لا تملك صلاحية عرض العملاء، لذلك لا يمكن تغيير العميل" />
          ) : form.partyType === 'client' ? (
            <Select
              label="العميل"
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              error={attempted ? errors.party : undefined}
            >
              <option value="">اختر العميل</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : (
            <>
              <Input
                label="اسم الطرف"
                list="debt-party-names"
                autoComplete="off"
                placeholder="اسم الشخص أو الشركة"
                value={form.partyName}
                onChange={(e) => setForm((f) => ({ ...f, partyName: e.target.value }))}
                error={attempted ? errors.party : undefined}
              />
              <datalist id="debt-party-names">
                {parties.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </>
          )}
        </FormSection>

        <FormSection title="الدين">
          <Input
            label="الوصف"
            placeholder="مثال: توريد مواد"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="قيمة الدين"
            placeholder="0"
            value={form.amount}
            onChange={(e) => isPartialDecimalInput(e.target.value) && setForm((f) => ({ ...f, amount: e.target.value }))}
            error={attempted ? errors.amount : undefined}
            hint={
              edit && paid > 0
                ? toMilli(amount) < toMilli(paid)
                  ? `المسدد حتى الآن ${formatCurrencyDisplay(paid)}. سيُخفَّض المسدد إلى قيمة الدين الجديدة.`
                  : `المسدد حتى الآن ${formatCurrencyDisplay(paid)}`
                : undefined
            }
            fieldSize="lg"
            inputMode="decimal"
            autoComplete="off"
            className="text-xl font-bold"
            rightIcon={<span className="text-sm font-semibold">د.ل</span>}
            calculator="حاسبة المبلغ"
            calculatorUnit="د.ل"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="تاريخ الدين"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <Input
              label="تاريخ الاستحقاق"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
          <Textarea
            label="ملاحظات"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </FormSection>
      </FormBody>
    </Sheet>
  );
}
