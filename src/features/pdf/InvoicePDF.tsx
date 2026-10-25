// @ts-nocheck
import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import './pdfFonts';
import { ar, arDate } from './arabicPDF';
import type { Invoice, Client } from '../../types';
import { getPdfBrand } from './pdfBrand';
import {
  makePdfStyles,
  PdfBrandedReportHeader,
  PdfBrandedFooter,
  PdfMoneyText,
  PdfTotalsBlock,
  PdfNotesBox,
  PDF_PAGINATION,
  INK,
} from './pdfKit';

const ci = {
  desc: { flex: 1, textAlign: 'right', paddingRight: 4 },
  qty: { width: 52, textAlign: 'center' },
  price: { width: 74, textAlign: 'center' },
  total: { width: 82, textAlign: 'left', paddingLeft: 4 },
};

const STATUS_AR: Record<string, string> = {
  paid: 'مدفوعة',
  partially_paid: 'مدفوعة جزئياً',
  overdue: 'متأخرة',
  cancelled: 'ملغاة',
  draft: 'مسودة',
  sent: 'مرسلة',
};

interface Props {
  invoice: Invoice;
  client: Client;
}

export const InvoicePDF: React.FC<Props> = ({ invoice, client }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const statusColor =
    invoice.status === 'paid' ? INK.success :
    invoice.status === 'cancelled' ? INK.faint :
    INK.warning;

  const clientName = invoice.clientId ? client?.name : (invoice.tempClientName || client?.name);
  const clientPhone = invoice.clientId ? client?.phone : (invoice.tempClientPhone || client?.phone);
  const clientAddress = invoice.clientId ? client?.address : (invoice.tempClientAddress || client?.address);

  return (
    <Document title={`فاتورة ${invoice.invoiceNumber}`} author={B.fullName} language="ar">
      <Page size="A4" style={s.page}>
        <PdfBrandedReportHeader
          s={s}
          B={B}
          titleEn="INVOICE"
          subtitleAr="فاتورة رسمية"
          refLine={`#${invoice.invoiceNumber}`}
        />

        <View style={s.infoRow}>
          <View style={s.datesCol}>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar('الإصدار')}</Text>
              <Text style={s.dateVal}>{arDate(invoice.issueDate)}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar('الاستحقاق')}</Text>
              <Text style={s.dateVal}>{arDate(invoice.dueDate)}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar('الحالة')}</Text>
              <Text style={[s.dateVal, { color: statusColor }]}>{ar(STATUS_AR[invoice.status] || invoice.status)}</Text>
            </View>
          </View>
          <View style={s.clientBox}>
            <Text style={s.clientSectionLbl}>{ar('إلى السيد / السادة')}</Text>
            <Text style={s.clientName}>{ar(clientName)}</Text>
            {clientAddress ? <Text style={s.clientSub}>{ar(clientAddress)}</Text> : null}
            {clientPhone ? <Text style={s.clientSub}>{clientPhone}</Text> : null}
          </View>
        </View>

        <View style={s.tableHead} minPresenceAhead={PDF_PAGINATION.tableHead}>
          <Text style={[s.th, ci.total]}>{ar('الإجمالي')}</Text>
          <Text style={[s.th, ci.price]}>{ar('سعر الوحدة')}</Text>
          <Text style={[s.th, ci.qty]}>{ar('الكمية')}</Text>
          <Text style={[s.th, ci.desc]}>{ar('الوصف')}</Text>
        </View>
        {invoice.items.map((item, i) => (
          <View key={i} style={[s.tableRow, i % 2 !== 0 && s.rowEven]} wrap={false}>
            <View style={[ci.total, { flexDirection: 'row' }]}>
              <PdfMoneyText amount={item.total} style={s.tdBold} />
            </View>
            <PdfMoneyText amount={item.unitPrice} style={s.td} containerStyle={ci.price} />
            <Text style={[s.td, ci.qty]}>{item.quantity}</Text>
            <Text style={[s.tdBold, ci.desc]}>{ar(item.description)}</Text>
          </View>
        ))}

        <PdfTotalsBlock
          s={s}
          subtotal={invoice.subtotal}
          taxAmount={invoice.taxAmount}
          taxRate={invoice.taxRate}
          total={invoice.total}
        />

        {invoice.notes ? (
          <PdfNotesBox s={s}>
            <Text style={s.notesTxt}>{ar(invoice.notes)}</Text>
          </PdfNotesBox>
        ) : null}

        <PdfBrandedFooter s={s} B={B} />
      </Page>
    </Document>
  );
};
