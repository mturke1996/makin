import { Amount, ProgressBar, Section, StatCard } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import { KPI_CONTAINER, kpiGridClass } from '../../../../design-system/charts';
import { PROFIT_BASE_LABELS } from '../../../../core/finance/clientProfitTotals';
import type { InsightAction } from '../../../../core/finance/clientInsights';
import { percentOf, type OverviewTrend } from '../../../../core/finance/clientAnalytics';
import { subtractMoney } from '../../../../core/finance/money';
import type { ClientSummary } from '../types';
import { badgeFor, monthSeries, thisMonth } from './kpiParts';

interface AccountFiguresProps {
  summary: ClientSummary;
  workersDue?: number;
  /** This month against last, and the monthly curves; leave out and the cards carry only their figure. */
  trend?: OverviewTrend;
  onAction?: (action: InsightAction) => void;
  unavailable?: readonly InsightAction[];
  className?: string;
}

/**
 * The financial board, built like the home page's: statistic cards straight on the page (no box around the
 * box), the account's three headline figures with their month and curve, then the agreed percentage, debts and
 * what workers are still owed. Columns follow the width of the block, so they follow the text size too.
 */
export function AccountFigures({ summary, workersDue, trend, onAction, unavailable = [], className }: AccountFiguresProps) {
  const open = (action: InsightAction) => (onAction && !unavailable.includes(action) ? () => onAction(action) : undefined);
  const months = trend?.flow.months.length ?? 0;
  const span = `آخر ${months} أشهر`;
  const deficit = summary.remaining < 0;
  // What the account owes in all (costs, debts and the agreed percentage): the balance is collected minus this.
  const owed = subtractMoney(summary.totalPaid, summary.remaining);
  const coverage = percentOf(summary.totalPaid, owed);
  const covered = coverage !== null ? Math.min(100, Math.floor(coverage)) : null;
  const hasPercentage = summary.profitPercentage > 0;
  const second = 2 + (workersDue !== undefined ? 1 : 0);

  return (
    <Section title="اللوحة المالية" description="التحصيل والصرف والصافي ومستحقات المشروع" className={cn(className)}>
      <div aria-label="ملخص حساب العميل" role="group" className={cn('space-y-2.5', KPI_CONTAINER)}>
        <div className={kpiGridClass(3)}>
          <StatCard
            label="إجمالي المدفوعات"
            value={<Amount amount={summary.totalPaid} tone="success" />}
            badge={trend && badgeFor(trend.collected, 'up')}
            hint={trend ? thisMonth(trend.collected.current) : 'المحصّل من العميل'}
            trend={trend && monthSeries(trend.flow.collected, 'income', `المحصّل الشهري خلال ${span}`)}
            onClick={open('payments')}
          />
          <StatCard
            label="إجمالي المصروفات"
            value={<Amount amount={summary.totalExpenses} tone="danger" />}
            badge={trend && badgeFor(trend.expenses, 'down')}
            hint={trend ? thisMonth(trend.expenses.current) : 'الصرف على المشروع'}
            trend={trend && monthSeries(trend.flow.expenses, 'expense', `المصروفات الشهرية خلال ${span}`)}
            onClick={open('expenses')}
          />
          <StatCard
            label={deficit ? 'عجز الحساب' : 'الصافي المتبقي'}
            value={<Amount amount={summary.remaining} tone={deficit ? 'danger' : 'brand'} />}
            hint="بعد المصروفات والديون والنسبة"
            trend={
              covered !== null && (
                <div className="space-y-1.5 !h-auto">
                  <div className="flex items-baseline justify-between gap-3 text-2xs text-fg-subtle">
                    <span>ما غُطّي من التزامات الحساب</span>
                    <span className="font-semibold tabular-nums text-fg"><bdi dir="ltr">{covered}%</bdi></span>
                  </div>
                  <ProgressBar value={covered} tone={covered >= 100 ? 'success' : covered >= 50 ? 'warning' : 'danger'} label="نسبة تغطية التزامات الحساب" />
                </div>
              )
            }
            onClick={open('statement')}
          />
        </div>

        <div className={cn('grid grid-cols-2 gap-2.5', second === 3 && '[&>*:last-child]:col-span-2 [@container_(min-width:40rem)]:grid-cols-3 [@container_(min-width:40rem)]:[&>*:last-child]:col-span-1')}>
          <StatCard
            label="النسبة المتفق عليها"
            value={hasPercentage ? <Amount amount={summary.profit} tone="warning" /> : <span className="text-base font-medium text-fg-muted">غير محددة</span>}
            hint={hasPercentage ? `${summary.profitPercentage}% ${PROFIT_BASE_LABELS[summary.profitBase]}` : 'لم تُحدد نسبة للعميل'}
            onClick={open('profit')}
          />
          <StatCard label="الديون المستحقة" value={<Amount amount={summary.totalDebts} tone="warning" />} hint="المتبقي من الديون" onClick={open('debts')} />
          {workersDue !== undefined && (
            <StatCard label="متبقي العمال" value={<Amount amount={workersDue} tone="brand" />} hint="مستحقات لم تُسدّد بعد" onClick={open('workers')} />
          )}
        </div>
      </div>
    </Section>
  );
}
