// @ts-nocheck
import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import './pdfFonts';
import type { Client, Expense, Payment, StandaloneDebt, Worker } from '../../types';
import { expenseCategories } from '../../core/utils-formatters';
import { formatExpensePdfQtyBlock, formatExpenseNotesOnly } from '../../core/utils-formatters';
import { ar, arDate } from './arabicPDF';
import { getPdfBrand } from './pdfBrand';
import { makePdfStyles, PdfBrandedReportHeader, PdfBrandedFooter, PdfSummaryStrip, INK } from './pdfKit';
import { PDF_FONT_FAMILY } from './pdfFonts';
import { PdfTable, PdfSectionTitle, type PdfColumn } from './PdfTable';
import { buildWorkerLedgers, summarizeWorkerLedgers } from '../../core/finance/workerLedger';
import { workerSummaryRow } from './workerReportModel';
import { WorkerStatementPages } from './WorkerStatementPDF';

const today = () => arDate(new Date().toISOString());
const getCatLabel = (cat: string) => ar((expenseCategories as any)[cat] || cat);
const getPayLabel = (m: string) =>
  ar(({ cash: 'نقداً', check: 'شيك', bank_transfer: 'تحويل بنكي', credit_card: 'بطاقة ائتمان', mobile_payment: 'دفع إلكتروني' } as Record<string, string>)[m] || m);

const EXP_COLS: PdfColumn[] = [
  { key: 'desc', label: 'البيان', flex: 2.1, kind: 'text' },
  { key: 'cat', label: 'التصنيف', flex: 1, kind: 'text' },
  { key: 'date', label: 'التاريخ', flex: 0.75, kind: 'date' },
  { key: 'qtyBlock', label: 'الكمية والوحدة', flex: 1.2, kind: 'multiline' },
  { key: 'notes', label: 'ملاحظات', flex: 1.05, kind: 'text' },
  { key: 'amount', label: 'المبلغ', flex: 0.85, kind: 'money' },
];

const mapExpensePdfRow = (e: Expense) => ({
  desc: e.description,
  cat: getCatLabel(e.category),
  date: arDate(e.date),
  qtyBlock: formatExpensePdfQtyBlock(e),
  notes: formatExpenseNotesOnly(e.notes) || '—',
  amount: e.amount,
});

const PAY_COLS: PdfColumn[] = [
  { key: 'notes', label: 'ملاحظات', flex: 2, kind: 'text' },
  { key: 'method', label: 'طريقة الدفع', flex: 1.1, kind: 'text' },
  { key: 'by', label: 'بواسطة', flex: 1, kind: 'text' },
  { key: 'date', label: 'التاريخ', flex: 1, kind: 'date' },
  { key: 'amount', label: 'المبلغ', flex: 1, kind: 'money' },
];

const DEBT_COLS: PdfColumn[] = [
  { key: 'desc', label: 'الوصف', flex: 1.8, kind: 'text' },
  { key: 'party', label: 'الطرف', flex: 1.2, kind: 'text' },
  { key: 'amount', label: 'المبلغ', flex: 1, kind: 'money' },
  { key: 'paid', label: 'مدفوع', flex: 1, kind: 'money' },
  { key: 'remaining', label: 'متبقي', flex: 1, kind: 'money' },
];

const WORKER_COLS: PdfColumn[] = [
  { key: 'job', label: 'طبيعة العمل', flex: 1.6, kind: 'text' },
  { key: 'name', label: 'اسم العامل', flex: 1.2, kind: 'text' },
  { key: 'work', label: 'حالة العمل', flex: 1, kind: 'text' },
  { key: 'account', label: 'حالة الحساب', flex: 1, kind: 'text' },
  { key: 'agreed', label: 'الاتفاق', flex: 1, kind: 'money' },
  { key: 'paid', label: 'المدفوع', flex: 1, kind: 'money' },
  { key: 'due', label: 'المتبقي', flex: 1, kind: 'money' },
  { key: 'overpaid', label: 'زيادة مدفوعة', flex: 1, kind: 'money' },
];

const MetaBar = ({ s, client }: { s: any; client: Client }) => (
  <View style={s.infoRow}>
    <View style={s.datesCol}>
      <View style={s.dateRow}>
        <Text style={s.dateLabel}>{ar('تاريخ التقرير')}</Text>
        <Text style={s.dateVal}>{today()}</Text>
      </View>
    </View>
    <View style={s.clientBox}>
      <Text style={s.clientSectionLbl}>{ar('تقرير لحساب')}</Text>
      <Text style={s.clientName}>{ar(client.name)}</Text>
      {client.address ? <Text style={s.clientSub}>{ar(client.address)}</Text> : null}
      {client.phone ? <Text style={s.clientSub}>{client.phone}</Text> : null}
    </View>
  </View>
);

const ReportPage = ({
  title, titleEn, refText, client, children, summaryCells,
}: {
  title: string; titleEn?: string; refText: string; client: Client; children: React.ReactNode;
  summaryCells?: { label: string; value: string | number; color?: string }[];
  docRef?: string;
}) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  return (
    <Page size="A4" style={s.page} wrap>
      <PdfBrandedReportHeader s={s} B={B} titleEn={titleEn || title} subtitleAr={title} refLine={refText} />
      <MetaBar s={s} client={client} />
      {summaryCells?.length ? <PdfSummaryStrip s={s} cells={summaryCells} /> : null}
      {children}
      <PdfBrandedFooter s={s} B={B} />
    </Page>
  );
};

/** Compact bar on continuation pages within the full report */
const FullReportSectionBar = ({ client, sectionTitle }: { s?: any; client: Client; sectionTitle: string }) => (
  <View style={{ marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: INK.border }}>
    <Text style={{ fontSize: 8.5, color: INK.muted, textAlign: 'right', fontFamily: PDF_FONT_FAMILY }}>
      {ar(`تقرير شامل — ${client.name}`)}
    </Text>
    <Text style={{ fontSize: 10, fontWeight: 'bold', color: INK.text, textAlign: 'right', fontFamily: PDF_FONT_FAMILY, marginTop: 2 }}>
      {ar(sectionTitle)}
    </Text>
  </View>
);

/* ═══ 1. EXPENSES ═══ */
interface ExpensesPDFProps { client: Client; expenses: Expense[]; total: number }

export const ExpensesPDF: React.FC<ExpensesPDFProps> = ({ client, expenses, total }) => {
  const B = getPdfBrand();
  return (
    <Document title={`مصروفات-${client.name}`} author={B.fullName} language="ar">
      <ReportPage title="تقرير مصروفات" titleEn="EXPENSES" refText={ar('كشف المصروفات')} client={client}
        summaryCells={[
          { label: 'عدد السجلات', value: expenses.length },
          { label: 'إجمالي المصروفات', value: total, color: INK.danger, accent: true },
        ]}>
        <PdfTable
          repeatHeader
          columns={EXP_COLS}
          primary={B.palette.primary}
          moneyColor={INK.danger}
          rows={expenses.map(mapExpensePdfRow)}
          footer={{ label: 'الإجمالي', values: { amount: total }, colors: { amount: INK.danger } }}
        />
      </ReportPage>
    </Document>
  );
};

/* ═══ 2. PAYMENTS ═══ */
interface PaymentsPDFProps { client: Client; payments: Payment[]; total: number }

export const PaymentsPDF: React.FC<PaymentsPDFProps> = ({ client, payments, total }) => {
  const B = getPdfBrand();
  return (
    <Document title={`مدفوعات-${client.name}`} author={B.fullName} language="ar">
      <ReportPage title="تقرير مدفوعات" titleEn="PAYMENTS" refText={ar('كشف المدفوعات')} client={client}
        summaryCells={[
          { label: 'عدد الدفعات', value: payments.length },
          { label: 'إجمالي المدفوعات', value: total, color: INK.success, accent: true },
        ]}>
        <PdfTable
          repeatHeader
          columns={PAY_COLS}
          primary={B.palette.primary}
          moneyColor={INK.success}
          rows={payments.map((p) => ({
            notes: p.notes || '-',
            method: getPayLabel(p.paymentMethod),
            by: p.createdBy || '-',
            date: arDate(p.paymentDate),
            amount: p.amount,
          }))}
          footer={{ label: 'الإجمالي', values: { amount: total }, colors: { amount: INK.success } }}
        />
      </ReportPage>
    </Document>
  );
};

/* ═══ 3. WORKERS ═══ */
interface WorkersPDFProps {
  client: Client; workers: Worker[]; expenses: Expense[];
  totalAgreed: number; totalPaid: number; totalDue: number;
}

export const WorkersPDF: React.FC<WorkersPDFProps> = ({ client, workers, expenses }) => {
  const B = getPdfBrand();
  const entries = buildWorkerLedgers(workers, expenses);
  const totals = summarizeWorkerLedgers(entries.map((entry) => entry.ledger));
  return (
    <Document title={`عمال-${client.name}`} author={B.fullName} language="ar">
      <ReportPage title="تقرير عمال" titleEn="WORKERS" refText={ar('كشف العمال والمقاولين')} client={client}
        summaryCells={[
          { label: 'إجمالي الاتفاقيات', value: totals.agreed },
          { label: 'المدفوع', value: totals.paid, color: INK.success, accent: true },
          { label: 'المستحق للعمال', value: totals.owed, color: INK.danger, accent: true },
          { label: 'زيادة مدفوعة', value: totals.overpaid, color: INK.warning },
        ]}>
        <PdfTable
          repeatHeader
          columns={WORKER_COLS}
          primary={B.palette.primary}
          rows={entries.map(workerSummaryRow)}
          footer={{
            label: 'إجمالي العمال',
            values: { agreed: totals.agreed, paid: totals.paid, due: totals.owed, overpaid: totals.overpaid },
            colors: { paid: INK.success, due: INK.danger },
          }}
        />
      </ReportPage>
      {entries.map((entry) => <WorkerStatementPages key={entry.worker.id} client={client} entry={entry} />)}
    </Document>
  );
};

/* ═══ 4. FULL REPORT ═══ */
interface FullReportPDFProps {
  client: Client;
  expenses: Expense[];
  payments: Payment[];
  debts: StandaloneDebt[];
  workers: Worker[];
  summary: {
    totalPaid: number; profit: number; profitPercentage: number; profitBase?: 'expenses' | 'payments';
    totalExpenses: number; totalDebts: number; totalObligations: number;
    remaining: number; totalWorkersAgreed: number; totalWorkersPaid: number; totalWorkersDue: number;
    clientDeficit?: number; agreedPercentageDeficit?: number; requiredCollection?: number;
  };
}

export const FullReportPDF: React.FC<FullReportPDFProps> = ({
  client, expenses, payments, debts, workers, summary,
}) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const workerEntries = buildWorkerLedgers(workers, expenses);
  const workerTotals = summarizeWorkerLedgers(workerEntries.map((entry) => entry.ledger));
  const remColor = summary.remaining >= 0 ? INK.success : INK.danger;
  const profitLabel = `النسبة ${summary.profitPercentage}% (${summary.profitBase === 'payments' ? 'من المدفوعات' : 'من المصروفات'})`;

  type ReportSection = {
    key: string;
    title: string;
    node: React.ReactNode;
  };

  const sections: ReportSection[] = [];

  if (expenses.length > 0) {
    sections.push({
      key: 'expenses',
      title: `المصروفات (${expenses.length})`,
      node: (
        <PdfTable
          repeatHeader
          columns={EXP_COLS}
          primary={B.palette.primary}
          moneyColor={INK.danger}
          rows={expenses.map(mapExpensePdfRow)}
          footer={{ label: 'إجمالي المصروفات', values: { amount: summary.totalExpenses }, colors: { amount: INK.danger } }}
        />
      ),
    });
  }

  if (payments.length > 0) {
    sections.push({
      key: 'payments',
      title: `المدفوعات (${payments.length})`,
      node: (
        <PdfTable
          repeatHeader
          columns={PAY_COLS}
          primary={B.palette.primary}
          moneyColor={INK.success}
          rows={payments.map((p) => ({
            notes: p.notes || '-',
            method: getPayLabel(p.paymentMethod),
            by: p.createdBy || '-',
            date: arDate(p.paymentDate),
            amount: p.amount,
          }))}
          footer={{ label: 'إجمالي المدفوعات', values: { amount: summary.totalPaid }, colors: { amount: INK.success } }}
        />
      ),
    });
  }

  if (debts.length > 0) {
    sections.push({
      key: 'debts',
      title: `الديون (${debts.length})`,
      node: (
        <PdfTable
          repeatHeader
          columns={DEBT_COLS}
          primary={B.palette.primary}
          rows={debts.map((d) => ({
            desc: d.description,
            party: d.partyName,
            amount: d.amount,
            paid: d.paidAmount,
            remaining: d.remainingAmount,
          }))}
          footer={{ label: 'إجمالي الديون', values: { amount: summary.totalDebts } }}
        />
      ),
    });
  }

  if (workers.length > 0) {
    sections.push({
      key: 'workers',
      title: `العمال والمقاولون (${workers.length})`,
      node: (
        <PdfTable
          repeatHeader
          columns={WORKER_COLS}
          primary={B.palette.primary}
          rows={workerEntries.map(workerSummaryRow)}
          footer={{
            label: 'إجمالي العمال',
            values: { agreed: workerTotals.agreed, paid: workerTotals.paid, due: workerTotals.owed, overpaid: workerTotals.overpaid },
            colors: { paid: INK.success, due: INK.danger },
          }}
        />
      ),
    });
  }

  const [firstSection, ...restSections] = sections;

  return (
    <Document title={`تقرير-${client.name}`} author={B.fullName} language="ar">
      <Page size="A4" style={s.page} wrap>
        <PdfBrandedReportHeader
          s={s}
          B={B}
          titleEn="FULL REPORT"
          subtitleAr="تقرير شامل"
          refLine={ar('التقرير الشامل')}
        />
        <MetaBar s={s} client={client} />

        <PdfSummaryStrip
          s={s}
          cells={[
            { label: 'إجمالي المدفوعات', value: summary.totalPaid, color: INK.success, accent: true },
            {
              label:
                (summary.agreedPercentageDeficit ?? 0) > 0
                  ? `${profitLabel} — عجز النسبة: ${Math.round(summary.agreedPercentageDeficit ?? 0).toLocaleString('en-US')}`
                  : profitLabel,
              value: summary.profit,
              color: INK.warning,
              accent: (summary.agreedPercentageDeficit ?? 0) > 0,
            },
            { label: 'مصروفات + ديون', value: summary.totalExpenses + summary.totalDebts, color: INK.danger, accent: true },
            { label: summary.remaining < 0 ? 'المتبقي (عجز)' : 'المتبقي', value: summary.remaining, color: remColor, accent: true },
          ]}
        />

        {firstSection ? (
          <View style={{ marginBottom: 14 }}>
            <PdfSectionTitle primary={B.palette.primary}>{firstSection.title}</PdfSectionTitle>
            {firstSection.node}
          </View>
        ) : null}

        <PdfBrandedFooter s={s} B={B} />
      </Page>

      {restSections.map((section) => (
        <Page key={section.key} size="A4" style={s.page} wrap>
          <FullReportSectionBar s={s} client={client} sectionTitle={section.title} />
          <View style={{ marginBottom: 14 }}>
            <PdfSectionTitle primary={B.palette.primary}>{section.title}</PdfSectionTitle>
            {section.node}
          </View>
          <PdfBrandedFooter s={s} B={B} />
        </Page>
      ))}
      {workerEntries.map((entry) => <WorkerStatementPages key={`worker-${entry.worker.id}`} client={client} entry={entry} />)}
    </Document>
  );
};

/* ═══ 5. DEBTS ═══ */
interface DebtsPDFProps { client: Client; debts: StandaloneDebt[]; total: number }

export const DebtsPDF: React.FC<DebtsPDFProps> = ({ client, debts, total }) => {
  const B = getPdfBrand();
  return (
    <Document title={`ديون-${client.name}`} author={B.fullName} language="ar">
      <ReportPage title="تقرير ديون" titleEn="DEBTS" refText={ar('كشف الديون')} client={client}
        summaryCells={[
          { label: 'عدد الديون', value: debts.length },
          { label: 'إجمالي المتبقي', value: total, color: INK.warning, accent: true },
        ]}>
        <PdfTable
          repeatHeader
          columns={DEBT_COLS}
          primary={B.palette.primary}
          rows={debts.map((d) => ({
            desc: d.description,
            party: d.partyName,
            amount: d.amount,
            paid: d.paidAmount,
            remaining: d.remainingAmount,
          }))}
          footer={{ label: 'إجمالي الديون المتبقية', values: { remaining: total }, colors: { remaining: INK.warning } }}
        />
      </ReportPage>
    </Document>
  );
};
