import type { ReactNode } from 'react';
import { Amount, ProgressBar, Card, CardHeader, CardTitle, CardDescription } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import { PROFIT_BASE_LABELS } from '../../../core/finance/clientProfitTotals';
import { percentOf } from '../../../core/finance/clientAnalytics';
import { fromMilli, subtractMoney, toMilli } from '../../../core/finance/money';
import { formatCurrencyDisplay } from '../../../core/utils-formatters';
import type { ClientSummary } from './types';

/** One line of the statement: label (with an optional second line), signed figure. */
export function StatementLine({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
      <dt className="min-w-0">
        <span className="block text-base text-fg">{label}</span>
        {hint && <span className="block text-xs text-fg-muted">{hint}</span>}
      </dt>
      <dd className="ms-auto min-w-0 text-end text-md font-semibold tabular-nums [&_bdi]:whitespace-normal [&_bdi]:[overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/**
 * The client's account as a short statement (shown only to people who hold the whole picture:
 * payments, every expense and debts; everybody else gets `ClientPersonalSummary`): what was collected, what was spent,
 * what is owed, the agreed percentage, and the balance that is left (or the deficit). Every figure is the exact
 * output of `computeClientAccount`, so the lines add up to the result. Under a deficit it also says how much
 * must be collected to close it, and how far collection has come against what the account owes.
 */
export function ClientAccountSummary({ summary, className }: { summary: ClientSummary; className?: string }) {
  const deficit = summary.remaining < 0;
  const hasPercentage = summary.profitPercentage > 0;
  // What the account owes in all (costs, debts and the agreed percentage): the balance is collected minus this.
  const owed = subtractMoney(summary.totalPaid, summary.remaining);
  const coverage = percentOf(summary.totalPaid, owed);
  const covered = coverage !== null ? Math.min(100, Math.floor(coverage)) : null;
  const closing = toMilli(summary.requiredCollection) > 0;
  const both = toMilli(summary.clientDeficit) > 0 && toMilli(summary.agreedPercentageDeficit) > 0;

  return (
    <Card padding="none" aria-labelledby="client-account-title" className={className}>
      <CardHeader>
        <div>
          <CardTitle id="client-account-title">حساب العميل</CardTitle>
          <CardDescription className="mt-0.5">من المحصّل نطرح المصروفات والديون والنسبة حتى يظهر الصافي</CardDescription>
        </div>
      </CardHeader>
        <dl className="divide-y divide-border px-4 pb-1 pt-1">
          <StatementLine label="المحصّل من العميل">
            <Amount amount={summary.totalPaid} tone="success" showSign />
          </StatementLine>
          <StatementLine label="المصروفات">
            <Amount amount={-summary.totalExpenses} tone="danger" />
          </StatementLine>
          <StatementLine label="الديون المتبقية">
            <Amount amount={-summary.totalDebts} tone="danger" />
          </StatementLine>
          <StatementLine
            label="النسبة المتفق عليها"
            hint={hasPercentage ? `${summary.profitPercentage}% ${PROFIT_BASE_LABELS[summary.profitBase]}` : 'لم تُحدد بعد'}
          >
            {hasPercentage ? (
              <Amount amount={-summary.profit} tone="danger" />
            ) : (
              <span className="text-sm font-medium text-fg-muted">لا نسبة</span>
            )}
          </StatementLine>
        </dl>

        <div
          className={cn(
            'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border px-4 py-4'
          )}
        >
          <p className={cn('text-base font-semibold', deficit ? 'text-danger-ink' : 'text-success-ink')}>
            {deficit ? 'عجز مالي' : 'الصافي المتبقي'}
          </p>
          <Amount amount={summary.remaining} tone={deficit ? 'danger' : 'success'} className="max-w-full whitespace-normal text-2xl font-semibold [&_bdi]:whitespace-normal [&_bdi]:[overflow-wrap:anywhere]" />
        </div>

        {closing && (
          <dl className="border-t border-border px-4 py-1">
            <StatementLine
              label="المطلوب تحصيله لإغلاق العجز"
              hint={
                both
                  ? `عجز عام ${formatCurrencyDisplay(fromMilli(toMilli(summary.clientDeficit)))} وعجز نسبة ${formatCurrencyDisplay(fromMilli(toMilli(summary.agreedPercentageDeficit)))}`
                  : toMilli(summary.agreedPercentageDeficit) > 0
                    ? 'عجز في النسبة المتفق عليها'
                    : 'عجز عام: المصروفات والديون فوق المحصّل'
              }
            >
              <Amount amount={summary.requiredCollection} tone="danger" />
            </StatementLine>
          </dl>
        )}

        {covered !== null && (
          <div className="space-y-2 border-t border-border px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-fg-subtle">ما غُطّي من التزامات الحساب</span>
              <span className="font-semibold tabular-nums text-fg">
                <bdi dir="ltr">{covered}%</bdi>
              </span>
            </div>
            <ProgressBar value={covered} tone={covered >= 100 ? 'success' : covered >= 50 ? 'warning' : 'danger'} label="نسبة تغطية التزامات الحساب" />
          </div>
        )}
    </Card>
  );
}
