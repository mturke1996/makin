import { AccountBalanceWallet, WarningAmber } from '@mui/icons-material';
import { formatCurrencyDisplay, parseDecimalInput } from '../../../core/utils-formatters';
import { Amount } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import { chargedCustody } from '../../../core/finance/clientCustody';
import { roundMoney, splitAgainstCustody } from '../../../core/finance/custodyFifo';
import { ProfileCallout } from './profileUi';
import type { UserBalanceInfo } from './types';

/** Remaining custody pool: tinted success while there is balance, danger once it is gone. */
export function FundBanner({ title = 'رصيد العهدة', stats }: { title?: string; stats: { remaining: number } }) {
  const positive = stats.remaining > 0;
  return (
    <ProfileCallout
      tone={positive ? 'success' : 'danger'}
      icon={positive ? <AccountBalanceWallet sx={{ fontSize: 22 }} /> : <WarningAmber sx={{ fontSize: 22 }} />}
      title={title}
      figure={<Amount amount={stats.remaining} />}
    >
      {!positive && 'الرصيد منتهٍ'}
    </ProfileCallout>
  );
}

/**
 * One employee's custody balance on this client with what was given and what was spent. A deficit says what
 * happens to it, and with several custodies it names the one the next expense will be charged to. When the
 * viewer cannot see the spending (`exact: false`) it states only what was handed over.
 */
export function UserBalanceBanner({ info, userName }: { info: UserBalanceInfo; userName?: string }) {
  const title = userName ? `رصيد عهدة ${userName}` : 'رصيد العهدة';

  if (!info.exact) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-lg bg-surface-sunken px-4 py-3 text-fg">
        <AccountBalanceWallet sx={{ fontSize: 22 }} aria-hidden className="flex-none text-fg-muted" />
        <p className="min-w-0 flex-1 text-sm font-semibold">{userName ? `عهدة ${userName}` : 'العهدة'}</p>
        <p className="flex-none text-end">
          <span className="block text-2xs font-normal text-fg-muted">الممنوح</span>
          <Amount amount={info.given} className="text-md font-bold" />
        </p>
      </div>
    );
  }

  const positive = info.remaining > 0;
  const inDeficit = info.deficit > 0;
  const next = info.custodies.length > 1 ? chargedCustody(info.custodies) : undefined;
  return (
    <div
      role="status"
      className={cn(
        'overflow-hidden rounded-lg',
        positive ? 'bg-success-soft text-success-ink' : 'bg-danger-soft text-danger-ink'
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <AccountBalanceWallet sx={{ fontSize: 22 }} aria-hidden className="flex-none" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>
        <p className="flex-none text-xl font-bold leading-tight tabular-nums">
          <Amount amount={info.remaining} />
        </p>
      </div>
      <dl className="grid grid-cols-2 border-t border-border">
        <div className="min-w-0 px-4 py-2.5">
          <dt className="text-2xs text-fg-subtle">إجمالي العهدة</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">
            <Amount amount={info.given} />
          </dd>
        </div>
        <div className="min-w-0 border-s border-border px-4 py-2.5">
          <dt className="text-2xs text-fg-subtle">المصروف</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-danger-ink">
            <Amount amount={info.spent} />
          </dd>
        </div>
      </dl>
      {next && (
        <p className="border-t border-border px-4 py-2 text-xs font-medium text-fg-subtle">
          تُخصم المصروفات الجديدة من العهدة <bdi dir="ltr" className="font-bold tabular-nums">#{next.number}</bdi>
        </p>
      )}
      {!positive && (
        <p className="flex items-center gap-2 border-t border-border px-4 py-2 text-xs font-semibold">
          <WarningAmber sx={{ fontSize: 18 }} aria-hidden className="flex-none" />
          {inDeficit ? (
            <span>
              تجاوزت المصروفات العهدة بمقدار <Amount amount={info.deficit} />، ويُخصم الفرق من العهدة القادمة
            </span>
          ) : (
            'رصيد العهدة نفد بالكامل'
          )}
        </p>
      )}
    </div>
  );
}

/**
 * تنبيه قبل حفظ مصروف يتجاوز رصيد العهدة: المصروف يُسجَّل كاملاً في سطر واحد دون تقسيم،
 * والفرق فقط يصبح عجزاً يُخصم تلقائياً من العهدة القادمة.
 * originalAmount: مبلغ المصروف الأصلي عند التعديل (يُعاد إلى الرصيد قبل المقارنة).
 */
export function CustodyOverdraftNotice({
  stats,
  amount,
  originalAmount = 0,
  label = 'العهدة',
}: {
  stats?: { remaining: number } | null;
  amount: unknown;
  originalAmount?: number;
  /** Which custody the figures belong to, as the warning names it. */
  label?: string;
}) {
  if (!stats) return null;
  const value = roundMoney(parseDecimalInput(amount) ?? 0);
  const available = roundMoney(stats.remaining + (originalAmount || 0));
  const { fromBalance, deficit } = splitAgainstCustody(available, value);
  if (deficit <= 0) return null;
  const totalDeficit = roundMoney(Math.max(0, -available) + deficit);

  return (
    <ProfileCallout
      tone="danger"
      icon={<WarningAmber sx={{ fontSize: 22 }} />}
      title={
        fromBalance > 0
          ? `المبلغ أكبر من رصيد ${label} المتبقي (${formatCurrencyDisplay(available)})`
          : `رصيد ${label} منتهٍ`
      }
    >
      <p className="text-sm leading-relaxed">
        {fromBalance > 0
          ? `سيُسجَّل المصروف كاملاً (${formatCurrencyDisplay(value)}) دون تقسيم: يغطي الرصيد المتبقي ${formatCurrencyDisplay(fromBalance)}، والفرق ${formatCurrencyDisplay(deficit)} يُسجَّل عجزاً يُخصم تلقائياً من العهدة القادمة.`
          : `سيُسجَّل المصروف كاملاً (${formatCurrencyDisplay(value)}) ويُضاف إلى العجز الذي يُخصم تلقائياً من العهدة القادمة.`}
      </p>
      {totalDeficit > deficit && (
        <p className="mt-1.5 text-sm font-semibold text-danger-ink">
          إجمالي العجز بعد الحفظ: {formatCurrencyDisplay(totalDeficit)}
        </p>
      )}
    </ProfileCallout>
  );
}
