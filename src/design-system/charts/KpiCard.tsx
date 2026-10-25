import type { ReactNode } from 'react';
import { Amount } from '../primitives/CurrencyAmount';
import { StatCard } from '../primitives/StatCard';
import { DeltaBadge } from './DeltaBadge';

interface KpiCardProps {
  label: string;
  /** Money shown big. */
  amount: number;
  amountTone?: 'neutral' | 'success' | 'danger' | 'warning' | 'brand' | 'auto';
  /** Change against the previous period; omit when there is none to compare. */
  delta?: { pct: number | null; favorable: 'up' | 'down' };
  /** One quiet line under the figure ("34 قيداً", "عن الفترة السابقة"). */
  hint?: ReactNode;
  /** The mini chart. */
  children?: ReactNode;
  className?: string;
}

/** A dashboard figure: name and change badge on top, the amount, a hint, and a small chart. */
export function KpiCard({ label, amount, amountTone = 'neutral', delta, hint, children, className }: KpiCardProps) {
  return (
    <StatCard
      className={className}
      label={label}
      badge={delta && <DeltaBadge pct={delta.pct} favorable={delta.favorable} />}
      value={<Amount amount={amount} tone={amountTone} rounding="integer" />}
      hint={hint}
      trend={children}
    />
  );
}
