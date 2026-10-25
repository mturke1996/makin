import { AccountBalanceWallet } from '@mui/icons-material';
import { Amount, Badge, ProgressBar } from '../../../design-system/primitives';
import { formatCurrencyDisplay } from '../../../core/utils-formatters';

type Tone = 'success' | 'warning' | 'danger';

const ICON_TONE: Record<Tone, string> = {
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
};
const STATE_LABEL: Record<Tone, string> = { success: 'رصيد جيد', warning: 'رصيد منخفض', danger: 'عجز' };

/** The signed-in user's custody (عهدة): what is left to spend, and how fast it is going. */
export function FundBanner({ stats }: { stats: { deposited: number; spent: number; remaining: number } }) {
  const deficit = stats.remaining < 0;
  const low = !deficit && stats.remaining <= stats.deposited * 0.4;
  const tone: Tone = deficit ? 'danger' : low ? 'warning' : 'success';
  const pct =
    stats.deposited > 0 ? Math.max(0, Math.min(100, (stats.remaining / stats.deposited) * 100)) : 0;

  return (
    <section aria-label="رصيد العهدة" className="rounded-lg border border-border bg-surface-panel">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span aria-hidden className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${ICON_TONE[tone]}`}>
          <AccountBalanceWallet sx={{ fontSize: 22 }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-fg-subtle">{deficit ? 'عجز في العهدة' : 'رصيد عهدتك المتاح'}</p>
          <Amount amount={stats.remaining} tone={tone} className="text-xl font-bold" />
        </div>
        <Badge tone={tone} dot>
          {STATE_LABEL[tone]}
        </Badge>
      </div>
      <div className="px-4 pb-3.5">
        <ProgressBar value={deficit ? 100 : pct} tone={tone} label="المتبقي من العهدة" />
        <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-fg-muted">
          <span>{deficit ? 'العجز يُخصم من العهدة القادمة' : `${Math.round(pct)}% متبقي`}</span>
          <span>
            صُرف {formatCurrencyDisplay(stats.spent)} من {formatCurrencyDisplay(stats.deposited)}
          </span>
        </div>
      </div>
    </section>
  );
}
