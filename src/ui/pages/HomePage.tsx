import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Add,
  People,
  Receipt,
  Payments as PaymentsIcon,
  AccountBalance,
  Description,
  ReceiptLong,
  RequestQuote,
  ManageAccounts,
  WavingHand,
  Groups,
} from '../../design-system/icons';
import { useBrand } from '../../config/BrandProvider';
import { useAuthStore } from '../../stores/useAuthStore';
import { useDataSlice } from '../../stores/useDataStore';
import { useGlobalFundStore } from '../../stores/useGlobalFundStore';
import { useAccess } from '../../core/access/useAccess';
import type { AppModule } from '../../core/access';
import { useMyFundStats } from '../../core/hooks/useMyFundStats';
import { useSmartNav } from '../../core/agent/useSmartNav';
import { Amount, EmptyState, PageHeader, PageShell, Section, Segmented } from '../../design-system/primitives';
import { cn } from '../../design-system/primitives/cn';
import { HomeCustodyPledgeCard } from './HomeCustodyPledgeCard';
import { HomeAttention } from './HomeAttention';
import { HomeModuleList, type HomeModule } from './HomeModuleList';
import { HomeQuickActions, type QuickAction } from './HomeQuickActions';
import { HomeDashboardSkeleton, HomeFlowCard, HomeKpiGrid, HomeStatGrid, daysLabel } from './HomeDashboard';
import { buildAttentionItems } from './homeAttentionModel';
import { canOpenPath, homeGates, planDashboard } from './homeGates';
import { computeHomeStats } from './homeStats';
import { QuickAddFab, useCanQuickAdd } from '../quick-expense/QuickAddFab';

type Period = '7' | '30' | '90';

/**
 * Home: a quiet start of day.
 * greeting → dashboard (KPI cards, balances, income vs expense) → what needs attention →
 * quick actions → personal custody → shortcuts to every module.
 *
 * Everything below is drawn only from data the person may download and only with the permission that
 * governs it (see `homeGates`): no figure, shortcut or action appears that they could not use.
 */
export function HomePage() {
  const navigate = useNavigate();
  const brand = useBrand();
  const rtl = brand.direction === 'rtl';
  const t = useMemo(() => (ar: string, en: string) => (rtl ? ar : en), [rtl]);
  const user = useAuthStore((s) => s.user);
  const { payments, clients, expenses, invoices, standaloneDebts, workers, projectPhases, paymentMilestones, isLoading } = useDataSlice('payments', 'clients', 'expenses', 'invoices', 'standaloneDebts', 'workers', 'projectPhases', 'paymentMilestones', 'isLoading');
  const access = useAccess();
  const { frequent } = useSmartNav();
  const fundBalance = useGlobalFundStore((s) => s.getCurrentBalance());
  const myFundStats = useMyFundStats();
  const [period, setPeriod] = useState<Period>('30');
  const days = Number(period);

  const gates = useMemo(() => homeGates(access.principal), [access.principal]);
  const listable = useMemo(() => access.listableExpenses(expenses), [access, expenses]);
  const plan = useMemo(() => planDashboard(gates, myFundStats !== null), [gates, myFundStats]);
  const endDay = dayjs().locale('en').format('YYYY-MM-DD');

  const stats = useMemo(
    () =>
      computeHomeStats(gates, {
        payments,
        listableExpenses: listable,
        allExpenses: expenses,
        invoices,
        debts: standaloneDebts,
        workers,
        endDay,
        days,
      }),
    [gates, payments, listable, expenses, invoices, standaloneDebts, workers, endDay, days]
  );

  const attention = useMemo(
    () =>
      buildAttentionItems({
        invoices,
        payments,
        clients,
        debts: standaloneDebts,
        custody: gates.custody ? myFundStats : null,
        expenses: listable,
        phases: projectPhases,
        milestones: paymentMilestones,
        userId: user?.id,
        allow: {
          invoices: gates.overdueInvoices,
          invoiceAmounts: gates.overdueInvoiceAmounts,
          debts: gates.overdueDebts,
          custody: gates.custody,
          approvals: gates.approvals,
          corrections: gates.corrections,
          budgets: gates.budgets,
          schedule: gates.schedule,
        },
        t,
      }),
    [invoices, payments, clients, standaloneDebts, listable, projectPhases, paymentMilestones, user?.id, myFundStats, gates, t]
  );

  const firstName = user?.displayName?.trim().split(/\s+/)[0] || '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('صباح الخير', 'Good morning') : t('مساء الخير', 'Good evening');
  const today = new Date();
  const weekday = today.toLocaleDateString(rtl ? 'ar-u-nu-latn' : 'en-US', { weekday: 'long' });
  const dateLine = `${weekday} ${dayjs(today).format('DD/MM/YYYY')}`;

  const quickActions: QuickAction[] = [
    gates.newInvoice && {
      label: t('فاتورة جديدة', 'New invoice'),
      path: '/invoices/new',
      icon: <Add sx={{ fontSize: 22 }} />,
    },
    gates.newExpense && {
      label: t('مصروف', 'Expense'),
      path: '/expenses?new=1',
      icon: <ReceiptLong sx={{ fontSize: 20 }} />,
    },
    gates.newPayment && {
      label: t('دفعة', 'Payment'),
      path: '/payments?new=1',
      icon: <PaymentsIcon sx={{ fontSize: 20 }} />,
    },
  ].filter(Boolean) as QuickAction[];

  const unpaidCount = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').length;
  const allModules: (HomeModule & { module: AppModule })[] = [
    { module: 'workers', label: t('مركز العمال', 'Workers'), description: t('مستحقات العمال في جميع المشاريع', 'Worker balances across projects'), path: '/workers', Icon: Groups },
    {
      module: 'clients',
      label: t('العملاء', 'Clients'),
      description: countClients(clients.length, rtl),
      path: '/clients',
      Icon: People,
    },
    {
      module: 'invoices',
      label: t('الفواتير', 'Invoices'),
      description:
        unpaidCount > 0
          ? t(`${unpaidCount} غير مدفوعة`, `${unpaidCount} unpaid`)
          : t('كل الفواتير مسددة', 'All invoices settled'),
      path: '/invoices',
      Icon: Receipt,
    },
    {
      module: 'payments',
      label: t('المدفوعات', 'Payments'),
      description: t(`${payments.length} دفعة مسجلة`, `${payments.length} payments recorded`),
      path: '/payments',
      Icon: PaymentsIcon,
    },
    {
      module: 'balances',
      label: t('العهدات', 'Custody'),
      description: gates.pooledFund
        ? t('الإيداعات وأرصدة الموظفين', 'Deposits and staff balances')
        : t('عهدتك والمصروف منها', 'Your custody and what was spent from it'),
      path: '/fund',
      Icon: AccountBalance,
      // The pooled fund balance is a manager's figure; everyone else sees their own custody on that page.
      trailing: gates.pooledFund ? <Amount amount={fundBalance} tone="neutral" className="text-sm font-semibold" /> : undefined,
    },
    {
      module: 'expenses',
      label: t('المصروفات', 'Expenses'),
      description:
        access.expenseScope === 'all'
          ? t('تتبع التكاليف على المشاريع', 'Track project costs')
          : t('المصروفات التي سجّلتها', 'The expenses you recorded'),
      path: '/expenses',
      Icon: ReceiptLong,
    },
    {
      module: 'debts',
      label: t('الديون', 'Debts'),
      description: t('ديون العملاء والموردين', 'Client and supplier debts'),
      path: '/debts',
      Icon: RequestQuote,
    },
    {
      module: 'letters',
      label: t('الرسائل', 'Letters'),
      description: t('خطابات رسمية جاهزة للطباعة', 'Official letters ready to print'),
      path: '/letters',
      Icon: Description,
    },
    {
      module: 'users',
      label: t('المستخدمون', 'Users'),
      description: t('الحسابات والصلاحيات', 'Accounts and access'),
      path: '/users',
      Icon: ManageAccounts,
    },
  ];
  const modules = allModules.filter((m) => access.canAccessModule(m.module));

  const phones = [brand.contact.phone, brand.contact.phoneSecondary].filter(Boolean);

  const recent = frequent.filter((f) => canOpenPath(access.principal, f.path));
  const showCustody = gates.custody && !!myFundStats;
  const hasAside = quickActions.length > 0 || showCustody;
  const hasDashboard = plan.kpis.length > 0 || plan.cells.length > 0 || plan.chart;
  const canQuickAdd = useCanQuickAdd();
  const nothingToDo = modules.length === 0 && quickActions.length === 0 && !hasDashboard && !showCustody;

  return (
    <PageShell>
      <PageHeader
        title={firstName ? `${greeting}${rtl ? '،' : ','} ${firstName}` : greeting}
        subtitle={dateLine}
        actions={
          hasDashboard ? (
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
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2" aria-label="الوصول السريع">
        {access.can('workers.view') && <button type="button" onClick={() => navigate('/workers')} className="inline-flex min-h-12 items-center gap-2 rounded-md border border-border bg-surface-panel px-4 text-sm font-semibold text-fg"><Groups sx={{ fontSize: 21 }} />مركز العمال</button>}
        {access.can('clients.view') && <button type="button" onClick={() => navigate('/clients')} className="inline-flex min-h-12 items-center gap-2 rounded-md border border-border bg-surface-panel px-4 text-sm font-semibold text-fg"><People sx={{ fontSize: 21 }} />مشاريعي</button>}
      </div>
      {hasDashboard &&
        (isLoading ? (
          <HomeDashboardSkeleton plan={plan} />
        ) : (
          <>
            <HomeKpiGrid gates={gates} stats={stats} days={days} kpis={plan.kpis} />
            <div
              className={cn(
                'grid gap-6',
                plan.cells.length > 0 && plan.chart && 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start'
              )}
            >
              <HomeStatGrid
                gates={gates}
                stats={stats}
                cells={plan.cells}
                pooledFund={fundBalance}
                onOpen={navigate}
              />
              <HomeFlowCard gates={gates} stats={stats} days={days} />
            </div>
          </>
        ))}

      {nothingToDo ? (
        <EmptyState
          Icon={WavingHand}
          title={t('أهلاً بك', 'Welcome')}
          description={t(
            'لم تُفتح لك أقسام بعد. يحدد مدير النظام ما يظهر لك، فاطلب منه إضافة ما تحتاجه.',
            'No sections are open to you yet. Your administrator decides what you see, so ask them to add what you need.'
          )}
        />
      ) : (
        /*
          Phones: attention → actions → custody → shortcuts (the `order-*` classes; the two
          wrappers dissolve with `contents`). Desktop: main column + a 21rem aside (only when it has content).
        */
        <div
          className={cn(
            'flex flex-col gap-6',
            hasAside && 'lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start'
          )}
        >
          <div className="contents lg:block lg:space-y-6">
            <HomeAttention
              className="order-1"
              title={t('تحتاج انتباهاً', 'Needs attention')}
              items={attention}
              onOpen={navigate}
            />
            <div className={cn('order-4 space-y-6')}>
              {recent.length > 0 && (
                <Section title={t('زُرت مؤخراً', 'Recent')}>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((f) => (
                      <button
                        key={f.path}
                        type="button"
                        onClick={() => navigate(f.path)}
                        className="inline-flex h-11 items-center rounded-full border border-border bg-surface-panel px-4 text-sm font-semibold text-fg-subtle transition-[background-color,color] duration-fast ease-out hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:shadow-focus"
                      >
                        {prettifyPath(f.path, rtl)}
                      </button>
                    ))}
                  </div>
                </Section>
              )}
              <HomeModuleList
                title={t('الأقسام', 'Sections')}
                modules={modules}
                loading={isLoading}
                onOpen={navigate}
              />
            </div>
          </div>

          {hasAside && (
            <div className="contents lg:block lg:space-y-6">
              <HomeQuickActions
                className="order-2"
                label={t('إجراءات سريعة', 'Quick actions')}
                actions={quickActions}
                onOpen={navigate}
              />
              {showCustody && myFundStats && (
                <HomeCustodyPledgeCard
                  className="order-3"
                  stats={myFundStats}
                  rtl={rtl}
                  onOpen={() => navigate('/fund')}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* The quick-add button floats over the end of the page: leave it room so it never covers the last lines. */}
      <footer className={cn('space-y-1 pt-2 text-center text-2xs text-fg-muted', canQuickAdd && 'pb-16 lg:pb-20')}>
        <p>
          {brand.fullName} © {today.getFullYear()}
        </p>
        {phones.length > 0 && (
          <p className="tabular-nums" dir="ltr">
            {phones.join(' · ')}
          </p>
        )}
      </footer>

      <QuickAddFab />
    </PageShell>
  );
}

/** Arabic count nouns: 1, 2, 3-10, 11+ take different forms. */
function countClients(n: number, rtl: boolean): string {
  if (!rtl) return n === 1 ? '1 client' : `${n} clients`;
  if (n === 0) return 'لا يوجد عملاء بعد';
  if (n === 1) return 'عميل واحد';
  if (n === 2) return 'عميلان';
  if (n <= 10) return `${n} عملاء`;
  return `${n} عميلاً`;
}

function prettifyPath(path: string, rtl: boolean): string {
  if (path === '/') return rtl ? 'الرئيسية' : 'Dashboard';
  const map: Record<string, [string, string]> = {
    '/clients': ['Clients', 'العملاء'],
    '/invoices': ['Invoices', 'الفواتير'],
    '/invoices/new': ['New invoice', 'فاتورة جديدة'],
    '/payments': ['Payments', 'المدفوعات'],
    '/fund': ['Custody', 'العهدات'],
    '/expenses': ['Expenses', 'المصروفات'],
    '/expenses/invoices': ['Expense invoices', 'فواتير المصروفات'],
    '/debts': ['Debts', 'الديون'],
    '/letters': ['Letters', 'الرسائل'],
    '/users': ['Users', 'المستخدمون'],
    '/settings/branding': ['Branding', 'العلامة التجارية'],
    '/settings/audit': ['Audit log', 'سجل التدقيق'],
  };
  const hit = map[path];
  if (hit) return rtl ? hit[1] : hit[0];
  const segs = path.split('/').filter(Boolean);
  return segs.map((s) => s[0]?.toUpperCase() + s.slice(1)).join(' › ');
}
