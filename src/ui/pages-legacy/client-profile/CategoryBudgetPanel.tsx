import { useState } from 'react';
import { Amount, Badge, ProgressBar } from '../../../design-system/primitives';
import type { BudgetState, CategoryBudgetRow } from '../../../core/finance/budgetStatus';
import { categoryBudgetTotals } from '../../../core/finance/budgetStatus';

const SHOWN = 6;

const STATE: Record<CategoryBudgetRow['state'], { tone: 'danger' | 'warning' | 'neutral' | 'success'; label: string | null; bar: 'danger' | 'warning' | 'brand' }> = {
  over: { tone: 'danger', label: 'تجاوز التقدير', bar: 'danger' },
  near: { tone: 'warning', label: 'قارب التقدير', bar: 'warning' },
  ok: { tone: 'success', label: null, bar: 'brand' },
  none: { tone: 'neutral', label: null, bar: 'brand' },
  unbudgeted: { tone: 'neutral', label: 'بلا تقدير', bar: 'brand' },
};

/**
 * The estimate (the bill of quantities, by category) against what was spent on the same categories.
 * Worst first, so the categories that need a look are the ones on top.
 */
export function CategoryBudgetPanel({ rows }: { rows: readonly CategoryBudgetRow[] }) {
  const [all, setAll] = useState(false);
  if (rows.length === 0) return null;
  const totals = categoryBudgetTotals(rows);
  const shown = all ? rows : rows.slice(0, SHOWN);
  const overCount = rows.filter((r) => r.state === 'over').length;

  return (
    <section aria-label="التقدير مقابل الفعلي حسب التصنيف" className="overflow-hidden rounded-lg border border-border bg-surface-panel">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">التقدير مقابل الفعلي حسب التصنيف</h3>
          <p className="mt-0.5 text-2xs text-fg-muted">التقدير من بنود الجدول المصنّفة، والفعلي من مصروفات التصنيف نفسه.</p>
        </div>
        {overCount > 0 && <Badge tone="danger">{overCount === 1 ? 'تصنيف تجاوز تقديره' : `${overCount} تصنيفات تجاوزت تقديرها`}</Badge>}
      </header>
      <ul className="divide-y divide-border">
        {shown.map((row) => {
          const style = STATE[row.state];
          const used = row.ratio ?? 0;
          return (
            <li key={row.category} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-fg">{row.label}</span>
                  {style.label && <Badge tone={style.tone}>{style.label}</Badge>}
                </span>
                <span className="flex-none text-end text-sm tabular-nums">
                  <Amount amount={row.actual} tone={row.state === 'over' ? 'danger' : 'inherit'} className="font-bold" />
                  {row.state !== 'unbudgeted' && (
                    <span className="ms-1 text-xs text-fg-muted">
                      من <Amount amount={row.budget} />
                    </span>
                  )}
                </span>
              </div>
              {row.state !== 'unbudgeted' && (
                <div className="mt-2 flex items-center gap-3">
                  <ProgressBar value={Math.min(100, used)} tone={style.bar} label={`استهلاك تقدير ${row.label}`} />
                  <span className="w-12 flex-none text-end text-2xs tabular-nums text-fg-muted">{`${Math.round(used)}%`}</span>
                </div>
              )}
              {row.state === 'over' && (
                <p className="mt-1 text-2xs text-danger-ink">
                  زاد <Amount amount={Math.abs(row.variance)} /> عن التقدير
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-sunken px-4 py-2.5 text-xs text-fg-muted">
        <span>
          الفعلي <Amount amount={totals.actual} /> من تقدير <Amount amount={totals.budget} />
          {totals.unbudgeted > 0 && (
            <>
              {' '}
              · بلا تقدير <Amount amount={totals.unbudgeted} />
            </>
          )}
        </span>
        {rows.length > SHOWN && (
          <button type="button" className="min-h-11 font-semibold text-accent-ink" onClick={() => setAll((v) => !v)}>
            {all ? 'عرض الأهم فقط' : `عرض كل التصنيفات (${rows.length})`}
          </button>
        )}
      </footer>
    </section>
  );
}

export type { BudgetState };
