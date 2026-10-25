import { useMemo, useState } from 'react';
import { Amount, Segmented } from '../../../../design-system/primitives';
import { REST_KEY, breakdownByCategory, breakdownByPerson, type Breakdown } from '../../../../core/finance/clientAnalytics';
import type { Expense } from '../../../../types';

type Mode = 'category' | 'person';

/**
 * One hue, stepped from strong to soft in rank order: the list beside the bar names every step, so no
 * meaning rests on color. People use the neutral ink so the two views never read as the same thing.
 */
const STEPS = [100, 86, 74, 64, 56];
const tint = (mode: Mode, rank: number, rest: boolean) =>
  rest
    ? 'var(--surface-border-strong)'
    : `color-mix(in oklab, var(${mode === 'category' ? '--chart-expense' : '--chart-net'}) ${STEPS[Math.min(rank, STEPS.length - 1)]}%, var(--surface-panel))`;

/** «مصروف واحد»، «مصروفان»، «5 مصروفات»، «12 مصروفاً». */
const entries = (n: number) => (n === 1 ? 'مصروف واحد' : n === 2 ? 'مصروفان' : `${n} ${n <= 10 ? 'مصروفات' : 'مصروفاً'}`);

interface SpendBreakdownProps {
  expenses: readonly Expense[];
  /** The viewer sees every person's expenses, so the split by person is true. */
  showPeople: boolean;
}

/** Where the money went: a stacked bar and a ranked list, by category and (when it is true) by person. */
export function SpendBreakdown({ expenses, showPeople }: SpendBreakdownProps) {
  const [mode, setMode] = useState<Mode>('category');
  const byCategory = useMemo(() => breakdownByCategory(expenses), [expenses]);
  const byPerson = useMemo(() => breakdownByPerson(expenses), [expenses]);
  const current: Breakdown = mode === 'person' && showPeople ? byPerson : byCategory;
  const view: Mode = mode === 'person' && showPeople ? 'person' : 'category';

  return (
    <section aria-labelledby="overview-spend-title" className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 px-1">
        <div className="min-w-0">
          <h2 id="overview-spend-title" className="text-lg font-bold leading-tight text-fg">
            أين ذهب المال
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            {entries(current.count)}، إجماليها <Amount amount={current.total} className="font-medium text-fg-subtle" />
          </p>
        </div>
        {showPeople && (
          <Segmented<Mode>
            aria-label="التقسيم"
            value={view}
            onChange={setMode}
            className="w-64 max-w-full flex-none"
            options={[
              { value: 'category', label: 'حسب الفئة' },
              { value: 'person', label: 'حسب الشخص' },
            ]}
          />
        )}
      </header>

      <div className="rounded-lg border border-border bg-surface-panel p-4">
        {current.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">لا مصروفات مسجّلة بعد</p>
        ) : (
          <>
            <div role="img" aria-label={`توزيع المصروفات ${view === 'person' ? 'حسب الشخص' : 'حسب الفئة'}`} className="flex h-3 gap-0.5">
              {current.rows.map((row, i) => (
                <span
                  key={row.key}
                  aria-hidden
                  className="min-w-0.5 rounded-xs"
                  style={{ flex: `${row.amount} 1 0`, background: tint(view, i, row.key === REST_KEY) }}
                />
              ))}
            </div>

            <ol className="mt-3 divide-y divide-border">
              {current.rows.map((row, i) => (
                <li key={row.key} className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-0.5 py-2">
                  <span aria-hidden className="size-3 flex-none rounded-xs" style={{ background: tint(view, i, row.key === REST_KEY) }} />
                  <span className="min-w-0 flex-1 basis-32">
                    <span className="block text-base font-medium leading-snug text-fg [overflow-wrap:anywhere]">{row.label}</span>
                    <span className="block text-2xs text-fg-muted">
                      {entries(row.count)}
                      {row.key === REST_KEY && current.folded > 0 ? `، من ${current.folded} ${view === 'person' ? 'أشخاص' : 'فئات'}` : ''}
                    </span>
                  </span>
                  <span className="flex flex-none items-baseline gap-3">
                    <span className="w-10 text-end text-sm tabular-nums text-fg-subtle">
                      <bdi dir="ltr">{row.share}%</bdi>
                    </span>
                    <Amount amount={row.amount} className="text-base font-semibold text-fg" />
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
