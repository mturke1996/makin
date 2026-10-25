import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowForward, ExpandMore, PostAdd, Payment as PaymentIcon, PersonOff, ReceiptLong } from '../../design-system/icons';
import { Button, Card, CardHeader, CardTitle, CardDescription, ClientProfileHero, EmptyState, PageShell } from '../../design-system/primitives';
import { cn } from '../../design-system/primitives/cn';
import { expenseReadOnlyNotice, isExpenseLocked } from '../../core/finance/expenseLock';
import { useDataStore } from '../../stores/useDataStore';
import { useAccess } from '../../core/access/useAccess';
import { useAuthStore } from '../../stores/useAuthStore';
import { sumBoqItems } from '../../core/finance/projectBudget';
import { scheduleHighlights } from '../../core/finance/paymentSchedule';
import { advanceTotal, workerProgressView } from '../../core/finance/workerProgress';
import { buildCategoryBudgetRows } from '../../core/finance/budgetStatus';
import { getExpenseCategoryLabel } from '../../core/utils-formatters';
import { PROFIT_BASE_LABELS, resolveProfitBase } from '../../core/finance/clientProfitTotals';
import { CLIENT_STATUS_LABEL, resolveClientStatus } from '../../core/finance/clientProject';
import { sumMoney } from '../../core/finance/workerLedger';
import type {
  BoqLineItem,
  ClientProfitBase,
  Expense,
  Payment,
  PaymentMilestone,
  ProjectPhase,
  SiteReport,
  StandaloneDebt,
  UserBalance,
} from '../../types';
import { BalanceFormSheet } from './client-profile/BalanceFormSheet';
import { BalancesSheet } from './client-profile/BalancesSheet';
import { BoqFormSheet } from './client-profile/BoqFormSheet';
import { BoqSheet } from './client-profile/BoqSheet';
import { ClientModules } from './client-profile/ClientModules';
import { ClientPersonalSummary } from './client-profile/ClientPersonalSummary';
import { ClientProfileSkeleton } from './client-profile/ClientProfileSkeleton';
import { ClientActivitySheet, ClientStatementSheet } from './client-profile/activity';
import { ClientDetailsCard } from './client-profile/details';
import { DebtFormSheet } from './client-profile/DebtFormSheet';
import { DebtsSheet } from './client-profile/DebtsSheet';
import { EditClientFormSheet } from './client-profile/EditClientFormSheet';
import { ExpenseFormSheet } from './client-profile/ExpenseFormSheet';
import { ExpensesSheet } from './client-profile/ExpensesSheet';
import { buildClientInvoices } from './client-profile/invoices/clientInvoices';
import { ClientInvoicesSheet } from './client-profile/invoices';
import { ClientLettersSheet } from './client-profile/letters';
import { PdfActions } from './client-profile/LedgerParts';
import { ClientOverview, type InsightAction } from './client-profile/overview';
import { PaymentFormSheet } from './client-profile/PaymentFormSheet';
import { PaymentsSheet } from './client-profile/PaymentsSheet';
import { GenerateScheduleSheet } from './client-profile/GenerateScheduleSheet';
import { MilestoneFormSheet } from './client-profile/MilestoneFormSheet';
import { PhaseFormSheet } from './client-profile/PhaseFormSheet';
import { PhasesSheet } from './client-profile/PhasesSheet';
import { ProfitRuleModal } from './client-profile/ProfitRuleModal';
import { ScheduleSheet } from './client-profile/ScheduleSheet';
import { SiteReportFormSheet } from './client-profile/SiteReportFormSheet';
import { SiteReportsSheet } from './client-profile/SiteReportsSheet';
import { WorkersFlow } from './client-profile/workers';
import { useClientDeletes } from './client-profile/useClientDeletes';
import { useClientExtras } from './client-profile/useClientExtras';
import { useClientPdf } from './client-profile/useClientPdf';
import { useClientProfileData } from './client-profile/useClientProfileData';
import { useClientSaves, type ProfileSheetKey } from './client-profile/useClientSaves';
import { QuickAddFab } from '../quick-expense/QuickAddFab';
import { ReceiptPanel } from './money/ReceiptPanel';
import { useReceipt } from './money/useReceipt';

/** The form open over the page (and the record it edits, when it edits one). */
type ActiveForm =
  | { kind: 'payment'; edit?: Payment | null }
  | { kind: 'expense'; edit?: Expense | null }
  | { kind: 'debt'; edit?: StandaloneDebt | null }
  | { kind: 'balance'; edit?: UserBalance | null; userId?: string }
  | { kind: 'phase'; edit?: ProjectPhase | null }
  | { kind: 'boq'; edit?: BoqLineItem | null }
  | { kind: 'milestone'; edit?: PaymentMilestone | null }
  | { kind: 'generateSchedule' }
  | { kind: 'siteReport'; edit?: SiteReport | null }
  | { kind: 'editClient' }
  | { kind: 'profit' };

/** Client profile: who the client is, how their account stands, and every record type behind it. */
export const ClientProfilePage = () => {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const access = useAccess();
  const receipt = useReceipt();
  const approveExpenses = useDataStore((s) => s.approveExpenses);
  const rejectExpense = useDataStore((s) => s.rejectExpense);
  const data = useClientProfileData(clientId);
  const { client, summary, userBalancesSummary, clientPhases, caps } = data;
  const { clientInvoices, clientLetters } = useClientExtras(clientId, caps);
  const invoiceView = useMemo(
    () => buildClientInvoices({ invoices: clientInvoices, payments: data.clientPayments, paymentsKnown: caps.payments }),
    [clientInvoices, data.clientPayments, caps.payments]
  );

  // Each action appears only for the exact permission the Firestore rules ask for.
  const may = {
    editClient: access.can('clients.manage'),
    deleteClient: access.can('clients.delete'),
    addExpense: access.can('expenses.create'),
    managePayments: access.can('payments.manage'),
    deletePayments: access.can('payments.delete'),
    manageDebts: access.can('debts.manage'),
    deleteDebts: access.can('debts.delete'),
    manageCustody: access.can('custody.manage'),
    manageProjects: access.can('projects.manage'),
    manageInvoices: access.can('invoices.manage'),
    manageSchedule: access.can('payments.manage'),
    manageLetters: access.can('letters.manage'),
  };
  // The agreed percentage is a client edit, and only makes sense next to the full account it is computed from.
  const canEditProfit = may.editClient && caps.showSummary;

  // The estimate by category is a comparison, so it needs every expense of the client.
  const categoryRows = useMemo(
    () => (caps.expenseScope === 'all' && caps.projects ? buildCategoryBudgetRows(data.clientBoqItems, data.clientExpenses, getExpenseCategoryLabel) : []),
    [caps.expenseScope, caps.projects, data.clientBoqItems, data.clientExpenses],
  );

  // The late and coming instalments, for the attention list.
  const insightSchedule = useMemo(() => scheduleHighlights(data.schedule), [data.schedule]);

  // Workers whose payments run ahead of the progress the supervisor approved.
  const workersAhead = useMemo(
    () =>
      data.workerEntries
        .map(({ worker, ledger }) => ({ worker, view: workerProgressView({ agreed: ledger.agreed, paid: ledger.paid, percent: worker.workProgressPercent, advances: advanceTotal(ledger.payments) }) }))
        .filter(({ worker, view }) => !worker.archivedAt && (view.state === 'ahead' || view.state === 'far_ahead'))
        .map(({ worker, view }) => ({ name: worker.name, aheadBy: view.aheadBy, far: view.state === 'far_ahead' })),
    [data.workerEntries],
  );

  const [activeSheet, setActiveSheet] = useState<ProfileSheetKey | null>(null);
  // A link may open a section straight away (?section=workers|phases|boq|expenses), when this person may see it.
  useEffect(() => {
    const wanted = searchParams.get('section');
    const allowed: Record<string, boolean> = { schedule: caps.payments, invoices: caps.invoices, workers: caps.workers, phases: caps.projects, boq: caps.projects, expenses: caps.expenseScope !== 'none' };
    if (wanted && allowed[wanted]) setActiveSheet(wanted as ProfileSheetKey);
  }, [searchParams, caps.workers, caps.projects, caps.payments, caps.invoices, caps.expenseScope]);
  const [activeForm, setActiveForm] = useState<ActiveForm | null>(null);
  const [profitPercentage, setProfitPercentage] = useState('');
  const [profitBase, setProfitBase] = useState<ClientProfitBase>('expenses');

  // The percentage editor starts from what is saved on the client.
  const loadedId = client?.id;
  const savedPercentage = client?.profitPercentage;
  const savedBase = client?.profitBase;
  useEffect(() => {
    if (!loadedId) return;
    setProfitPercentage(savedPercentage?.toString() || '');
    setProfitBase(resolveProfitBase({ profitBase: savedBase }));
  }, [loadedId, savedPercentage, savedBase]);

  // A form opened from the activity feed or the statement returns there when it is saved or dismissed.
  const returnSheet = useRef<ProfileSheetKey | null>(null);
  const closeForm = () => {
    returnSheet.current = null;
    setActiveForm(null);
  };
  const pdf = useClientPdf({
    client,
    expenses: data.clientExpenses,
    payments: data.clientPayments,
    debts: data.clientDebts,
    workers: data.clientWorkers,
    budget: caps.expenseScope === 'all' && caps.projects ? { phases: data.phaseBudgetRows, categories: categoryRows } : undefined,
    schedule: caps.payments ? data.schedule : undefined,
    summary,
  });
  const deletes = useClientDeletes({ closeForm });
  const saves = useClientSaves({
    clientId,
    systemUsers: data.systemUsers,
    phaseCount: clientPhases.length,
    milestoneCount: data.clientMilestones.length,
    afterSave: (sheet) => {
      const back = returnSheet.current;
      returnSheet.current = null;
      setActiveForm(null);
      const next = back ?? sheet;
      if (next) setActiveSheet(next);
    },
  });

  if (!client) {
    if (data.isLoading) return <ClientProfileSkeleton />;
    return (
      <PageShell>
        <EmptyState
          Icon={PersonOff}
          title="العميل غير موجود"
          description="ربما حُذف هذا العميل أو أن الرابط غير صحيح. ارجع إلى قائمة العملاء واختر من هناك."
          action={<Button onClick={() => navigate('/clients')}>العودة إلى العملاء</Button>}
        />
      </PageShell>
    );
  }

  // Only the top layer may close (a form over a sheet, a dialog over a form).
  const closeSheet = () => {
    if (activeForm || deletes.confirmOpen) return;
    setActiveSheet(null);
  };
  const dismissForm = () => {
    if (!deletes.confirmOpen) closeForm();
  };
  const closeProfit = () => {
    setProfitPercentage(client.profitPercentage?.toString() || '');
    setProfitBase(resolveProfitBase(client));
    closeForm();
  };

  // One primary action: the most common one this user is allowed to do.
  const quickActions = [
    may.addExpense && {
      key: 'expense',
      label: 'إضافة مصروف',
      shortLabel: 'مصروف',
      Icon: ReceiptLong,
      run: () => setActiveForm({ kind: 'expense', edit: null }),
    },
    may.managePayments && {
      key: 'payment',
      label: 'إضافة دفعة',
      shortLabel: 'دفعة',
      Icon: PaymentIcon,
      run: () => setActiveForm({ kind: 'payment', edit: null }),
    },
    may.manageInvoices && {
      key: 'invoice',
      label: 'فاتورة جديدة',
      shortLabel: 'فاتورة',
      Icon: PostAdd,
      run: () => navigate(`/invoices/new?clientId=${clientId}`),
    },
  ].filter((a): a is NonNullable<typeof a> => !!a);

  const latestProgress = data.clientSiteReports.find((r) => r.progressPercent != null)?.progressPercent;

  // A row tapped in the activity feed or the statement opens its form (read-only for what this person may not
  // change); a record they have no form for opens the sheet it belongs to.
  const openFromFeed = (kind: 'expense' | 'worker' | 'payment' | 'debt' | 'custody' | 'siteReport' | 'phase', id: string) => {
    const from = activeSheet === 'activity' || activeSheet === 'statement' ? activeSheet : null;
    const openForm = (form: ActiveForm) => {
      returnSheet.current = from;
      setActiveForm(form);
    };
    switch (kind) {
      case 'expense':
      case 'worker': {
        const edit = data.clientExpenses.find((e) => e.id === id);
        if (edit) openForm({ kind: 'expense', edit });
        else setActiveSheet(kind === 'worker' ? 'workers' : 'expenses');
        return;
      }
      case 'payment': {
        const edit = data.clientPayments.find((p) => p.id === id);
        if (edit && may.managePayments) openForm({ kind: 'payment', edit });
        else setActiveSheet('payments');
        return;
      }
      case 'debt': {
        const edit = data.clientDebts.find((d) => d.id === id);
        if (edit && may.manageDebts) openForm({ kind: 'debt', edit });
        else setActiveSheet('debts');
        return;
      }
      case 'custody': {
        const edit = data.clientUserBalances.find((b) => b.id === id);
        if (edit && may.manageCustody) openForm({ kind: 'balance', edit });
        else setActiveSheet('balances');
        return;
      }
      case 'siteReport': {
        const edit = data.clientSiteReports.find((r) => r.id === id);
        if (edit && may.manageProjects) openForm({ kind: 'siteReport', edit });
        else setActiveSheet('siteReports');
        return;
      }
      case 'phase': {
        const edit = clientPhases.find((p) => p.id === id);
        if (edit && may.manageProjects) openForm({ kind: 'phase', edit });
        else setActiveSheet('phases');
        return;
      }
    }
  };

  // A tapped insight opens the sheet or form it is about; ones this person has no way into stay plain text.
  const openInsight = (action: InsightAction) => {
    if (action === 'profit') {
      if (canEditProfit) setActiveForm({ kind: 'profit' });
      return;
    }
    setActiveSheet(action);
  };
  const unavailableInsights: InsightAction[] = [
    !canEditProfit && 'profit',
    caps.expenseScope === 'none' && 'expenses',
    !caps.payments && 'payments',
    !caps.payments && 'schedule',
    !caps.debts && 'debts',
    !caps.workers && 'workers',
    !caps.custody && 'balances',
    !caps.projects && 'phases',
    !caps.projects && 'boq',
    !caps.invoices && 'invoices',
    !caps.showSummary && 'statement',
  ].filter((a): a is InsightAction => !!a);

  const renderModules = (section: 'all' | 'shortcuts') => (
    <ClientModules
      section={section}
      summary={summary}
      caps={caps}
      canEditProfit={canEditProfit}
      onOpenSheet={setActiveSheet}
      onOpenProfit={() => setActiveForm({ kind: 'profit' })}
      stats={{
        expenses: data.clientExpenses.length,
        payments: data.clientPayments.length,
        debts: data.clientDebts.length,
        workers: data.clientWorkers.length,
        balances: data.clientUserBalances.length,
        phases: clientPhases.length,
        boq: data.clientBoqItems.length,
        reports: data.clientSiteReports.length,
        custodyRemaining: sumMoney(Object.values(userBalancesSummary).map((b) => b.remaining)),
        custodyGiven: sumMoney(Object.values(userBalancesSummary).map((b) => b.given)),
        custodyExact: data.custodyExact,
        phasesBudget: sumMoney(data.phaseBudgetRows.map((r) => r.budget)),
        boqTotal: sumBoqItems(data.clientBoqItems),
        latestProgress,
        invoices: clientInvoices.length,
        invoicesRemaining: caps.payments ? invoiceView.totals.remaining : null,
        invoicesOverdue: invoiceView.totals.overdueCount,
        letters: clientLetters.length,
        milestones: data.schedule.rows.length,
        scheduleRemaining: data.schedule.remaining,
        scheduleOverdue: data.schedule.overdueCount,
      }}
    />
  );

  return (
    <PageShell width="7xl">
          <ClientProfileHero
            desktopCompact
            initial={client.name.charAt(0)}
            isCompany={client.type === 'company'}
            clientName={client.name}
            statusLabel={CLIENT_STATUS_LABEL[resolveClientStatus(client)]}
            phone={client.phone}
            address={client.address}
            profitPercentage={summary.profitPercentage}
            profitBaseLabel={PROFIT_BASE_LABELS[summary.profitBase]}
            showProfitBadge={caps.showSummary && summary.profitPercentage > 0}
            onSettings={may.editClient ? () => setActiveForm({ kind: 'editClient' }) : undefined}
            actions={
              quickActions.length > 0 ? (
                <div className={cn('grid w-full gap-2', quickActions.length === 3 ? 'grid-cols-3' : quickActions.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
                  {quickActions.map(({ key, label, shortLabel, Icon, run }) => (
                    <button
                      key={key}
                      type="button"
                      aria-label={label}
                      className={cn('client-hero-action flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-2xs font-semibold focus:outline-none focus-visible:shadow-focus', key === 'invoice' ? 'client-hero-action-primary' : 'border-[var(--client-hero-border)] bg-[var(--client-hero-tint)] text-[var(--client-hero-fg)]')}
                      onClick={run}
                    >
                      <Icon sx={{ fontSize: 18 }} aria-hidden />
                      {shortLabel}
                    </button>
                  ))}
                </div>
              ) : undefined
            }
          />

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 xl:gap-8">
        <div className="min-w-0 space-y-4 lg:order-2 lg:col-span-8 xl:col-span-9">
          {caps.showSummary ? (
            <ClientOverview
              summary={summary}
              expenses={data.clientExpenses}
              payments={data.clientPayments}
              debts={data.clientDebts}
              workerSummary={caps.workers ? { remaining: summary.totalWorkersDue } : undefined}
              phaseBudgetRows={data.phaseBudgetRows}
              categoryBudgetRows={categoryRows}
              custody={userBalancesSummary}
              invoices={caps.invoices ? clientInvoices : undefined}
              schedule={insightSchedule}
              workersAhead={caps.workers ? workersAhead : undefined}
              expenseScope={caps.expenseScope}
              onAction={openInsight}
              unavailableActions={unavailableInsights}
              onAddPayment={may.managePayments ? () => setActiveForm({ kind: 'payment', edit: null }) : undefined}
              onAddExpense={may.addExpense ? () => setActiveForm({ kind: 'expense', edit: null }) : undefined}
              loading={data.isLoading}
              afterInsights={renderModules('all')}
            />
          ) : (
            <>
              {(caps.expenseScope !== 'none' || data.currentUserBalanceInfo) && (
                <ClientPersonalSummary
                  scope={caps.expenseScope}
                  expensesTotal={summary.totalExpenses}
                  expensesCount={data.clientExpenses.length}
                  custody={data.currentUserBalanceInfo}
                />
              )}
              {renderModules('all')}
            </>
          )}
          <details open className="group rounded-lg border border-border bg-surface-panel">
            <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-fg">بيانات المشروع<ExpandMore className="shrink-0 text-fg-muted transition-transform group-open:rotate-180" sx={{ fontSize: 20 }} aria-hidden /></summary>
            <ClientDetailsCard client={client} caps={caps} collected={summary.totalPaid} onEdit={may.editClient ? () => setActiveForm({ kind: 'editClient' }) : undefined} className="rounded-none border-0 border-t" />
          </details>
        </div>

        <aside aria-label="إجراءات العميل وتقاريره" className="min-w-0 space-y-4 lg:order-1 lg:col-span-4 lg:sticky lg:top-4 xl:col-span-3">
          <Card padding="none" className="hidden lg:block">
            <CardHeader><div><CardTitle>إجراءات سريعة</CardTitle><CardDescription className="mt-1">تسجيل حركة جديدة على هذا العميل</CardDescription></div></CardHeader>
            <div className="space-y-2 border-t border-border p-3.5">
              <Button block variant="outline" leftIcon={<ArrowForward sx={{ fontSize: 18 }} className="ltr:rotate-180" />} onClick={() => navigate('/clients')}>العودة للعملاء</Button>
              {quickActions.map(({ key, label, Icon, run }) => <Button key={key} block variant={key === 'invoice' ? 'primary' : 'outline'} leftIcon={<Icon sx={{ fontSize: 18 }} />} onClick={run}>{label}</Button>)}
            </div>
          </Card>
          <div className="hidden lg:block">{renderModules('shortcuts')}</div>
          {caps.showSummary && (
            <Card padding="none">
              <CardHeader><div><CardTitle>التقرير الشامل</CardTitle><CardDescription className="mt-1">المصروفات والمدفوعات والديون وسجل العمال</CardDescription></div></CardHeader>
              <div className="border-t border-border p-3.5 [&>div]:gap-2 lg:[&>div]:grid-cols-1 xl:[&>div]:grid-cols-2">
              <PdfActions
                loading={pdf.pdfLoading}
                onDownload={() => pdf.download('full')}
                onShare={() => pdf.share('full')}
                downloadLabel="تحميل PDF"
                shareLabel="مشاركة التقرير"
              />
              </div>
            </Card>
          )}
        </aside>
      </div>

      {/* Record sheets: each exists only for a permission this person holds, and offers only the actions they may take. */}
      {caps.expenseScope !== 'none' && (
        <ExpensesSheet
          open={activeSheet === 'expenses'}
          loading={data.isLoading}
          onClose={closeSheet}
          client={client}
          clientExpenses={data.clientExpenses}
          systemUsers={data.systemUsers}
          globalFundStats={data.globalFundStats}
          currentUserBalanceInfo={data.currentUserBalanceInfo}
          userName={user?.displayName || data.currentUserBalanceInfo?.name || ''}
          totalExpenses={summary.totalExpenses}
          pdfLoading={pdf.pdfLoading}
          onAdd={() => setActiveForm({ kind: 'expense', edit: null })}
          onEdit={(e) => setActiveForm({ kind: 'expense', edit: e })}
          onDelete={(e) => deletes.expense(e)}
          onDownloadPdf={caps.showSummary ? () => pdf.download('expenses') : undefined}
          onSharePdf={caps.showSummary ? () => pdf.share('expenses') : undefined}
        />
      )}

      {caps.payments && (
        <PaymentsSheet
          open={activeSheet === 'payments'}
          loading={data.isLoading}
          onClose={closeSheet}
          client={client}
          clientPayments={data.clientPayments}
          totalPaid={summary.totalPaid}
          pdfLoading={pdf.pdfLoading}
          onAdd={may.managePayments ? () => setActiveForm({ kind: 'payment', edit: null }) : undefined}
          onEdit={may.managePayments ? (p) => setActiveForm({ kind: 'payment', edit: p }) : undefined}
          onDelete={may.deletePayments ? (p) => deletes.payment(p) : undefined}
          onDownloadPdf={caps.showSummary ? () => pdf.download('payments') : undefined}
          onSharePdf={caps.showSummary ? () => pdf.share('payments') : undefined}
        />
      )}

      {caps.payments && (
        <ScheduleSheet
          open={activeSheet === 'schedule'}
          loading={data.isLoading}
          onClose={closeSheet}
          client={client}
          schedule={data.schedule}
          contractValue={client.contractValue}
          onAdd={may.manageSchedule ? () => setActiveForm({ kind: 'milestone', edit: null }) : undefined}
          onGenerate={may.manageSchedule ? () => setActiveForm({ kind: 'generateSchedule' }) : undefined}
          onEdit={
            may.manageSchedule
              ? (id) => {
                  const edit = data.clientMilestones.find((m) => m.id === id);
                  if (edit) setActiveForm({ kind: 'milestone', edit });
                }
              : undefined
          }
          onDelete={
            may.manageSchedule
              ? (id) => {
                  const milestone = data.clientMilestones.find((m) => m.id === id);
                  if (milestone) deletes.milestone(milestone);
                }
              : undefined
          }
        />
      )}

      {caps.debts && (
        <DebtsSheet
          open={activeSheet === 'debts'}
          loading={data.isLoading}
          onClose={closeSheet}
          client={client}
          clientDebts={data.clientDebts}
          totalDebts={summary.totalDebts}
          pdfLoading={pdf.pdfLoading}
          onAdd={may.manageDebts ? () => setActiveForm({ kind: 'debt', edit: null }) : undefined}
          onEdit={may.manageDebts ? (d) => setActiveForm({ kind: 'debt', edit: d }) : undefined}
          onDelete={may.deleteDebts ? (d) => deletes.debt(d) : undefined}
          onDownloadPdf={caps.showSummary ? () => pdf.download('debts') : undefined}
          onSharePdf={caps.showSummary ? () => pdf.share('debts') : undefined}
        />
      )}

      {caps.workers && (
        <WorkersFlow
          open={activeSheet === 'workers'}
          initialWorkerId={searchParams.get('worker') ?? undefined}
          onClose={closeSheet}
          clientId={client.id}
          clientName={client.name}
          entries={data.workerEntries}
          fundStats={data.globalFundStats}
          pdfLoading={pdf.pdfLoading}
          onDownloadPdf={caps.showSummary ? () => pdf.download('workers') : undefined}
          onSharePdf={caps.showSummary ? () => pdf.share('workers') : undefined}
          onStatementPdf={caps.showSummary ? (entry, period) => pdf.workerStatement(entry, 'download', period) : undefined}
          onShareStatement={caps.showSummary ? (entry, period) => pdf.workerStatement(entry, 'share', period) : undefined}
        />
      )}

      {caps.custody && (
        <BalancesSheet
          open={activeSheet === 'balances'}
          onClose={closeSheet}
          client={client}
          clientUserBalances={data.clientUserBalances}
          userBalancesSummary={userBalancesSummary}
          onAdd={may.manageCustody ? (userId) => setActiveForm({ kind: 'balance', edit: null, userId }) : undefined}
          onEdit={may.manageCustody ? (b) => setActiveForm({ kind: 'balance', edit: b }) : undefined}
          onDelete={may.manageCustody ? (b) => deletes.balance(b) : undefined}
        />
      )}

      {caps.projects && (
        <>
          <PhasesSheet
            open={activeSheet === 'phases'}
          loading={data.isLoading}
            onClose={closeSheet}
            client={client}
            phases={clientPhases}
            budgetRows={data.phaseBudgetRows}
            actualKnown={caps.expenseScope === 'all'}
            onAdd={may.manageProjects ? () => setActiveForm({ kind: 'phase', edit: null }) : undefined}
            onEdit={may.manageProjects ? (p) => setActiveForm({ kind: 'phase', edit: p }) : undefined}
            onDelete={
              may.manageProjects
                ? (id) => {
                    const phase = clientPhases.find((p) => p.id === id);
                    if (phase) deletes.phase(phase);
                  }
                : undefined
            }
          />

          <BoqSheet
            open={activeSheet === 'boq'}
          loading={data.isLoading}
            onClose={closeSheet}
            client={client}
            phases={clientPhases}
            items={data.clientBoqItems}
            categoryRows={categoryRows}
            onAdd={may.manageProjects ? () => setActiveForm({ kind: 'boq', edit: null }) : undefined}
            onEdit={may.manageProjects ? (item) => setActiveForm({ kind: 'boq', edit: item }) : undefined}
            onDelete={
              may.manageProjects
                ? (id) => {
                    const item = data.clientBoqItems.find((i) => i.id === id);
                    if (item) deletes.boqItem(item);
                  }
                : undefined
            }
          />

          <SiteReportsSheet
            open={activeSheet === 'siteReports'}
          loading={data.isLoading}
            onClose={closeSheet}
            client={client}
            reports={data.clientSiteReports}
            onAdd={may.manageProjects ? () => setActiveForm({ kind: 'siteReport', edit: null }) : undefined}
            onEdit={may.manageProjects ? (r) => setActiveForm({ kind: 'siteReport', edit: r }) : undefined}
            onDelete={
              may.manageProjects
                ? (id) => {
                    const report = data.clientSiteReports.find((r) => r.id === id);
                    if (report) deletes.siteReport(report);
                  }
                : undefined
            }
          />
        </>
      )}

      <ClientActivitySheet
        open={activeSheet === 'activity'}
        onClose={closeSheet}
        client={client}
        caps={caps}
        custodyScope={may.manageCustody ? 'all' : 'own'}
        expenses={data.clientExpenses}
        workerEntries={data.workerEntries}
        payments={data.clientPayments}
        debts={data.clientDebts}
        custodies={data.clientUserBalances}
        siteReports={data.clientSiteReports}
        phases={clientPhases}
        loading={data.isLoading}
        onOpen={openFromFeed}
      />

      <ClientStatementSheet
        open={activeSheet === 'statement'}
        onClose={closeSheet}
        client={client}
        caps={caps}
        payments={data.clientPayments}
        expenses={data.clientExpenses}
        debts={data.clientDebts}
        loading={data.isLoading}
        onOpen={openFromFeed}
      />

      {caps.invoices && (
        <ClientInvoicesSheet
          open={activeSheet === 'invoices'}
          onClose={closeSheet}
          client={client}
          invoices={clientInvoices}
          payments={data.clientPayments}
          paymentsKnown={caps.payments}
          loading={data.isLoading}
          onOpenInvoice={(id) => navigate(`/invoices/${id}`)}
          onCreate={may.manageInvoices ? () => navigate(`/invoices/new?clientId=${clientId}`) : undefined}
        />
      )}

      {caps.letters && (
        <ClientLettersSheet
          open={activeSheet === 'letters'}
          onClose={closeSheet}
          client={client}
          letters={clientLetters}
          loading={data.isLoading}
          onOpenLetter={(l) => navigate(`/letters?open=${l.id}`)}
          onCreate={may.manageLetters ? () => navigate(`/letters?new=1&clientId=${clientId}`) : undefined}
        />
      )}

      {/* Forms (open over the sheets) */}
      {activeForm?.kind === 'payment' && may.managePayments && (
        <PaymentFormSheet
          edit={activeForm.edit}
          onClose={dismissForm}
          onSubmit={(values) => saves.savePayment(activeForm.edit, values)}
          onDelete={may.deletePayments && activeForm.edit ? () => deletes.payment(activeForm.edit!, true) : undefined}
          receiptPanel={
            activeForm.edit && (
              <ReceiptPanel
                payment={receipt.live(activeForm.edit)}
                busy={receipt.busyId === activeForm.edit.id}
                canIssue={receipt.canIssue}
                onDownload={() => void receipt.issue(activeForm.edit!, 'download')}
                onShare={() => void receipt.issue(activeForm.edit!, 'share')}
              />
            )
          }
        />
      )}

      {activeForm?.kind === 'expense' && (
        <ExpenseFormSheet
          edit={activeForm.edit}
          clientWorkers={data.clientWorkers}
          clientPhases={clientPhases}
          currentUserBalanceInfo={data.currentUserBalanceInfo}
          userName={user?.displayName || data.currentUserBalanceInfo?.name || ''}
          // The warning follows the custody this screen shows (the person's custody on this client), else their general fund.
          fundStats={
            !activeForm.edit || activeForm.edit.userId === user?.id
              ? data.currentUserBalanceInfo?.exact
                ? data.currentUserBalanceInfo
                : data.globalFundStats
              : null
          }
          fundLabel={data.currentUserBalanceInfo?.exact ? 'عهدتك على هذا المشروع' : 'عهدتك العامة'}
          fundOriginalAmount={activeForm.edit?.amount || 0}
          canLinkWorker={access.can('workers.manage')}
          // A closed expense, or one this person may not change, opens read-only and says why.
          readOnlyNotice={
            activeForm.edit ? expenseReadOnlyNotice(activeForm.edit, access.canEditExpense(activeForm.edit)) : null
          }
          review={
            activeForm.edit
              ? {
                  canDecide: access.can('expenses.edit.all') && !isExpenseLocked(activeForm.edit),
                  onApprove: async () => {
                    await approveExpenses([activeForm.edit!.id]);
                    dismissForm();
                  },
                  onReject: async (reason) => {
                    await rejectExpense(activeForm.edit!.id, reason);
                    dismissForm();
                  },
                }
              : undefined
          }
          onClose={dismissForm}
          onSubmit={(values, receipt) => saves.saveExpense(activeForm.edit, values, receipt)}
          onDelete={
            activeForm.edit && access.canDeleteExpense(activeForm.edit)
              ? () => deletes.expense(activeForm.edit!, true)
              : undefined
          }
        />
      )}

      {activeForm?.kind === 'debt' && may.manageDebts && (
        <DebtFormSheet
          edit={activeForm.edit}
          onClose={dismissForm}
          onSubmit={(values) => saves.saveDebt(activeForm.edit, values)}
          onDelete={may.deleteDebts && activeForm.edit ? () => deletes.debt(activeForm.edit!, true) : undefined}
        />
      )}

      {activeForm?.kind === 'balance' && may.manageCustody && (
        <BalanceFormSheet
          edit={activeForm.edit}
          systemUsers={data.systemUsers}
          userBalancesSummary={userBalancesSummary}
          defaultUserId={activeForm.userId}
          onClose={dismissForm}
          onSubmit={(values) => saves.saveBalance(activeForm.edit, values)}
          onDelete={activeForm.edit ? () => deletes.balance(activeForm.edit!, true) : undefined}
        />
      )}

      {activeForm?.kind === 'phase' && may.manageProjects && (
        <PhaseFormSheet
          edit={activeForm.edit}
          nextOrder={clientPhases.length + 1}
          onClose={dismissForm}
          onSubmit={(values) => saves.savePhase(activeForm.edit, values)}
        />
      )}

      {activeForm?.kind === 'boq' && may.manageProjects && (
        <BoqFormSheet
          edit={activeForm.edit}
          phases={clientPhases}
          onClose={dismissForm}
          onSubmit={(values) => saves.saveBoq(activeForm.edit, values)}
        />
      )}

      {activeForm?.kind === 'milestone' && may.manageSchedule && (
        <MilestoneFormSheet
          edit={activeForm.edit}
          nextOrder={data.clientMilestones.length + 1}
          suggestedAmount={
            client.contractValue && client.contractValue > data.schedule.total
              ? Math.round((client.contractValue - data.schedule.total) * 1000) / 1000
              : undefined
          }
          onClose={dismissForm}
          onSubmit={(values) => saves.saveMilestone(activeForm.edit, values)}
          onDelete={activeForm.edit ? () => deletes.milestone(activeForm.edit!) : undefined}
        />
      )}

      {activeForm?.kind === 'generateSchedule' && may.manageSchedule && (
        <GenerateScheduleSheet
          suggestedTotal={
            client.contractValue && client.contractValue > data.schedule.total
              ? Math.round((client.contractValue - data.schedule.total) * 1000) / 1000
              : 0
          }
          contractValue={client.contractValue}
          existingCount={data.clientMilestones.length}
          onClose={dismissForm}
          onSubmit={(drafts) => saves.saveSchedule(drafts)}
        />
      )}

      {activeForm?.kind === 'siteReport' && may.manageProjects && (
        <SiteReportFormSheet
          edit={activeForm.edit}
          onClose={dismissForm}
          onSubmit={(values) => saves.saveSiteReport(activeForm.edit, values)}
        />
      )}

      {activeForm?.kind === 'editClient' && may.editClient && (
        <EditClientFormSheet
          client={client}
          onClose={dismissForm}
          onSubmit={(values) => saves.saveClient(values)}
          onDelete={may.deleteClient ? () => deletes.client(client) : undefined}
        />
      )}

      {canEditProfit && (
        <ProfitRuleModal
          open={activeForm?.kind === 'profit'}
          onClose={closeProfit}
          percentage={profitPercentage}
          onPercentageChange={setProfitPercentage}
          base={profitBase}
          onBaseChange={setProfitBase}
          totals={{ totalExpenses: summary.totalExpenses, totalPaid: summary.totalPaid }}
          onSave={() => saves.saveProfit(profitPercentage, profitBase)}
        />
      )}

      {deletes.modal}
      <QuickAddFab initialClientId={client.id} />
    </PageShell>
  );
};
