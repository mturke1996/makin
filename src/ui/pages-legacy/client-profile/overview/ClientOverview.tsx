import { useMemo, type ReactNode } from 'react';
import { ExpandMore, Insights } from '../../../../design-system/icons';
import { Button, EmptyState } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import { buildOverviewTrend, localDay } from '../../../../core/finance/clientAnalytics';
import { buildClientInsights, type InsightAction, type InsightSchedule, type InsightWorkerAhead } from '../../../../core/finance/clientInsights';
import type { PhaseBudgetRow } from '../../../../core/finance/projectBudget';
import type { CategoryBudgetRow } from '../../../../core/finance/budgetStatus';
import type { Expense, Invoice, Payment, StandaloneDebt } from '../../../../types';
import { ClientAccountSummary } from '../ClientAccountSummary';
import type { ClientSummary, UserBalancesSummary } from '../types';
import { CashFlowCard } from './CashFlowCard';
import { InsightsList } from './InsightsList';
import { OverviewKpis } from './OverviewKpis';
import { ClientOverviewSkeleton } from './OverviewSkeleton';
import { SpendBreakdown } from './SpendBreakdown';
import { AccountFigures } from './AccountFigures';

export interface ClientOverviewProps {
  /** The account figures: totals plus `computeClientAccount`'s result (the page's `summary`). */
  summary: ClientSummary;
  /** Every expense of the client (the overview is only for viewers who see them all). */
  expenses: readonly Expense[];
  payments: readonly Payment[];
  debts: readonly StandaloneDebt[];
  /** What workers are still owed; pass it only when the viewer holds the workers group. */
  workerSummary?: { remaining: number };
  /** Empty when the viewer has no projects access. */
  phaseBudgetRows: readonly PhaseBudgetRow[];
  /** The estimate by category against the spending, when the viewer sees every expense. */
  categoryBudgetRows?: readonly CategoryBudgetRow[];
  /** Custody per user on this client (`userBalancesSummary`); empty when the viewer has none. */
  custody: UserBalancesSummary;
  /** This client's invoices, only when the viewer may list them (`caps.invoices`). */
  invoices?: readonly Invoice[];
  /** What the agreed payment schedule says (late or due soon), when the client has one and the viewer sees payments. */
  schedule?: InsightSchedule;
  /** Workers paid beyond their approved progress. */
  workersAhead?: readonly InsightWorkerAhead[];
  /** Whose expenses are listed; the split by person is shown only for `'all'`. Defaults to `'all'`. */
  expenseScope?: 'all' | 'own' | 'none';
  /** Called with the action of the insight that was tapped; the page opens the matching sheet or form. */
  onAction: (action: InsightAction) => void;
  /** Actions that lead nowhere for this viewer; their insights show as plain text. */
  unavailableActions?: readonly InsightAction[];
  /** The empty state offers these when given (leave out the ones the viewer may not do). */
  onAddPayment?: () => void;
  onAddExpense?: () => void;
  /**
   * Rendered right after the attention list, before the account statement and the charts. The page puts its record
   * list (expenses, payments, custody...) here so the way into the records is never three screens down on a phone.
   */
  afterInsights?: ReactNode;
  loading?: boolean;
  /** Today, for tests and previews. Defaults to the current time. */
  now?: Date;
  className?: string;
}

/**
 * The top of the client page for people who see the whole account: four figures with their month and curve,
 * what needs attention, the account statement, the monthly cash flow and where the money went.
 * Every number is derived from the records passed in, in exact thousandths.
 */
export function ClientOverview({
  summary,
  expenses,
  payments,
  debts,
  workerSummary,
  phaseBudgetRows,
  categoryBudgetRows,
  custody,
  invoices,
  schedule,
  workersAhead,
  expenseScope = 'all',
  onAction,
  unavailableActions,
  onAddPayment,
  onAddExpense,
  afterInsights,
  loading,
  now,
  className,
}: ClientOverviewProps) {
  const today = useMemo(() => localDay(now ?? new Date()), [now]);

  const trend = useMemo(() => buildOverviewTrend({ payments, expenses, today }), [payments, expenses, today]);

  const insights = useMemo(
    () =>
      buildClientInsights({
        today,
        totals: {
          expenses: summary.totalExpenses,
          paid: summary.totalPaid,
          clientDeficit: summary.clientDeficit,
          agreedPercentageDeficit: summary.agreedPercentageDeficit,
          profitPercentage: summary.profitPercentage,
          profitBase: summary.profitBase,
          workersDue: workerSummary?.remaining,
        },
        expenses,
        payments,
        debts,
        phases: phaseBudgetRows,
        categories: categoryBudgetRows,
        custody: Object.values(custody),
        invoices,
        schedule,
        workersAhead,
      }),
    [today, summary, expenses, payments, debts, workerSummary, phaseBudgetRows, categoryBudgetRows, custody, invoices, schedule, workersAhead],
  );

  // The slot stays in every state: the way into the records must not vanish while the numbers load or when there are none.
  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <ClientOverviewSkeleton />
        {afterInsights}
      </div>
    );
  }

  if (payments.length === 0 && expenses.length === 0 && debts.length === 0) {
    return (
      <div className={cn('space-y-6', className)}>
        <AccountFigures summary={summary} workersDue={workerSummary?.remaining} trend={trend} onAction={onAction} unavailable={unavailableActions} />
        <InsightsList insights={insights} onAction={onAction} unavailable={unavailableActions} limit={3} />
        {afterInsights}
        <EmptyState
          Icon={Insights}
          title="ابدأ بتسجيل أول دفعة أو مصروف"
          description="بعدها يظهر هنا المحصّل والمصروفات شهرياً، وأين ذهب المال، وما يحتاج انتباهك."
          action={
            onAddPayment || onAddExpense ? (
              <div className="flex flex-wrap justify-center gap-2">
                {onAddPayment && (
                  <Button variant="outline" onClick={onAddPayment}>
                    إضافة دفعة
                  </Button>
                )}
                {onAddExpense && (
                  <Button variant="outline" onClick={onAddExpense}>
                    إضافة مصروف
                  </Button>
                )}
              </div>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        <AccountFigures summary={summary} workersDue={workerSummary?.remaining} trend={trend} onAction={onAction} unavailable={unavailableActions} />
        <InsightsList insights={insights} onAction={onAction} unavailable={unavailableActions} limit={3} />
        {afterInsights}
        <details open className="group rounded-lg border border-border bg-surface-panel p-4">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-fg">تفاصيل حساب العميل<ExpandMore className="shrink-0 text-fg-muted transition-transform group-open:rotate-180" sx={{ fontSize: 20 }} aria-hidden /></summary>
          <ClientAccountSummary summary={summary} className="mt-3 border-0" />
        </details>
        <details open className="group rounded-lg border border-border bg-surface-panel p-4">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-fg">التحليل الشهري وتوزيع المصروفات<ExpandMore className="shrink-0 text-fg-muted transition-transform group-open:rotate-180" sx={{ fontSize: 20 }} aria-hidden /></summary>
          <div className="mt-4 space-y-6"><OverviewKpis totalPaid={summary.totalPaid} totalExpenses={summary.totalExpenses} trend={trend} /><CashFlowCard payments={payments} expenses={expenses} today={today} /><SpendBreakdown expenses={expenses} showPeople={expenseScope === 'all'} /></div>
        </details>
      </div>
    </div>
  );
}
