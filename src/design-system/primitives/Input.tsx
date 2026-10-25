import {
  forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes,
  useCallback, useId, useRef,
} from 'react';
import { ExpandMore } from '@mui/icons-material';
import { cn } from './cn';
import { CalculatorButton } from './CalculatorPad';

/**
 * Shared field chrome. Idle and invalid are separate branches (never merged), because plain
 * class joining cannot resolve conflicting utilities such as bg-surface-sunken vs bg-danger-soft.
 */
const fieldBase =
  'flex w-full items-center gap-2 rounded-md border text-fg ' +
  'transition-[background-color,border-color,box-shadow] duration-fast ease-out';
const fieldIdle =
  'border-border bg-surface-panel hover:border-border-strong ' +
  'focus-within:border-[color:var(--accent)] focus-within:bg-surface-panel focus-within:shadow-focus';
const fieldInvalid =
  'border-[color:var(--brand-danger)] bg-danger-soft ' +
  'focus-within:bg-surface-panel focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand-danger)_28%,transparent)]';
const fieldChrome = (invalid: boolean) => `${fieldBase} ${invalid ? fieldInvalid : fieldIdle}`;
/** focus-visible:shadow-none: the shell already draws the focus ring (global input rule would double it). */
const fieldText =
  'w-full min-w-0 bg-transparent text-[1rem] sm:text-sm text-fg outline-none placeholder:text-fg-muted disabled:cursor-not-allowed focus-visible:shadow-none';

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
  /** Marks the label with a required indicator. */
  required?: boolean;
}

/** Label + control + hint/error. Use around any custom control. */
export function Field({ label, hint, error, htmlFor, className, children, required }: FieldProps) {
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-fg-subtle">
          {label}
          {required && <span aria-hidden className="ms-1 text-danger-ink">*</span>}
        </label>
      )}
      {children}
      {(error || hint) && (
        <span id={htmlFor ? `${htmlFor}-description` : undefined} className={cn('text-xs leading-relaxed', error ? 'text-danger-ink' : 'text-fg-muted')} role={error ? 'alert' : undefined}>
          {error || hint}
        </span>
      )}
    </div>
  );
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  invalid?: boolean;
  label?: string;
  hint?: string;
  error?: string;
  /** `lg` — 56px row; for auth and key amount entry. Default 48px. */
  fieldSize?: 'md' | 'lg';
  /** Adds a small calculator button; `true` or a title (e.g. «حاسبة المبلغ»). */
  calculator?: boolean | string;
  /** Unit shown next to the calculator result (د.ل، م²…). */
  calculatorUnit?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, rightIcon, invalid, error, className, label, hint, id, fieldSize = 'md', calculator, calculatorUnit, required, ...rest },
  ref
) {
  const innerRef = useRef<HTMLInputElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );
  const autoId = useId();
  const fieldId = id || `in-${autoId}`;
  const isInvalid = invalid || !!error;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fieldId} required={required}>
      <div className={cn(fieldChrome(isInvalid), fieldSize === 'lg' ? 'h-14 px-4' : 'h-12 px-3.5')}>
        {leftIcon && <span className="flex-none text-fg-muted">{leftIcon}</span>}
        <input
          id={fieldId}
          ref={setRefs}
          required={required}
          aria-invalid={isInvalid || undefined}
          aria-describedby={error || hint ? `${fieldId}-description` : undefined}
          className={cn(fieldText, 'h-full', className)}
          {...rest}
        />
        {rightIcon && <span className="flex-none text-fg-muted">{rightIcon}</span>}
        {calculator && (
          <CalculatorButton
            inputRef={innerRef}
            unit={calculatorUnit}
            title={typeof calculator === 'string' ? calculator : label ? `حاسبة: ${label}` : undefined}
            className="-me-1"
          />
        )}
      </div>
    </Field>
  );
});

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  invalid?: boolean;
  leftIcon?: ReactNode;
}

/** Native select (best mobile picker) with the shared field chrome. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, invalid, leftIcon, className, id, children, required, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id || `sel-${autoId}`;
  const isInvalid = invalid || !!error;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fieldId} required={required}>
      <div className={cn(fieldChrome(isInvalid), 'relative h-12 px-3.5')}>
        {leftIcon && <span className="flex-none text-fg-muted">{leftIcon}</span>}
        <select
          id={fieldId}
          ref={ref}
          required={required}
          aria-invalid={isInvalid || undefined}
          aria-describedby={error || hint ? `${fieldId}-description` : undefined}
          className={cn(fieldText, 'h-full appearance-none pe-7 cursor-pointer', className)}
          {...rest}
        >
          {children}
        </select>
        <ExpandMore sx={{ fontSize: 20 }} className="pointer-events-none absolute end-3 text-fg-muted" aria-hidden />
      </div>
    </Field>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, invalid, className, id, rows = 3, required, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id || `ta-${autoId}`;
  const isInvalid = invalid || !!error;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fieldId} required={required}>
      <div className={cn(fieldChrome(isInvalid), 'items-start px-3.5 py-3')}>
        <textarea
          id={fieldId}
          ref={ref}
          rows={rows}
          required={required}
          aria-invalid={isInvalid || undefined}
          aria-describedby={error || hint ? `${fieldId}-description` : undefined}
          className={cn(fieldText, 'resize-none leading-relaxed', className)}
          {...rest}
        />
      </div>
    </Field>
  );
});
