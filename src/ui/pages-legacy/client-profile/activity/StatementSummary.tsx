import type { ReactNode } from 'react';
import { Amount } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import type { ClientStatement } from '../../../../core/finance/clientStatement';
import { countPhrase } from '../moduleCopy';

/** One line of the sum: a sign, what it is, and the figure. Wraps instead of clipping at large font sizes. */
function Line({ sign, label, hint, children }: { sign?: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-4 py-2.5 lg:flex-col lg:items-start lg:justify-start lg:gap-y-2 lg:py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="w-4 flex-none text-center text-md font-semibold text-fg-muted lg:hidden">
          {sign}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{label}</p>
          {hint && <p className="text-xs text-fg-muted">{hint}</p>}
        </div>
      </div>
      <div className="ms-auto flex-none text-md font-bold tabular-nums lg:ms-0">{children}</div>
    </div>
  );
}

/**
 * The statement as arithmetic: opening, plus what came in, minus what went out, equals the closing
 * balance. Says in words which side the balance falls on.
 */
export function StatementSummary({ statement }: { statement: ClientStatement }) {
  const { closing } = statement;
  const hint =
    closing < 0 ? 'عجز: المصروف أكبر من المحصّل' : closing > 0 ? 'فائض: المحصّل أكبر من المصروف' : 'المحصّل يساوي المصروف';
  return (
    <div className="space-y-2">
      <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-panel lg:grid lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.6fr)] lg:divide-x lg:divide-y-0 lg:rtl:divide-x-reverse">
        <Line label="الرصيد الافتتاحي">
          <Amount amount={statement.opening} tone={statement.opening < 0 ? 'danger' : 'neutral'} />
        </Line>
        <Line sign="+" label="المحصّل" hint={statement.inCount > 0 ? countPhrase('payments', statement.inCount) : undefined}>
          <Amount amount={statement.totalIn} tone="success" />
        </Line>
        <Line sign="−" label="المصروف" hint={statement.outCount > 0 ? countPhrase('expenses', statement.outCount) : undefined}>
          <Amount amount={statement.totalOut} tone="danger" />
        </Line>
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3.5 lg:flex-col lg:items-start lg:justify-start lg:gap-y-2',
            closing < 0 ? 'bg-danger-soft' : 'bg-success-soft'
          )}
        >
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold', closing < 0 ? 'text-danger-ink' : 'text-success-ink')}>الرصيد الختامي</p>
            <p className="text-xs text-fg-subtle">{hint}</p>
          </div>
          <Amount
            amount={closing}
            tone={closing < 0 ? 'danger' : 'success'}
            className="ms-auto flex-none text-xl font-bold lg:ms-0"
          />
        </div>
      </dl>
      <p className="px-1 text-xs leading-relaxed text-fg-muted">
        الرصيد = المحصّل ناقص المصروف، دون النسبة المتفق عليها ودون الديون.
      </p>
    </div>
  );
}
