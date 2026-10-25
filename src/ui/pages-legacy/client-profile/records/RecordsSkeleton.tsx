import { Skeleton } from '../../../../design-system/primitives';

/** Placeholder with the shape of a record sheet (summary strip, search row, one list), shown while the data is still arriving. */
export function RecordsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="جارٍ تحميل السجلات" className="space-y-4 px-4 py-4 lg:px-6">
      <div className="space-y-3 rounded-lg border border-border bg-surface-panel p-4">
        <Skeleton height={12} width="34%" />
        <Skeleton height={26} width="52%" />
        <Skeleton height={8} className="rounded-full" />
      </div>
      <Skeleton height={48} className="rounded-md" />
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-panel">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton circle width={44} height={44} />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton height={14} width={i % 2 ? '58%' : '72%'} />
              <Skeleton height={11} width="38%" />
            </div>
            <Skeleton height={18} width={64} />
          </div>
        ))}
      </div>
    </div>
  );
}
