import { Skeleton } from '../../../../design-system/primitives';
import { KPI_CONTAINER, kpiGridClass } from '../../../../design-system/charts';

function KpiRowSkeleton({ chart }: { chart?: boolean }) {
  return (
    <div className="flex min-h-[6.5rem] min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface-panel p-3.5">
      <Skeleton height={13} width="38%" />
      <Skeleton height={26} width="58%" />
      <Skeleton height={13} width="46%" />
      {chart && <Skeleton height={44} className="mt-auto" />}
    </div>
  );
}

function InsightRowSkeleton() {
  return (
    <div className="flex min-h-[4.5rem] items-start gap-3 px-4 py-3.5">
      <Skeleton width={44} height={44} className="flex-none rounded-md" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton height={15} width="52%" />
        <Skeleton height={12} width="88%" />
      </div>
    </div>
  );
}

/** The financial board and priorities; the record entry points are rendered by the parent slot. */
export function ClientOverviewSkeleton() {
  return (
    <div role="status" aria-label="جارٍ تحميل ملخص الحساب" className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-2 px-1"><Skeleton height={20} width="30%" /><Skeleton height={12} width="55%" /></div>
        <div className={KPI_CONTAINER}>
          <div className="space-y-2.5">
            <div className={kpiGridClass(3)}>
              {[0, 1, 2].map((i) => <KpiRowSkeleton key={i} chart />)}
            </div>
            <div className="grid grid-cols-2 gap-2.5 [&>*:last-child]:col-span-2 [@container_(min-width:40rem)]:grid-cols-3 [@container_(min-width:40rem)]:[&>*:last-child]:col-span-1">
              {[0, 1, 2].map((i) => <KpiRowSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton height={22} width="30%" />
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-panel">
          {[0, 1].map((i) => (
            <InsightRowSkeleton key={i} />
          ))}
        </div>
      </div>

    </div>
  );
}
