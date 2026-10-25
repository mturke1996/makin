import React, { createContext, forwardRef, ReactNode, useContext, useEffect, useId, useRef, useState } from 'react';
import { AccountBalance, Check, CreditCard, Delete, PhoneAndroid, Payments, RequestQuote, Search } from '../../../design-system/icons';
import { Amount, Avatar, Button, Field, Input, ListGroup, Select, Sheet, Textarea } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import { formatDecimalNumber, parseDecimalInput, CURRENCY_SYMBOL } from '../../../core/utils-formatters';
import { PROFILE_TONE, type ProfileTone } from './profileUi';

export type FormTone = ProfileTone;

/* Field plumbing: FormField gives its control an id (and the label text) through context,
   so a bare FormSelect / FormDateInput / MoneyField inside it is labelled without extra props. */
type FieldContextValue = { id: string; label: string; invalid: boolean };
const FormFieldContext = createContext<FieldContextValue | null>(null);
const useFormField = () => useContext(FormFieldContext);

export function FormField({
  label,
  children,
  hint,
  error,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const id = `ff-${useId()}`;
  return (
    <FormFieldContext.Provider value={{ id, label, invalid: !!error }}>
      <Field label={label} hint={hint} error={error} htmlFor={id} required={required}>
        {children}
      </Field>
    </FormFieldContext.Provider>
  );
}

export const FormSelect = forwardRef<HTMLSelectElement, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>>(
  function FormSelect({ id, ...props }, ref) {
    const field = useFormField();
    return <Select ref={ref} id={id ?? field?.id} invalid={field?.invalid} {...props} />;
  }
);

export const FormTextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function FormTextArea({ id, ...props }, ref) {
    const field = useFormField();
    return <Textarea ref={ref} id={id ?? field?.id} invalid={field?.invalid} {...props} />;
  }
);

export const FormDateInput = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>>(
  function FormDateInput({ id, ...props }, ref) {
    const field = useFormField();
    return <Input ref={ref} type="date" id={id ?? field?.id} invalid={field?.invalid} {...props} />;
  }
);

/** Small titled group of fields. Space and a hairline separate groups; no boxes. */
export function FormSection({
  title,
  description,
  children,
}: {
  /** @deprecated ignored: sections are no longer numbered. */
  step?: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border [&:not(:first-child)]:pt-6">
      <div>
        <h3 className="text-base font-semibold text-fg">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Live summary of the main figure of the form (amount, total or percent). */
export function AmountPreview({
  amount,
  label = 'المبلغ',
  unit = 'دينار ليبي',
  format = 'money',
  tone = 'brand',
}: {
  amount: unknown;
  label?: string;
  unit?: string;
  format?: 'money' | 'plain' | 'percent';
  tone?: FormTone;
}) {
  const raw = typeof amount === 'string' ? (parseDecimalInput(amount) ?? NaN) : Number(amount);
  const valid = Number.isFinite(raw) && raw > 0;
  const ink = valid ? (tone === 'brand' ? 'text-fg' : PROFILE_TONE[tone].ink) : 'text-fg-muted';

  let figure: ReactNode;
  if (format === 'percent') {
    figure = `${valid ? Math.round(raw) : 0}%`;
  } else if (format === 'plain') {
    figure = valid ? (Number.isInteger(raw) ? String(raw) : formatDecimalNumber(raw)) : '0';
  } else {
    figure = <Amount amount={valid ? raw : 0} />;
  }

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-4 py-2.5"
      role="status"
      aria-live="polite"
    >
      <span className="text-sm font-medium text-fg-subtle">{label}</span>
      <span className={cn('text-xl font-bold leading-tight tabular-nums', ink)}>
        {figure}
        {unit && format === 'plain' && <span className="ms-1.5 text-xs font-medium text-fg-muted">{unit}</span>}
      </span>
    </div>
  );
}

/** Amount input: large tabular figure, currency symbol, calculator. */
export function MoneyField({
  value,
  onChange,
  onBlur,
  name,
  placeholder = '0',
  calculatorTitle = 'حاسبة المبلغ',
  label,
  hint,
  error,
  readOnly = false,
}: {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  calculatorTitle?: string;
  label?: string;
  hint?: string;
  error?: string;
  /** Look only: no calculator button (the field itself is disabled by the form around it). */
  readOnly?: boolean;
}) {
  const field = useFormField();
  return (
    <Input
      id={field?.id}
      label={label}
      hint={hint}
      error={error}
      aria-label={label || field ? undefined : 'المبلغ'}
      invalid={field?.invalid}
      fieldSize="lg"
      type="number"
      inputMode="decimal"
      dir="ltr"
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      className="text-end text-xl font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      rightIcon={<span className="text-sm font-medium text-fg-muted">{CURRENCY_SYMBOL}</span>}
      calculator={readOnly ? undefined : calculatorTitle}
      calculatorUnit={CURRENCY_SYMBOL}
    />
  );
}

/**
 * One option of a single-choice group. A real (visually hidden) radio keeps native
 * keyboard and screen-reader behavior; the selected state is a fill, a stronger border
 * and, when `showCheck` is set, a check mark, so it never relies on color alone.
 */
export function ChoiceOption({
  name,
  checked,
  onSelect,
  children,
  showCheck,
  className,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
  showCheck?: boolean;
  className?: string;
}) {
  return (
    <label className="relative block cursor-pointer">
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="peer sr-only" />
      <span
        className={cn(
          'flex min-h-12 items-center gap-2.5 rounded-md border px-3.5 py-2 text-sm font-semibold',
          'transition-[background-color,border-color,box-shadow] duration-fast ease-out peer-focus-visible:shadow-focus',
          checked
            ? 'border-accent bg-accent-soft text-accent-ink shadow-[inset_0_0_0_1px_var(--accent)]'
            : 'border-border bg-surface-panel text-fg-subtle hover:border-border-strong hover:bg-surface-hover',
          className
        )}
      >
        {children}
        {showCheck && checked && <Check sx={{ fontSize: 20 }} className="ms-auto flex-none" aria-hidden />}
      </span>
    </label>
  );
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'نقداً', Icon: Payments },
  { value: 'bank_transfer', label: 'تحويل', Icon: AccountBalance },
  { value: 'check', label: 'شيك', Icon: RequestQuote },
  { value: 'mobile_payment', label: 'إلكتروني', Icon: PhoneAndroid },
] as const;

/** بطاقة: لا تُعرض لدفعة جديدة، وتظهر فقط عند تعديل دفعة قديمة سُجّلت بها. */
const LEGACY_CARD = { value: 'credit_card', label: 'بطاقة', Icon: CreditCard } as const;

export function PaymentMethodPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const field = useFormField();
  const name = useId();
  const options = value === LEGACY_CARD.value ? [...PAYMENT_METHODS, LEGACY_CARD] : PAYMENT_METHODS;
  return (
    <div role="radiogroup" aria-label={field?.label ?? 'طريقة الدفع'} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map(({ value: v, label, Icon }) => {
        const checked = value === v;
        return (
          <ChoiceOption key={v} name={name} checked={checked} onSelect={() => onChange(v)} className="justify-center">
            {checked ? <Check sx={{ fontSize: 20 }} aria-hidden /> : <Icon sx={{ fontSize: 20 }} aria-hidden />}
            {label}
          </ChoiceOption>
        );
      })}
    </div>
  );
}

/** Lists longer than this get a search box. */
const USER_SEARCH_THRESHOLD = 6;

export function UserPicker({
  users,
  value,
  onChange,
}: {
  users: { id: string; name: string; sub?: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const field = useFormField();
  const name = useId();
  const [query, setQuery] = useState('');
  const q = query.trim();
  const list = q ? users.filter((u) => u.name.includes(q) || u.sub?.includes(q)) : users;

  return (
    <div className="space-y-2">
      {users.length > USER_SEARCH_THRESHOLD && (
        <Input
          type="search"
          aria-label="ابحث عن موظف"
          placeholder="ابحث عن موظف"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search sx={{ fontSize: 20 }} aria-hidden />}
        />
      )}
      {list.length === 0 ? (
        <p className="rounded-md bg-surface-sunken px-4 py-3 text-sm text-fg-muted">
          {users.length === 0 ? 'لا يوجد موظفون لاختيارهم' : 'لا يوجد موظف بهذا الاسم'}
        </p>
      ) : (
        <ListGroup role="radiogroup" aria-label={field?.label ?? 'اختيار الموظف'} className="max-h-72 overflow-y-auto">
          {list.map((u) => {
            const selected = value === u.id;
            return (
              <label key={u.id} className="relative block cursor-pointer">
                <input
                  type="radio"
                  name={name}
                  checked={selected}
                  onChange={() => onChange(u.id)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-fast ease-out',
                    'peer-focus-visible:shadow-[inset_var(--brand-focus-ring)]',
                    selected ? 'bg-accent-soft' : 'hover:bg-surface-hover'
                  )}
                >
                  <Avatar name={u.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-base font-semibold', selected ? 'text-accent-ink' : 'text-fg')}>
                      {u.name}
                    </span>
                    {u.sub && <span className="block truncate text-xs text-fg-muted">{u.sub}</span>}
                  </span>
                  {selected && <Check sx={{ fontSize: 20 }} className="flex-none text-accent-ink" aria-hidden />}
                </span>
              </label>
            );
          })}
        </ListGroup>
      )}
    </div>
  );
}

export function FormSheetShell({
  tone = 'brand',
  title,
  subtitle,
  amount,
  amountLabel,
  amountFormat = 'money',
  amountUnit = 'دينار ليبي',
  onClose,
  onSubmit,
  submitLabel,
  cancelLabel = 'إلغاء',
  children,
  maxWidth = 'sm',
  onDelete,
  deleteLabel = 'حذف',
  readOnly = false,
}: {
  /** Tints the live summary figure (success = received, danger = spent, warning = custody). */
  tone?: FormTone;
  title: string;
  subtitle?: string;
  amount?: unknown;
  amountLabel?: string;
  amountFormat?: 'money' | 'plain' | 'percent';
  amountUnit?: string;
  onClose: () => void;
  /** May return a promise: the submit button then shows a busy state until it settles. */
  onSubmit: () => void | Promise<unknown>;
  submitLabel: string;
  cancelLabel?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
  /** Edit mode: adds a quiet delete button beside save (the header back arrow replaces cancel). */
  onDelete?: () => void;
  deleteLabel?: string;
  /** The person may look but not change: every field is disabled and the footer only closes. */
  readOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const submit = () => {
    if (busy) return;
    const result = onSubmit();
    if (result && typeof (result as Promise<unknown>).finally === 'function') {
      setBusy(true);
      (result as Promise<unknown>).finally(() => {
        if (alive.current) setBusy(false);
      });
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth={maxWidth}
      headerExtras={
        amount !== undefined ? (
          <AmountPreview amount={amount} label={amountLabel} format={amountFormat} unit={amountUnit} tone={tone} />
        ) : undefined
      }
      footer={
        readOnly ? (
          <Button variant="outline" block onClick={onClose}>
            إغلاق
          </Button>
        ) : onDelete ? (
          <div className="flex gap-3">
            <Button
              variant="danger-soft"
              className="shrink-0"
              disabled={busy}
              leftIcon={<Delete sx={{ fontSize: 20 }} />}
              onClick={onDelete}
            >
              {deleteLabel}
            </Button>
            <Button className="min-w-0 flex-1" loading={busy} onClick={submit}>
              {submitLabel}
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button className="flex-[2]" loading={busy} onClick={submit}>
              {submitLabel}
            </Button>
            <Button variant="outline" className="flex-1" disabled={busy} onClick={onClose}>
              {cancelLabel}
            </Button>
          </div>
        )
      }
    >
      <div className="px-4 py-5 lg:px-6 lg:py-6">
        <fieldset disabled={readOnly} className="m-0 min-w-0 space-y-6 border-0 p-0">
          {children}
        </fieldset>
      </div>
    </Sheet>
  );
}
