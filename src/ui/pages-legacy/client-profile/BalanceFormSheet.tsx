import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { UserBalance } from '../../../types';
import { formatCurrencyDisplay, parseDecimalInput } from '../../../core/utils-formatters';
import {
  FormDateInput,
  FormField,
  FormSection,
  FormSheetShell,
  FormTextArea,
  MoneyField,
  UserPicker,
} from './FormSheetKit';
import { HolderStanding } from './custody/HolderStanding';
import { isoDay } from './ledgerUtils';
import { balanceSchema, type BalanceFormValues } from './schemas';
import type { SystemUser, UserBalancesSummary } from './types';

interface BalanceFormSheetProps {
  edit?: UserBalance | null;
  systemUsers: SystemUser[];
  /** Custody per user on this client: shows each employee's current balance and what saving does to it. */
  userBalancesSummary?: UserBalancesSummary;
  /** Employee pre-selected for a new custody (the holder on screen in the custody sheet). */
  defaultUserId?: string;
  onClose: () => void;
  onSubmit: (data: BalanceFormValues) => Promise<unknown>;
  onDelete?: () => void;
}

/** Custody given to one employee on this client. */
export function BalanceFormSheet({
  edit,
  systemUsers,
  userBalancesSummary,
  defaultUserId,
  onClose,
  onSubmit,
  onDelete,
}: BalanceFormSheetProps) {
  const { control, handleSubmit } = useForm<BalanceFormValues>({
    resolver: zodResolver(balanceSchema),
    defaultValues: {
      userId: edit?.userId ?? defaultUserId ?? '',
      amount: edit ? String(edit.amount) : '',
      date: edit?.date ? isoDay(edit.date) : isoDay(),
      notes: edit?.notes ?? '',
    },
  });
  const amount = useWatch({ control, name: 'amount' });
  const userId = useWatch({ control, name: 'userId' });

  const holders = useMemo(() => Object.values(userBalancesSummary ?? {}), [userBalancesSummary]);
  const infoOf = (id: string) => holders.find((h) => h.userId === id);

  const userOptions = systemUsers.map((u) => {
    const id = u.uid || u.id;
    const info = infoOf(id);
    return {
      id,
      name: u.displayName || 'مستخدم',
      sub: !userBalancesSummary
        ? undefined
        : !info
          ? 'لا عهدة على هذا المشروع بعد'
          : !info.exact
            ? `الممنوح ${formatCurrencyDisplay(info.given)}`
            : info.deficit > 0
              ? `عليه عجز ${formatCurrencyDisplay(info.deficit)}`
              : `رصيده ${formatCurrencyDisplay(info.remaining)}`,
    };
  });
  const picked = userOptions.find((o) => o.id === userId);
  const pickedInfo = userId ? infoOf(userId) : undefined;
  // Editing a custody of the same person replaces its amount; a different person is not affected by it.
  const replacing = edit && edit.userId === userId ? edit.amount : 0;
  const number = edit ? holders.flatMap((h) => h.custodies).find((c) => c.id === edit.id)?.number : undefined;

  return (
    <FormSheetShell
      tone="warning"
      title={edit ? (number ? `تعديل العهدة رقم ${number}` : 'تعديل العهدة') : 'إيداع عهدة'}
      subtitle="مبلغ يُسلَّم لموظف ليصرف منه على المشروع"
      amount={amount}
      amountLabel="مبلغ العهدة"
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={edit ? 'حفظ التعديلات' : 'إيداع العهدة'}
      onDelete={edit ? onDelete : undefined}
      deleteLabel="حذف العهدة"
    >
      <FormSection title="المستلم" description="اختر الموظف الذي سيستلم العهدة، وتُخصم مصروفاته على هذا المشروع منها تلقائياً">
        <Controller
          name="userId"
          control={control}
          render={({ field, fieldState }) => (
            <FormField label="الموظف المستلم" error={fieldState.error?.message}>
              <UserPicker users={userOptions} value={field.value} onChange={field.onChange} />
            </FormField>
          )}
        />
        {userBalancesSummary && picked && (
          <HolderStanding name={picked.name} info={pickedInfo} typed={parseDecimalInput(amount)} replacing={replacing} />
        )}
      </FormSection>
      <FormSection title="المبلغ والتاريخ">
        <Controller
          name="amount"
          control={control}
          render={({ field, fieldState }) => (
            <MoneyField
              label="مبلغ العهدة"
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
            <FormField label="تاريخ الإيداع" error={fieldState.error?.message}>
              <FormDateInput {...field} />
            </FormField>
          )}
        />
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <FormField label="ملاحظات (اختياري)">
              <FormTextArea {...field} rows={3} placeholder="غرض العهدة أو أي تفاصيل" />
            </FormField>
          )}
        />
      </FormSection>
    </FormSheetShell>
  );
}
