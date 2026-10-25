// @ts-nocheck
import React from 'react';
import { Document, Text, View } from '@react-pdf/renderer';
import './pdfFonts';
import type { WorkerVoucherData } from '../../core/finance/workerVoucher';
import { formatCurrencyDisplay } from '../../core/utils-formatters';
import { ar, arDate } from './arabicPDF';
import { getPdfBrand } from './pdfBrand';
import { PDF_FONT_FAMILY, PDF_NUM_FONT } from './pdfFonts';
import { INK, PdfDocTitle, PdfInfoCard, PdfPage, PdfStatement, PdfSummaryStrip, makePdfStyles } from './pdfKit';
import { PdfQr } from './PdfQr';

const FF = PDF_FONT_FAMILY;
const NUM = PDF_NUM_FONT;

const Signature = ({ role, name }: { role: string; name?: string }) => (
  <View style={{ flex: 1, alignItems: 'center' }} wrap={false}>
    <View style={{ width: '82%', height: 44, borderBottomWidth: 0.8, borderBottomColor: INK.text }} />
    <Text style={{ marginTop: 6, fontSize: 9, fontWeight: 'bold', color: INK.text, fontFamily: FF }}>{ar(role)}</Text>
    {name ? <Text style={{ marginTop: 2, fontSize: 8.4, color: INK.muted, fontFamily: FF }}>{ar(name)}</Text> : null}
  </View>
);

/**
 * The voucher a worker signs when he is paid: his details, the amount in figures and in words, what remains of his
 * agreement, and (when progress is approved) what the work has earned against what he has been paid.
 */
export const WorkerVoucherPDF: React.FC<{ voucher: WorkerVoucherData }> = ({ voucher }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const p = voucher.progress;
  const kind = voucher.isAdvance ? 'سلفة' : 'دفعة على الحساب';
  return (
    <Document title={`إيصال صرف ${voucher.ref}`} author={B.fullName} language="ar">
      <PdfPage B={B} s={s} letterhead runningTitle={`إيصال صرف  ·  ${voucher.workerName}  ·  ${voucher.projectName}`} docRef={voucher.ref}>
        <PdfDocTitle
          s={s}
          titleAr="إيصال صرف"
          subtitle={kind}
          meta={[
            { label: 'المرجع', value: voucher.ref },
            { label: 'تاريخ الصرف', value: arDate(voucher.date) },
          ]}
        />

        <PdfInfoCard
          s={s}
          items={[
            { label: 'صُرف للسيد', value: voucher.workerName },
            { label: 'العمل', value: voucher.jobType },
            { label: 'الهاتف', value: voucher.phone },
            { label: 'الهوية', value: voucher.nationalId },
            { label: 'المشروع', value: voucher.projectName },
          ]}
        />

        <PdfSummaryStrip s={s} cells={[{ label: voucher.isAdvance ? 'مبلغ السلفة' : 'المبلغ المصروف', value: voucher.amount, color: INK.danger }]} />

        <View style={{ marginBottom: 14, paddingVertical: 10, borderBottomWidth: 0.6, borderBottomColor: INK.border }} wrap={false}>
          <Text style={{ fontSize: 7.8, color: INK.faint, textAlign: 'right', marginBottom: 4, fontFamily: FF }}>{ar('المبلغ كتابةً')}</Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: INK.text, textAlign: 'right', lineHeight: 1.7, fontFamily: FF }}>{ar(voucher.amountWords)}</Text>
        </View>

        {voucher.note ? (
          <View style={{ marginBottom: 12 }} wrap={false}>
            <Text style={{ fontSize: 7.8, color: INK.faint, textAlign: 'right', marginBottom: 3, fontFamily: FF }}>{ar('ملاحظات')}</Text>
            <Text style={{ fontSize: 9.6, color: INK.text, textAlign: 'right', lineHeight: 1.7, fontFamily: FF }}>{ar(voucher.note)}</Text>
          </View>
        ) : null}

        <PdfStatement
          lines={[
            { label: 'قيمة الاتفاق', amount: voucher.agreed },
            { label: 'المصروف له حتى هذه الدفعة', sign: '−', amount: voucher.paidThrough, note: 'تشمل هذه الدفعة' },
          ]}
          net={{
            label: voucher.remainingAfter < 0 ? 'مدفوع فوق الاتفاق' : voucher.remainingAfter === 0 ? 'الاتفاق مسدّد بالكامل' : 'المتبقي من الاتفاق',
            amount: Math.abs(voucher.remainingAfter),
            color: voucher.remainingAfter < 0 ? INK.danger : voucher.remainingAfter === 0 ? INK.success : undefined,
          }}
        />

        {p && p.percent !== null ? (
          <Text style={{ marginTop: 4, fontSize: 8.8, color: p.aheadBy > 0 ? INK.warning : INK.muted, textAlign: 'right', lineHeight: 1.7, fontFamily: FF }}>
            {ar(
              `الإنجاز المعتمد ${p.percent} بالمئة، والمستحق به ${formatCurrencyDisplay(p.earned)}. ` +
                (p.aheadBy > 0
                  ? `المدفوع يسبق الإنجاز بمقدار ${formatCurrencyDisplay(p.aheadBy)}${p.advanceOutstanding > 0 ? '، وهو سلفة تُخصم من الإنجاز القادم' : ''}.`
                  : `المستحق له الآن بعد خصم السلف ${formatCurrencyDisplay(p.payableNow)}.`),
            )}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', marginTop: 26, gap: 18 }} wrap={false}>
          <Signature role="المستلم (العامل)" name={voucher.workerName} />
          <Signature role="الصارف" name={voucher.recordedBy} />
          <View style={{ alignItems: 'center', width: 78 }}>
            <PdfQr value={voucher.qr} size={66} />
            <Text style={{ marginTop: 3, fontFamily: NUM, fontSize: 6.6, color: INK.faint }}>{voucher.ref}</Text>
          </View>
        </View>

        <Text style={{ marginTop: 14, fontSize: 7.6, color: INK.faint, textAlign: 'center', fontFamily: FF }}>
          {ar('أقرّ بأني استلمت المبلغ المذكور أعلاه. امسح الرمز للتحقق من المرجع والمبلغ والتاريخ.')}
        </Text>
      </PdfPage>
    </Document>
  );
};
