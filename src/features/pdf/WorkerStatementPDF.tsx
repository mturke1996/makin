import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { Client } from '../../types';
import { ar, arDate } from './arabicPDF';
import { getPdfBrand } from './pdfBrand';
import { makePdfStyles, PdfBrandedReportHeader, PdfBrandedFooter, PdfSummaryStrip, INK, PdfMoneyText } from './pdfKit';
import { PdfTable, PdfSectionTitle, type PdfColumn } from './PdfTable';
import { PDF_FONT_FAMILY } from './pdfFonts';
import { buildWorkerStatement, type WorkerReportEntry, type WorkerReportPeriod } from './workerReportModel';

const AGREEMENT_COLS: PdfColumn[] = [
  { key: 'title', label: 'بند الاتفاق', flex: 2.2 }, { key: 'quantity', label: 'الكمية', flex: 0.65, kind: 'num' },
  { key: 'unit', label: 'الوحدة', flex: 0.65 }, { key: 'unitPrice', label: 'السعر', flex: 0.9, kind: 'money' },
  { key: 'total', label: 'الإجمالي', flex: 1, kind: 'money' },
];

const textStyle = { fontFamily: PDF_FONT_FAMILY, fontSize: 9, lineHeight: 1.65, color: INK.text, textAlign: 'right' as const };

/** Each ledger uses separate agreement/payment pages, preventing multiple repeating table headers from overlapping. */
export function WorkerStatementPages({ client, entry, period }: { client: Client; entry: WorkerReportEntry; period?: WorkerReportPeriod }) {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const report = buildWorkerStatement(entry, period);
  const { worker, ledger } = report;
  const scope = report.scoped ? `الدفعات من ${period?.from ? arDate(period.from) : 'البداية'} إلى ${period?.to ? arDate(period.to) : 'اليوم'}` : 'جميع الدفعات المسجلة';
  const header = (title: string) => <PdfBrandedReportHeader s={s} B={B} titleEn="WORKER STATEMENT" subtitleAr={title} refLine={ar(`${client.name}، ${worker.name}`)} />;
  return (
    <>
      <Page size="A4" style={s.page} wrap>
        {header('كشف حساب العامل والاتفاق')}
        <Text style={{ ...textStyle, fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>{ar(worker.name)}</Text>
        <Text style={textStyle}>{ar(`${worker.jobType || 'عامل / مقاول'}، ${report.workLabel}، ${report.accountLabel}`)}</Text>
        {worker.phone && <Text style={textStyle}>{ar(`الهاتف: ${worker.phone}`)}</Text>}
        {worker.startDate && <Text style={textStyle}>{ar(`بدء العمل: ${arDate(worker.startDate)}`)}</Text>}
        <Text style={{ ...textStyle, color: INK.muted, marginBottom: 12 }}>{ar(`تاريخ الإصدار: ${arDate(new Date().toISOString())}. ${scope}`)}</Text>
        <PdfSummaryStrip s={s} cells={[
          { label: 'الاتفاق الحالي', value: ledger.agreed }, { label: 'كل المدفوع', value: ledger.paid, color: INK.success },
          { label: 'المستحق الحالي', value: Math.max(0, ledger.remaining), color: INK.danger }, { label: 'زيادة مدفوعة', value: ledger.overpaidBy, color: INK.warning },
        ]} />
        <Text style={{ ...textStyle, color: INK.muted, marginBottom: 8 }}>{ar('دفعات العامل مدرجة ضمن مصروفات المشروع. هذا الكشف تفصيل لها ولا يضيف تكلفة أخرى.')}</Text>
        {worker.notes && <><PdfSectionTitle primary={B.palette.primary}>ملاحظات العامل</PdfSectionTitle><Text style={textStyle}>{ar(worker.notes)}</Text></>}
        <PdfSectionTitle primary={B.palette.primary}>الاتفاق الحالي</PdfSectionTitle>
        {report.agreementRows.length > 0 ? <PdfTable columns={AGREEMENT_COLS} rows={report.agreementRows} primary={B.palette.primary} footer={{ label: 'إجمالي الاتفاق', values: { total: ledger.agreed } }} /> : <Text style={textStyle}>{ar('مبلغ مقطوع، دون تفصيل بنود محفوظ.')}</Text>}
        {ledger.lines.filter((line) => !!line.note).map((line) => <Text key={line.id} style={{ ...textStyle, color: INK.muted }}>{ar(`${line.title}: ${line.note}`)}</Text>)}
        <PdfBrandedFooter s={s} B={B} />
      </Page>
      <Page size="A4" style={s.page} wrap>
        {header('سجل دفعات العامل')}
        <Text style={{ ...textStyle, marginBottom: 8 }}>{ar(scope)}</Text>
        <PdfSummaryStrip s={s} cells={[
          { label: 'مدفوع قبل الفترة', value: report.openingPaid }, { label: 'دفعات الفترة', value: report.periodPaid }, { label: 'مدفوع حتى نهاية الفترة', value: report.closingPaid },
        ]} />
        <Text style={{ ...textStyle, color: INK.muted, marginBottom: 8 }}>{ar('الرصيد بعد كل دفعة وفق نسخة الاتفاق المسجلة وقت إدخالها. عند غياب توثيق سابق يُبيّن المرجع المستخدم، ولا يُفترض تاريخ قديم للاتفاق.')}</Text>
        {report.payments.length === 0 && <Text style={textStyle}>{ar('لا توجد دفعات ضمن هذا النطاق.')}</Text>}
        {report.payments.map((payment, index) => (
          <View key={payment.id} style={{ borderBottomWidth: 1, borderBottomColor: INK.border, paddingVertical: 10 }} wrap>
            <View wrap={false} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <PdfMoneyText amount={payment.amount} style={{ fontSize: 11, fontWeight: 'bold', color: INK.text }} />
              <Text style={{ ...textStyle, fontWeight: 'bold' }}>{ar(`دفعة ${index + 1}، ${payment.day ? arDate(payment.day) : 'تاريخ غير موثق'}`)}</Text>
            </View>
            <Text style={{ ...textStyle, color: INK.muted }}>{ar(`المرجع: ${payment.id}${payment.recordedBy ? `، سجّلها ${payment.recordedBy}` : ''}`)}</Text>
            <Text style={textStyle}>{ar(payment.note || 'دون ملاحظة')}</Text>
            <View wrap={false} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 5 }}>
              <PdfMoneyText amount={payment.remainingAfter} style={{ fontSize: 9, color: payment.remainingAfter < 0 ? INK.danger : INK.text }} />
              <Text style={{ ...textStyle, color: INK.muted }}>{ar(payment.balanceBasis === 'recorded' ? 'المتبقي وفق الاتفاق المسجل وقتها' : payment.balanceBasis === 'opening' ? 'المتبقي وفق الاتفاق الافتتاحي، التاريخ السابق غير موثق' : 'المتبقي وفق الاتفاق الحالي، التعديلات السابقة غير موثقة')}</Text>
            </View>
            <View wrap={false} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <PdfMoneyText amount={payment.cumulativePaid} style={{ fontSize: 9, color: INK.muted }} />
              <Text style={{ ...textStyle, color: INK.muted }}>{ar('إجمالي المدفوع حتى هذه الدفعة')}</Text>
            </View>
          </View>
        ))}
        {report.unknownDatePayments > 0 && <Text style={textStyle}>{ar(`استُبعدت ${report.unknownDatePayments} دفعات بلا تاريخ موثق من النطاق الزمني، وتبقى ضمن إجمالي كل المدفوع.`)}</Text>}
        <PdfBrandedFooter s={s} B={B} />
      </Page>
      <Page size="A4" style={s.page} wrap>
        {header('سجل نسخ اتفاق العامل')}
        <Text style={{ ...textStyle, color: INK.muted, marginBottom: 12 }}>{ar('هذا السجل لجميع نسخ الاتفاق المحفوظة، مستقل عن نطاق الدفعات المختار.')}</Text>
        {report.revisions.length === 0 && <Text style={textStyle}>{ar('اتفاق سابق لبدء توثيق السجل. لا توجد تواريخ محفوظة لتعديلاته القديمة.')}</Text>}
        {report.revisions.map((revision) => <View key={revision.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: INK.border }} wrap>
          <View wrap={false} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><PdfMoneyText amount={revision.totalAmount} style={{ fontSize: 10, fontWeight: 'bold' }} /><Text style={{ ...textStyle, fontWeight: 'bold' }}>{ar(revision.kind === 'baseline' ? 'بيانات افتتاحية، تاريخ الاتفاق الأصلي غير موثق' : revision.kind === 'created' ? 'تسجيل الاتفاق الأول' : 'تعديل الاتفاق')}</Text></View>
          <Text style={{ ...textStyle, color: INK.muted }}>{ar(`سُجل ${arDate(revision.recordedAt)}، بواسطة ${revision.recordedByName}`)}</Text>
          <Text style={textStyle}>{ar(revision.reason)}</Text>
          {revision.change !== 0 && <Text style={textStyle}>{ar(`التغيير: ${revision.change > 0 ? '+' : ''}${revision.change.toFixed(3)} د.ل`)}</Text>}
          {revision.agreementItems.map((line) => <Text key={line.id} style={textStyle}>{ar(`${line.title}: ${line.quantity} ${line.unit ?? ''} × ${line.unitPrice.toFixed(3)} د.ل${line.note ? `، ${line.note}` : ''}`)}</Text>)}
        </View>)}
        <PdfBrandedFooter s={s} B={B} />
      </Page>
    </>
  );
}

export function WorkerStatementPDF(props: { client: Client; entry: WorkerReportEntry; period?: WorkerReportPeriod }) {
  const B = getPdfBrand();
  return <Document title={`كشف-${props.entry.worker.name}-${props.client.name}`} author={B.fullName} language="ar"><WorkerStatementPages {...props} /></Document>;
}
