import { PageShell, Skeleton } from '../../../design-system/primitives';
import { ClientOverviewSkeleton } from './overview/OverviewSkeleton';

/** Matches the loaded phone composition to avoid a layout jump when data arrives. */
export function ClientProfileSkeleton() {
  return (
    <PageShell width="7xl">
      <div
        role="status"
        aria-label="جارٍ تحميل ملف العميل"
        className="space-y-4"
      >
        <div className="space-y-4 rounded-xl border border-border bg-surface-panel p-4 lg:p-3">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Skeleton width={56} height={56} className="rounded-md" />
            <div className="flex w-full min-w-0 flex-col items-center gap-2 sm:flex-1 sm:items-start">
              <Skeleton height={24} width={120} />
              <Skeleton height={24} width="65%" />
            </div>
          </div>
          <Skeleton height={128} className="rounded-md lg:hidden" />
          <div className="grid grid-cols-3 gap-2 lg:hidden">
            {[0, 1, 2].map((i) => <Skeleton key={i} height={44} className="rounded-md" />)}
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="min-w-0 space-y-4 lg:order-2 lg:col-span-8 xl:col-span-9">
            <div aria-hidden><ClientOverviewSkeleton /></div>
            <div className="grid grid-cols-4 gap-1">
              {[0, 1, 2, 3].map((i) => <div key={i} className="flex flex-col items-center gap-2 py-2">
                <Skeleton width={44} height={44} className="rounded-lg" />
                <Skeleton height={12} width="70%" />
                <Skeleton height={11} width="50%" />
              </div>)}
            </div>
          </div>
          <div className="space-y-3 rounded-lg border border-border bg-surface-panel p-4 lg:order-1 lg:col-span-4 xl:col-span-3">
            <Skeleton height={20} width="60%" />
            {[0, 1, 2].map((i) => <Skeleton key={i} height={44} className="rounded-md" />)}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
