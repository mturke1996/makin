import { Amount, Badge, ListGroup, Sheet } from '../../../design-system/primitives';
import { formatDate, formatMeasureUnit } from '../../../core/utils-formatters';
import type { MaterialSummary } from '../../../core/finance/priceTracking';

interface Props {
  summary: MaterialSummary;
  clientName: (id: string) => string;
  onClose: () => void;
}

/** The price of one material over time and across projects, newest first. */
export function MaterialSheet({ summary, clientName, onClose }: Props) {
  const { material, usual, change, high } = summary;
  const points = [...material.points].reverse();
  const percent = change === null ? null : Math.round(Math.abs(change) * 100);

  return (
    <Sheet open onClose={onClose} title={material.name} subtitle={material.unit ? `السعر لكل ${formatMeasureUnit(material.unit)}` : 'سعر القطعة'} maxWidth="md">
      <div className="space-y-5 p-4 pb-8 lg:p-6">
        <dl className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-surface-panel p-4">
          <div className="min-w-0">
            <dt className="text-2xs text-fg-muted">آخر سعر</dt>
            <dd className="mt-0.5 text-md font-bold"><Amount amount={summary.latest.unitPrice} tone={high ? 'danger' : 'inherit'} /></dd>
          </div>
          <div className="min-w-0">
            <dt className="text-2xs text-fg-muted">المعتاد</dt>
            <dd className="mt-0.5 text-md font-bold">{usual === null ? <span className="text-fg-muted">—</span> : <Amount amount={usual} />}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-2xs text-fg-muted">المدى</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg"><bdi dir="ltr">{summary.min.toLocaleString('en-US')} – {summary.max.toLocaleString('en-US')}</bdi></dd>
          </div>
        </dl>

        {high && percent !== null && (
          <p role="status" className="rounded-md bg-warning-soft p-3 text-sm leading-relaxed text-warning-ink">
            آخر شراء أعلى من المعتاد بنحو <bdi dir="ltr">{percent}%</bdi>. راجع السعر مع المورّد قبل الشراء القادم.
          </p>
        )}
        {summary.cheapest && (
          <p className="text-sm text-fg-subtle">الأرخص حالياً: <b className="text-fg">{summary.cheapest.name}</b> بسعر <Amount amount={summary.cheapest.unitPrice} className="font-semibold text-fg" /></p>
        )}

        <section className="space-y-2">
          <h3 className="px-1 text-sm font-semibold text-fg-subtle">كل المشتريات <span className="font-normal text-fg-muted">({points.length})</span></h3>
          <ListGroup>
            {points.map((p, i) => (
              <div key={p.expenseId} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tabular-nums text-fg">
                    {formatDate(p.date)} {i === 0 && <Badge tone="neutral" className="ms-1">الأحدث</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {[p.supplierName, clientName(p.clientId)].filter(Boolean).join(' · ')} · الكمية <bdi dir="ltr" className="tabular-nums">{p.quantity}</bdi>
                  </p>
                </div>
                <Amount amount={p.unitPrice} className="flex-none text-sm font-bold" />
              </div>
            ))}
          </ListGroup>
        </section>
      </div>
    </Sheet>
  );
}
