import { Skeleton } from '../../../design-system/primitives';

/** The hero panel while it loads: same size as the real one, so nothing jumps. */
function HeroSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-panel" aria-hidden>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Skeleton circle width={56} height={56} />
          <div className="flex-1 space-y-2">
            <Skeleton height={24} width="44%" />
            <Skeleton height={14} width="22%" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton height={14} width="30%" />
          <Skeleton height={44} width="55%" />
        </div>
        <Skeleton height={10} className="rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-4 border-t border-border px-5 py-4 sm:px-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton height={12} width="60%" />
            <Skeleton height={20} width="80%" />
          </div>
        ))}
      </div>
    </div>
  );
}

function UserRowSkeleton() {
  return (
    <div className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3" aria-hidden>
      <Skeleton circle width={44} height={44} />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="42%" />
        <Skeleton height={12} width="58%" />
      </div>
      <Skeleton height={22} width={72} />
    </div>
  );
}

/** The overview while it loads: the hero, then the employees list. */
export function OverviewSkeleton() {
  return (
    <div role="status" aria-label="جارٍ تحميل صندوق العهد" className="space-y-6">
      <HeroSkeleton />
      <div className="space-y-3">
        <Skeleton height={22} width="20%" />
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-panel">
          {[0, 1, 2, 3].map((i) => (
            <UserRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LogRowSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5" aria-hidden>
      <Skeleton circle width={36} height={36} />
      <div className="flex-1 space-y-2">
        <Skeleton height={15} width="52%" />
        <Skeleton height={12} width="68%" />
        <Skeleton height={12} width="40%" />
      </div>
      <Skeleton height={18} width={64} />
    </div>
  );
}

/** One employee while it loads: the hero, then a custody with its log. */
export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="جارٍ تحميل العهدة" aria-busy className="space-y-6">
      <HeroSkeleton />
      <div className="space-y-3">
        <Skeleton height={22} width="24%" />
        <div className="overflow-hidden rounded-xl border border-border bg-surface-panel">
          <div className="space-y-3 p-4 sm:p-5">
            <Skeleton height={22} width="40%" />
            <Skeleton height={40} />
            <Skeleton height={6} className="rounded-full" />
          </div>
          <div className="divide-y divide-border border-t border-border">
            {[0, 1, 2].map((i) => (
              <LogRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
