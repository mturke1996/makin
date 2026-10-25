import { useState } from 'react';
import { Controller, useFormState, type Control } from 'react-hook-form';
import { ExpandMore } from '../../../../design-system/icons';
import { Input, Segmented, Textarea } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import { CLIENT_STATUS_LABEL } from '../../../../core/finance/clientProject';
import { MoneyField } from '../FormSheetKit';
import { CLIENT_NOTES_MAX, type ClientFormValues } from '../schemas';

const FIELD_NAMES = ['status', 'contractValue', 'startDate', 'expectedEndDate', 'notes', 'documentLanguage'] as const;

/** The count appears once the note is getting close to its limit. */
const NOTES_COUNTER_FROM = Math.floor(CLIENT_NOTES_MAX * 0.8);

interface ClientProjectFieldsProps {
  control: Control<ClientFormValues>;
  /** Wrap the fields in a disclosure (the quick add form keeps them out of the way). */
  collapsible?: boolean;
  /** Start opened. Only for `collapsible`. */
  defaultOpen?: boolean;
  className?: string;
}

function Fields({ control }: { control: Control<ClientFormValues> }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-fg-subtle">حالة المشروع</span>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Segmented
              aria-label="حالة المشروع"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'active', label: CLIENT_STATUS_LABEL.active },
                { value: 'paused', label: CLIENT_STATUS_LABEL.paused },
                { value: 'completed', label: CLIENT_STATUS_LABEL.completed },
              ]}
            />
          )}
        />
      </div>

      <Controller
        name="contractValue"
        control={control}
        render={({ field, fieldState }) => (
          <MoneyField
            label="قيمة العقد"
            hint="اختياري. تُقارَن بما حُصِّل من العميل"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            error={fieldState.error?.message}
          />
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="startDate"
          control={control}
          render={({ field, fieldState }) => (
            <Input {...field} type="date" label="تاريخ البدء" error={fieldState.error?.message} />
          )}
        />
        <Controller
          name="expectedEndDate"
          control={control}
          render={({ field, fieldState }) => (
            <Input {...field} type="date" label="التسليم المتوقع" error={fieldState.error?.message} />
          )}
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-fg-subtle">لغة الوثائق</span>
        <Controller
          name="documentLanguage"
          control={control}
          render={({ field }) => (
            <Segmented
              aria-label="لغة وثائق العميل"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'ar', label: 'العربية' },
                { value: 'both', label: 'عربي وإنجليزي' },
              ]}
            />
          )}
        />
        <p className="text-xs text-fg-muted">للعميل الأجنبي: الإيصال والفاتورة والكشوف تُطبع بالعربية والإنجليزية معاً.</p>
      </div>

      <Controller
        name="notes"
        control={control}
        render={({ field, fieldState }) => (
          <Textarea
            {...field}
            label="ملاحظات"
            rows={3}
            placeholder="شروط العقد، جهة الاتصال في الموقع، أي تفصيل يفيد الفريق"
            hint={field.value.length >= NOTES_COUNTER_FROM ? `${field.value.length} من ${CLIENT_NOTES_MAX} حرف` : undefined}
            error={fieldState.error?.message}
          />
        )}
      />
    </div>
  );
}

/**
 * Status, contract value, dates and notes of a client, shared by the quick add form and the profile's
 * edit form. Works on the form's `control`, so the parent form owns the values and the validation.
 * A collapsed section opens by itself when one of its fields has an error.
 */
export function ClientProjectFields({ control, collapsible, defaultOpen = false, className }: ClientProjectFieldsProps) {
  const [opened, setOpened] = useState(defaultOpen);
  const { errors } = useFormState({ control, name: [...FIELD_NAMES] });
  const open = opened || FIELD_NAMES.some((name) => !!errors[name]);

  if (!collapsible) return <div className={className}><Fields control={control} /></div>;

  return (
    <div className={cn('border-t border-border pt-4', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="client-project-fields"
        onClick={() => setOpened(!open)}
        className={cn(
          'flex min-h-12 w-full items-center gap-3 rounded-md py-1 text-start',
          'focus:outline-none focus-visible:shadow-focus'
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-fg">تفاصيل المشروع</span>
          <span className="block text-xs text-fg-muted">الحالة وقيمة العقد والمواعيد والملاحظات، اختيارية</span>
        </span>
        <ExpandMore
          sx={{ fontSize: 22 }}
          className={cn('flex-none text-fg-muted transition-transform duration-base ease-out', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      <div
        id="client-project-fields"
        className="grid"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          visibility: open ? 'visible' : 'hidden',
          transition: open
            ? 'grid-template-rows 200ms var(--ease-out), visibility 0s'
            : 'grid-template-rows 200ms var(--ease-out), visibility 0s linear 200ms',
        }}
      >
        {/* The padding gives the focus rings room inside the clipping box; the negative margin keeps the fields aligned with the rest of the form. */}
        <div className="-mx-1 -mb-1 overflow-hidden px-1 pb-1">
          <div className="pt-4">
            <Fields control={control} />
          </div>
        </div>
      </div>
    </div>
  );
}
