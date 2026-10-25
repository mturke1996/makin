import type { ComponentProps } from 'react';
import { Input } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import { normalizeDigits } from './format';

type InputProps = ComponentProps<typeof Input>;

type NumberFieldProps = Omit<InputProps, 'value' | 'onChange' | 'type' | 'inputMode' | 'calculator'> & {
  value: string;
  onValueChange: (value: string) => void;
  /** عنوان الحاسبة، مثل «حاسبة المبلغ». */
  calculator: string;
};

/**
 * حقل رقمي: لوحة أرقام عشرية على الهاتف، ويقبل الأرقام العربية والفاصلة العربية.
 * القيمة نص حتى لا يُفقَد ما يكتبه المستخدم أثناء الكتابة (مثل «12.»).
 */
export function NumberField({ value, onValueChange, className, ...rest }: NumberFieldProps) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      dir="ltr"
      autoComplete="off"
      className={cn('text-end', className)}
      value={value}
      onChange={(e) => onValueChange(normalizeDigits(e.target.value))}
      {...rest}
    />
  );
}
