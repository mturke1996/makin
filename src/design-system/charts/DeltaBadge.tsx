import { NorthEast, SouthEast, Remove } from '@mui/icons-material';
import { cn } from '../primitives/cn';

interface DeltaBadgeProps {
  /** Percent change against the previous period; null hides the badge (nothing to compare with). */
  pct: number | null;
  /** Which way is good news: more income is `up`, more spending is `down`. */
  favorable: 'up' | 'down';
  className?: string;
}

/** "69.4%" with an arrow, green when the change is good news and red when it is not. */
export function DeltaBadge({ pct, favorable, className }: DeltaBadgeProps) {
  if (pct === null) return null;
  const dir = pct === 0 ? 'flat' : pct > 0 ? 'up' : 'down';
  const good = dir === 'flat' ? null : dir === favorable;
  const Icon = dir === 'up' ? NorthEast : dir === 'down' ? SouthEast : Remove;
  const word = dir === 'up' ? 'ارتفاع' : dir === 'down' ? 'انخفاض' : 'دون تغيير';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-3xs font-semibold leading-4 tabular-nums',
        good === null ? 'bg-surface-sunken text-fg-subtle' : good ? 'bg-success-soft text-success-ink' : 'bg-danger-soft text-danger-ink',
        className,
      )}
      aria-label={`${word} ${Math.abs(pct).toLocaleString('en-US')} بالمئة عن الفترة السابقة`}
    >
      <Icon aria-hidden sx={{ fontSize: 12 }} className="rtl-flip" />
      <bdi dir="ltr">{Math.abs(pct).toLocaleString('en-US', { maximumFractionDigits: 1 })}%</bdi>
    </span>
  );
}
