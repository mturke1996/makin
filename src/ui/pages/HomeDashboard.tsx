import type { ReactNode } from 'react';
import { AccountBalanceWallet, EventBusy, Engineering, ReceiptLong, RequestQuote } from '../../design-system/icons';
import { Skeleton } from '../../design-system/primitives';
import { cn } from '../../design-system/primitives/cn';
import {
  ChartLegend,
  CompactAmount,
  FlowChart,
  KpiCard,
  MiniBars,
  Sparkline,
  StatCell,
  StatGrid,
  type FlowSeries,
} from '../../design-system/charts';
import type { DashboardPlan, HomeGates, HomeStatKey } from './homeGates';
import { bucketSums, type HomeStats } from './homeStats';

/** «7 أيام»، «30 يوماً». */
export const daysLabel = (n: number) => (n >= 3 && n <= 10 ? `${n} أيام` : `${n} يوماً`);

/** «قيد واحد»، «قيدان»، «5 قيود»، «34 قيداً». */
const entriesLabel = (n: number) => (n === 1 ? 'قيد واحد' : n === 2 ? 'قيدان' : n >= 3 && n <= 10 ? `${n} قيود` : `${n} قيداً`);

/**
 * Columns follow the width of the block measured in rem, not the width of the screen, so they also follow
 * the text size: at 130% a half-width phone card can no longer hold "−33,211 د.ل" and the cards take a
 * row each, while at normal size the same phone shows two per row (≥ 22rem). Wide screens use more.
 * The wrapper is the size container; the grid inside reads its width.
 */
const CONTAINER = '[container-type:inline-size]';

// Tailwind reads class names from the source text, so every class is written out in full here.
function kpiGridClass(n: number): string {
  return cn(
    'grid grid-cols-1 gap-2.5',
    '[@container_(min-width:18rem)]:grid-cols-2',
    // an odd last card takes the whole row instead of leaving a hole
    '[@container_(min-width:18rem)]:[&>*:last-child:nth-child(odd)]:col-span-2',
    // wide blocks: one row of four (or three); the odd-card rule stops applying to a full row of three
    n >= 4 && '[@container_(min-width:40rem)]:grid-cols-4',
    n === 3 && '[@container_(min-width:40rem)]:grid-cols-3',
    n === 3 && '[@container_(min-width:40rem)]:[&>*:last-child:nth-child(odd)]:col-span-1',
  );
}


/* ─────────────────────────────────────────────────────────────────────────
   KPI cards
───────────────────────────────────────────────────────────────────────── */

export function HomeKpiGrid({ gates, stats, days, kpis }: { gates: HomeGates; stats: HomeStats; days: number; kpis: DashboardPlan['kpis'] }) {
  if (kpis.length === 0) return null;
  const d = stats.dashboard;
  const span = daysLabel(days);
  const own = gates.expenses === 'own';
  const income = d.comparison.income;
  const expense = d.comparison.expense;
  const net = d.comparison.net;
  // 90 bars would not fit a half-width card: long periods fold into blocks of 3 days.
  const bucket = days > 45 ? 3 : 1;

  const cards: Record<DashboardPlan['kpis'][number], ReactNode> = {
    income: (
      <KpiCard
        key="income"
        label="التحصيل"
        amount={income.total}
        delta={{ pct: income.changePct, favorable: 'up' }}
        hint={income.changePct === null ? `خلال ${span}` : 'عن الفترة السابقة'}
      >
        <Sparkline values={d.income} tone="income" label={`التحصيل اليومي خلال ${span}`} />
      </KpiCard>
    ),
    expenses: (
      <KpiCard
        key="expenses"
        label={own ? 'مصروفاتي' : 'المصروفات'}
        amount={expense.total}
        delta={{ pct: expense.changePct, favorable: 'down' }}
        hint={entriesLabel(d.expenseCount)}
      >
        <Sparkline values={d.expense} tone="expense" label={`${own ? 'مصروفاتي' : 'المصروفات'} اليومية خلال ${span}`} />
      </KpiCard>
    ),
    net: (
      <KpiCard
        key="net"
        label="صافي الحركة"
        amount={net.total}
        amountTone="auto"
        delta={{ pct: net.changePct, favorable: 'up' }}
        hint={d.expenseShareOfIncome === null ? undefined : `المصروف ${d.expenseShareOfIncome}% من الوارد`}
      >
        <Sparkline values={d.net} tone="net" label={`صافي الحركة اليومي خلال ${span}`} />
      </KpiCard>
    ),
    average: (
      <KpiCard
        key="average"
        label="متوسط المصروف اليومي"
        amount={d.dailyAverageExpense}
        delta={{ pct: expense.changePct, favorable: 'down' }}
        hint={`${span} في الفترة`}
      >
        <MiniBars
          values={bucketSums(d.expense, bucket)}
          tone="expense"
          groupSize={bucket === 1 ? 7 : 2}
          label={`${own ? 'مصروفاتي' : 'المصروف'} اليومي خلال ${span}`}
        />
      </KpiCard>
    ),
  };

  return (
    <div className={CONTAINER}>
      <div className={kpiGridClass(kpis.length)}>{kpis.map((k) => cards[k])}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Stat grid: the few balances worth a glance, each opening its page
───────────────────────────────────────────────────────────────────────── */

interface StatsProps {
  gates: HomeGates;
  stats: HomeStats;
  cells: HomeStatKey[];
  /** The person's own custody balance (null when unknown). */
  /** The pooled fund balance (custody managers). */
  pooledFund: number;
  onOpen: (path: string) => void;
}

export function HomeStatGrid({ gates, stats, cells, pooledFund, onOpen }: StatsProps) {
  if (cells.length === 0) return null;
  const sizeIcon = { fontSize: 24 };

  const items: Record<HomeStatKey, ReactNode> = {
    outstanding: stats.outstanding !== null && (
      <StatCell
        key="outstanding"
        icon={<ReceiptLong sx={sizeIcon} />}
        label="المطلوب تحصيله"
        value={<CompactAmount amount={stats.outstanding} />}
        tone={stats.outstanding > 0 ? 'warning' : 'neutral'}
        onClick={() => onOpen('/invoices')}
      />
    ),
    debts: stats.debtsRemaining !== null && (
      <StatCell
        key="debts"
        icon={<RequestQuote sx={sizeIcon} />}
        label="ديون متبقية"
        value={<CompactAmount amount={stats.debtsRemaining} />}
        tone={stats.debtsRemaining > 0 ? 'warning' : 'neutral'}
        onClick={() => onOpen('/debts')}
      />
    ),
    custody:
      gates.custodyKind === 'pooled' ? (
        <StatCell
          key="custody"
          icon={<AccountBalanceWallet sx={sizeIcon} />}
          label="رصيد العهد"
          value={<CompactAmount amount={pooledFund} />}
          tone={pooledFund < 0 ? 'danger' : 'neutral'}
          onClick={() => onOpen('/fund')}
        />
      ) : null,
    overdueInvoices: stats.overdueInvoices !== null && (
      <StatCell
        key="overdue"
        icon={<EventBusy sx={sizeIcon} />}
        label="فواتير متأخرة"
        value={<span className="tabular-nums">{stats.overdueInvoices}</span>}
        tone={stats.overdueInvoices > 0 ? 'danger' : 'neutral'}
        onClick={() => onOpen('/invoices')}
      />
    ),
    workers: stats.workersOwed !== null && (
      <StatCell
        key="workers"
        icon={<Engineering sx={sizeIcon} />}
        label="المتبقي للعمال"
        value={<CompactAmount amount={stats.workersOwed} />}
        tone={stats.workersOwed > 0 ? 'warning' : 'neutral'}
      />
    ),
  };

  const nodes = cells.map((c) => items[c]).filter(Boolean);
  if (nodes.length === 0) return null;
  // One column when the block is narrow for its text size, two otherwise (the grid's own filler cell only
  // matters in two columns), and a single cell always takes the whole row.
  const two = nodes.length > 1;
  return (
    <div className={CONTAINER}>
      <StatGrid
        className={two ? undefined : '!grid-cols-1'}
      >
        {nodes}
      </StatGrid>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Income versus expense
───────────────────────────────────────────────────────────────────────── */

export function HomeFlowCard({ gates, stats, days }: { gates: HomeGates; stats: HomeStats; days: number }) {
  const d = stats.dashboard;
  const span = daysLabel(days);
  const hasIncome = gates.income;
  const hasExpense = gates.expenses !== 'none';
  if (!hasIncome && !hasExpense) return null;

  const expenseName = gates.expenses === 'own' ? 'مصروفاتي' : 'المصروفات';
  const both = hasIncome && hasExpense;
  const title = both ? 'الوارد والصادر' : hasIncome ? 'التحصيل' : expenseName;

  const series: FlowSeries[] = [];
  if (hasIncome) series.push({ id: 'income', label: both ? 'الوارد' : 'التحصيل', values: d.income, tone: 'income' });
  if (hasExpense) series.push({ id: 'expense', label: both ? 'الصادر' : expenseName, values: d.expense, tone: 'expense' });

  const totals = (
    <>
      {both ? (
        <>
          الوارد <CompactAmount amount={d.comparison.income.total} className="font-semibold text-fg" />
          <span aria-hidden> · </span>
          الصادر <CompactAmount amount={d.comparison.expense.total} className="font-semibold text-fg" />
        </>
      ) : (
        <>
          الإجمالي <CompactAmount amount={hasIncome ? d.comparison.income.total : d.comparison.expense.total} className="font-semibold text-fg" />
        </>
      )}{' '}
      خلال {span}
    </>
  );

  return (
    <section className="min-w-0 rounded-lg border border-border bg-surface-panel p-4 sm:p-5" aria-label={title}>
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-fg-subtle">{totals}</p>
      <div className="mt-3">
        <ChartLegend items={series.map((s) => ({ label: s.label, tone: s.tone }))} />
      </div>
      <div className="mt-3">
        <FlowChart days={d.days} series={series} height={200} label={`${title} خلال ${span}`} />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Loading: same silhouette as the loaded dashboard
───────────────────────────────────────────────────────────────────────── */

export function HomeDashboardSkeleton({ plan }: { plan: DashboardPlan }) {
  return (
    <div aria-hidden className="space-y-6">
      {plan.kpis.length > 0 && (
        <div className={CONTAINER}>
          <div className={kpiGridClass(plan.kpis.length)}>
            {plan.kpis.map((k) => (
              <div key={k} className="space-y-3 rounded-lg border border-border bg-surface-panel p-4">
                <Skeleton height={14} width="50%" />
                <Skeleton height={26} width="70%" />
                <Skeleton height={56} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={cn('grid gap-6', plan.cells.length > 0 && plan.chart && 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]')}>
        {plan.cells.length > 0 && (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
            {plan.cells.map((c) => (
              <div key={c} className="flex min-h-20 items-center gap-3 bg-surface-panel p-4">
                <Skeleton circle width={44} height={44} />
                <div className="flex-1 space-y-2">
                  <Skeleton height={12} width="60%" />
                  <Skeleton height={18} width="45%" />
                </div>
              </div>
            ))}
          </div>
        )}
        {plan.chart && (
          <div className="space-y-3 rounded-lg border border-border bg-surface-panel p-4 sm:p-5">
            <Skeleton height={20} width="40%" />
            <Skeleton height={14} width="75%" />
            <Skeleton height={200} />
          </div>
        )}
      </div>
    </div>
  );
}

