import { PaymentsOutlined } from '../../../design-system/icons';
import { Amount, EmptyState, ListGroup, ListRow } from '../../../design-system/primitives';
import { formatCurrencyDisplay, formatDate } from '../../../core/utils-formatters';
import type { Payment } from '../../../types';
import { PAYMENT_METHOD_LABEL } from './invoiceStatus';
import { fromMills, toMills } from './invoiceMath';

interface PaymentsTimelineProps {
  payments: Payment[];
  invoiceTotal: number;
}

/** Payments newest first, each with what was left on the invoice right after it. */
export function PaymentsTimeline({ payments, invoiceTotal }: PaymentsTimelineProps) {
  if (payments.length === 0) {
    return (
      <EmptyState
        bare
        className="rounded-lg border border-dashed border-border-strong py-8"
        Icon={PaymentsOutlined}
        title="لا توجد دفعات بعد"
        description="كل دفعة تُسجَّل هنا مع تاريخها وطريقتها وما تبقى بعدها."
      />
    );
  }

  const chronological = [...payments].sort(
    (a, b) => a.paymentDate.localeCompare(b.paymentDate) || a.createdAt.localeCompare(b.createdAt)
  );
  let running = toMills(invoiceTotal);
  const afterById = new Map<string, number>();
  for (const p of chronological) {
    running -= toMills(p.amount);
    afterById.set(p.id, Math.max(0, fromMills(running)));
  }

  return (
    <ListGroup>
      {[...chronological].reverse().map((p) => (
        <ListRow
          key={p.id}
          density="compact"
          leading={
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-soft text-success-ink">
              <PaymentsOutlined sx={{ fontSize: 18 }} />
            </span>
          }
          title={<Amount amount={p.amount} tone="success" showSign className="text-md font-bold" />}
          subtitle={
            <>
              <bdi dir="ltr">{formatDate(p.paymentDate)}</bdi> · {PAYMENT_METHOD_LABEL[p.paymentMethod] || p.paymentMethod}
            </>
          }
          meta={
            <>
              {p.notes && <span className="text-xs text-fg-subtle">{p.notes}</span>}
              <span className="text-xs text-fg-muted">
                المتبقي بعدها <bdi dir="ltr">{formatCurrencyDisplay(afterById.get(p.id) ?? 0)}</bdi>
              </span>
            </>
          }
        />
      ))}
    </ListGroup>
  );
}
