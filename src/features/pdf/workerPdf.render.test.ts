import { createElement, type ReactElement } from 'react';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Font, renderToBuffer } from '@react-pdf/renderer';
import type { Client, Expense, Worker } from '../../types';
import { buildWorkerLedger } from '../../core/finance/workerLedger';
import { WorkerStatementPDF } from './WorkerStatementPDF';
import { FullReportPDF } from './ClientReportsPDF';

Font.register({ family: 'MakinPdf', fonts: [{ src: resolve('public/fonts/Tajawal-Regular.ttf'), fontWeight: 400 }, { src: resolve('public/fonts/Tajawal-Bold.ttf'), fontWeight: 700 }] });
Font.registerHyphenationCallback(word => [word]);
const at = '2026-10-24T10:00:00Z';
const client = { id: 'c1', name: 'مشروع التحقق', phone: '0910000000', address: 'طرابلس', type: 'individual', createdAt: at, updatedAt: at } as Client;
const worker: Worker = { id: 'w1', clientId: client.id, name: 'عامل التحقق', jobType: 'تشطيب', totalAmount: 1000.125, paidAmount: 0, remainingAmount: 1000.125, status: 'active', createdAt: at, updatedAt: at, agreementHistory: [{ id: 'initial', kind: 'created', totalAmount: 1000.125, agreementItems: [], recordedAt: at, recordedBy: 'admin', recordedByName: 'المدير', reason: 'تسجيل الاتفاق الأول' }] };
const expense: Expense = { id: 'payment1', clientId: client.id, workerId: worker.id, workerName: worker.name, description: 'دفعة مرحلة', amount: 100.125, category: 'labor', date: '2026-10-24', isClosed: false, createdAt: at, updatedAt: at, notes: 'توريد وإنجاز مرحلة', userId: 'admin' };
function pageCount(buffer: Buffer) { return [...buffer.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length; }
// Composite report components resolve to Document at render time.
const renderReport = (element: ReactElement) => renderToBuffer(element);
function saveSample(name: string, buffer: Buffer) {
  if (!process.env.PDF_QA_OUTPUT_DIR) return;
  mkdirSync(process.env.PDF_QA_OUTPUT_DIR, { recursive: true });
  writeFileSync(resolve(process.env.PDF_QA_OUTPUT_DIR, name), buffer);
}
describe('worker PDF generation', () => {
  it('renders Arabic worker agreement, payment ledger and revision pages', async () => {
    const buffer = await renderReport(createElement(WorkerStatementPDF, { client, entry: { worker, ledger: buildWorkerLedger(worker, [expense]) } }));
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(pageCount(buffer)).toBeGreaterThanOrEqual(1);
    expect(buffer.length).toBeGreaterThan(5000);
    saveSample('worker-statement.pdf', buffer);
  }, 30000);
  it('includes individual worker appendices in the comprehensive project report', async () => {
    const buffer = await renderReport(createElement(FullReportPDF, { client, expenses: [expense], payments: [], debts: [], workers: [worker], summary: { totalPaid: 0, totalExpenses: 100.125, totalDebts: 0, totalObligations: 100.125, profit: 0, remaining: -100.125, totalWorkersAgreed: 1000.125, totalWorkersPaid: 100.125, totalWorkersDue: 900, profitPercentage: 0, profitBase: 'expenses' } }));
    expect(pageCount(buffer)).toBeGreaterThanOrEqual(2);
    saveSample('full-project-report.pdf', buffer);
  }, 30000);
});
