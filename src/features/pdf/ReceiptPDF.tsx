// @ts-nocheck
import React from 'react';
import { Document, Text, View } from '@react-pdf/renderer';
import './pdfFonts';
import type { ReceiptData } from '../../core/finance/receipt';
import { ar, arDate } from './arabicPDF';
import { getPdfBrand } from './pdfBrand';
import { PDF_FONT_FAMILY, PDF_NUM_FONT } from './pdfFonts';
import { INK, PdfDocTitle, PdfInfoCard, PdfPage, PdfSeal, PdfSignature, PdfStatement, PdfSummaryStrip, makePdfStyles } from './pdfKit';
import { PdfQr } from './PdfQr';
import { bilingualLabel, useBilingual } from './pdfI18n';
import { amountInWordsEn } from '../../core/finance/amountInWordsEn';

const FF = PDF_FONT_FAMILY;
const NUM = PDF_NUM_FONT;

/**
 * The receipt for a payment: who paid, how much (in figures and in words), for what, what is left on the
 * invoice, two signatures and a QR code that carries the number, amount and date for checking.
 */
export const ReceiptPDF: React.FC<{ receipt: ReceiptData }> = ({ receipt }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const { invoice } = receipt;
  const both = useBilingual();
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
            { label: 'طريقة الدفع', value: bilingualLabel(receipt.method, both) },
            { label: 'عن', value: invoice ? `فاتورة ${invoice.number}` : receipt.notes ? undefined : bilingualLabel('دفعة على الحساب', both) },
          ]}
        />

        <PdfSummaryStrip s={s} cells={[{ label: 'المبلغ المستلم', value: receipt.amount, color: INK.success }]} />

        <View style={{ marginBottom: 10, paddingVertical: 8, borderBottomWidth: 0.6, borderBottomColor: INK.border }} wrap={false}>
          <Text style={{ fontSize: 7.8, color: INK.faint, textAlign: 'right', marginBottom: 4, fontFamily: FF }}>{ar('المبلغ كتابةً')}</Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: INK.text, textAlign: 'right', lineHeight: 1.7, fontFamily: FF }}>{ar(receipt.amountWords)}</Text>
          {both ? <Text style={{ marginTop: 3, fontSize: 10, color: INK.muted, textAlign: 'right', lineHeight: 1.5, fontFamily: FF }}>{amountInWordsEn(receipt.amount)}</Text> : null}
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

        <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', marginTop: 14, gap: 18 }} wrap={false}>
          <PdfSignature role="المستلم" name={receipt.receivedBy} />
          <PdfSignature role="اعتماد الإدارة" stamp={<PdfSeal B={B} docRef={receipt.number} date={receipt.date} />} />
          <View style={{ alignItems: 'center', width: 84 }}>
            <PdfQr value={receipt.qr} size={76} />
            <Text style={{ marginTop: 3, fontFamily: NUM, fontSize: 6.6, color: INK.faint }}>{receipt.number}</Text>
          </View>
        </View>

        <Text style={{ marginTop: 14, fontSize: 7.6, color: INK.faint, textAlign: 'center', fontFamily: FF }}>
          {ar('امسح الرمز للتحقق من الإيصال: سلامة الرقم والمبلغ والتاريخ، ومطابقتها لسجلات الشركة.')}
        </Text>
      </PdfPage>
    </Document>
  );
};
