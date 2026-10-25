import { cn } from '../../../../design-system/primitives/cn';
import { toMilli } from '../../../../core/finance/money';

/** Part of the bar as a share (0 to 100) of `whole`, both in thousandths. */
const share = (part: number, whole: number): number => (whole > 0 ? Math.min(100, Math.max(0, (part / whole) * 100)) : 0);

export type BarPart = { key: string; pct: number; className: string };

/**
 * One thin bar of adjacent parts on a sunken track. It is read by screen readers through `label` alone and
 * never relies on color: the figures are always printed beside it. No animation (it is data, not a state).
 */
export function CustodyBar({ parts, label, className }: { parts: BarPart[]; label: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-sunken', className)}
    >
      {parts
        .filter((p) => p.pct > 0)
        .map((p) => (
          <span key={p.key} className={cn('block h-full min-w-1 rounded-full', p.className)} style={{ flex: `0 1 ${p.pct}%` }} />
        ))}
    </div>
  );
}

/**
 * Parts of one custody against its amount: the deficit deducted from it (warning), what was spent that the
 * custody covered (accent), and what went beyond it (danger). The unfilled track is what is left.
 */
export function custodyParts(c: { amount: number; spent: number; opening: number }): BarPart[] {
  const carry = toMilli(c.amount) - toMilli(c.opening);
  const used = carry + toMilli(c.spent);
  const over = Math.max(0, used - toMilli(c.amount));
  const covered = toMilli(c.spent) - over;
  const base = Math.max(toMilli(c.amount), used);
  const pct = (milli: number) => share(milli, base);
  return [
    { key: 'carry', pct: pct(carry), className: 'bg-warning' },
    { key: 'spent', pct: pct(covered), className: 'bg-accent' },
    { key: 'over', pct: pct(over), className: 'bg-danger' },
  ];
}

/** Parts of a person's whole custody on the client: spent within what was given, then what went beyond it. */
export function userParts(u: { given: number; spent: number }): BarPart[] {
  const given = toMilli(u.given);
  const spent = toMilli(u.spent);
  const base = Math.max(given, spent);
  const pct = (milli: number) => share(milli, base);
  return [
    { key: 'spent', pct: pct(Math.min(spent, given)), className: 'bg-accent' },
    { key: 'over', pct: pct(Math.max(0, spent - given)), className: 'bg-danger' },
  ];
}
