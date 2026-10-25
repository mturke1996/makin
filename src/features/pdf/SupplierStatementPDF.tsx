// @ts-nocheck
import React from 'react';
import { Document } from '@react-pdf/renderer';
import './pdfFonts';
import type { Expense, Supplier } from '../../types';
import type { SupplierRow } from '../../core/finance/supplierLedger';
import { expenseCategories, expenseHasQuantityLine, formatCurrencyDisplay, formatQuantityWithUnit } from '../../core/utils-formatters';
import { arDate } from './arabicPDF';
import { getPdfBrand } from './pdfBrand';
import { INK, PdfDocTitle, PdfInfoCard, PdfPage, PdfSummaryStrip, countWord, makePdfStyles } from './pdfKit';
import { PdfTable, type PdfColumn } from './PdfTable';

const catLabel = (cat: string) => (expenseCategories as any)[cat] || cat;
const BUYS = { one: 'مشترى واحد', two: 'مشتريان', few: 'مشتريات', many: 'مشترى' };
const PROJECTS = { one: 'مشروع واحد', two: 'مشروعان', few: 'مشاريع', many: 'مشروعاً' };

const PROJECT_COLS: PdfColumn[] = [
  { key: 'project', label: 'المشروع', flex: 3, kind: 'text', bold: true },
  { key: 'count', label: 'المشتريات', flex: 1, kind: 'num' },
  { key: 'total', label: 'الإجمالي', flex: 1.2, kind: 'money', bold: true },
];

const BUY_COLS: PdfColumn[] = [
  { key: 'date', label: 'التاريخ', flex: 0.9, kind: 'date' },
  { key: 'desc', label: 'البيان', flex: 2.6, kind: 'stack', bold: true },
  { key: 'project', label: 'المشروع', flex: 1.6, kind: 'text' },
  { key: 'amount', label: 'المبلغ', flex: 1.1, kind: 'money', bold: true },
];

/** What was bought from one supplier: the total, the split by project, and every purchase with its quantity and price. */
export const SupplierStatementPDF: React.FC<{ supplier: Supplier; row: SupplierRow; expenses: Expense[]; clientName: (id: string) => string }> = ({ supplier, row, expenses, clientName }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);
  const ref = `MK-SUP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${supplier.id.slice(-4).toUpperCase()}`;
  return (
    <Document title={`كشف-${supplier.name}`} author={B.fullName} language="ar">
      <PdfPage B={B} s={s} letterhead runningTitle={`كشف حساب مورّد  ·  ${supplier.name}`} docRef={ref}>
        <PdfDocTitle
          s={s}
          titleAr="كشف حساب مورّد"
          subtitle={supplier.name}
          meta={[{ label: 'المرجع', value: ref }, { label: 'تاريخ الإصدار', value: arDate(new Date().toISOString()) }]}
        />
        <PdfInfoCard
          s={s}
          items={[
            { label: 'المورّد', value: supplier.name },
            { label: 'الهاتف', value: supplier.phone },
            { label: 'يورّد', value: supplier.supplies },
            { label: 'آخر شراء', value: row.lastDate ? arDate(row.lastDate) : undefined },
          ]}
        />
        <PdfSummaryStrip s={s} cells={[{ label: 'إجمالي المشتريات', value: row.total, color: INK.danger, accent: true }, { label: 'عدد المشتريات', value: row.count, count: true }]} />

        {row.byClient.length > 1 ? (
          <PdfTable
            s={s}
            heading="التوزيع على المشاريع"
            hint={countWord(row.byClient.length, PROJECTS)}
            columns={PROJECT_COLS}
            rows={row.byClient.map((c) => ({ project: clientName(c.clientId), count: String(c.count), total: c.total }))}
          />
        ) : null}

        <PdfTable
          s={s}
          heading="المشتريات"
          hint={countWord(expenses.length, BUYS)}
          columns={BUY_COLS}
          rows={expenses.map((e) => ({
            date: arDate(e.date),
            desc: {
              t: e.description,
              s: [catLabel(e.category), expenseHasQuantityLine(e) ? `${formatQuantityWithUnit(e.quantity!, e.unit)} بسعر ${formatCurrencyDisplay(e.unitPrice!)}` : ''].filter(Boolean).join('  ·  '),
            },
            project: clientName(e.clientId),
            amount: e.amount,
          }))}
          emptyMessage="لا مشتريات مرتبطة بهذا المورّد"
        />
      </PdfPage>
    </Document>
  );
};
