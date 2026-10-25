import { Search } from '../../../../design-system/icons';
import { Button, EmptyState } from '../../../../design-system/primitives';
import type { RecordGroup } from '../../../../core/finance/clientRecords';
import { dayLabel, monthKeyLabel } from '../ledgerUtils';

/** Heading of a group of records: «أكتوبر 2026», «أمس», «بدون تاريخ». */
export function groupTitle(group: Pick<RecordGroup<unknown>, 'kind' | 'key'>): string {
  switch (group.kind) {
    case 'month':
      return monthKeyLabel(group.key);
    case 'day':
      return dayLabel(group.key);
    case 'undated':
      return 'بدون تاريخ';
    default:
      return '';
  }
}

/** There are records, but none passes the filters: say so and offer the way back. */
export function RecordsNoResults({ description, onReset }: { description: string; onReset: () => void }) {
  return (
    <EmptyState
      Icon={Search}
      title="لا توجد نتائج مطابقة"
      description={description}
      action={
        <Button variant="outline" onClick={onReset}>
          مسح البحث والتصفية
        </Button>
      }
    />
  );
}

/** Long lists open a page at a time, so a client with hundreds of records stays quick to scroll. */
export function ShowMore({ hidden, onMore }: { hidden: number; onMore: () => void }) {
  if (hidden <= 0) return null;
  return (
    <Button variant="outline" block onClick={onMore}>
      عرض المزيد ({hidden})
    </Button>
  );
}
