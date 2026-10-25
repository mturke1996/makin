import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Amount, Avatar, Badge, PageHeader, PageShell, ProgressBar, Segmented } from '../../design-system/primitives';
import { AttentionPanel, AttentionRow, type AttentionSeverity } from '../../design-system/primitives/AttentionPanel';
import { cn } from '../../design-system/primitives/cn';
import {
  ChartLegend,
  CompactAmount,
  FlowChart,
  KPI_CONTAINER,
  KpiCard,
  Sparkline,
  StatCell,
  StatGrid,
  kpiGridClass,
} from '../../design-system/charts';
import { CLIENT_STATUS_LABEL } from '../../core/finance/clientProject';
import { buildCompanyOverview, type ProjectRow } from '../../core/finance/companyOverview';
import { buildDashboard } from '../../core/finance/dashboardSeries';
import { localDay } from '../../core/finance/clientAnalytics';
import { useDataSlice } from '../../stores/useDataStore';
import { CashFlowCard } from '../pages-legacy/client-profile/overview/CashFlowCard';
import { SpendBreakdown } from '../pages-legacy/client-profile/overview/SpendBreakdown';
import { FigureStripSkeleton, ListSkeleton } from '../pages-legacy/money/moneyUi';
import { daysLabel } from './HomeDashboard';

type Period = '7' | '30' | '90';

interface Follow {
  key: string;
  severity: AttentionSeverity;
  title: string;
  reason: string;
  action: string;
  path: string;
  amount?: number;
}

/**
 * The company on one page, for the manager, in the same cards as Home: the period's figures with their trend, the
 * balances worth a glance, what needs a decision, every project as a card, the monthly cash flow and where the money
 * went. Every figure comes from the same rules as the project pages.
 */
export const CompanyPage = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30');
  const { clients, payments, expenses, standaloneDebts, workers, projectPhases, paymentMilestones, invoices, isLoading } = useDataSlice(
    'clients', 'payments', 'expenses', 'standaloneDebts', 'workers', 'projectPhases', 'paymentMilestones', 'invoices', 'isLoading',
  );

  const overview = useMemo(
    () => buildCompanyOverview({ clients, payments, expenses, debts: standaloneDebts, workers, phases: projectPhases, milestones: paymentMilestones, invoices }),
    [clients, payments, expenses, standaloneDebts, workers, projectPhases, paymentMilestones, invoices],
  );
  const days = Number(period);
  const today = localDay();
  const d = useMemo(
    () => buildDashboard({ income: payments.map((p) => ({ date: p.paymentDate, amount: p.amount })), expense: expenses.map((e) => ({ date: e.date, amount: e.amount })), endDay: today, days }),
    [payments, expenses, today, days],
  );
  const { totals, followUps, projects } = overview;
  const loading = isLoading && clients.length === 0;
  const span = daysLabel(days);

  const follows = ([
    followUps.overdueAmount > 0 && {
      key: 'overdue', severity: 'danger', title: 'دفعات متأخرة عند العملاء',
      reason: `${followUps.overdueClients} ${followUps.overdueClients === 1 ? 'عميل' : 'عملاء'} تأخروا عن موعد السداد`,
      action: 'فتح المتأخرات', path: '/receivables', amount: followUps.overdueAmount,
    },
    followUps.pendingApprovals > 0 && {
      key: 'approvals', severity: 'warning', title: `${followUps.pendingApprovals} ${followUps.pendingApprovals === 1 ? 'مصروف' : 'مصروفات'} بانتظار الاعتماد`,
      reason: 'سجّلها الموظفون ولم تُراجَع بعد', action: 'مراجعة المصروفات', path: '/expenses?status=pending', amount: followUps.pendingAmount,
    },
    followUps.phasesOver > 0 && {
      key: 'phases', severity: 'warning', title: `${followUps.phasesOver} ${followUps.phasesOver === 1 ? 'مرحلة تجاوزت' : 'مراحل تجاوزت'} ميزانيتها`,
      reason: 'المصروف الفعلي فوق ما خُصص لها', action: 'مراجعة المشاريع', path: '/clients',
    },
    followUps.priceRises > 0 && {
      key: 'prices', severity: 'warning', title: `${followUps.priceRises} ${followUps.priceRises === 1 ? 'مشترى' : 'مشتريات'} بسعر أعلى من المعتاد`,
      reason: 'خلال آخر 14 يوماً', action: 'مراجعة الأسعار', path: '/suppliers?tab=prices',
    },
    followUps.upcomingAmount > 0 && {
      key: 'upcoming', severity: 'info', title: 'دفعات متوقعة خلال 30 يوماً',
      reason: 'من جداول الدفعات والفواتير', action: 'عرض المستحقات', path: '/receivables', amount: followUps.upcomingAmount,
    },
  ] as (Follow | false)[]).filter((f): f is Follow => !!f);
  const counts = { danger: 0, warning: 0, info: 0 };
  for (const f of follows) counts[f.severity]++;

  return (
    <PageShell>
      <PageHeader
        title="لوحة الشركة"
        subtitle="كل المشاريع في نظرة واحدة"
        actions={
          <Segmented<Period>
            aria-label="فترة الأرقام"
            className="w-full sm:w-72"
            value={period}
            onChange={setPeriod}
            options={[
              { value: '7', label: daysLabel(7) },
              { value: '30', label: daysLabel(30) },
              { value: '90', label: daysLabel(90) },
            ]}
          />
        }
      />

      {loading ? (
        <>
          <FigureStripSkeleton />
          <ListSkeleton />
        </>
      ) : (
        <>
          <div className={KPI_CONTAINER}>
            <div className={kpiGridClass(4)}>
              <KpiCard label="التحصيل" amount={d.comparison.income.total} amountTone="success" delta={{ pct: d.comparison.income.changePct, favorable: 'up' }} hint={d.comparison.income.changePct === null ? `خلال ${span}` : 'عن الفترة السابقة'}>
                <Sparkline values={d.income} tone="income" label={`التحصيل اليومي خلال ${span}`} />
              </KpiCard>
              <KpiCard label="المصروفات" amount={d.comparison.expense.total} delta={{ pct: d.comparison.expense.changePct, favorable: 'down' }} hint={d.expenseShareOfIncome === null ? `خلال ${span}` : `${d.expenseShareOfIncome}% من التحصيل`}>
                <Sparkline values={d.expense} tone="expense" label={`المصروفات اليومية خلال ${span}`} />
              </KpiCard>
              <KpiCard label="صافي الحركة" amount={d.comparison.net.total} amountTone="auto" delta={{ pct: d.comparison.net.changePct, favorable: 'up' }} hint="المحصّل − المصروف">
                <Sparkline values={d.net} tone="net" label={`صافي الحركة اليومي خلال ${span}`} />
              </KpiCard>
              <KpiCard
                label="متأخر عند العملاء"
                amount={followUps.overdueAmount}
                amountTone={followUps.overdueAmount > 0 ? 'danger' : 'neutral'}
                hint={followUps.overdueClients > 0 ? `${followUps.overdueClients} ${followUps.overdueClients === 1 ? 'عميل' : 'عملاء'} · المتوقع ${Math.round(followUps.upcomingAmount).toLocaleString('en-US')} د.ل خلال 30 يوماً` : 'لا متأخرات'}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <StatGrid>
              <StatCell icon={null} label="إجمالي المحصّل" value={<CompactAmount amount={totals.collected} />} tone="success" hint="منذ بدء المشاريع" />
              <StatCell icon={null} label="إجمالي المصروفات" value={<CompactAmount amount={totals.spent} />} hint="كل المشاريع" />
              <StatCell icon={null} label="ديون متبقية" value={<CompactAmount amount={totals.debts} />} tone={totals.debts > 0 ? 'warning' : 'neutral'} onClick={() => navigate('/debts')} />
              <StatCell icon={null} label="مستحقات العمال" value={<CompactAmount amount={totals.workersOwed} />} tone={totals.workersOwed > 0 ? 'warning' : 'neutral'} onClick={() => navigate('/workers')} />
              <StatCell icon={null} label="نسبة الشركة المتفق عليها" value={<CompactAmount amount={totals.agreedProfit} />} tone="info" hint="على كل المشاريع" />
              <StatCell icon={null} label="الصافي منذ البداية" value={<CompactAmount amount={totals.net} />} tone={totals.net < 0 ? 'danger' : 'success'} hint="قبل الديون ونسبة الشركة" />
            </StatGrid>

            <section className="min-w-0 rounded-lg border border-border bg-surface-panel p-4 sm:p-5" aria-label="الوارد والصادر">
              <h2 className="text-lg font-bold text-fg">الوارد والصادر</h2>
              <p className="mt-1 text-sm leading-relaxed text-fg-subtle">
                الوارد <CompactAmount amount={d.comparison.income.total} className="font-semibold text-fg" />
                <span aria-hidden> · </span>
                الصادر <CompactAmount amount={d.comparison.expense.total} className="font-semibold text-fg" /> خلال {span}
              </p>
              <div className="mt-3">
                <ChartLegend items={[{ label: 'الوارد', tone: 'income' }, { label: 'الصادر', tone: 'expense' }]} />
              </div>
              <div className="mt-3">
                <FlowChart
                  days={d.days}
                  series={[{ id: 'income', label: 'الوارد', values: d.income, tone: 'income' }, { id: 'expense', label: 'الصادر', values: d.expense, tone: 'expense' }]}
                  height={200}
                  label={`الوارد والصادر خلال ${span}`}
                />
              </div>
            </section>
          </div>

          {follows.length > 0 && (
            <AttentionPanel title="تحتاج قرارك" counts={counts}>
              {follows.map((f) => (
                <AttentionRow
                  key={f.key}
                  title={f.title}
                  reason={f.reason}
                  severity={f.severity}
                  actionLabel={f.action}
                  onAction={() => navigate(f.path)}
                  amount={f.amount === undefined ? undefined : <Amount amount={f.amount} tone={f.severity === 'danger' ? 'danger' : 'inherit'} />}
                />
              ))}
            </AttentionPanel>
          )}

          <section aria-label="المشاريع" className="space-y-3">
            <h2 className="px-1 text-lg font-bold text-fg">المشاريع <span className="text-sm font-normal text-fg-muted">({projects.length})</span></h2>
            {projects.length === 0 ? (
              <p className="rounded-lg border border-border bg-surface-panel p-6 text-center text-sm text-fg-muted">لا مشاريع بعد.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {projects.map((p) => (
                  <ProjectCard key={p.client.id} row={p} onOpen={() => navigate(`/clients/${p.client.id}`)} />
                ))}
              </div>
            )}
          </section>

          <CashFlowCard payments={payments} expenses={expenses} today={today} />
          <SpendBreakdown expenses={expenses} showPeople />
        </>
      )}
    </PageShell>
  );
};

/** The edge colour says how the project stands before a word is read: green holds, amber needs a look, red is out of pocket. */
function stateOf(row: ProjectRow): { edge: string; tone: 'success' | 'warning' | 'danger' } {
  if (row.remaining < 0) return { edge: 'border-t-danger', tone: 'danger' };
  if (row.overdue > 0 || row.phasesOver > 0) return { edge: 'border-t-warning', tone: 'warning' };
  return { edge: 'border-t-success', tone: 'success' };
}

function Tile({ label, children, tone }: { label: string; children: React.ReactNode; tone?: 'success' | 'danger' | 'info' }) {
  return (
    <div className="min-w-0 rounded-md bg-surface-sunken px-3 py-2.5">
      <dt className="text-2xs text-fg-muted">{label}</dt>
      <dd className={cn('mt-0.5 truncate text-sm font-bold tabular-nums', tone === 'success' && 'text-success-ink', tone === 'danger' && 'text-danger-ink', tone === 'info' && 'text-info-ink', !tone && 'text-fg')}>{children}</dd>
    </div>
  );
}

function ProjectCard({ row, onOpen }: { row: ProjectRow; onOpen: () => void }) {
  const { edge, tone } = stateOf(row);
  const red = row.remaining < 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('block w-full min-w-0 rounded-lg border border-border border-t-4 bg-surface-panel p-4 text-start transition-colors duration-fast hover:bg-surface-hover focus:outline-none focus-visible:shadow-focus', edge, row.status === 'completed' && 'opacity-80')}
    >
      <div className="flex items-start gap-3">
        <Avatar name={row.client.name} shape={row.client.type === 'company' ? 'entity' : 'person'} tone={tone} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-fg">{row.client.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={row.status === 'active' ? 'success' : 'neutral'} dot>{CLIENT_STATUS_LABEL[row.status]}</Badge>
            {row.overdue > 0 && <Badge tone="danger">متأخر <Amount amount={row.overdue} bare /> د.ل</Badge>}
            {row.phasesOver > 0 && <Badge tone="warning">{row.phasesOver === 1 ? 'مرحلة فوق الميزانية' : `${row.phasesOver} مراحل فوق الميزانية`}</Badge>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs text-fg-muted">{red ? 'عجز المشروع' : 'المتبقي بعد المصروفات والنسبة'}</p>
          <Amount amount={Math.abs(row.remaining)} tone={red ? 'danger' : 'success'} className="text-xl font-bold" />
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Tile label="المحصّل" tone="success"><Amount amount={row.collected} bare /></Tile>
        <Tile label="المصروف"><Amount amount={row.spent} bare /></Tile>
        <Tile label="نسبة الشركة" tone="info">{row.agreedProfit > 0 ? <Amount amount={row.agreedProfit} bare /> : '—'}</Tile>
      </dl>

      {row.collectedShare !== null && (
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={row.collectedShare} tone={row.collectedShare >= 100 ? 'success' : 'brand'} label={`المحصّل من عقد ${row.client.name}`} />
          <span className="flex-none text-xs font-semibold tabular-nums text-fg-subtle">حُصّل <bdi dir="ltr">{Math.round(row.collectedShare)}%</bdi></span>
        </div>
      )}
    </button>
  );
}
