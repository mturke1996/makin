import { useForm, Controller, useWatch } from 'react-hook-form';
import dayjs from 'dayjs';
import { Input } from '../../../design-system/primitives';
import { PROJECT_PHASE_STATUSES, type ProjectPhase } from '../../../types';
import { PHASE_STATUS_LABELS } from '../../../features/export/excelExport';
import {
  FormSheetShell,
  FormSection,
  FormField,
  FormSelect,
  FormTextArea,
  FormDateInput,
  MoneyField,
} from './FormSheetKit';

interface PhaseFormSheetProps {
  edit?: ProjectPhase | null;
  nextOrder: number;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function PhaseFormSheet({ edit, nextOrder, onClose, onSubmit }: PhaseFormSheetProps) {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      name: edit?.name ?? '',
      order: edit?.order ?? nextOrder,
      status: edit?.status ?? 'planned',
      budgetAmount: edit?.budgetAmount ?? ('' as any),
      startDate: edit?.startDate ? dayjs(edit.startDate).format('YYYY-MM-DD') : '',
      endDate: edit?.endDate ? dayjs(edit.endDate).format('YYYY-MM-DD') : '',
      notes: edit?.notes ?? '',
    },
  });
  const budgetAmount = useWatch({ control, name: 'budgetAmount' });

  return (
    <FormSheetShell
      tone="brand"
      title={edit ? 'تعديل المرحلة' : 'إضافة مرحلة'}
      subtitle="مرحلة من مراحل المشروع والميزانية المخصصة"
      amount={budgetAmount}
      amountLabel="الميزانية"
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={edit ? 'حفظ التعديلات' : 'إضافة المرحلة'}
    >
      <FormSection title="تعريف المرحلة">
        <Controller
          name="name"
          control={control}
          render={({ field }) => <Input {...field} label="اسم المرحلة" placeholder="مثال: الأساسات، التشطيب" />}
        />
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="order"
            control={control}
            render={({ field }) => <Input {...field} label="الترتيب" type="number" inputMode="numeric" />}
          />
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <FormField label="الحالة">
                <FormSelect {...field}>
                  {PROJECT_PHASE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PHASE_STATUS_LABELS[s] || s}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            )}
          />
        </div>
      </FormSection>

      <FormSection title="الميزانية والجدول">
        <Controller
          name="budgetAmount"
          control={control}
          render={({ field }) => (
            <MoneyField
              label="الميزانية"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
            />
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <FormField label="تاريخ البداية">
                <FormDateInput {...field} />
              </FormField>
            )}
          />
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <FormField label="تاريخ النهاية">
                <FormDateInput {...field} />
              </FormField>
            )}
          />
        </div>
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
