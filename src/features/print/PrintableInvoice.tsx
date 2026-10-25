import { forwardRef } from 'react';
import type { Client, Invoice } from '../../types';
import { formatDate } from '../../core/utils-formatters';
import { useBrand } from '../../config/BrandProvider';
import { Amount } from '../../design-system/primitives';

interface PrintableInvoiceProps {
  invoice: Invoice;
  client: Client;
}

/**
 * Paper colors are fixed on purpose: the printed invoice must look the same in light
 * and dark mode and on any brand palette. Only the thin top rule and the grand total
 * pick up the brand primary.
 */
const PAPER = { ink: '#1b2236', muted: '#5b6478', rule: '#d9dce4', soft: '#f6f7f9' } as const;

const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  paid: { label: 'مدفوعة', fg: '#0b6b61', bg: '#e3f3f1' },
  partially_paid: { label: 'مدفوعة جزئياً', fg: '#8a4b05', bg: '#fbefdc' },
};
const STATUS_DEFAULT = { label: 'غير مدفوعة', fg: '#9b1c1c', bg: '#fbe9e9' };

/**
 * The invoice as a printable A4 sheet. Used by the invoice screen's print action:
 * a clean ledger layout, hairline rules instead of fills, nothing under 12px.
 */
export const PrintableInvoice = forwardRef<HTMLDivElement, PrintableInvoiceProps>(({ invoice, client }, ref) => {
  const brand = useBrand();
  const primary = brand.palette.primary;
  const phones = [brand.contact.phone, brand.contact.phoneSecondary].filter(Boolean).join(' · ');
  const contactLine = [brand.contact.address, phones].filter(Boolean).join(' · ');
  const status = STATUS[invoice.status] ?? STATUS_DEFAULT;

  return (
    <article
      ref={ref}
      className="invoice-doc mx-auto w-full max-w-[210mm] bg-white print:min-h-[297mm] print:max-w-none"
      style={{ color: PAPER.ink, fontFamily: 'var(--brand-font-arabic)' }}
    >
      <div aria-hidden style={{ height: 6, background: primary }} />

      <div className="px-6 pb-10 pt-7 sm:px-10">
        {/* Header: issuer on the start side, document title and number on the end side */}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            {brand.logo.src && <img src={brand.logo.src} alt="" className="h-14 w-14 shrink-0 object-contain" />}
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">{brand.fullName}</h1>
              {contactLine && <p className="mt-1 text-xs leading-relaxed" style={{ color: PAPER.muted }}>{contactLine}</p>}
            </div>
          </div>
          <div className="text-end">
            <p className="text-2xl font-bold leading-none">فاتورة</p>
            <p className="mt-2 text-base font-semibold tabular-nums" dir="ltr">#{invoice.invoiceNumber}</p>
            <span
              className="mt-2 inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold"
              style={{ color: status.fg, background: status.bg }}
            >
              {status.label}
            </span>
          </div>
        </header>

        {/* Parties and dates */}
        <section className="mt-8 grid gap-6 border-y py-5 sm:grid-cols-2" style={{ borderColor: PAPER.rule }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: PAPER.muted }}>فاتورة إلى</p>
            <p className="mt-1.5 text-md font-bold leading-snug">{client.name}</p>
            {client.address && <p className="mt-1 text-sm leading-relaxed" style={{ color: PAPER.muted }}>{client.address}</p>}
            {client.phone && (
              <p className="mt-1 text-sm tabular-nums" dir="ltr" style={{ color: PAPER.muted, textAlign: 'start' }}>
                {client.phone}
              </p>
            )}
          </div>
          <dl className="space-y-2 text-sm">
            <MetaRow label="تاريخ الإصدار" value={formatDate(invoice.issueDate)} />
            <MetaRow label="تاريخ الاستحقاق" value={formatDate(invoice.dueDate)} />
          </dl>
        </section>

        {/* Line items */}
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="text-xs" style={{ color: PAPER.muted, borderBottom: `1px solid ${PAPER.ink}` }}>
              <th className="py-2 pe-3 text-start font-semibold">الوصف</th>
              <th className="w-16 py-2 text-center font-semibold">الكمية</th>
              <th className="w-28 py-2 text-end font-semibold">السعر</th>
              <th className="w-32 py-2 ps-3 text-end font-semibold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm" style={{ color: PAPER.muted }}>لا توجد بنود</td>
              </tr>
            ) : (
              invoice.items.map((item, i) => (
                <tr key={item.id || i} style={{ borderBottom: `1px solid ${PAPER.rule}` }}>
                  <td className="py-3 pe-3 align-top font-medium leading-snug">{item.description || 'بند بلا وصف'}</td>
                  <td className="py-3 text-center align-top tabular-nums">{item.quantity}</td>
                  <td className="py-3 text-end align-top"><Amount amount={item.unitPrice} /></td>
                  <td className="py-3 ps-3 text-end align-top font-bold"><Amount amount={item.total} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totals */}
        <dl className="ms-auto mt-6 w-full max-w-xs space-y-2 text-sm">
          <TotalRow label="المجموع الفرعي" value={<Amount amount={invoice.subtotal} />} />
          {invoice.taxAmount > 0 && <TotalRow label={`الضريبة (${invoice.taxRate}%)`} value={<Amount amount={invoice.taxAmount} />} />}
          <div className="flex items-baseline justify-between border-t pt-3" style={{ borderColor: PAPER.ink }}>
            <dt className="text-md font-bold">الإجمالي</dt>
            <dd className="text-xl font-bold" style={{ color: primary }}><Amount amount={invoice.total} /></dd>
          </div>
        </dl>

        {invoice.notes && (
          <section className="mt-8">
            <h2 className="text-xs font-semibold" style={{ color: PAPER.muted }}>ملاحظات</h2>
            <p className="mt-1.5 text-sm leading-relaxed">{invoice.notes}</p>
          </section>
        )}

        <footer className="mt-12 border-t pt-4 text-center text-xs" style={{ borderColor: PAPER.rule, color: PAPER.muted }}>
          <p className="font-semibold" style={{ color: PAPER.ink }}>{brand.fullName}</p>
          {contactLine && <p className="mt-1">{contactLine}</p>}
        </footer>
      </div>
    </article>
  );
});

PrintableInvoice.displayName = 'PrintableInvoice';

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt style={{ color: PAPER.muted }}>{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt style={{ color: PAPER.muted }}>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
