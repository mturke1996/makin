// @ts-nocheck
import React from 'react';
import { Document, Text, View } from '@react-pdf/renderer';
import './pdfFonts';
import type { Client, Expense, Payment, StandaloneDebt, Worker } from '../../types';
import { expenseCategories, expenseHasQuantityLine, formatCurrencyDisplay, formatExpenseNotesOnly, formatQuantityWithUnit } from '../../core/utils-formatters';
import { buildWorkerLedgers, summarizeWorkerLedgers } from '../../core/finance/workerLedger';
import { ar, arDate } from './arabicPDF';
import { getPdfBrand } from './pdfBrand';
import { PDF_FONT_FAMILY } from './pdfFonts';
import {
  INK,
  countWord,
  PdfBreakdown,
  PdfDocTitle,
  PdfInfoCard,
  PdfPage,
  PdfSectionHeading,
  PdfStatement,
  PdfSummaryStrip,
  makePdfStyles,
} from './pdfKit';
import { PdfTable, type PdfColumn } from './PdfTable';
import { workerSummaryRow } from './workerReportModel';
import { WorkerStatementPages } from './WorkerStatementPDF';

const REC = { one: 'سجل واحد', two: 'سجلان', few: 'سجلات', many: 'سجلاً' };
const PAYW = { one: 'دفعة واحدة', two: 'دفعتان', few: 'دفعات', many: 'دفعة' };
const DEBTW = { one: 'دين واحد', two: 'دينان', few: 'ديون', many: 'ديناً' };
const WORKW = { one: 'عامل واحد', two: 'عاملان', few: 'عمال', many: 'عاملاً' };
const catLabel = (cat: string) => (expenseCategories as any)[cat] || cat;
const PAY_LABEL: Record<string, string> = { cash: 'نقداً', check: 'شيك', bank_transfer: 'تحويل بنكي', credit_card: 'بطاقة ائتمان', mobile_payment: 'دفع إلكتروني' };
const payLabel = (m: string) => PAY_LABEL[m] || m;

const ymd = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
const docRef = (prefix: string, client: Client) => `MK-${prefix}-${ymd()}-${String(client.id).slice(-4).toUpperCase()}`;

/** «من 12/06/2026 إلى 23/10/2026» for a list of dated records. */
function periodOf(days: (string | undefined)[]): string | undefined {
  const valid = days.filter(Boolean).map((d) => String(d).slice(0, 10)).sort();
  if (valid.length === 0) return undefined;
  const [first, last] = [valid[0], valid[valid.length - 1]];
  return first === last ? arDate(first) : `${arDate(first)}  –  ${arDate(last)}`;
}

/** Largest groups first; the long tail is folded into «أخرى» so the chart stays readable. */
function topGroups(entries: Map<string, number>, max = 6) {
  const sorted = [...entries.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
  if (sorted.length <= max) return sorted;
  const head = sorted.slice(0, max - 1);
  const rest = sorted.slice(max - 1).reduce((sum, r) => sum + r.amount, 0);
  return [...head, { label: 'أخرى', amount: rest }];
}

const sumBy = <T,>(items: T[], pick: (item: T) => string, amount: (item: T) => number) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(pick(item), (map.get(pick(item)) ?? 0) + amount(item));
  return map;
};

const EXP_COLS: PdfColumn[] = [
  { key: 'date', label: 'التاريخ', flex: 0.85, kind: 'date' },
  { key: 'desc', label: 'البيان', flex: 2.6, kind: 'stack', bold: true },
  { key: 'qty', label: 'الكمية', flex: 1.1, kind: 'stack' },
  { key: 'notes', label: 'ملاحظات', flex: 1.4, kind: 'text' },
  { key: 'amount', label: 'المبلغ', flex: 1, kind: 'money', bold: true },
];

const expenseRow = (e: Expense) => ({
  date: arDate(e.date),
  desc: { t: e.description, s: [catLabel(e.category), e.workerName].filter(Boolean).join('  ·  ') },
  qty: expenseHasQuantityLine(e) ? { t: formatQuantityWithUnit(e.quantity!, e.unit), s: `بسعر ${formatCurrencyDisplay(e.unitPrice!)}` } : { t: '—' },
  notes: formatExpenseNotesOnly(e.notes) || '—',
  amount: e.amount,
});

const PAY_COLS: PdfColumn[] = [
  { key: 'date', label: 'التاريخ', flex: 0.9, kind: 'date' },
  { key: 'method', label: 'طريقة الدفع', flex: 1.1, kind: 'text' },
  { key: 'notes', label: 'ملاحظات', flex: 2.2, kind: 'text' },
  { key: 'by', label: 'سجّلها', flex: 1.1, kind: 'text' },
  { key: 'amount', label: 'المبلغ', flex: 1, kind: 'money', bold: true },
];

const paymentRow = (p: Payment) => ({ date: arDate(p.paymentDate), method: payLabel(p.paymentMethod), notes: p.notes || '—', by: p.createdBy || '—', amount: p.amount });

const DEBT_COLS: PdfColumn[] = [
  { key: 'desc', label: 'الدين', flex: 2.4, kind: 'stack', bold: true },
  { key: 'due', label: 'الاستحقاق', flex: 0.9, kind: 'date' },
  { key: 'amount', label: 'القيمة', flex: 1, kind: 'money' },
  { key: 'paid', label: 'المسدد', flex: 1, kind: 'money' },
  { key: 'remaining', label: 'المتبقي', flex: 1, kind: 'money', bold: true },
];

const debtRow = (d: StandaloneDebt) => ({
  desc: { t: d.description, s: d.partyName },
  due: d.dueDate ? arDate(d.dueDate) : '—',
  amount: d.amount,
  paid: d.paidAmount,
  remaining: d.remainingAmount,
});

const WORKER_COLS: PdfColumn[] = [
  { key: 'name', label: 'العامل', flex: 2, kind: 'stack', bold: true },
  { key: 'state', label: 'الحالة', flex: 1.5, kind: 'stack' },
  { key: 'agreed', label: 'الاتفاق', flex: 1, kind: 'money' },
  { key: 'paid', label: 'المدفوع', flex: 1, kind: 'money' },
  { key: 'due', label: 'المتبقي', flex: 1, kind: 'money', bold: true },
];

const workerRow = (entry) => {
  const r = workerSummaryRow(entry);
  return { name: { t: r.name, s: r.job }, state: { t: r.account, s: r.work }, agreed: r.agreed, paid: r.paid, due: r.due };
};

const ClientCard = ({ s, client, period }: { s: any; client: Client; period?: string }) => (
  <PdfInfoCard
    s={s}
    items={[
      { label: 'المشروع / العميل', value: client.name },
      { label: 'الهاتف', value: client.phone },
      { label: 'العنوان', value: client.address },
      { label: 'الفترة', value: period },
    ]}
  />
);

const Breakdown = ({ s, title, hint, groups, total, color }: any) =>
  groups.length > 1 ? (
    <View wrap={false}>
      <PdfSectionHeading s={s}>{title}</PdfSectionHeading>
      {hint ? <Text style={{ fontSize: 7.8, color: INK.faint, textAlign: 'right', marginBottom: 6, fontFamily: PDF_FONT_FAMILY }}>{ar(hint)}</Text> : null}
      <PdfBreakdown rows={groups} total={total} color={color} />
    </View>
  ) : null;

/* ═══ Expenses ═══ */
export const ExpensesPDF: React.FC<{ client: Client; expenses: Expense[]; total: number }> = ({ client, expenses, total }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const ref = docRef('EXP', client);
  const groups = topGroups(sumBy(expenses, (e) => catLabel(e.category), (e) => e.amount));
  const average = expenses.length ? total / expenses.length : 0;
  return (
    <Document title={`مصروفات-${client.name}`} author={B.fullName} language="ar">
      <PdfPage B={B} s={s} letterhead runningTitle={`كشف المصروفات  ·  ${client.name}`} docRef={ref}>
        <PdfDocTitle s={s} titleAr="كشف المصروفات" meta={[{ label: 'المرجع', value: ref }, { label: 'تاريخ الإصدار', value: arDate(new Date().toISOString()) }]} />
        <ClientCard s={s} client={client} period={periodOf(expenses.map((e) => e.date))} />
        <PdfSummaryStrip
          s={s}
          cells={[
            { label: 'إجمالي المصروفات', value: total, color: INK.danger, accent: true },
            { label: 'عدد السجلات', value: expenses.length, count: true },
            { label: 'متوسط السجل', value: average },
            { label: 'أكبر تصنيف', value: groups[0]?.label ?? '—', count: true, hint: groups[0] && total > 0 ? `${Math.round((groups[0].amount / total) * 100)} بالمئة من الإجمالي` : undefined },
          ]}
        />
        <Breakdown s={s} title="توزيع المصروفات حسب التصنيف" groups={groups} total={total} color={INK.text} />
        <PdfTable s={s} heading="تفاصيل المصروفات" hint={countWord(expenses.length, REC)} columns={EXP_COLS} rows={expenses.map(expenseRow)} />
      </PdfPage>
    </Document>
  );
};

/* ═══ Payments ═══ */
export const PaymentsPDF: React.FC<{ client: Client; payments: Payment[]; total: number }> = ({ client, payments, total }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const ref = docRef('PAY', client);
  const groups = topGroups(sumBy(payments, (p) => payLabel(p.paymentMethod), (p) => p.amount));
  const last = [...payments].sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)))[0];
  return (
    <Document title={`مدفوعات-${client.name}`} author={B.fullName} language="ar">
      <PdfPage B={B} s={s} letterhead runningTitle={`كشف المدفوعات  ·  ${client.name}`} docRef={ref}>
        <PdfDocTitle s={s} titleAr="كشف المدفوعات" meta={[{ label: 'المرجع', value: ref }, { label: 'تاريخ الإصدار', value: arDate(new Date().toISOString()) }]} />
        <ClientCard s={s} client={client} period={periodOf(payments.map((p) => p.paymentDate))} />
        <PdfSummaryStrip
          s={s}
          cells={[
            { label: 'إجمالي المدفوعات', value: total, color: INK.success, accent: true },
            { label: 'عدد الدفعات', value: payments.length, count: true },
            { label: 'متوسط الدفعة', value: payments.length ? total / payments.length : 0 },
            { label: 'آخر دفعة', value: last ? arDate(last.paymentDate) : '—', count: true, hint: last ? formatCurrencyDisplay(last.amount) : undefined },
          ]}
        />
        <Breakdown s={s} title="توزيع المدفوعات حسب الطريقة" groups={groups} total={total} color={INK.success} />
        <PdfTable s={s} heading="تفاصيل الدفعات" hint={countWord(payments.length, PAYW)} columns={PAY_COLS} rows={payments.map(paymentRow)} />
      </PdfPage>
    </Document>
  );
};

/* ═══ Workers ═══ */
export const WorkersPDF: React.FC<{ client: Client; workers: Worker[]; expenses: Expense[] }> = ({ client, workers, expenses }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const ref = docRef('WRK', client);
  const entries = buildWorkerLedgers(workers, expenses);
  const totals = summarizeWorkerLedgers(entries.map((entry) => entry.ledger));
  return (
    <Document title={`عمال-${client.name}`} author={B.fullName} language="ar">
      <PdfPage B={B} s={s} letterhead runningTitle={`كشف العمال والمقاولين  ·  ${client.name}`} docRef={ref}>
        <PdfDocTitle s={s} titleAr="كشف العمال والمقاولين" meta={[{ label: 'المرجع', value: ref }, { label: 'تاريخ الإصدار', value: arDate(new Date().toISOString()) }]} />
        <ClientCard s={s} client={client} />
        <PdfSummaryStrip
          s={s}
          cells={[
            { label: 'إجمالي الاتفاقيات', value: totals.agreed },
            { label: 'المدفوع للعمال', value: totals.paid, color: INK.success, accent: true },
            { label: 'المستحق للعمال', value: totals.owed, color: INK.danger, accent: true },
            ...(totals.overpaid > 0 ? [{ label: 'زيادة مدفوعة', value: totals.overpaid, color: INK.warning }] : []),
          ]}
        />
        <PdfTable s={s} heading="العمال والمقاولون" hint={countWord(entries.length, WORKW)} columns={WORKER_COLS} rows={entries.map(workerRow)} moneyColor={undefined} />
      </PdfPage>
      {entries.map((entry) => (
        <WorkerStatementPages key={entry.worker.id} client={client} entry={entry} />
      ))}
    </Document>
  );
};

/* ═══ Debts ═══ */
export const DebtsPDF: React.FC<{ client: Client; debts: StandaloneDebt[]; total: number }> = ({ client, debts, total }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const ref = docRef('DBT', client);
  const value = debts.reduce((sum, d) => sum + d.amount, 0);
  const paid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  return (
    <Document title={`ديون-${client.name}`} author={B.fullName} language="ar">
      <PdfPage B={B} s={s} letterhead runningTitle={`كشف الديون  ·  ${client.name}`} docRef={ref}>
        <PdfDocTitle s={s} titleAr="كشف الديون" meta={[{ label: 'المرجع', value: ref }, { label: 'تاريخ الإصدار', value: arDate(new Date().toISOString()) }]} />
        <ClientCard s={s} client={client} />
        <PdfSummaryStrip
          s={s}
          cells={[
            { label: 'المتبقي', value: total, color: INK.warning, accent: true },
            { label: 'إجمالي الديون', value },
            { label: 'المسدد', value: paid, color: INK.success },
            { label: 'عدد الديون', value: debts.length, count: true },
          ]}
        />
        <PdfTable s={s} heading="تفاصيل الديون" hint={countWord(debts.length, DEBTW)} columns={DEBT_COLS} rows={debts.map(debtRow)} />
      </PdfPage>
    </Document>
  );
};

/* ═══ Full report ═══ */
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

export const FullReportPDF: React.FC<FullReportPDFProps> = ({ client, expenses, payments, debts, workers, summary }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const ref = docRef('RPT', client);
  const workerEntries = buildWorkerLedgers(workers, expenses);
  const workerTotals = summarizeWorkerLedgers(workerEntries.map((entry) => entry.ledger));
  const groups = topGroups(sumBy(expenses, (e) => catLabel(e.category), (e) => e.amount));
  const baseLabel = summary.profitBase === 'payments' ? 'من المدفوعات' : 'من المصروفات';

  return (
    <Document title={`تقرير-${client.name}`} author={B.fullName} language="ar">
      <PdfPage B={B} s={s} letterhead runningTitle={`التقرير الشامل  ·  ${client.name}`} docRef={ref}>
        <PdfDocTitle s={s} titleAr="التقرير الشامل" meta={[{ label: 'المرجع', value: ref }, { label: 'تاريخ الإصدار', value: arDate(new Date().toISOString()) }]} />
        <ClientCard s={s} client={client} period={periodOf([...expenses.map((e) => e.date), ...payments.map((p) => p.paymentDate)])} />

        <PdfSectionHeading s={s}>ملخص الحساب</PdfSectionHeading>
        <PdfStatement
          lines={[
            { label: 'المدفوعات المحصّلة من العميل', sign: '+', amount: summary.totalPaid, color: INK.success, note: countWord(payments.length, PAYW) },
            { label: 'المصروفات', sign: '−', amount: summary.totalExpenses, color: INK.danger, note: countWord(expenses.length, REC) },
            ...(summary.totalDebts > 0 ? [{ label: 'الديون المتبقية', sign: '−', amount: summary.totalDebts, color: INK.warning, note: countWord(debts.length, DEBTW) }] : []),
            ...(summary.profitPercentage > 0 ? [{ label: 'النسبة المتفق عليها', sign: '−', amount: summary.profit, note: `${summary.profitPercentage} بالمئة ${baseLabel}` }] : []),
          ]}
          net={{ label: summary.remaining < 0 ? 'العجز' : 'الصافي المتبقي', amount: summary.remaining, color: summary.remaining < 0 ? INK.danger : undefined }}
        />
        {workerTotals.owed > 0 ? (
          <Text style={{ fontSize: 8.2, color: INK.muted, textAlign: 'right', marginBottom: 4, fontFamily: PDF_FONT_FAMILY }}>
            {ar(`مستحقات عمال لم تُسدَّد بعد: ${formatCurrencyDisplay(workerTotals.owed)}، وهي غير محتسبة في الصافي أعلاه.`)}
          </Text>
        ) : null}
        {(summary.agreedPercentageDeficit ?? 0) > 0 ? (
          <Text style={{ fontSize: 8.2, color: INK.warning, textAlign: 'right', marginBottom: 4, fontFamily: PDF_FONT_FAMILY }}>
            {ar(`عجز النسبة المتفق عليها: ${formatCurrencyDisplay(summary.agreedPercentageDeficit)}`)}
          </Text>
        ) : null}

        <Breakdown s={s} title="توزيع المصروفات حسب التصنيف" groups={groups} total={summary.totalExpenses} color={INK.text} />

        {expenses.length > 0 ? (
          <>
            <PdfTable s={s} heading="المصروفات" hint={countWord(expenses.length, REC)} columns={EXP_COLS} rows={expenses.map(expenseRow)} />
          </>
        ) : null}
        {payments.length > 0 ? (
          <>
            <PdfTable s={s} heading="المدفوعات" hint={countWord(payments.length, PAYW)} columns={PAY_COLS} rows={payments.map(paymentRow)} />
          </>
        ) : null}
        {debts.length > 0 ? (
          <>
            <PdfTable s={s} heading="الديون" hint={countWord(debts.length, DEBTW)} columns={DEBT_COLS} rows={debts.map(debtRow)} />
          </>
        ) : null}
        {workers.length > 0 ? (
          <>
            <PdfTable s={s} heading="العمال والمقاولون" hint={countWord(workers.length, WORKW)} columns={WORKER_COLS} rows={workerEntries.map(workerRow)} />
          </>
        ) : null}
      </PdfPage>
      {workerEntries.map((entry) => (
        <WorkerStatementPages key={`worker-${entry.worker.id}`} client={client} entry={entry} />
      ))}
    </Document>
  );
};
