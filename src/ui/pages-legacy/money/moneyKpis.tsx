import type { ReactNode } from 'react';
import { KPI_CONTAINER, kpiGridClass } from '../../../design-system/charts';
import { Skeleton } from '../../../design-system/primitives';

/** The figures at the top of a money page: the same statistic cards, in the same container-driven grid, as the home page. */
export function MoneyKpiGrid({ count, label, children }: { count: number; label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className={KPI_CONTAINER}>
      <div className={kpiGridClass(count)}>{children}</div>
    </section>
  );
}

/** «دفعة واحدة، دفعتان، 3 دفعات، 11 دفعة»: the counted noun the hints use. */
export function paymentCount(n: number): string {
  return n === 1 ? 'دفعة واحدة' : n === 2 ? 'دفعتان' : n >= 3 && n <= 10 ? `${n} دفعات` : `${n} دفعة`;
}

/** The loading silhouette of the grid above: four cards, each with room for its curve. */
export function MoneyKpiSkeleton() {
  return (
    <div role="status" aria-label="جارٍ التحميل" className={KPI_CONTAINER}>
      <div className={kpiGridClass(4)}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex min-h-[6.5rem] min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface-panel p-3.5">
            <Skeleton height={13} width="45%" />
            <Skeleton height={26} width="60%" />
            <Skeleton height={13} width="40%" />
            <Skeleton height={44} className="mt-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
