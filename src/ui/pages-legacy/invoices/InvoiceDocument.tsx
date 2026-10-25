import { Amount, Badge } from '../../../design-system/primitives';
import { LogoMark } from '../../brand/LogoMark';
import { useBrand } from '../../../config/BrandProvider';
import { formatCurrencyDisplay, formatDate, getStatusLabel } from '../../../core/utils-formatters';
import type { Client, Invoice } from '../../../types';
import { STATUS_TONE } from './invoiceStatus';

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-fg-subtle">{label}</dt>
      <dd className="text-sm font-semibold text-fg">{children}</dd>
    </div>
  );
}

function TotalLine({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className={strong ? 'flex items-baseline justify-between gap-4 border-t border-border pt-3' : 'flex items-baseline justify-between gap-4'}>
      <dt className={strong ? 'text-md font-bold text-fg' : 'text-sm text-fg-subtle'}>{label}</dt>
      <dd className={strong ? 'text-xl font-bold text-fg' : 'text-md font-semibold text-fg'}>{children}</dd>
    </div>
  );
}

interface InvoiceDocumentProps {
  invoice: Invoice;
  client: Client;
}

/**
 * The invoice as a document: issuer, recipient, dates, lines, totals, notes.
 * Lines are a table from `sm` up and stacked rows on phones.
 */
export function InvoiceDocument({ invoice, client }: InvoiceDocumentProps) {
  const brand = useBrand();
  const contact = [brand.contact.address, [brand.contact.phone, brand.contact.phoneSecondary].filter(Boolean).join(' · ')]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface-panel">
      <header className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <LogoMark size={44} />
          <div className="min-w-0">
            <p className="truncate text-md font-bold text-fg">{brand.fullName}</p>
            {contact && <p className="mt-0.5 text-xs text-fg-muted">{contact}</p>}
          </div>
        </div>
        <div className="flex-none text-end">
          <p className="text-xs font-medium text-fg-muted">فاتورة</p>
          <p className="text-lg font-bold text-fg">
            <bdi dir="ltr">{invoice.invoiceNumber}</bdi>
          </p>
        </div>
      </header>

      <div className="grid gap-5 border-t border-border p-5 sm:grid-cols-2 sm:gap-8 sm:p-6">
        <div>
          <p className="text-xs font-medium text-fg-muted">فاتورة إلى</p>
          <p className="mt-1 text-md font-bold text-fg">{client.name}</p>
          {client.address && <p className="mt-0.5 text-sm text-fg-subtle">{client.address}</p>}
          {client.phone && (
            <p className="mt-0.5 text-sm text-fg-subtle">
              <bdi dir="ltr">{client.phone}</bdi>
            </p>
          )}
        </div>
        <dl className="space-y-2.5">
          <Meta label="تاريخ الإصدار">
            <bdi dir="ltr">{formatDate(invoice.issueDate)}</bdi>
          </Meta>
          <Meta label="تاريخ الاستحقاق">
            <bdi dir="ltr">{formatDate(invoice.dueDate)}</bdi>
          </Meta>
          <Meta label="الحالة">
            <Badge tone={STATUS_TONE[invoice.status]} dot>
              {getStatusLabel(invoice.status)}
            </Badge>
          </Meta>
        </dl>
      </div>

      {/* Lines: table from sm up */}
      <div className="hidden border-t border-border sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-sunken text-xs font-medium text-fg-muted">
              <th scope="col" className="px-6 py-3 text-start font-medium">الوصف</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الكمية</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">السعر (د.ل)</th>
              <th scope="col" className="px-6 py-3 text-end font-medium">الإجمالي (د.ل)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoice.items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-6 py-3.5 font-medium text-fg">{item.description || 'بدون وصف'}</td>
                <td className="px-3 py-3.5 tabular-nums text-fg-subtle">{item.quantity}</td>
                <td className="px-3 py-3.5 text-fg-subtle">
                  <Amount amount={item.unitPrice} bare />
                </td>
                <td className="px-6 py-3.5 text-end font-semibold text-fg">
                  <Amount amount={item.total} bare />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lines: stacked rows on phones */}
      <ul className="divide-y divide-border border-t border-border sm:hidden">
        {invoice.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
            <div className="min-w-0">
              <p className="text-base font-medium text-fg">{item.description || 'بدون وصف'}</p>
              <p className="mt-0.5 text-xs text-fg-muted">
                <bdi dir="ltr">{item.quantity} × {formatCurrencyDisplay(item.unitPrice)}</bdi>
              </p>
            </div>
            <Amount amount={item.total} className="flex-none text-md font-bold text-fg" />
          </li>
        ))}
      </ul>

      <dl className="ms-auto w-full max-w-sm space-y-2.5 border-t border-border p-5 sm:border-t-0 sm:px-6 sm:pb-6 sm:pt-5">
        <TotalLine label="المجموع الفرعي">
          <Amount amount={invoice.subtotal} />
        </TotalLine>
        {invoice.taxAmount > 0 && (
          <TotalLine label={`الضريبة (${invoice.taxRate}%)`}>
            <Amount amount={invoice.taxAmount} />
          </TotalLine>
        )}
        <TotalLine label="الإجمالي" strong>
          <Amount amount={invoice.total} />
        </TotalLine>
      </dl>

      {invoice.notes && (
        <div className="border-t border-border p-5 sm:p-6">
          <p className="text-xs font-medium text-fg-muted">ملاحظات</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-fg-subtle">{invoice.notes}</p>
        </div>
      )}
    </article>
  );
}
