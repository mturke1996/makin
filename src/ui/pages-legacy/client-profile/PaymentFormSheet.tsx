import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Payment } from '../../../types';
import {
  FormDateInput,
  FormField,
  FormSection,
  FormSheetShell,
  FormTextArea,
  MoneyField,
  PaymentMethodPicker,
} from './FormSheetKit';
import { isoDay } from './ledgerUtils';
import { paymentSchema, type PaymentFormValues } from './schemas';

interface PaymentFormSheetProps {
  edit?: Payment | null;
  onClose: () => void;
  onSubmit: (data: PaymentFormValues) => Promise<unknown>;
  onDelete?: () => void;
  /** The receipt of the payment being edited (a saved payment only). */
  receiptPanel?: ReactNode;
}

export function PaymentFormSheet({ edit, onClose, onSubmit, onDelete, receiptPanel }: PaymentFormSheetProps) {
  const { control, handleSubmit } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: edit ? String(edit.amount) : '',
      paymentMethod: edit?.paymentMethod ?? 'cash',
      paymentDate: edit?.paymentDate ? isoDay(edit.paymentDate) : isoDay(),
      notes: edit?.notes ?? '',
    },
  });
  const amount = useWatch({ control, name: 'amount' });

  return (
    <FormSheetShell
      tone="success"
      title={edit ? 'تعديل دفعة' : 'إضافة دفعة'}
      subtitle="تسجيل دفعة مالية من العميل"
      amount={amount}
      amountLabel="مبلغ الدفعة"
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={edit ? 'حفظ التعديلات' : 'تسجيل الدفعة'}
      onDelete={edit ? onDelete : undefined}
      deleteLabel="حذف الدفعة"
    >
      {edit && receiptPanel}
      <FormSection title="المبلغ" description="قيمة الدفعة بالدينار">
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
      </FormSection>
      <FormSection title="تفاصيل الدفعة">
        <Controller
          name="paymentMethod"
          control={control}
          render={({ field }) => (
            <FormField label="طريقة الدفع">
              <PaymentMethodPicker value={field.value} onChange={field.onChange} />
            </FormField>
          )}
        />
        <Controller
          name="paymentDate"
          control={control}
          render={({ field, fieldState }) => (
            <FormField label="تاريخ الدفعة" error={fieldState.error?.message}>
              <FormDateInput {...field} />
            </FormField>
          )}
        />
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <FormField label="ملاحظات (اختياري)">
              <FormTextArea {...field} rows={2} placeholder="رقم الشيك أو أي تفاصيل أخرى" />
            </FormField>
          )}
        />
      </FormSection>
    </FormSheetShell>
  );
}
