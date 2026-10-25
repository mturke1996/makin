// @ts-nocheck
import React from 'react';
import { Document, Text, View } from '@react-pdf/renderer';
import './pdfFonts';
import type { ReceiptData } from '../../core/finance/receipt';
import { ar, arDate } from './arabicPDF';
import { getPdfBrand } from './pdfBrand';
import { PDF_FONT_FAMILY, PDF_NUM_FONT } from './pdfFonts';
import { INK, PdfAmount, PdfDocTitle, PdfInfoCard, PdfPage, PdfStatement, PdfSummaryStrip, makePdfStyles } from './pdfKit';
import { PdfQr } from './PdfQr';

const FF = PDF_FONT_FAMILY;
const NUM = PDF_NUM_FONT;

/** A signature line: the role under a ruled space, and the name beneath when it is known. */
const Signature = ({ role, name }: { role: string; name?: string }) => (
  <View style={{ flex: 1, alignItems: 'center' }} wrap={false}>
    <View style={{ width: '82%', height: 44, borderBottomWidth: 0.8, borderBottomColor: INK.text }} />
    <Text style={{ marginTop: 6, fontSize: 9, fontWeight: 'bold', color: INK.text, fontFamily: FF }}>{ar(role)}</Text>
    {name ? <Text style={{ marginTop: 2, fontSize: 8.4, color: INK.muted, fontFamily: FF }}>{ar(name)}</Text> : null}
  </View>
);

/**
 * The receipt for a payment: who paid, how much (in figures and in words), for what, what is left on the
 * invoice, two signatures and a QR code that carries the number, amount and date for checking.
 */
export const ReceiptPDF: React.FC<{ receipt: ReceiptData }> = ({ receipt }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const { invoice } = receipt;
  return (
    <Document title={`إيصال ${receipt.number}`} author={B.fullName} language="ar">
      <PdfPage B={B} s={s} letterhead runningTitle={`إيصال استلام ${receipt.number}  ·  ${receipt.clientName}`} docRef={receipt.number}>
        <PdfDocTitle
          s={s}
          titleAr="إيصال استلام"
          meta={[
            { label: 'رقم الإيصال', value: receipt.number },
            { label: 'تاريخ الاستلام', value: arDate(receipt.date) },
          ]}
        />

        <PdfInfoCard
          s={s}
          items={[
            { label: 'استلمنا من السيد / السادة', value: receipt.clientName },
            { label: 'الهاتف', value: receipt.clientPhone },
            { label: 'طريقة الدفع', value: receipt.method },
            { label: 'عن', value: invoice ? `فاتورة ${invoice.number}` : receipt.notes ? undefined : 'دفعة على الحساب' },
          ]}
        />

        <PdfSummaryStrip s={s} cells={[{ label: 'المبلغ المستلم', value: receipt.amount, color: INK.success }]} />

        <View style={{ marginBottom: 14, paddingVertical: 10, borderBottomWidth: 0.6, borderBottomColor: INK.border }} wrap={false}>
          <Text style={{ fontSize: 7.8, color: INK.faint, textAlign: 'right', marginBottom: 4, fontFamily: FF }}>{ar('المبلغ كتابةً')}</Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: INK.text, textAlign: 'right', lineHeight: 1.7, fontFamily: FF }}>{ar(receipt.amountWords)}</Text>
        </View>

        {receipt.notes ? (
          <View style={{ marginBottom: 12 }} wrap={false}>
            <Text style={{ fontSize: 7.8, color: INK.faint, textAlign: 'right', marginBottom: 3, fontFamily: FF }}>{ar('ملاحظات')}</Text>
            <Text style={{ fontSize: 9.6, color: INK.text, textAlign: 'right', lineHeight: 1.7, fontFamily: FF }}>{ar(receipt.notes)}</Text>
          </View>
        ) : null}

        {invoice ? (
          <View style={{ marginBottom: 6 }}>
            <PdfStatement
              lines={[
                { label: `إجمالي الفاتورة ${invoice.number}`, amount: invoice.total },
                { label: 'المسدد قبل هذه الدفعة', sign: '−', amount: Math.max(0, invoice.paidThrough - receipt.amount) },
                { label: 'هذه الدفعة', sign: '−', amount: receipt.amount, color: INK.success },
              ]}
              net={{ label: invoice.remaining > 0 ? 'المتبقي على الفاتورة' : 'الفاتورة مسددة بالكامل', amount: invoice.remaining, color: invoice.remaining > 0 ? INK.danger : INK.success }}
            />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', marginTop: 26, gap: 18 }} wrap={false}>
          <Signature role="المستلم" name={receipt.receivedBy} />
          <Signature role="اعتماد الإدارة" />
          <View style={{ alignItems: 'center', width: 78 }}>
            <PdfQr value={receipt.qr} size={66} />
            <Text style={{ marginTop: 3, fontFamily: NUM, fontSize: 6.6, color: INK.faint }}>{receipt.number}</Text>
          </View>
        </View>

        <Text style={{ marginTop: 14, fontSize: 7.6, color: INK.faint, textAlign: 'center', fontFamily: FF }}>
          {ar('امسح الرمز للتحقق من رقم الإيصال والمبلغ والتاريخ ومطابقتها مع سجلات الشركة.')}
        </Text>
      </PdfPage>
    </Document>
  );
};
