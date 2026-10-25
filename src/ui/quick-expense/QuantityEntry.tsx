import { Amount, Input, Select } from "../../design-system/primitives";
import {
  EXPENSE_MEASURE_UNIT_GROUPS,
  formatMeasureUnit,
  formatQuantityWithUnit,
  isPartialDecimalInput,
} from "../../core/utils-formatters";
import { calculateQuickQuantity } from "./quickExpenseLogic";

export function QuantityEntry({
  quantity,
  unitPrice,
  unit,
  onQuantity,
  onPrice,
  onUnit,
}: {
  quantity: string;
  unitPrice: string;
  unit: string;
  onQuantity: (value: string) => void;
  onPrice: (value: string) => void;
  onUnit: (value: string) => void;
}) {
  const result = calculateQuickQuantity(quantity, unitPrice);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="الكمية"
          inputMode="decimal"
          dir="ltr"
          value={quantity}
          placeholder="مثل 12.5"
          onChange={(event) => {
            if (isPartialDecimalInput(event.target.value))
              onQuantity(event.target.value);
          }}
          calculator="حاسبة الكمية"
          calculatorUnit={formatMeasureUnit(unit)}
        />
        <Select
          label="الوحدة"
          value={unit}
          onChange={(event) => onUnit(event.target.value)}
        >
          <option value="">بدون وحدة</option>
          {EXPENSE_MEASURE_UNIT_GROUPS.map((group) => (
            <optgroup key={group.title} label={group.title}>
              {group.units.map((value) => (
                <option key={value} value={value}>
                  {formatMeasureUnit(value)}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>
      <Input
        label="سعر الوحدة بالدينار"
        inputMode="decimal"
        dir="ltr"
        value={unitPrice}
        placeholder="0.000"
        onChange={(event) => {
          if (isPartialDecimalInput(event.target.value))
            onPrice(event.target.value);
        }}
        calculator="حاسبة سعر الوحدة"
        calculatorUnit="د.ل"
      />
      <div
        aria-live="polite"
        className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-3"
      >
        <div className="min-w-0">
          <p className="text-xs text-fg-muted">الإجمالي المحسوب</p>
          <p className="mt-1 text-sm text-fg-subtle">
            {formatQuantityWithUnit(result.quantity, unit)} ×{" "}
            <Amount amount={result.unitPrice} />
          </p>
        </div>
        <Amount amount={result.amount} className="shrink-0 text-xl font-bold" />
      </div>
      {quantity && unitPrice && result.error && (
        <p role="alert" className="text-xs text-danger-ink">
          {result.error}
        </p>
      )}
    </div>
  );
}
