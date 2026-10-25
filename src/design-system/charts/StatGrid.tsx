import { Children, type ReactNode } from 'react';
import { cn } from '../primitives/cn';
import { StatCard } from '../primitives/StatCard';
import { compactParts } from './scale';
import { CURRENCY_SYMBOL } from '../../core/utils-formatters';

export function CompactAmount({ amount, className }: { amount: number; className?: string }) {
  const { sign, number, unit } = compactParts(amount);
  return <span className={cn('whitespace-nowrap tabular-nums', className)}><bdi dir="ltr">{sign}{number}</bdi>{unit && <span className="ms-1">{unit}</span>}<span data-currency className="ms-1 font-normal text-fg-subtle [font-size:0.85em]">{CURRENCY_SYMBOL}</span></span>;
}

type CellTone = 'neutral' | 'warning' | 'danger' | 'success' | 'info';
const valueTone: Record<CellTone, string> = { neutral: 'text-fg', warning: 'text-warning-ink', danger: 'text-danger-ink', success: 'text-success-ink', info: 'text-info-ink' };
interface StatCellProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: CellTone;
  hint?: ReactNode;
  onClick?: () => void;
}
/** Same compact statistic card used in Linda's customer profile, without decorative icon tiles. */
export function StatCell({ label, value, tone = 'neutral', hint, onClick }: StatCellProps) {
  return <StatCard label={label} value={value} hint={hint} onClick={onClick} valueClassName={valueTone[tone]} />;
}
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  const count = Children.toArray(children).length;
  return <div className={cn('grid grid-cols-2 gap-2.5', count > 1 && count % 2 === 1 && '[&>*:last-child]:col-span-2', className)}>{children}</div>;
}
