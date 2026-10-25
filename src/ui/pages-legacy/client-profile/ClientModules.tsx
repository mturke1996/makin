import type { ElementType, ReactNode } from 'react';
import {
  AccountBalanceWallet,
  Description,
  Engineering,
  Groups,
  History,
  Payment,
  Percent,
  Receipt,
  ReceiptLong,
  RequestQuote,
  TableChart,
  Timeline,
  TrendingDown,
} from '@mui/icons-material';
import { Section } from '../../../design-system/primitives';
import { PROFIT_BASE_LABELS } from '../../../core/finance/clientProfitTotals';
import { subtractMoney } from '../../../core/finance/workerLedger';
import { extrasCountPhrase } from './extrasCopy';
import { custodyCount } from './custody/copy';
import { countPhrase } from './moduleCopy';
import { ProfileModuleRow, type ProfileTone } from './profileUi';
import type { ClientProfileCaps, ClientSummary } from './types';
import type { ProfileSheetKey } from './useClientSaves';

export interface ClientModuleStats {
  expenses: number;
  payments: number;
  debts: number;
  workers: number;
  balances: number;
  phases: number;
  boq: number;
  reports: number;
  /** What is left of the custody given on this client (only a real figure when `custodyExact`). */
  custodyRemaining: number;
  /** What was given as custody on this client. */
  custodyGiven: number;
  /** The viewer sees every expense of the custody holders, so the remaining balance is complete. */
  custodyExact: boolean;
  phasesBudget: number;
  boqTotal: number;
  /** Progress percent of the latest site report that has one. */
  latestProgress: number | undefined;
  invoices: number;
  /** Still to collect on the client's invoices; null when this person does not hold the payments to know it. */
  invoicesRemaining: number | null;
  invoicesOverdue: number;
  letters: number;
}

interface ModuleDef {
  key: ProfileSheetKey | 'profit';
  /** Whether this person may open the row at all: it appears only for the data they really have. */
  shown: boolean;
  title: string;
  subtitle: ReactNode;
  amountLabel?: string;
  amount: number;
  amountDisplay?: ReactNode;
  Icon: ElementType;
  tone: ProfileTone;
}

interface ClientModulesProps {
  section?: 'records' | 'supporting' | 'all' | 'shortcuts';
  stats: ClientModuleStats;
  summary: ClientSummary;
  caps: ClientProfileCaps;
  /** May change the agreed percentage (`clients.manage`); it also needs the full summary to make sense. */
  canEditProfit: boolean;
  onOpenSheet: (sheet: ProfileSheetKey) => void;
  onOpenProfit: () => void;
}

/**
 * Main records are four icon entries; secondary services are grouped, compact links.
 * Entries exist only for permissions the person holds; personal expenses stay labelled as their own.
 */
export function ClientModules({ stats, summary, caps, canEditProfit, onOpenSheet, onOpenProfit, section = 'all' }: ClientModulesProps) {
  const hasPercentage = summary.profitPercentage > 0;
  const ownExpenses = caps.expenseScope === 'own';

  const records: ModuleDef[] = [
    {
      key: 'expenses',
      shown: caps.expenseScope !== 'none',
      title: ownExpenses ? 'مصروفاتي' : 'المصروفات',
      subtitle: countPhrase('expenses', stats.expenses),
      amountLabel: ownExpenses ? 'ما سجّلته' : 'الإجمالي',
      amount: summary.totalExpenses,
      Icon: TrendingDown,
      tone: 'danger',
    },
    {
      key: 'payments',
      shown: caps.payments,
      title: 'المدفوعات',
      subtitle: countPhrase('payments', stats.payments),
      amountLabel: 'المحصّل',
      amount: summary.totalPaid,
      Icon: Payment,
      tone: 'success',
    },
    {
      key: 'debts',
      shown: caps.debts,
      title: 'الديون',
      subtitle: countPhrase('debts', stats.debts),
      amountLabel: 'المتبقي',
      amount: summary.totalDebts,
      Icon: RequestQuote,
      tone: 'warning',
    },
    {
      key: 'workers',
      shown: caps.workers,
      title: 'العمال',
      subtitle: countPhrase('workers', stats.workers),
      amountLabel: 'المتبقي لهم',
      amount: summary.totalWorkersDue,
      Icon: Groups,
      tone: 'info',
    },
    {
      key: 'balances',
      shown: caps.custody,
      title: 'العهد',
      subtitle: custodyCount(stats.balances),
      amountLabel: stats.custodyExact ? 'الرصيد' : 'الممنوح',
      amount: stats.custodyExact ? stats.custodyRemaining : stats.custodyGiven,
      Icon: AccountBalanceWallet,
      tone: 'warning',
    },
    {
      key: 'profit',
      shown: canEditProfit && caps.showSummary,
      title: 'النسبة المتفق عليها',
      subtitle: hasPercentage
        ? `${summary.profitPercentage}% ${PROFIT_BASE_LABELS[summary.profitBase]}`
        : 'لم تُحدد بعد',
      amountLabel: hasPercentage ? 'قيمة النسبة' : undefined,
      amount: summary.profit,
      amountDisplay: hasPercentage ? undefined : (
        <span className="text-sm font-semibold text-accent-ink">تحديد النسبة</span>
      ),
      Icon: Percent,
      tone: 'brand',
    },
  ];

  const documents: ModuleDef[] = [
    {
      key: 'invoices',
      shown: caps.invoices,
      title: 'الفواتير',
      subtitle:
        stats.invoicesOverdue > 0
          ? `${extrasCountPhrase('invoices', stats.invoices)} · ${stats.invoicesOverdue} متأخرة`
          : extrasCountPhrase('invoices', stats.invoices),
      amountLabel: stats.invoicesRemaining != null ? 'المتبقي' : undefined,
      amount: stats.invoicesRemaining ?? 0,
      amountDisplay:
        stats.invoicesRemaining != null ? undefined : <span className="text-sm font-medium text-fg-muted">عرض</span>,
      Icon: Receipt,
      tone: stats.invoicesOverdue > 0 ? 'danger' : 'info',
    },
    {
      key: 'letters',
      shown: caps.letters,
      title: 'الرسائل والخطابات',
      subtitle: extrasCountPhrase('letters', stats.letters),
      amount: 0,
      amountDisplay: <span className="text-sm font-medium text-fg-muted">عرض</span>,
      Icon: Description,
      tone: 'brand',
    },
  ];

  const history: ModuleDef[] = [
    {
      key: 'activity',
      shown: caps.expenseScope !== 'none' || caps.payments || caps.debts || caps.custody || caps.projects,
      title: 'سجل النشاط',
      subtitle: 'كل ما جرى على هذا العميل بترتيب زمني',
      amount: 0,
      amountDisplay: <span className="text-sm font-medium text-fg-muted">عرض</span>,
      Icon: History,
      tone: 'info',
    },
    {
      key: 'statement',
      shown: caps.showSummary,
      title: 'كشف الحساب',
      subtitle: 'المحصّل والمصروف برصيد جارٍ',
      amountLabel: 'الرصيد',
      amount: subtractMoney(summary.totalPaid, summary.totalExpenses),
      Icon: ReceiptLong,
      tone: 'brand',
    },
  ];

  const project: ModuleDef[] = [
    {
      key: 'phases',
      shown: caps.projects,
      title: 'مراحل المشروع',
      subtitle: countPhrase('phases', stats.phases),
      amountLabel: 'الميزانية',
      amount: stats.phasesBudget,
      Icon: Timeline,
      tone: 'brand',
    },
    {
      key: 'boq',
      shown: caps.projects,
      title: 'جدول الكميات',
      subtitle: countPhrase('boq', stats.boq),
      amountLabel: 'الإجمالي',
      amount: stats.boqTotal,
      Icon: TableChart,
      tone: 'info',
    },
    {
      key: 'siteReports',
      shown: caps.projects,
      title: 'تقارير الموقع',
      subtitle: countPhrase('reports', stats.reports),
      amountLabel: stats.latestProgress != null ? 'آخر إنجاز' : undefined,
      amount: 0,
      amountDisplay:
        stats.latestProgress != null ? (
          <bdi dir="ltr">{stats.latestProgress}%</bdi>
        ) : (
          <span className="text-sm font-medium text-fg-muted">لا تقدم بعد</span>
        ),
      Icon: Engineering,
      tone: 'warning',
    },
  ];

  const renderGroup = (title: string, defs: ModuleDef[], primary = false) => {
    const visible = defs.filter((m) => m.shown);
    if (visible.length === 0) return null;
    return (
      <Section title={title} key={title} className="[&_h2]:text-sm [&_h2]:font-semibold">
        <nav aria-label={title} className={primary ? 'grid grid-cols-4 gap-1 sm:gap-3' : 'grid gap-1 rounded-lg border border-border bg-surface-panel p-1 sm:grid-cols-2'}>
          {visible.map((m) => (
            <ProfileModuleRow
              key={m.key}
              title={m.title}
              subtitle={m.subtitle}
              amountLabel={m.amountLabel}
              amount={m.amount}
              amountDisplay={m.amountDisplay}
              Icon={m.Icon}
              tone={m.tone}
              layout={primary ? 'icon' : 'row'}
              onClick={m.key === 'profit' ? onOpenProfit : () => onOpenSheet(m.key as ProfileSheetKey)}
            />
          ))}
        </nav>
      </Section>
    );
  };

  if (section === 'shortcuts') {
    const visible = records.filter((module) => module.shown);
    if (visible.length === 0) return null;
    return <Section title="اختصارات الأقسام" className="[&_h2]:text-sm [&_h2]:font-semibold">
      <nav aria-label="اختصارات أقسام العميل" className="space-y-1 rounded-lg border border-border bg-surface-panel p-2">
        {visible.map(({ key, title, Icon }) => <button key={key} type="button" onClick={key === 'profit' ? onOpenProfit : () => onOpenSheet(key as ProfileSheetKey)} className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-start text-2xs font-medium text-fg transition-colors hover:bg-surface-sunken focus:outline-none focus-visible:shadow-focus"><Icon sx={{ fontSize: 18 }} className="shrink-0 text-fg-muted" aria-hidden /><span className="min-w-0 break-words">{title}</span></button>)}
      </nav>
    </Section>;
  }

  return (
    <>
      {section !== 'supporting' && renderGroup('الأقسام', records.slice(0, 4), true)}
      {section !== 'records' && renderGroup('العهد والنسبة', records.slice(4))}
      {section !== 'records' && renderGroup('المستندات', documents)}
      {section !== 'records' && renderGroup('السجل والكشف', history)}
      {section !== 'records' && renderGroup('متابعة المشروع', project)}
    </>
  );
}
