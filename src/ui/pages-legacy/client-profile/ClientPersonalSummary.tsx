import { Amount, Section, StatCard } from '../../../design-system/primitives';
import { KPI_CONTAINER, kpiGridClass } from '../../../design-system/charts';
import { formatCurrencyDisplay } from '../../../core/utils-formatters';
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
  const cards = (scope !== 'none' ? 1 : 0) + (custody ? 1 : 0);

  return (
    <Section
      title={scope === 'none' ? 'عهدتي على هذا المشروع' : own ? 'ملخصي على هذا المشروع' : 'المصروفات على هذا المشروع'}
      className={className}
    >
      <div className={KPI_CONTAINER}>
        <div className={kpiGridClass(cards)}>
          {scope !== 'none' && (
            <StatCard
              label={own ? 'مصروفاتي' : 'إجمالي المصروفات'}
              value={<Amount amount={expensesTotal} tone="danger" />}
              hint={own ? `${countPhrase('expenses', expensesCount)}، ما سجّلته أنت فقط` : countPhrase('expenses', expensesCount)}
            />
          )}
          {custody && (
            <StatCard
              label={custody.deficit > 0 ? 'عجز عهدتي' : 'عهدتي على المشروع'}
              value={
                custody.exact ? (
                  <Amount
                    amount={custody.deficit > 0 ? -custody.deficit : custody.remaining}
                    tone={custody.remaining > 0 ? 'success' : custody.remaining < 0 ? 'danger' : 'neutral'}
                  />
                ) : (
                  <Amount amount={custody.given} tone="success" />
                )
              }
              hint={
                custody.exact
                  ? `${custodyCount(custody.custodies.length)}، الممنوح ${formatCurrencyDisplay(custody.given)}، المصروف ${formatCurrencyDisplay(custody.spent)}`
                  : 'الممنوح لك، والمصروف منها غير متاح لك'
              }
            />
          )}
        </div>
      </div>
    </Section>
  );
}
