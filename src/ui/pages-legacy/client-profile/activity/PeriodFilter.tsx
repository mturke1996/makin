import { Input, Select } from '../../../../design-system/primitives';
import type { PeriodKey } from '../../../../core/finance/clientActivity';

export interface PeriodState {
  period: PeriodKey;
  /** YYYY-MM-DD typed by hand; used when `period` is `custom`. */
  from: string;
  to: string;
}

export const DEFAULT_PERIOD: PeriodState = { period: 'all', from: '', to: '' };

const OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: 'all', label: 'كل الفترات' },
  { value: 'thisMonth', label: 'هذا الشهر' },
  { value: 'lastMonth', label: 'الشهر الماضي' },
  { value: 'thisYear', label: 'هذه السنة' },
  { value: 'custom', label: 'فترة محددة' },
];

/** The period picker: a native select (best phone picker); a custom range adds `CustomRange` below. */
export function PeriodSelect({ value, onChange }: { value: PeriodState; onChange: (next: PeriodState) => void }) {
  return (
    <Select
      aria-label="الفترة"
      value={value.period}
      onChange={(e) => onChange({ ...value, period: e.target.value as PeriodKey })}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

/** Two date fields, only for a custom range. */
export function CustomRange({ value, onChange }: { value: PeriodState; onChange: (next: PeriodState) => void }) {
  if (value.period !== 'custom') return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input type="date" label="من" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      <Input type="date" label="إلى" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} />
    </div>
  );
}
