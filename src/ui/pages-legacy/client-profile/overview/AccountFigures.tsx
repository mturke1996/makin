import { Amount, Card, CardHeader, CardTitle, CardDescription, StatCard } from '../../../../design-system/primitives';
import { PROFIT_BASE_LABELS } from '../../../../core/finance/clientProfitTotals';
import type { InsightAction } from '../../../../core/finance/clientInsights';
import type { ClientSummary } from '../types';

interface AccountFiguresProps {
  summary: ClientSummary;
  workersDue?: number;
  onAction?: (action: InsightAction) => void;
  unavailable?: readonly InsightAction[];
}

/** Rkeaz's financial board: four account totals, then the debts and workers row. */
export function AccountFigures({ summary, workersDue, onAction, unavailable = [] }: AccountFiguresProps) {
  const open = (action: InsightAction) => onAction && !unavailable.includes(action) ? () => onAction(action) : undefined;
  return <Card padding="none" aria-label="ملخص حساب العميل" className="client-profile-finances overflow-hidden">
    <CardHeader><div><CardTitle>اللوحة المالية</CardTitle><CardDescription className="mt-1">التحصيل والصرف والصافي ومستحقات المشروع</CardDescription></div></CardHeader>
    <div className="client-profile-finance-grid grid grid-cols-2 gap-2.5 border-t border-border p-3 sm:p-4">
      <StatCard label="إجمالي المدفوعات" value={<Amount amount={summary.totalPaid} tone="success" />} hint="المحصّل من العميل" onClick={open('payments')} />
      <StatCard label="إجمالي المصروفات" value={<Amount amount={summary.totalExpenses} tone="danger" />} hint="الصرف على المشروع" onClick={open('expenses')} />
      <StatCard label={summary.remaining < 0 ? 'عجز الحساب' : 'الصافي المتبقي'} value={<Amount amount={summary.remaining} tone={summary.remaining < 0 ? 'danger' : 'brand'} />} hint="بعد المصروفات والديون والنسبة" onClick={open('statement')} />
      <StatCard label="النسبة المتفق عليها" value={summary.profitPercentage > 0 ? <Amount amount={summary.profit} tone="warning" /> : <span className="text-base font-medium text-fg-muted">غير محددة</span>} hint={summary.profitPercentage > 0 ? `${summary.profitPercentage}% ${PROFIT_BASE_LABELS[summary.profitBase]}` : 'لم تُحدد نسبة للعميل'} onClick={open('profit')} />
    </div>
    <div className="client-profile-finance-grid grid grid-cols-2 gap-2.5 border-t border-border bg-surface-sunken p-3 sm:p-4">
      <StatCard label="الديون المستحقة" value={<Amount amount={summary.totalDebts} tone="warning" />} hint="المتبقي من الديون" onClick={open('debts')} />
      {workersDue !== undefined && <StatCard label="متبقي العمال" value={<Amount amount={workersDue} tone="brand" />} hint="مستحقات لم تُسدّد بعد" onClick={open('workers')} />}
    </div>
  </Card>;
}
