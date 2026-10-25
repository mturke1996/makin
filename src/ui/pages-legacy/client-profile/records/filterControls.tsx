import { useId, useState, type ReactNode } from 'react';
import { Input } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import {
  matchPreset,
  presetRange,
  type DateRange,
  type FacetOption,
  type PeriodPreset,
} from '../../../../core/finance/clientRecords';
import { isoDay } from '../ledgerUtils';

/** The pill every filter choice is made of: a real toggle button, 44px tall, selected state also in `aria-pressed`. */
export function FilterChip({
  selected,
  onClick,
  count,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  /** How many records this choice leaves. */
  count?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 max-w-full flex-none items-center gap-2 rounded-full border text-sm font-semibold',
        count !== undefined ? 'ps-4 pe-2.5' : 'px-4',
        'transition-[background-color,color,border-color] duration-fast ease-out active:scale-[0.97]',
        'focus:outline-none focus-visible:shadow-focus',
        selected
          ? 'border-transparent bg-accent text-accent-on'
          : 'border-border bg-surface-panel text-fg-subtle hover:border-border-strong hover:text-fg'
      )}
    >
      <span className="truncate">{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            'grid h-6 min-w-6 flex-none place-items-center rounded-full px-1.5 text-xs font-medium tabular-nums',
            selected ? 'bg-[color-mix(in_oklab,var(--on-accent)_22%,transparent)]' : 'bg-surface-sunken text-fg-muted'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** A titled set of choices inside the filter panel. */
export function FilterGroup({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={cn('min-w-0 space-y-2', className)}>
      <p id={id} className="text-xs font-semibold text-fg-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

const COLLAPSED_CHIPS = 8;

/** Many choices, any number selected at once. The first few show; the rest open on request (a selected one never hides). */
export function MultiChips({
  options,
  selected,
  onToggle,
  moreLabel,
}: {
  options: readonly FacetOption[];
  selected: readonly string[];
  onToggle: (key: string) => void;
  /** The expand button, before the count: «عرض كل التصنيفات». */
  moreLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const limited = !expanded && options.length > COLLAPSED_CHIPS + 1;
  const visible = limited ? options.filter((o, i) => i < COLLAPSED_CHIPS || selected.includes(o.key)) : options;
  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((o) => (
        <FilterChip key={o.key} selected={selected.includes(o.key)} count={o.count} onClick={() => onToggle(o.key)}>
          {o.label}
        </FilterChip>
      ))}
      {limited && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="min-h-11 rounded-full px-3 text-sm font-semibold text-accent-ink hover:underline focus:outline-none focus-visible:shadow-focus"
        >
          {moreLabel} ({options.length})
        </button>
      )}
    </div>
  );
}

/** One choice at a time; picking the selected one again goes back to «all» (an empty key). */
export function SingleChips({
  options,
  value,
  onChange,
  allLabel = 'الكل',
  allCount,
  scroll,
}: {
  options: readonly FacetOption[];
  value: string;
  onChange: (key: string) => void;
  allLabel?: string;
  allCount?: number;
  /** On phones: one row that scrolls sideways instead of wrapping (a timeline of months). */
  scroll?: boolean;
}) {
  return (
    <div className={scroll ? 'no-scrollbar flex gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible' : 'flex flex-wrap gap-2'}>
      <FilterChip selected={value === ''} count={allCount} onClick={() => onChange('')}>
        {allLabel}
      </FilterChip>
      {options.map((o) => (
        <FilterChip key={o.key} selected={value === o.key} count={o.count} onClick={() => onChange(value === o.key ? '' : o.key)}>
          {o.label}
        </FilterChip>
      ))}
    </div>
  );
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  thisMonth: 'هذا الشهر',
  lastMonth: 'الشهر الماضي',
  last30: 'آخر 30 يوماً',
};

/** Quick periods plus two date fields; the end date can never be set before the start. */
export function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const today = isoDay();
  const preset = matchPreset(value, today);
  const open = !value.from && !value.to;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <FilterChip selected={open} onClick={() => onChange({ from: '', to: '' })}>
          كل الفترات
        </FilterChip>
        {(Object.keys(PRESET_LABELS) as PeriodPreset[]).map((p) => (
          <FilterChip
            key={p}
            selected={preset === p}
            onClick={() => onChange(preset === p ? { from: '', to: '' } : presetRange(p, today))}
          >
            {PRESET_LABELS[p]}
          </FilterChip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="date"
          label="من تاريخ"
          value={value.from}
          max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
        <Input
          type="date"
          label="إلى تاريخ"
          value={value.to}
          min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
    </div>
  );
}

/** «من 01/10/2026 إلى 20/10/2026», or one side when the other is open. */
export function rangeLabel(range: DateRange, format: (day: string) => string): string {
  if (range.from && range.to) return `من ${format(range.from)} إلى ${format(range.to)}`;
  if (range.from) return `من ${format(range.from)}`;
  return `حتى ${format(range.to)}`;
}
