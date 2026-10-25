import { Amount } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import { formatCurrencyDisplay } from '../../../core/utils-formatters';
import { StatementLine } from './ClientAccountSummary';
import { custodyCount } from './custody/copy';
import { countPhrase } from './moduleCopy';
import type { UserBalanceInfo } from './types';

interface ClientPersonalSummaryProps {
  /** Whose expenses `expensesTotal` adds up: everyone's, only the signed-in person's, or none (no line). */
  scope: 'all' | 'own' | 'none';
  expensesTotal: number;
  expensesCount: number;
  /** The person's own custody on this client, when they have any. */
  custody: UserBalanceInfo | null;
  className?: string;
}

/**
 * What a person can honestly say about this client when they do not hold the whole picture (no payments,
 * debts or other people's expenses): their own expenses on it and, if they have custody, its balance.
 * Every label names whose figure it is, so a partial total is never read as the client's account.
 */
export function ClientPersonalSummary({ scope, expensesTotal, expensesCount, custody, className }: ClientPersonalSummaryProps) {
  const own = scope === 'own';

  return (
    <section
      aria-labelledby="client-personal-title"
      className={cn('rounded-lg border border-border bg-surface-panel', className)}
    >
      <h2 id="client-personal-title" className="px-4 pt-4 text-lg font-bold text-fg">
        {scope === 'none' ? 'عهدتي على هذا المشروع' : own ? 'ملخصي على هذا المشروع' : 'المصروفات على هذا المشروع'}
      </h2>

      <dl className="divide-y divide-border px-4 pb-1 pt-2">
        {scope !== 'none' && (
          <StatementLine
            label={own ? 'مصروفاتي' : 'إجمالي المصروفات'}
            hint={own ? `${countPhrase('expenses', expensesCount)}، ما سجّلته أنت فقط` : countPhrase('expenses', expensesCount)}
          >
            <Amount amount={-expensesTotal} tone="danger" />
          </StatementLine>
        )}

        {custody && (
          <StatementLine
            label={custody.deficit > 0 ? 'عجز عهدتي' : 'عهدتي على المشروع'}
            hint={
              custody.exact
                ? `${custodyCount(custody.custodies.length)}، الممنوح ${formatCurrencyDisplay(custody.given)}، المصروف ${formatCurrencyDisplay(custody.spent)}`
                : 'الممنوح لك، والمصروف منها غير متاح لك'
            }
          >
            {custody.exact ? (
              <Amount
                amount={custody.deficit > 0 ? -custody.deficit : custody.remaining}
                tone={custody.remaining > 0 ? 'success' : custody.remaining < 0 ? 'danger' : 'neutral'}
              />
            ) : (
              <Amount amount={custody.given} tone="success" />
            )}
          </StatementLine>
        )}
      </dl>
    </section>
  );
}
