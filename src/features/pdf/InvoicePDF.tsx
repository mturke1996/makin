// @ts-nocheck
import React from 'react';
import { Document, Text } from '@react-pdf/renderer';
import './pdfFonts';
import { ar, arDate } from './arabicPDF';
import type { Invoice, Client } from '../../types';
import { getPdfBrand } from './pdfBrand';
import { INK, PdfDocTitle, PdfInfoCard, PdfNotesBox, PdfPage, PdfTotalsBlock, makePdfStyles } from './pdfKit';
import { PdfTable, type PdfColumn } from './PdfTable';

const STATUS_AR: Record<string, string> = {
  paid: 'مدفوعة',
  partially_paid: 'مدفوعة جزئياً',
  overdue: 'متأخرة',
  cancelled: 'ملغاة',
  draft: 'مسودة',
  sent: 'مرسلة',
};

const ITEM_COLS: PdfColumn[] = [
  { key: 'desc', label: 'الوصف', flex: 3.2, kind: 'text' },
  { key: 'qty', label: 'الكمية', flex: 0.8, kind: 'num' },
  { key: 'price', label: 'سعر الوحدة', flex: 1.1, kind: 'money' },
  { key: 'total', label: 'الإجمالي', flex: 1.2, kind: 'money' },
];

interface Props {
  invoice: Invoice;
  client: Client;
}

export const InvoicePDF: React.FC<Props> = ({ invoice, client }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);

  const clientName = invoice.clientId ? client?.name : invoice.tempClientName || client?.name;
  const clientPhone = invoice.clientId ? client?.phone : invoice.tempClientPhone || client?.phone;
  const clientAddress = invoice.clientId ? client?.address : invoice.tempClientAddress || client?.address;

  return (
    <Document title={`فاتورة ${invoice.invoiceNumber}`} author={B.fullName} language="ar">
      <PdfPage B={B} s={s} letterhead runningTitle={`فاتورة ${invoice.invoiceNumber}  ·  ${clientName ?? ''}`} docRef={invoice.invoiceNumber}>
        <PdfDocTitle
          s={s}
          titleEn="INVOICE"
          titleAr="فاتورة"
          meta={[
            { label: 'رقم الفاتورة', value: invoice.invoiceNumber },
            { label: 'تاريخ الإصدار', value: arDate(invoice.issueDate) },
            { label: 'تاريخ الاستحقاق', value: arDate(invoice.dueDate) },
            { label: 'الحالة', value: ar(STATUS_AR[invoice.status] || invoice.status) },
          ]}
        />
        <PdfInfoCard s={s} items={[{ label: 'إلى السيد / السادة', value: clientName }, { label: 'الهاتف', value: clientPhone }, { label: 'العنوان', value: clientAddress }]} />

        <PdfTable
          columns={ITEM_COLS}
          rows={invoice.items.map((item) => ({ desc: item.description, qty: String(item.quantity), price: item.unitPrice, total: item.total }))}
        />
        <PdfTotalsBlock s={s} subtotal={invoice.subtotal} taxAmount={invoice.taxAmount} taxRate={invoice.taxRate} total={invoice.total} />

        {invoice.notes ? (
          <PdfNotesBox s={s}>
            <Text style={s.notesTxt}>{ar(invoice.notes)}</Text>
          </PdfNotesBox>
        ) : null}
      </PdfPage>
    </Document>
  );
};
