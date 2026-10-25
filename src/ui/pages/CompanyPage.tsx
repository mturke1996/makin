import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Amount, Avatar, Badge, FigureStrip, ListGroup, PageHeader, PageShell, ProgressBar } from '../../design-system/primitives';
import { AttentionPanel, AttentionRow, type AttentionSeverity } from '../../design-system/primitives/AttentionPanel';
import { CLIENT_STATUS_LABEL } from '../../core/finance/clientProject';
import { buildCompanyOverview, type ProjectRow } from '../../core/finance/companyOverview';
import { localDay } from '../../core/finance/clientAnalytics';
import { useDataSlice } from '../../stores/useDataStore';
import { CashFlowCard } from '../pages-legacy/client-profile/overview/CashFlowCard';
import { SpendBreakdown } from '../pages-legacy/client-profile/overview/SpendBreakdown';
import { FigureStripSkeleton, ListSkeleton } from '../pages-legacy/money/moneyUi';

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
 * The company on one page, for the manager: the totals, what needs a decision, how every project stands, the monthly
 * cash flow and where the money went. Every figure comes from the same rules as the project pages.
 */
export const CompanyPage = () => {
  const navigate = useNavigate();
  const { clients, payments, expenses, standaloneDebts, workers, projectPhases, paymentMilestones, invoices, isLoading } = useDataSlice(
    'clients', 'payments', 'expenses', 'standaloneDebts', 'workers', 'projectPhases', 'paymentMilestones', 'invoices', 'isLoading',
  );

  const overview = useMemo(
    () => buildCompanyOverview({ clients, payments, expenses, debts: standaloneDebts, workers, phases: projectPhases, milestones: paymentMilestones, invoices }),
    [clients, payments, expenses, standaloneDebts, workers, projectPhases, paymentMilestones, invoices],
  );
  const { totals, followUps, projects } = overview;
  const loading = isLoading && clients.length === 0;
  const today = localDay();

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
      <PageHeader title="لوحة الشركة" subtitle="كل المشاريع في نظرة واحدة" />

      {loading ? (
        <>
          <FigureStripSkeleton />
          <ListSkeleton />
        </>
      ) : (
        <>
          <FigureStrip
            figures={[
              { label: 'المحصّل من العملاء', value: <Amount amount={totals.collected} tone="success" />, tone: 'success' },
              { label: 'المصروفات', value: <Amount amount={totals.spent} /> },
              { label: 'الصافي (محصّل − مصروف)', value: <Amount amount={totals.net} tone={totals.net < 0 ? 'danger' : 'inherit'} showSign={totals.net !== 0} />, tone: totals.net < 0 ? 'danger' : 'neutral' },
              { label: 'متأخر عند العملاء', value: <Amount amount={followUps.overdueAmount} tone={followUps.overdueAmount > 0 ? 'danger' : 'inherit'} />, tone: followUps.overdueAmount > 0 ? 'danger' : 'neutral' },
            ]}
          />
          <FigureStrip
            mobileCols={3}
            figures={[
              { label: 'ديون متبقية', value: <Amount amount={totals.debts} /> },
              { label: 'مستحقات العمال', value: <Amount amount={totals.workersOwed} /> },
              { label: 'نسبة الشركة المتفق عليها', value: <Amount amount={totals.agreedProfit} />, hint: 'على كل المشاريع' },
            ]}
          />

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

          <section aria-label="المشاريع" className="space-y-2">
            <h2 className="px-1 text-lg font-bold text-fg">المشاريع <span className="text-sm font-normal text-fg-muted">({projects.length})</span></h2>
            {projects.length === 0 ? (
              <p className="rounded-lg border border-border bg-surface-panel p-6 text-center text-sm text-fg-muted">لا مشاريع بعد.</p>
            ) : (
              <ListGroup>
                {projects.map((p) => (
                  <ProjectItem key={p.client.id} row={p} onOpen={() => navigate(`/clients/${p.client.id}`)} />
                ))}
              </ListGroup>
            )}
          </section>

          <CashFlowCard payments={payments} expenses={expenses} today={today} />
          <SpendBreakdown expenses={expenses} showPeople />
        </>
      )}
    </PageShell>
  );
};

function ProjectItem({ row, onOpen }: { row: ProjectRow; onOpen: () => void }) {
  const red = row.remaining < 0;
  return (
    <button type="button" onClick={onOpen} className="block w-full px-4 py-4 text-start transition-colors duration-fast hover:bg-surface-hover focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]">
      <div className="flex items-start gap-3">
        <Avatar name={row.client.name} shape={row.client.type === 'company' ? 'entity' : 'person'} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-fg">{row.client.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={row.status === 'active' ? 'success' : 'neutral'} dot>{CLIENT_STATUS_LABEL[row.status]}</Badge>
            {row.overdue > 0 && <Badge tone="danger">متأخر <Amount amount={row.overdue} bare /> د.ل</Badge>}
            {row.phasesOver > 0 && <Badge tone="warning">{row.phasesOver === 1 ? 'مرحلة تجاوزت ميزانيتها' : `${row.phasesOver} مراحل تجاوزت ميزانيتها`}</Badge>}
          </div>
        </div>
        <div className="flex-none text-end">
          <p className="text-2xs text-fg-muted">{red ? 'العجز' : 'المتبقي'}</p>
          <Amount amount={Math.abs(row.remaining)} tone={red ? 'danger' : 'success'} className="text-md font-bold" />
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3 ps-12">
        <div className="min-w-0">
          <dt className="text-2xs text-fg-muted">المحصّل</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg"><Amount amount={row.collected} /></dd>
        </div>
        <div className="min-w-0">
          <dt className="text-2xs text-fg-muted">المصروف</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg"><Amount amount={row.spent} /></dd>
        </div>
        <div className="min-w-0">
          <dt className="text-2xs text-fg-muted">نسبة الشركة</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">{row.agreedProfit > 0 ? <Amount amount={row.agreedProfit} /> : <span className="text-fg-muted">—</span>}</dd>
        </div>
      </dl>
      {row.collectedShare !== null && (
        <div className="mt-3 flex items-center gap-3 ps-12">
          <ProgressBar value={row.collectedShare} tone={row.collectedShare >= 100 ? 'success' : 'brand'} label={`المحصّل من عقد ${row.client.name}`} />
          <span className="flex-none text-xs font-semibold tabular-nums text-fg-subtle">حُصّل <bdi dir="ltr">{Math.round(row.collectedShare)}%</bdi> من العقد</span>
        </div>
      )}
    </button>
  );
}
