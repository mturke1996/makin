import { useState, type ReactNode } from 'react';
import { Control, Controller } from 'react-hook-form';
import { Add, Close } from '@mui/icons-material';
import { Amount, Badge, IconButton, Input, Select } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import {
  formatDecimalNumber,
  formatMeasureUnit,
  formatQuantityWithUnit,
  expenseHasQuantityLine,
  parseDecimalInput,
  isPartialDecimalInput,
  multiplyQuantityPrice,
  EXPENSE_MEASURE_UNIT_GROUPS,
  CURRENCY_SYMBOL,
} from '../../../core/utils-formatters';

type Props = {
  control: Control<any>;
  quantity: unknown;
  unit: unknown;
  unitPrice: unknown;
  amount: unknown;
  defaultOpen?: boolean;
  onClear?: () => void;
  /** Look only: no skip button, no calculators (the fields are disabled by the form around it). */
  readOnly?: boolean;
};

const KNOWN_UNITS = EXPENSE_MEASURE_UNIT_GROUPS.flatMap((g) => g.units);

/** Optional quantity x unit price breakdown of an expense (the total is computed from it). */
export function ExpenseQuantityBlock({
  control,
  quantity,
  unit,
  unitPrice,
  amount,
  defaultOpen = false,
  onClear,
  readOnly = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const q = parseDecimalInput(quantity) ?? 0;
  const p = parseDecimalInput(unitPrice) ?? 0;
  const unitKey = String(unit || '').trim();
  const total = parseFloat(String(amount)) || 0;
  const active = expenseHasQuantityLine({ quantity: q, unitPrice: p });
  const computed = q > 0 && p >= 0 ? multiplyQuantityPrice(q, p) : 0;
  const priceLabel = unitKey ? 'سعر الوحدة' : 'سعر القطعة';

  const handleClose = () => {
    onClear?.();
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex min-h-14 w-full items-center gap-3 rounded-md border border-dashed border-border-strong px-4 py-3 text-start',
          'transition-colors duration-fast ease-out hover:bg-surface-hover focus:outline-none focus-visible:shadow-focus'
        )}
      >
        <span className="grid size-9 flex-none place-items-center rounded-md bg-surface-sunken text-fg-subtle">
          <Add sx={{ fontSize: 20 }} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">إضافة كمية ووحدة وسعر</span>
          <span className="block text-xs text-fg-muted">اختياري، أو اكتفِ بالمبلغ الإجمالي</span>
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-fg">تفصيل الكمية والسعر</p>
            <Badge>اختياري</Badge>
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">تظهر الوحدة في قائمة المصروفات وملف PDF.</p>
        </div>
        {!readOnly && (
          <IconButton label="تخطي التفصيل" onClick={handleClose} className="-me-2 -mt-1">
            <Close sx={{ fontSize: 20 }} />
          </IconButton>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          name="quantity"
          control={control}
          render={({ field }) => (
            <Input
              ref={field.ref}
              name={field.name}
              label="الكمية"
              type="text"
              inputMode="decimal"
              dir="ltr"
              placeholder="مثال: 2.5"
              className="text-end"
              value={field.value ?? ''}
              onBlur={field.onBlur}
              onChange={(e) => {
                if (isPartialDecimalInput(e.target.value)) field.onChange(e.target.value);
              }}
              calculator={readOnly ? undefined : 'حاسبة الكمية'}
              calculatorUnit={unitKey ? formatMeasureUnit(unitKey) : undefined}
            />
          )}
        />
        <Controller
          name="unit"
          control={control}
          render={({ field }) => (
            <Select
              ref={field.ref}
              name={field.name}
              label="وحدة القياس أو الوزن"
              value={field.value ?? ''}
              onBlur={field.onBlur}
              onChange={(e) => field.onChange(e.target.value)}
            >
              <option value="">بدون وحدة</option>
              {unitKey && !KNOWN_UNITS.includes(unitKey) && <option value={unitKey}>{formatMeasureUnit(unitKey)}</option>}
              {EXPENSE_MEASURE_UNIT_GROUPS.map((group) => (
                <optgroup key={group.title} label={group.title}>
                  {group.units.map((u) => (
                    <option key={u} value={u}>
                      {formatMeasureUnit(u)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          )}
        />
      </div>

      <Controller
        name="unitPrice"
        control={control}
        render={({ field }) => (
          <Input
            ref={field.ref}
            name={field.name}
            label={priceLabel}
            type="text"
            inputMode="decimal"
            dir="ltr"
            placeholder="0"
            className="text-end"
            value={field.value ?? ''}
            onBlur={field.onBlur}
            onChange={(e) => {
              if (isPartialDecimalInput(e.target.value)) field.onChange(e.target.value);
            }}
            rightIcon={<span className="text-sm font-medium text-fg-muted">{CURRENCY_SYMBOL}</span>}
            calculator={readOnly ? undefined : 'حاسبة سعر الوحدة'}
            calculatorUnit={CURRENCY_SYMBOL}
          />
        )}
      />

      <div className="rounded-md bg-surface-sunken px-4 py-3" aria-live="polite">
        {active ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-fg-muted">الإجمالي المحسوب</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm tabular-nums text-fg-subtle">
                <span>{formatQuantityWithUnit(q, unitKey || undefined)}</span>
                <span aria-hidden>×</span>
                <Amount amount={p} />
              </p>
            </div>
            <span className="flex-none text-xl font-bold tabular-nums text-fg">
              <Amount amount={computed || total} />
            </span>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">أدخل الكمية والسعر ليُحسب الإجمالي تلقائياً.</p>
        )}
      </div>
    </div>
  );
}

/** شارة الكمية في قائمة المصروفات: الكمية، سعر الوحدة، الإجمالي */
export function ExpenseQuantityChip({
  quantity,
  unit,
  unitPrice,
  amount,
}: {
  quantity?: number;
  unitPrice?: number;
  unit?: string;
  amount?: number;
}) {
  if (!expenseHasQuantityLine({ quantity, unitPrice })) return null;
  const q = quantity!;
  const p = unitPrice!;
  const total = amount ?? multiplyQuantityPrice(q, p);
  const unitLabel = unit ? formatMeasureUnit(unit) : null;

  return (
    <dl className="mt-2 grid grid-cols-3 overflow-hidden rounded-md bg-surface-sunken">
      <ChipCell label={unitLabel ? `الكمية (${unitLabel})` : 'الكمية'}>{formatDecimalNumber(q)}</ChipCell>
      <ChipCell label={unit ? 'سعر الوحدة' : 'سعر القطعة'}>
        <Amount amount={p} />
      </ChipCell>
      <ChipCell label="الإجمالي" strong>
        <Amount amount={total} />
      </ChipCell>
    </dl>
  );
}

function ChipCell({ label, strong, children }: { label: string; strong?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0 px-2.5 py-2 text-center [&:not(:first-child)]:border-s [&:not(:first-child)]:border-border">
      <dt className="truncate text-2xs text-fg-muted">{label}</dt>
      <dd className={cn('mt-0.5 text-xs tabular-nums', strong ? 'font-bold text-fg' : 'font-semibold text-fg-subtle')}>
        {children}
      </dd>
    </div>
  );
}
