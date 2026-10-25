import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { Input } from '../../../design-system/primitives';
import type { PaymentMilestone } from '../../../types';
import { milestoneTitle } from '../../../core/finance/paymentSchedule';
import {
  FormDateInput,
  FormField,
  FormSection,
  FormSheetShell,
  FormTextArea,
  MoneyField,
} from './FormSheetKit';
import { milestoneSchema, type MilestoneFormValues } from './schemas';

interface MilestoneFormSheetProps {
  edit?: PaymentMilestone | null;
  /** Position of the new instalment in the schedule (the existing count + 1). */
  nextOrder: number;
  /** What is left of the contract after the scheduled instalments, offered as the starting amount. */
  suggestedAmount?: number;
  onClose: () => void;
  onSubmit: (data: MilestoneFormValues) => Promise<unknown>;
  onDelete?: () => void;
}

export function MilestoneFormSheet({ edit, nextOrder, suggestedAmount, onClose, onSubmit, onDelete }: MilestoneFormSheetProps) {
  const { control, handleSubmit } = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      title: edit?.title ?? milestoneTitle(nextOrder - 1),
      amount: edit ? String(edit.amount) : suggestedAmount && suggestedAmount > 0 ? String(suggestedAmount) : '',
      dueDate: edit?.dueDate ? dayjs(edit.dueDate).format('YYYY-MM-DD') : dayjs().add(30, 'day').format('YYYY-MM-DD'),
      order: edit?.order ?? nextOrder,
      notes: edit?.notes ?? '',
    },
  });
  const amount = useWatch({ control, name: 'amount' });

  return (
    <FormSheetShell
      tone="info"
      title={edit ? 'تعديل الدفعة' : 'إضافة دفعة إلى الجدول'}
      subtitle="دفعة متفق عليها مع العميل وموعد استحقاقها"
      amount={amount}
      amountLabel="قيمة الدفعة"
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={edit ? 'حفظ التعديلات' : 'إضافة الدفعة'}
      onDelete={edit ? onDelete : undefined}
      deleteLabel="حذف الدفعة"
    >
      <FormSection title="الدفعة">
        <Controller
          name="title"
          control={control}
          render={({ field, fieldState }) => (
            <Input {...field} label="اسم الدفعة" placeholder="مثال: دفعة مقدمة، عند صب السقف، عند التسليم" error={fieldState.error?.message} />
          )}
        />
        <Controller
          name="amount"
          control={control}
          render={({ field, fieldState }) => (
            <MoneyField
              label="القيمة المطلوبة"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              error={fieldState.error?.message}
            />
          )}
        />
      </FormSection>

      <FormSection title="الموعد والترتيب" description="تُسدَّد الدفعات بترتيبها: ما يحصّله المشروع يغطي الأولى أولاً.">
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="dueDate"
            control={control}
            render={({ field, fieldState }) => (
              <FormField label="موعد الاستحقاق" error={fieldState.error?.message}>
                <FormDateInput {...field} />
              </FormField>
            )}
          />
          <Controller
            name="order"
            control={control}
            render={({ field }) => <Input {...field} label="الترتيب" type="number" inputMode="numeric" />}
          />
        </div>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <FormField label="ملاحظات (اختياري)">
              <FormTextArea {...field} rows={2} placeholder="شرط الاستحقاق، مثل: بعد اعتماد المخطط" />
            </FormField>
          )}
        />
      </FormSection>
    </FormSheetShell>
  );
}
