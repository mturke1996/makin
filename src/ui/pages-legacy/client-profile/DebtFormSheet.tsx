import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Person } from '../../../design-system/icons';
import { Input } from '../../../design-system/primitives';
import type { StandaloneDebt } from '../../../types';
import { FormDateInput, FormField, FormSection, FormSheetShell, FormTextArea, MoneyField } from './FormSheetKit';
import { isoDay } from './ledgerUtils';
import { debtSchema, type DebtFormValues } from './schemas';

interface DebtFormSheetProps {
  edit?: StandaloneDebt | null;
  onClose: () => void;
  onSubmit: (data: DebtFormValues) => Promise<unknown>;
  onDelete?: () => void;
}

export function DebtFormSheet({ edit, onClose, onSubmit, onDelete }: DebtFormSheetProps) {
  const { control, handleSubmit } = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      partyName: edit?.partyName ?? '',
      description: edit?.description ?? '',
      amount: edit ? String(edit.amount) : '',
      date: edit?.date ? isoDay(edit.date) : isoDay(),
      notes: edit?.notes ?? '',
    },
  });
  const amount = useWatch({ control, name: 'amount' });

  return (
    <FormSheetShell
      tone="warning"
      title={edit ? 'تعديل دين' : 'إضافة دين'}
      subtitle="دين أو التزام مالي على المشروع"
      amount={amount}
      amountLabel="قيمة الدين"
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={edit ? 'حفظ التعديلات' : 'تسجيل الدين'}
      onDelete={edit ? onDelete : undefined}
      deleteLabel="حذف الدين"
    >
      <FormSection title="الطرف والوصف">
        <Controller
          name="partyName"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="اسم الطرف"
              placeholder="الشخص أو الجهة"
              autoComplete="off"
              leftIcon={<Person sx={{ fontSize: 20 }} aria-hidden />}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Input {...field} label="وصف الدين (اختياري)" placeholder="سبب الدين أو تفاصيله" autoComplete="off" />
          )}
        />
      </FormSection>
      <FormSection title="المبلغ والتاريخ">
        <Controller
          name="amount"
          control={control}
          render={({ field, fieldState }) => (
            <MoneyField
              label="المبلغ"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="date"
          control={control}
          render={({ field, fieldState }) => (
            <FormField label="تاريخ الدين" error={fieldState.error?.message}>
              <FormDateInput {...field} />
            </FormField>
          )}
        />
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
