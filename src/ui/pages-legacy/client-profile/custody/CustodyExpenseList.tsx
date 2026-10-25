import { useState } from 'react';
import { WarningAmber } from '../../../../design-system/icons';
import { Amount, Badge, Button } from '../../../../design-system/primitives';
import type { ClientCustodyExpense } from '../../../../core/finance/clientCustody';
import { formatDate, getExpenseCategoryLabel } from '../../../../core/utils-formatters';

const PAGE = 20;

/**
 * The expenses charged to ONE custody, newest first. Each row is the whole expense (it is never split),
 * with the custody balance after it; the part that went beyond the balance is called out in words.
 */
export function CustodyExpenseList({ id, expenses }: { id: string; expenses: ClientCustodyExpense[] }) {
  const [limit, setLimit] = useState(PAGE);
  const newestFirst = [...expenses].reverse();
  const shown = newestFirst.slice(0, limit);

  return (
    <div id={id}>
      <ul className="divide-y divide-border">
        {shown.map((e) => (
          <li key={e.id} className="flex items-start gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block break-words text-sm font-semibold leading-snug text-fg">{e.description}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-fg-muted">
                <span className="tabular-nums">{formatDate(e.date)}</span>
                <span aria-hidden>·</span>
                <span>{getExpenseCategoryLabel(e.category)}</span>
                {e.workerName && (
                  <Badge tone="neutral" className="h-6">
                    دفعة عامل
                  </Badge>
                )}
              </span>
              {e.overdrawnAmount > 0 && (
                <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-danger-ink">
                  <WarningAmber sx={{ fontSize: 16 }} aria-hidden className="flex-none" />
                  <span>
                    تجاوز الرصيد بمقدار <Amount amount={e.overdrawnAmount} className="font-bold" />
                  </span>
                </span>
              )}
            </span>
            <span className="flex-none text-end">
              <Amount amount={-e.amount} tone="danger" className="text-base font-bold" />
              <span className="mt-0.5 block text-2xs text-fg-muted">
                الرصيد بعده <Amount amount={e.balanceAfter} bare tone={e.balanceAfter < 0 ? 'danger' : 'inherit'} className="font-semibold" />
              </span>
            </span>
          </li>
        ))}
      </ul>
      {newestFirst.length > limit && (
        <div className="border-t border-border p-3">
          <Button variant="outline" block onClick={() => setLimit((l) => l + PAGE)}>
            عرض المزيد
          </Button>
        </div>
      )}
    </div>
  );
}
