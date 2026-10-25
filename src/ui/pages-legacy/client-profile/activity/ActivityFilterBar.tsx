import { Search } from '../../../../design-system/icons';
import { Input, Segmented } from '../../../../design-system/primitives';
import { CustomRange, PeriodSelect, type PeriodState } from './PeriodFilter';

export interface KindChip<K extends string> {
  value: K;
  label: string;
  count: number;
}

interface ActivityFilterBarProps<K extends string> {
  query: string;
  onQuery: (value: string) => void;
  period: PeriodState;
  onPeriod: (next: PeriodState) => void;
  /** Kind chips, "all" first. Hidden when there is nothing to choose between. */
  chips: KindChip<K | 'all'>[] | null;
  kind: K | 'all';
  onKind: (value: K | 'all') => void;
}

/**
 * Search + period on one row, the kind chips under them. Sticks to the top of the sheet only on tall
 * screens: on a short phone (or at a large font size) it scrolls away so the list keeps the room.
 */
export function ActivityFilterBar<K extends string>({
  query,
  onQuery,
  period,
  onPeriod,
  chips,
  kind,
  onKind,
}: ActivityFilterBarProps<K>) {
  return (
    <div className="z-[1] space-y-3 bg-surface-canvas px-4 pb-3 pt-4 lg:px-6 [@media(min-height:44rem)]:sticky [@media(min-height:44rem)]:top-0">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 basis-40">
          <Input
            type="search"
            aria-label="بحث في سجل النشاط"
            placeholder="وصف، مبلغ، اسم، تاريخ"
            autoComplete="off"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            leftIcon={<Search sx={{ fontSize: 20 }} aria-hidden />}
          />
        </div>
        <div className="w-40 flex-none">
          <PeriodSelect value={period} onChange={onPeriod} />
        </div>
      </div>
      <CustomRange value={period} onChange={onPeriod} />
      {chips && (
        <Segmented<K | 'all'>
          layout="scroll"
          aria-label="تصفية حسب النوع"
          value={kind}
          onChange={onKind}
          options={chips.map((c) => ({ value: c.value, label: c.label, count: c.count }))}
        />
      )}
    </div>
  );
}
