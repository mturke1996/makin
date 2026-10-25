import { DeltaBadge, Sparkline, type ChartTone } from '../../../../design-system/charts';
import { Amount } from '../../../../design-system/primitives';
import type { PeriodChange } from '../../../../core/finance/clientAnalytics';

/** A change of a thousand percent or more says nothing a person can use (the base was almost nothing): no badge then. */
export const badgeFor = (change: PeriodChange, favorable: 'up' | 'down') => (
  <DeltaBadge pct={change.changePct !== null && Math.abs(change.changePct) >= 1000 ? null : change.changePct} favorable={favorable} />
);

/** The monthly curve under a card, the same drawing the home page uses. */
export const monthSeries = (values: readonly number[], tone: ChartTone, label: string) => (
  <Sparkline values={values} tone={tone} height={44} label={label} />
);

/** «هذا الشهر 1,200»: what the month so far added, under a figure. */
export const thisMonth = (value: number, tone?: 'auto') => (
  <>
    هذا الشهر <Amount amount={value} tone={tone} showSign={tone === 'auto'} className="font-medium text-fg-subtle" />
  </>
);
