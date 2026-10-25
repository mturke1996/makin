import { useForm, Controller, useWatch } from 'react-hook-form';
import dayjs from 'dayjs';
import { Input } from '../../../design-system/primitives';
import type { SiteReport } from '../../../types';
import { FormSheetShell, FormSection, FormField, FormTextArea, FormDateInput } from './FormSheetKit';

interface SiteReportFormSheetProps {
  edit?: SiteReport | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function SiteReportFormSheet({ edit, onClose, onSubmit }: SiteReportFormSheetProps) {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      title: edit?.title ?? `تقرير ${dayjs().format('YYYY-MM-DD')}`,
      reportDate: edit?.reportDate ? dayjs(edit.reportDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      weather: edit?.weather ?? '',
      workersOnSite: edit?.workersOnSite ?? ('' as any),
      progressPercent: edit?.progressPercent ?? ('' as any),
      workCompleted: edit?.workCompleted ?? '',
      issues: edit?.issues ?? '',
      nextSteps: edit?.nextSteps ?? '',
      notes: edit?.notes ?? '',
    },
  });
  const progressPercent = useWatch({ control, name: 'progressPercent' });

  return (
    <FormSheetShell
      tone="brand"
      title={edit ? 'تعديل تقرير الموقع' : 'تقرير موقع جديد'}
      subtitle="يوميات الإنجاز والمشاكل"
      amount={progressPercent}
      amountLabel="نسبة الإنجاز"
      amountFormat="percent"
      amountUnit=""
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={edit ? 'حفظ التعديلات' : 'تسجيل التقرير'}
    >
      <FormSection title="معلومات التقرير">
        <Controller name="title" control={control} render={({ field }) => <Input {...field} label="عنوان التقرير" />} />
        <Controller
          name="reportDate"
          control={control}
          render={({ field }) => (
            <FormField label="تاريخ التقرير">
              <FormDateInput {...field} />
            </FormField>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="workersOnSite"
            control={control}
            render={({ field }) => <Input {...field} label="عدد العمال" type="number" inputMode="numeric" dir="ltr" className="text-end" />}
          />
          <Controller
            name="progressPercent"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="نسبة الإنجاز %"
                type="number"
                inputMode="numeric"
                dir="ltr"
                placeholder="0 إلى 100"
                className="text-end"
              />
            )}
          />
        </div>
        <Controller
          name="weather"
          control={control}
          render={({ field }) => <Input {...field} label="الطقس (اختياري)" placeholder="مشمس، غائم…" />}
        />
      </FormSection>

      <FormSection title="تفاصيل اليوم">
        <Controller
          name="workCompleted"
          control={control}
          render={({ field }) => (
            <FormField label="الأعمال المنفذة" required>
              <FormTextArea {...field} rows={3} placeholder="ما تم إنجازه اليوم…" />
            </FormField>
          )}
        />
        <Controller
          name="issues"
          control={control}
          render={({ field }) => (
            <FormField label="المشاكل والتأخيرات (اختياري)">
              <FormTextArea {...field} rows={2} placeholder="أي عوائق أو تأخير…" />
            </FormField>
          )}
        />
        <Controller
          name="nextSteps"
          control={control}
          render={({ field }) => (
            <FormField label="الخطوات القادمة (اختياري)">
              <FormTextArea {...field} rows={2} placeholder="خطة الغد…" />
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
