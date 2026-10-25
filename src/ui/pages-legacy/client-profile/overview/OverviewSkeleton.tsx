import { Skeleton } from '../../../../design-system/primitives';

function KpiRowSkeleton() {
  return (
    <div className="flex min-h-[6.5rem] min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface-panel p-3.5">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton height={13} width="38%" />
        <Skeleton height={22} width="58%" />
        <Skeleton height={13} width="46%" />
      </div>
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
      <div className="client-profile-finances rounded-lg border border-border bg-surface-panel">
        <div className="space-y-2 border-b border-border p-4"><Skeleton height={16} width="30%" /><Skeleton height={12} width="65%" /></div>
        <div className="client-profile-finance-grid grid grid-cols-2 gap-2.5 p-3 sm:p-4">
          {[0, 1, 2, 3].map((i) => <KpiRowSkeleton key={i} />)}
        </div>
        <div className="client-profile-finance-grid grid grid-cols-2 gap-2.5 border-t border-border bg-surface-sunken p-3 sm:p-4">
          {[0, 1].map((i) => <KpiRowSkeleton key={i} />)}
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
