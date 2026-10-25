import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone } from '@mui/icons-material';
import { Input, Segmented } from '../../../design-system/primitives';
import type { Client } from '../../../types';
import { ClientProjectFields } from './details/ClientProjectFields';
import { projectFieldsOf } from './details/clientFields';
import { focusFirstInvalid } from './details/focusInvalid';
import { FormField, FormSection, FormSheetShell, FormTextArea } from './FormSheetKit';
import { clientSchema, type ClientFormValues } from './schemas';

interface EditClientFormSheetProps {
  client: Client;
  onClose: () => void;
  onSubmit: (data: ClientFormValues) => Promise<unknown>;
  /** Omitted when this person may not delete clients (`clients.delete`). */
  onDelete?: () => void;
}

export function EditClientFormSheet({ client, onClose, onSubmit, onDelete }: EditClientFormSheetProps) {
  const { control, handleSubmit } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client.name,
      email: client.email || '',
      phone: client.phone,
      address: client.address,
      type: client.type,
      ...projectFieldsOf(client),
    },
  });

  return (
    <FormSheetShell
      tone="brand"
      title="تعديل العميل"
      subtitle={client.name}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit, focusFirstInvalid)}
      submitLabel="حفظ التعديلات"
      onDelete={onDelete}
      deleteLabel="حذف العميل"
    >
      <FormSection title="البيانات الأساسية">
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-fg-subtle">نوع العميل</span>
              <Segmented
                aria-label="نوع العميل"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'individual', label: 'فرد' },
                  { value: 'company', label: 'شركة' },
                ]}
              />
            </div>
          )}
        />
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="اسم العميل"
              placeholder="الاسم الكامل"
              autoComplete="off"
              error={fieldState.error?.message}
            />
          )}
        />
      </FormSection>
      <FormSection title="معلومات التواصل">
        <Controller
          name="phone"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="رقم الهاتف"
              type="tel"
              inputMode="tel"
              dir="ltr"
              className="text-end"
              placeholder="091xxxxxxx"
              autoComplete="off"
              leftIcon={<Phone sx={{ fontSize: 20 }} aria-hidden />}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="البريد الإلكتروني (اختياري)"
              type="email"
              dir="ltr"
              className="text-end"
              autoComplete="off"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="address"
          control={control}
          render={({ field, fieldState }) => (
            <FormField label="العنوان" error={fieldState.error?.message}>
              <FormTextArea {...field} rows={2} placeholder="المدينة والحي والشارع" />
            </FormField>
          )}
        />
      </FormSection>
      <FormSection title="المشروع" description="الحالة وقيمة العقد والمواعيد والملاحظات">
        <ClientProjectFields control={control} />
      </FormSection>
    </FormSheetShell>
  );
}
