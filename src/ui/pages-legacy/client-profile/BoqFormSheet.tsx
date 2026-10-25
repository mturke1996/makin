import { useForm, Controller } from 'react-hook-form';
import { Input } from '../../../design-system/primitives';
import { BOQ_UNITS, type BoqLineItem, type ProjectPhase } from '../../../types';
import { BOQ_UNIT_LABELS } from '../../../features/export/excelExport';
import { computeBoqLineTotal } from '../../../core/finance/projectBudget';
import {
  FormSheetShell,
  FormSection,
  FormField,
  FormSelect,
  FormTextArea,
  MoneyField,
} from './FormSheetKit';

interface BoqFormSheetProps {
  edit?: BoqLineItem | null;
  phases: ProjectPhase[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function BoqFormSheet({ edit, phases, onClose, onSubmit }: BoqFormSheetProps) {
  const { control, handleSubmit, watch } = useForm({
    defaultValues: {
      itemCode: edit?.itemCode ?? '',
      description: edit?.description ?? '',
      unit: edit?.unit ?? 'm2',
      quantity: edit?.quantity ?? ('' as any),
      unitPrice: edit?.unitPrice ?? ('' as any),
      phaseId: edit?.phaseId ?? '',
      notes: edit?.notes ?? '',
    },
  });

  const qty = parseFloat(watch('quantity')) || 0;
  const price = parseFloat(watch('unitPrice')) || 0;
  const previewTotal = computeBoqLineTotal(qty, price);

  return (
    <FormSheetShell
      tone="info"
      title={edit ? 'تعديل البند' : 'إضافة بند BOQ'}
      subtitle="بند في جدول الكميات"
      amount={previewTotal}
      amountLabel="الإجمالي"
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={edit ? 'حفظ التعديلات' : 'إضافة البند'}
    >
      <FormSection title="وصف البند">
        <Controller
          name="description"
          control={control}
          render={({ field }) => <Input {...field} label="وصف البند" placeholder="مثال: صب خرسانة مسلحة للأساسات" />}
        />
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="itemCode"
            control={control}
            render={({ field }) => <Input {...field} label="كود البند (اختياري)" placeholder="01.001" dir="ltr" />}
          />
          <Controller
            name="phaseId"
            control={control}
            render={({ field }) => (
              <FormField label="المرحلة (اختياري)">
                <FormSelect {...field}>
                  <option value="">بدون مرحلة</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            )}
          />
        </div>
      </FormSection>

      <FormSection title="الكمية والسعر">
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="quantity"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="الكمية"
                type="number"
                inputMode="decimal"
                dir="ltr"
                placeholder="0"
                calculator="حاسبة الكمية"
                className="text-end"
              />
            )}
          />
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <FormField label="الوحدة">
                <FormSelect {...field}>
                  {BOQ_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {BOQ_UNIT_LABELS[u] || u}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            )}
          />
        </div>
        <Controller
          name="unitPrice"
          control={control}
          render={({ field }) => (
            <MoneyField
              label="سعر الوحدة"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
            />
          )}
        />
      </FormSection>

      <FormSection title="ملاحظات">
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <FormField label="ملاحظات (اختياري)">
              <FormTextArea {...field} rows={2} />
            </FormField>
          )}
        />
      </FormSection>
    </FormSheetShell>
  );
}
