import { withDocumentLanguage } from '../../../features/pdf/pdfI18n';
import { createElement, useCallback, useRef, useState, type ReactElement } from 'react';
import toast from 'react-hot-toast';
import { downloadPdf, sharePdf } from '../../../features/pdf/pdfService';
import { DebtsPDF, ExpensesPDF, FullReportPDF, PaymentsPDF, WorkersPDF } from '../../../features/pdf/ClientReportsPDF';
import { WorkerStatementPDF } from '../../../features/pdf/WorkerStatementPDF';
import type { Client, Expense, Payment, StandaloneDebt, Worker } from '../../../types';
import type { ClientSummary } from './types';
import type { CategoryBudgetRow } from '../../../core/finance/budgetStatus';
import type { PhaseBudgetRow } from '../../../core/finance/projectBudget';
import type { PaymentSchedule } from '../../../core/finance/paymentSchedule';
import type { WorkerReportEntry, WorkerReportPeriod } from '../../../features/pdf/workerReportModel';

export type ClientReportKind = 'full' | 'expenses' | 'payments' | 'debts' | 'workers';

interface ReportInput {
  client: Client | undefined;
  expenses: Expense[];
  payments: Payment[];
  debts: StandaloneDebt[];
  workers: Worker[];
  /** Only for someone who sees every expense: a budget compared with a partial total would mislead. */
  budget?: { phases: PhaseBudgetRow[]; categories: CategoryBudgetRow[] };
  /** The agreed payment schedule, for the full report. */
  schedule?: PaymentSchedule;
  summary: ClientSummary;
}

/** Download / share of every client report, with one shared busy flag. */
export function useClientPdf({ client, expenses, payments, debts, workers, budget, schedule, summary }: ReportInput) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const busy = useRef(false);

  const build = useCallback(
    (kind: ClientReportKind): { element: ReactElement; file: string; title: string; text: string } | null => {
      if (!client) return null;
      const name = client.name;
      switch (kind) {
        case 'full':
          return {
            element: createElement(FullReportPDF, { client, expenses, payments, debts, workers, budget, schedule, summary }),
            file: `تقرير-${name}`,
            title: `التقرير الشامل - ${name}`,
            text: `مرفق: التقرير الشامل لمشروع ${name}`,
          };
        case 'expenses':
          return {
            element: createElement(ExpensesPDF, { client, expenses, total: summary.totalExpenses }),
            file: `مصروفات-${name}`,
            title: `كشف المصروفات - ${name}`,
            text: `مرفق: كشف مصروفات مشروع ${name}`,
          };
        case 'payments':
          return {
            element: createElement(PaymentsPDF, { client, payments, total: summary.totalPaid }),
            file: `مدفوعات-${name}`,
            title: `كشف المدفوعات - ${name}`,
            text: `مرفق: كشف مدفوعات وتحصيلات مشروع ${name}`,
          };
        case 'debts':
          return {
            element: createElement(DebtsPDF, { client, debts, total: summary.totalDebts }),
            file: `ديون-${name}`,
            title: `كشف الديون - ${name}`,
            text: `مرفق: كشف الديون والمستحقات لمشروع ${name}`,
          };
        case 'workers':
          return {
            element: createElement(WorkersPDF, {
              client,
              workers,
              expenses,
            }),
            file: `عمال-${name}`,
            title: `كشف العمال - ${name}`,
            text: `مرفق: كشف العمال والمستحقات لمشروع ${name}`,
          };
      }
    },
    [client, expenses, payments, debts, workers, budget, schedule, summary]
  );

  const run = useCallback(
    async (kind: ClientReportKind, mode: 'download' | 'share') => {
      const built = build(kind);
      if (!built || busy.current) return;
      const report = { ...built, element: withDocumentLanguage(built.element, client) };
      busy.current = true;
      setPdfLoading(true);
      try {
        if (mode === 'download') await downloadPdf(report.element, report.file);
        else await sharePdf(report.element, report.file, { title: report.title, text: report.text });
      } catch (e) {
        console.error('PDF error:', e);
        toast.error('فشل في إنشاء PDF');
      } finally {
        setPdfLoading(false);
        busy.current = false;
      }
    },
    [build, client]
  );

  const download = useCallback((kind: ClientReportKind) => run(kind, 'download'), [run]);
  const share = useCallback((kind: ClientReportKind) => run(kind, 'share'), [run]);

  const workerStatement = useCallback(async (entry: WorkerReportEntry, mode: 'download' | 'share', period?: WorkerReportPeriod) => {
    if (!client || busy.current) return;
    busy.current = true;
    setPdfLoading(true);
    try {
      const element = createElement(WorkerStatementPDF, { client, entry, period });
      const file = `كشف-${entry.worker.name}-${client.name}`;
      if (mode === 'download') await downloadPdf(element, file);
      else await sharePdf(element, file, { title: `كشف حساب ${entry.worker.name}`, text: `كشف حساب العامل في مشروع ${client.name}` });
    } catch (error) {
      console.error('Worker PDF error:', error);
      toast.error('تعذر إنشاء كشف العامل');
    } finally {
      busy.current = false;
      setPdfLoading(false);
    }
  }, [client]);

  return { pdfLoading, download, share, workerStatement };
}
