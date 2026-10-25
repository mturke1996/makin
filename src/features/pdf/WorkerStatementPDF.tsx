// @ts-nocheck
import { Document, Text, View } from '@react-pdf/renderer';
import type { Client } from '../../types';
import { formatCurrencyDisplay, formatQuantityWithUnit } from '../../core/utils-formatters';
import { ar, arDate } from './arabicPDF';
import { getPdfBrand } from './pdfBrand';
import { INK, countWord, PdfDocTitle, PdfInfoCard, PdfPage, PdfSectionHeading, PdfSummaryStrip, makePdfStyles } from './pdfKit';
import { PdfTable, type PdfColumn } from './PdfTable';
import { PDF_FONT_FAMILY } from './pdfFonts';
import { advanceTotal, workerProgressView } from '../../core/finance/workerProgress';
import { buildWorkerStatement, type WorkerReportEntry, type WorkerReportPeriod } from './workerReportModel';

const AGREEMENT_COLS: PdfColumn[] = [
  { key: 'title', label: 'بند الاتفاق', flex: 2.6, kind: 'stack', bold: true },
  { key: 'quantity', label: 'الكمية', flex: 1, kind: 'text' },
  { key: 'unitPrice', label: 'السعر', flex: 1, kind: 'money' },
  { key: 'total', label: 'الإجمالي', flex: 1, kind: 'money', bold: true },
];

const PAYMENT_COLS: PdfColumn[] = [
  { key: 'n', label: '#', flex: 0.35, kind: 'num' },
  { key: 'date', label: 'التاريخ', flex: 0.9, kind: 'date' },
  { key: 'desc', label: 'البيان', flex: 2.3, kind: 'stack', bold: true },
  { key: 'amount', label: 'الدفعة', flex: 1, kind: 'money', bold: true },
  { key: 'cumulative', label: 'مجموع المدفوع', flex: 1, kind: 'money' },
  { key: 'remaining', label: 'المتبقي', flex: 1, kind: 'money' },
  { key: 'mark', label: '', flex: 0.25, kind: 'num' },
];

const REVISION_COLS: PdfColumn[] = [
  { key: 'date', label: 'التاريخ', flex: 0.9, kind: 'date' },
  { key: 'what', label: 'التعديل', flex: 3, kind: 'stack' },
  { key: 'total', label: 'قيمة الاتفاق', flex: 1, kind: 'money', bold: true },
  { key: 'change', label: 'التغيير', flex: 1, kind: 'money' },
];

const REVISION_KIND = { baseline: 'بيانات افتتاحية', created: 'تسجيل الاتفاق الأول', revised: 'تعديل الاتفاق' };
const BASIS_MARK = { recorded: '', opening: '*', current: '†' };
const BASIS_NOTE = {
  opening: '* المتبقي وفق الاتفاق الافتتاحي، فتاريخ الاتفاق الأصلي غير موثق.',
  current: '† المتبقي وفق الاتفاق الحالي، فالتعديلات السابقة غير موثقة.',
};

const ymd = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
const small = { fontFamily: PDF_FONT_FAMILY, fontSize: 8, lineHeight: 1.7, color: INK.muted, textAlign: 'right' as const };

/**
 * One worker's statement: agreement, every payment with the running balance, and the agreement history.
 * It flows over as many pages as it needs; `letterhead` is for a statement issued on its own.
 */
export function WorkerStatementPages({ client, entry, period, letterhead = false }: { client: Client; entry: WorkerReportEntry; period?: WorkerReportPeriod; letterhead?: boolean }) {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const report = buildWorkerStatement(entry, period);
  const { worker, ledger } = report;
  const ref = `MK-WST-${ymd()}-${String(worker.id).slice(-4).toUpperCase()}`;
  const scope = report.scoped ? `من ${period?.from ? arDate(period.from) : 'البداية'} إلى ${period?.to ? arDate(period.to) : 'اليوم'}` : undefined;
  const progress = worker.workProgressPercent == null ? null : workerProgressView({ agreed: ledger.agreed, paid: ledger.paid, percent: worker.workProgressPercent, advances: advanceTotal(ledger.payments) });
  const basisNotes = [...new Set(report.payments.map((p) => p.balanceBasis))].filter((b) => b !== 'recorded').map((b) => BASIS_NOTE[b]);

  const agreementRows = report.agreementRows.map((r) => ({
    title: { t: r.title, s: r.note || undefined },
    quantity: r.quantity ? `${formatQuantityWithUnit(r.quantity, r.unit)}` : '—',
    unitPrice: r.unitPrice,
    total: r.total,
  }));

  const paymentRows = report.payments.map((p, i) => ({
    n: String(i + 1),
    date: p.day ? arDate(p.day) : 'غير موثق',
    desc: { t: p.note || (p.expense.isWorkerAdvance ? 'سلفة' : 'دفعة'), s: [p.expense.isWorkerAdvance && p.note ? 'سلفة' : '', p.recordedBy ? `سجّلها ${p.recordedBy}` : ''].filter(Boolean).join('  ·  ') || undefined },
    amount: p.amount,
    cumulative: p.cumulativePaid,
    remaining: p.remainingAfter,
    mark: BASIS_MARK[p.balanceBasis] ?? '',
  }));

  const revisionRows = report.revisions.map((r) => ({
    date: arDate(r.recordedAt),
    what: {
      t: `${REVISION_KIND[r.kind] ?? 'تعديل'}${r.reason ? `: ${r.reason}` : ''}`,
      s: [`بواسطة ${r.recordedByName}`, ...r.agreementItems.map((l) => `${l.title} ${l.quantity}${l.unit ? ` ${l.unit}` : ''} × ${formatCurrencyDisplay(l.unitPrice)}`)].join('  ·  '),
    },
    total: r.totalAmount,
    change: r.change,
  }));

  return (
    <PdfPage B={B} s={s} letterhead={letterhead} runningTitle={`كشف حساب العامل  ·  ${worker.name}  ·  ${client.name}`} docRef={ref}>
      <PdfDocTitle
        s={s}
        titleAr="كشف حساب العامل"
        subtitle={`${worker.name}${worker.jobType ? `  ·  ${worker.jobType}` : ''}`}
        meta={[{ label: 'المرجع', value: ref }, { label: 'تاريخ الإصدار', value: arDate(new Date().toISOString()) }]}
      />
      <PdfInfoCard
        s={s}
        items={[
          { label: 'المشروع', value: client.name },
          { label: 'هاتف العامل', value: worker.phone },
          { label: 'الهوية', value: worker.nationalId },
          { label: 'بدء العمل', value: worker.startDate ? arDate(worker.startDate) : undefined },
          { label: 'الحالة', value: `${report.workLabel}، ${report.accountLabel}` },
          { label: 'نطاق الدفعات', value: scope },
        ]}
      />
      <PdfSummaryStrip
        s={s}
        cells={[
          { label: 'الاتفاق الحالي', value: ledger.agreed },
          { label: 'مجموع المدفوع', value: ledger.paid, color: INK.success, accent: true },
          { label: 'المستحق الحالي', value: Math.max(0, ledger.remaining), color: INK.danger, accent: true },
          ...(ledger.overpaidBy > 0 ? [{ label: 'زيادة مدفوعة', value: ledger.overpaidBy, color: INK.warning }] : []),
        ]}
      />
      {progress ? (
        <Text style={{ ...small, color: progress.aheadBy > 0 ? INK.warning : INK.muted, marginBottom: 4 }}>
          {ar(
            `الإنجاز المعتمد ${progress.percent} بالمئة، والمستحق به ${formatCurrencyDisplay(progress.earned)}. ` +
              (progress.aheadBy > 0
                ? `المدفوع يسبق الإنجاز بمقدار ${formatCurrencyDisplay(progress.aheadBy)}${progress.advanceOutstanding > 0 ? '، منه سلف قائمة تُخصم من الإنجاز القادم' : ''}.`
                : `المستحق الآن بعد خصم السلف ${formatCurrencyDisplay(progress.payableNow)}.`),
          )}
        </Text>
      ) : null}
      {worker.notes ? <Text style={{ ...small, color: INK.text, marginBottom: 4 }}>{ar(`ملاحظات: ${worker.notes}`)}</Text> : null}

      <PdfSectionHeading s={s}>الاتفاق الحالي</PdfSectionHeading>
      {agreementRows.length > 0 ? (
        <PdfTable columns={AGREEMENT_COLS} rows={agreementRows} />
      ) : (
        <Text style={small}>{ar('مبلغ مقطوع، دون تفصيل بنود محفوظ.')}</Text>
      )}

      <PdfSectionHeading s={s} hint={countWord(report.payments.length, { one: 'دفعة واحدة', two: 'دفعتان', few: 'دفعات', many: 'دفعة' })}>سجل الدفعات</PdfSectionHeading>
      {report.scoped ? (
        <PdfSummaryStrip
          s={s}
          cells={[
            { label: 'مدفوع قبل الفترة', value: report.openingPaid },
            { label: 'دفعات الفترة', value: report.periodPaid, color: INK.success, accent: true },
            { label: 'حتى نهاية الفترة', value: report.closingPaid },
          ]}
        />
      ) : null}
      {report.payments.length === 0 ? (
        <Text style={small}>{ar('لا توجد دفعات ضمن هذا النطاق.')}</Text>
      ) : (
        <PdfTable columns={PAYMENT_COLS} rows={paymentRows} />
      )}
      <View wrap={false} style={{ marginTop: 6 }}>
        {basisNotes.map((note) => (
          <Text key={note} style={small}>{ar(note)}</Text>
        ))}
        {report.unknownDatePayments > 0 ? (
          <Text style={small}>{ar(`استُبعدت ${report.unknownDatePayments} دفعات بلا تاريخ موثق من النطاق الزمني، وتبقى ضمن مجموع المدفوع.`)}</Text>
        ) : null}
        <Text style={small}>{ar('دفعات العامل مدرجة ضمن مصروفات المشروع، وهذا الكشف تفصيل لها ولا يضيف تكلفة أخرى.')}</Text>
      </View>

      {revisionRows.length > 0 ? (
        <>
          <PdfTable s={s} heading="سجل نسخ الاتفاق" hint="مستقل عن نطاق الدفعات المختار" columns={REVISION_COLS} rows={revisionRows} />
        </>
      ) : null}
    </PdfPage>
  );
}

export function WorkerStatementPDF(props: { client: Client; entry: WorkerReportEntry; period?: WorkerReportPeriod }) {
  const B = getPdfBrand();
  return (
    <Document title={`كشف-${props.entry.worker.name}-${props.client.name}`} author={B.fullName} language="ar">
      <WorkerStatementPages {...props} letterhead />
    </Document>
  );
}
