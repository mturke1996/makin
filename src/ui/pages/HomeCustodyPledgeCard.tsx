import { AccountBalanceWallet, ChevronRight } from '@mui/icons-material';
import { Amount, Badge, ProgressBar } from '../../design-system/primitives';
import { cn } from '../../design-system/primitives/cn';
import type { MyFundStats } from '../../core/hooks/useMyFundStats';

/**
 * Personal custody (عهدة): what is left of the cash handed to the signed-in
 * user. Same FIFO stats as the Custody screen; the whole card opens it.
 */
export interface HomeCustodyPledgeCardProps {
  stats: MyFundStats;
  rtl: boolean;
  /** Opens the person's custody page. */
  onOpen: () => void;
  className?: string;
}

/** Integer thousandths so comparisons never trip on float drift. */
const mil = (n: number) => Math.round(n * 1000);

export function HomeCustodyPledgeCard({ stats, rtl, onOpen, className }: HomeCustodyPledgeCardProps) {
  const t = (ar: string, en: string) => (rtl ? ar : en);
  const remaining = mil(stats.remaining);
  const isDeficit = remaining < 0;
  const healthy = remaining > mil(stats.deposited) * 0.4;
  const pct = stats.deposited > 0 ? Math.max(0, Math.min(100, (remaining / mil(stats.deposited)) * 100)) : 0;

  const tone = isDeficit ? 'danger' : healthy ? 'success' : 'warning';
  const iconTone = {
    danger: 'bg-danger-soft text-danger-ink',
    success: 'bg-success-soft text-success-ink',
    warning: 'bg-warning-soft text-warning-ink',
  }[tone];

  const note = isDeficit
    ? t('الرصيد سالب. راجع المصروفات المسجّلة.', 'Negative balance. Review recorded expenses.')
    : t(`متبقٍ ${Math.round(pct)}% من إجمالي العهدة.`, `${Math.round(pct)}% of the custody is left.`);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'block w-full rounded-lg border border-border bg-surface-panel p-4 text-start sm:p-5',
        'transition-[background-color,transform] duration-fast ease-out hover:bg-surface-hover active:scale-[0.99]',
        'focus:outline-none focus-visible:shadow-focus',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className={cn('inline-flex h-10 w-10 flex-none items-center justify-center rounded-md', iconTone)}>
          <AccountBalanceWallet sx={{ fontSize: 22 }} />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3 className="truncate text-base font-semibold text-fg">{t('عهدتك', 'Your custody')}</h3>
          {isDeficit && (
            <Badge tone="danger" dot>
              {t('عجز', 'Deficit')}
            </Badge>
          )}
        </div>
        <ChevronRight
          sx={{ fontSize: 20 }}
          className="flex-none text-fg-muted rtl-flip"
          aria-hidden
        />
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-fg-muted">{t('المتبقي', 'Remaining')}</p>
        <Amount
          amount={stats.remaining}
          tone={tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : 'warning'}
          className="mt-0.5 block text-3xl font-bold leading-tight"
        />
        <ProgressBar
          value={isDeficit ? 100 : pct}
          tone={tone}
          className="mt-3"
          label={t('نسبة المتبقي من العهدة', 'Share of custody left')}
        />
        <p className="mt-2 text-xs text-fg-muted">{note}</p>
      </div>

      <dl className="mt-4 grid grid-cols-2 border-t border-border pt-3">
        <div className="min-w-0 pe-3">
          <dt className="text-2xs font-medium text-fg-muted">{t('الإيداعات', 'Deposited')}</dt>
          <dd className="mt-0.5 truncate">
            <Amount amount={stats.deposited} tone="neutral" className="text-sm font-semibold" />
          </dd>
        </div>
        <div className="min-w-0 border-s border-border ps-3">
          <dt className="text-2xs font-medium text-fg-muted">{t('المصروف', 'Spent')}</dt>
          <dd className="mt-0.5 truncate">
            <Amount amount={stats.spent} tone="danger" className="text-sm font-semibold" />
          </dd>
        </div>
      </dl>
    </button>
  );
}
