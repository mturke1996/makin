import type { ReactNode } from 'react';
import { Amount, StatCard } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import { KPI_CONTAINER, kpiGridClass } from '../../../../design-system/charts';
import { subtractMoney } from '../../../../core/finance/money';
import { percentOf, type OverviewTrend } from '../../../../core/finance/clientAnalytics';
import { badgeFor, monthSeries, thisMonth } from './kpiParts';

/**
 * The monthly view of the account: the same statistic cards as the board and the home page.
 */

/** «+12 نقطة»: the change of a percentage is told in points, not as a percent of a percent. */
function PointsBadge({ points }: { points: number | null }) {
  if (points === null) return null;
  const dir = points === 0 ? 'flat' : points > 0 ? 'up' : 'down';
  const word = dir === 'up' ? 'ارتفاع' : dir === 'down' ? 'انخفاض' : 'دون تغيير';
  const abs = Math.abs(points).toLocaleString('en-US', { maximumFractionDigits: 1 });
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-3xs font-semibold leading-4 tabular-nums',
        dir === 'flat' ? 'bg-surface-sunken text-fg-subtle' : dir === 'up' ? 'bg-success-soft text-success-ink' : 'bg-danger-soft text-danger-ink',
      )}
      aria-label={`${word} ${abs} نقطة مئوية عن نهاية الشهر الماضي`}
    >
      <bdi dir="ltr">{dir === 'up' ? '+' : dir === 'down' ? '−' : ''}{abs}</bdi>
      <span className="ms-1">نقطة</span>
    </span>
  );
}

interface KpiProps {
  label: string;
  figure: ReactNode;
  badge: ReactNode;
  hint: ReactNode;
  spark: ReactNode;
}

function Kpi({ label, figure, badge, hint, spark }: KpiProps) {
  return (
    <StatCard label={label} value={figure} hint={hint} badge={badge} trend={spark} />
  );
}

interface OverviewKpisProps {
  /** The whole-account totals (the same figures as the account statement). */
  totalPaid: number;
  totalExpenses: number;
  trend: OverviewTrend;
  className?: string;
}

/** What is left of collected minus spent, and how much of the spending came back, each with its month and curve. */
export function OverviewKpis({ totalPaid, totalExpenses, trend, className }: OverviewKpisProps) {
  const { flow } = trend;
  const months = flow.months.length;
  const net = subtractMoney(totalPaid, totalExpenses);
  const ratio = percentOf(totalPaid, totalExpenses);
  // The ratio curve starts where something was first spent; before that there is nothing to divide by.
  const ratioCurve = flow.ratio.filter((v): v is number => v !== null);
  const span = `آخر ${months} أشهر`;
  return (
    <section aria-label="مؤشرات الحساب" className={cn(KPI_CONTAINER, className)}>
      <div className={kpiGridClass(2)}>
        <Kpi
          label="المحصّل ناقص المصروفات"
          figure={<Amount amount={net} tone="auto" showSign />}
          badge={badgeFor(trend.net, 'up')}
          hint={thisMonth(trend.net.current, 'auto')}
          spark={monthSeries(flow.net, 'net', `الصافي الشهري خلال ${span}`)}
        />
        <Kpi
          label="نسبة التحصيل"
          figure={
            ratio === null ? (
              <span className="text-base font-medium text-fg-muted">لا مصروفات بعد</span>
            ) : (
              <span className="tabular-nums">
                <bdi dir="ltr">{ratio.toLocaleString('en-US', { maximumFractionDigits: 0 })}%</bdi>
              </span>
            )
          }
          badge={<PointsBadge points={ratio === null ? null : trend.ratio.deltaPoints} />}
          hint="من المصروفات"
          spark={
            ratioCurve.length >= 2 ? (
              monthSeries(ratioCurve, 'net', `نسبة التحصيل في نهاية كل شهر خلال ${span}`)
            ) : (
              <div aria-hidden className="h-11" />
            )
          }
        />
      </div>
      <p className="mt-2 px-1 text-2xs text-fg-muted">
        الشارة تقارن هذا الشهر حتى اليوم {trend.dayOfMonth} بالفترة نفسها من الشهر الماضي. والمنحنى يغطي {span}.
      </p>
    </section>
  );
}
