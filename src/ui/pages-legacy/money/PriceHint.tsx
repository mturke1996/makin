import { useMemo } from 'react';
import { WarningAmber } from '../../../design-system/icons';
import { Amount } from '../../../design-system/primitives';
import { assessPrice, buildPriceBook, materialKey } from '../../../core/finance/priceTracking';
import type { Expense } from '../../../types';

interface Props {
  /** Every expense the person may see (the hint is shown only when that is all of them). */
  expenses: readonly Expense[];
  complete: boolean;
  description: string;
  category: string;
  unit?: string;
  unitPrice: number | undefined;
  /** The expense being edited: it is not compared with itself. */
  excludeId?: string;
}

/** While the unit price is typed: what this material usually costs, and a warning when this price is clearly higher. */
export function PriceHint({ expenses, complete, description, category, unit, unitPrice, excludeId }: Props) {
  const book = useMemo(() => (complete ? buildPriceBook(expenses) : []), [complete, expenses]);
  const result = useMemo(() => {
    if (!complete || !unitPrice || unitPrice <= 0 || !description.trim()) return null;
    const entry = book.find((m) => m.key === materialKey({ description, category: category as Expense['category'], unit }));
    const a = assessPrice(entry, unitPrice, { excludeId });
    return a.usual === null ? null : a;
  }, [book, complete, description, category, unit, unitPrice, excludeId]);

  if (!result || result.usual === null || result.change === null) return null;
  const percent = Math.round(Math.abs(result.change) * 100);

  if (result.high) {
    return (
      <div role="status" className="flex items-start gap-2.5 rounded-md bg-warning-soft p-3 text-warning-ink">
        <WarningAmber sx={{ fontSize: 20 }} aria-hidden className="mt-0.5 flex-none" />
        <p className="text-sm leading-relaxed">
          السعر أعلى من المعتاد بنحو <bdi dir="ltr">{percent}%</bdi>: المعتاد <Amount amount={result.usual} />، بحسب {result.priorCount} مشتريات سابقة. راجع السعر مع المورّد.
        </p>
      </div>
    );
  }
  return (
    <p className="text-xs text-fg-muted">
      السعر المعتاد لهذه المادة <Amount amount={result.usual} className="font-semibold text-fg-subtle" />
      {result.change < -0.001 && <> · هذا السعر أقل منه بنحو <bdi dir="ltr">{percent}%</bdi></>}.
    </p>
  );
}
