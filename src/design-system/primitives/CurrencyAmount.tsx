import { cn } from './cn';
import { CURRENCY_SYMBOL, formatAmountDisplay, formatCurrency, formatCurrencyNumber } from '../../core/utils-formatters';
import type { Ref, CSSProperties } from 'react';

type Props = {
  amount: number;
  className?: string;
  /** kept for API compatibility (unused — currency is inline now) */
  suffixClassName?: string;
};

/** Plain «رقم ثم د.ل» (rounded) — legacy helper kept for existing call sites. */
export function CurrencyAmount({ amount, className }: Props) {
  return <span className={cn('tabular-nums', className)}>{formatCurrency(amount)}</span>;
}

/** alias */
export function Money({ amount, className }: { amount: number; className?: string }) {
  return <span className={cn('tabular-nums', className)}>{formatCurrency(amount)}</span>;
}

type Tone = 'neutral' | 'auto' | 'success' | 'danger' | 'warning' | 'brand' | 'inherit';
const toneClass: Record<Exclude<Tone, 'auto'>, string> = {
  neutral: 'text-fg',
  success: 'text-success-ink',
  danger: 'text-danger-ink',
  warning: 'text-warning-ink',
  brand: 'text-accent-ink',
  inherit: '',
};

interface AmountProps {
  amount: number;
  /** `auto`: success when ≥ 0, danger when < 0. */
  tone?: Tone;
  /** Force a leading + for positives (for ledgers: +1,000 / −250). */
  showSign?: boolean;
  /** Keep fractions when present (default) or round to integers. */
  rounding?: 'preserve' | 'integer';
  /** Hide the currency symbol (for table columns that state the unit once). */
  bare?: boolean;
  className?: string;
}

/**
 * The one way to show money in the UI.
 * - number is an LTR-isolated run, so negatives read «−1,250» (not «1,250−») in RTL
 * - tabular figures, never wraps, symbol is quieter than the figure
 */
export function Amount({ amount, tone = 'inherit', showSign, rounding = 'preserve', bare, className }: AmountProps) {
  const negative = amount < 0 && Math.abs(amount) >= (rounding === 'integer' ? 0.5 : 0.0005);
  const abs = Math.abs(amount);
  const body = rounding === 'integer' ? formatCurrencyNumber(abs) : formatAmountDisplay(Number(abs.toFixed(3)));
  const sign = negative ? '−' : showSign && amount > 0 ? '+' : '';
  const resolved: Exclude<Tone, 'auto'> = tone === 'auto' ? (negative ? 'danger' : 'success') : tone;
  return (
    <span className={cn('whitespace-nowrap tabular-nums', toneClass[resolved], className)}>
      <bdi dir="ltr">{sign}{body}</bdi>
      {!bare && <span data-currency className="ms-1 font-medium opacity-70 [font-size:max(0.75rem,0.72em)]">{CURRENCY_SYMBOL}</span>}
    </span>
  );
}

/**
 * للعدّادات المتحركة (GSAP countUp) — الرقم في عنصر مستقل يُحدّث، تليه «د.ل».
 */
export function AnimatedCurrency({
  className,
  style,
  numberRef,
  start = 0,
}: {
  className?: string;
  style?: CSSProperties;
  numberRef?: Ref<HTMLElement>;
  start?: number;
}) {
  return (
    <span className={cn('tabular-nums', className)} style={style}>
      <span ref={numberRef as Ref<HTMLSpanElement>}>{formatCurrencyNumber(start)}</span>
      {' '}
      {CURRENCY_SYMBOL}
    </span>
  );
}
