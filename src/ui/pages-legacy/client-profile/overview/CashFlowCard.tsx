import { useMemo, useState, type ReactNode } from 'react';
import { Amount, Segmented } from '../../../../design-system/primitives';
import { ChartLegend } from '../../../../design-system/charts';
import { buildMonthlyFlow, localDay, type DatedExpense, type DatedPayment } from '../../../../core/finance/clientAnalytics';
import { subtractMoney, sumMoney } from '../../../../core/finance/money';
import { MonthlyBars } from './MonthlyBars';

type Span = '6' | '12';

interface CashFlowCardProps {
  payments: readonly DatedPayment[];
  expenses: readonly DatedExpense[];
  /** `YYYY-MM-DD`; the newest month shown is the month of this day. */
  today?: string;
}

/** Collected against spent for the last 6 or 12 months, with the totals of the period under the chart. */
export function CashFlowCard({ payments, expenses, today }: CashFlowCardProps) {
  const [span, setSpan] = useState<Span>('6');
  const day = today ?? localDay();

  const flow = useMemo(
    () => buildMonthlyFlow({ payments, expenses, endMonth: day.slice(0, 7), months: Number(span) }),
    [payments, expenses, day, span],
  );
  const collected = sumMoney(flow.collected);
  const spent = sumMoney(flow.expenses);
  const quiet = collected === 0 && spent === 0;
  const spanWords = span === '6' ? '6 أشهر' : '12 شهراً';

  return (
    <section aria-labelledby="overview-flow-title" className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 px-1">
        <div className="min-w-0">
          <h2 id="overview-flow-title" className="text-lg font-bold leading-tight text-fg">
            المحصّل والمصروفات شهرياً
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">اضغط على شهر لترى أرقامه</p>
        </div>
        <Segmented<Span>
          aria-label="مدة العرض"
          size="md"
          value={span}
          onChange={setSpan}
          className="w-44 flex-none"
          options={[
            { value: '6', label: '6 أشهر' },
            { value: '12', label: '12 شهراً' },
          ]}
        />
      </header>

      <div className="rounded-lg border border-border bg-surface-panel p-4">
        <ChartLegend
          items={[
            { label: 'المحصّل', tone: 'income' },
            { label: 'المصروفات', tone: 'expense' },
          ]}
        />
        {quiet ? (
          <p className="py-14 text-center text-sm text-fg-muted">لا حركة مسجّلة في هذه الأشهر</p>
        ) : (
          <div className="mt-3">
            <MonthlyBars flow={flow} />
          </div>
        )}

        <dl className="mt-4 divide-y divide-border border-t border-border">
          <Total label={`المحصّل خلال ${spanWords}`}>
            <Amount amount={collected} tone="success" />
          </Total>
          <Total label={`المصروفات خلال ${spanWords}`}>
            <Amount amount={spent} />
          </Total>
          <Total label="الصافي">
            <Amount amount={subtractMoney(collected, spent)} tone="auto" showSign />
          </Total>
        </dl>
      </div>
    </section>
  );
}

function Total({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 py-2">
      <dt className="min-w-0 text-sm text-fg-subtle">{label}</dt>
      <dd className="flex-none text-md font-semibold">{children}</dd>
    </div>
  );
}
