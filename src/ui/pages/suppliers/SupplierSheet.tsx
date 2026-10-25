import { useMemo, useState } from 'react';
import { Edit, PhoneEnabled, PictureAsPdf } from '../../../design-system/icons';
import { Amount, Avatar, Button, IconButton, ListGroup, Sheet } from '../../../design-system/primitives';
import { expenseCategories, expenseHasQuantityLine, formatCurrencyDisplay, formatDate, formatQuantityWithUnit } from '../../../core/utils-formatters';
import { supplierExpenses, type SupplierRow } from '../../../core/finance/supplierLedger';
import type { Expense } from '../../../types';

const catLabel = (cat: string) => (expenseCategories as Record<string, string>)[cat] || cat;
const SHOWN = 25;

interface Props {
  row: SupplierRow;
  expenses: Expense[];
  clientName: (id: string) => string;
  onClose: () => void;
  onEdit?: () => void;
  onStatement: () => void;
  busy?: boolean;
}

/** One supplier: what was bought from him in total, by project, and every purchase with its quantity and price. */
export function SupplierSheet({ row, expenses, clientName, onClose, onEdit, onStatement, busy }: Props) {
  const { supplier } = row;
  const [all, setAll] = useState(false);
  const bought = useMemo(() => supplierExpenses(supplier.id, expenses), [supplier.id, expenses]);
  const shown = all ? bought : bought.slice(0, SHOWN);

  return (
    <Sheet
      open
      onClose={onClose}
      title={supplier.name}
      subtitle={supplier.supplies}
      maxWidth="md"
      headerAction={onEdit ? <IconButton label="تعديل المورّد" onClick={onEdit}><Edit sx={{ fontSize: 22 }} /></IconButton> : undefined}
      footer={<Button block size="lg" loading={busy} leftIcon={<PictureAsPdf sx={{ fontSize: 20 }} />} onClick={onStatement}>كشف حساب المورّد (PDF)</Button>}
    >
      <div className="space-y-5 p-4 pb-8 lg:p-6">
        <section className="flex items-start gap-3">
          <Avatar name={supplier.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-fg-muted">إجمالي المشتريات</p>
            <p className="mt-0.5 text-2xl font-bold"><Amount amount={row.total} /></p>
            <p className="mt-1 text-xs text-fg-subtle tabular-nums">
              {row.count} {row.count === 1 ? 'عملية' : 'عمليات'}{row.lastDate ? ` · آخرها ${formatDate(row.lastDate)}` : ''}
            </p>
            {supplier.phone && (
              <a href={`tel:${supplier.phone.replace(/[^\d+]/g, '')}`} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-ink">
                <PhoneEnabled sx={{ fontSize: 18 }} aria-hidden />
                <bdi dir="ltr" className="tabular-nums">{supplier.phone}</bdi>
              </a>
            )}
          </div>
        </section>

        {supplier.notes && <p className="whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-sm leading-relaxed text-fg-subtle">{supplier.notes}</p>}

        {row.byClient.length > 1 && (
          <section className="space-y-2">
            <h3 className="px-1 text-sm font-semibold text-fg-subtle">حسب المشروع</h3>
            <ListGroup>
              {row.byClient.map((c) => (
                <div key={c.clientId} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 truncate text-sm text-fg">{clientName(c.clientId)} <span className="text-xs text-fg-muted">({c.count})</span></span>
                  <Amount amount={c.total} className="text-sm font-semibold" />
                </div>
              ))}
            </ListGroup>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="px-1 text-sm font-semibold text-fg-subtle">المشتريات</h3>
          {bought.length === 0 ? (
            <p className="rounded-md bg-surface-sunken p-4 text-sm text-fg-muted">لا مشتريات مرتبطة به بعد. اختر هذا المورّد عند تسجيل مصروف ليظهر هنا.</p>
          ) : (
            <ListGroup>
              {shown.map((e) => (
                <div key={e.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg">{e.description}</p>
                      <p className="mt-0.5 text-xs text-fg-muted tabular-nums">
                        {formatDate(e.date)} · {clientName(e.clientId)} · {catLabel(e.category)}
                      </p>
                      {expenseHasQuantityLine(e) && (
                        <p className="mt-0.5 text-xs text-fg-subtle">{formatQuantityWithUnit(e.quantity!, e.unit)} بسعر {formatCurrencyDisplay(e.unitPrice!)}</p>
                      )}
                    </div>
                    <Amount amount={e.amount} className="flex-none text-sm font-bold" />
                  </div>
                </div>
              ))}
            </ListGroup>
          )}
          {!all && bought.length > SHOWN && (
            <Button block variant="ghost" onClick={() => setAll(true)}>عرض كل المشتريات ({bought.length})</Button>
          )}
        </section>
      </div>
    </Sheet>
  );
}
