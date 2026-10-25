import { createElement, type ReactElement } from 'react';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Font, renderToBuffer } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { Client, Expense, Invoice, Letter, Payment, PaymentMilestone, StandaloneDebt, Worker } from '../../types';
import { buildWorkerLedgers } from '../../core/finance/workerLedger';
import { buildPaymentSchedule } from '../../core/finance/paymentSchedule';
import { DebtsPDF, ExpensesPDF, FullReportPDF, PaymentsPDF, WorkersPDF } from './ClientReportsPDF';
import { InvoicePDF } from './InvoicePDF';
import { LetterPDF } from './LetterPDF';
import { PdfLogoProvider } from './pdf-logo-context';
import { ReceiptPDF } from './ReceiptPDF';
import { buildReceipt } from '../../core/finance/receipt';
import { WorkerStatementPDF } from './WorkerStatementPDF';

Font.register({ family: 'MakinPdf', fonts: [{ src: resolve('public/fonts/Tajawal-Regular.ttf'), fontWeight: 400 }, { src: resolve('public/fonts/Tajawal-Bold.ttf'), fontWeight: 700 }] });
Font.register({ family: 'MakinNum', fonts: [{ src: resolve('public/fonts/Cairo-Regular.ttf'), fontWeight: 400 }, { src: resolve('public/fonts/Cairo-Bold.ttf'), fontWeight: 700 }] });
Font.registerHyphenationCallback((word) => [word]);

const logo = `data:image/png;base64,${readFileSync(resolve('public/brand/logo-pdf.png')).toString('base64')}`;
// Composite report components resolve to a Document at render time; the wrapper only supplies the logo.
const withLogo = (element: ReactElement) => createElement(PdfLogoProvider, { uri: logo, children: element }) as unknown as ReactElement<DocumentProps>;
const pageCount = (buffer: Buffer) => [...buffer.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
const save = (name: string, buffer: Buffer) => {
  if (!process.env.PDF_QA_OUTPUT_DIR) return;
  mkdirSync(process.env.PDF_QA_OUTPUT_DIR, { recursive: true });
  writeFileSync(resolve(process.env.PDF_QA_OUTPUT_DIR, name), buffer);
};

const at = '2026-10-24T10:00:00Z';
const client = { id: 'c-villa', name: 'فيلا الأستاذ خالد المبروك', phone: '0912345678', address: 'حي الأندلس', type: 'individual', createdAt: at, updatedAt: at } as Client;

const exp = (id: string, description: string, amount: number, category: string, date: string, extra: Partial<Expense> = {}): Expense =>
  ({ id, clientId: client.id, description, amount, category, date, isClosed: false, createdAt: at, updatedAt: at, ...extra }) as Expense;

const elec: Worker = {
  id: 'w-elec', clientId: client.id, name: 'علي الكهربائي', jobType: 'كهرباء', totalAmount: 18000, paidAmount: 0, remainingAmount: 18000, status: 'active', phone: '0921112233', startDate: '2026-08-15',
  agreementItems: [{ id: 'i1', title: 'تمديد نقاط الإنارة', quantity: 60, unit: 'نقطة', unitPrice: 150 }, { id: 'i2', title: 'تأسيس لوحات التوزيع', quantity: 3, unit: 'لوحة', unitPrice: 3000, note: 'شاملة القواطع' }],
  agreementHistory: [{ id: 'r1', kind: 'created', totalAmount: 15000, agreementItems: [], recordedAt: '2026-08-15T09:00:00Z', recordedBy: 'a', recordedByName: 'م. أحمد', reason: 'تسجيل الاتفاق الأول' }, { id: 'r2', kind: 'revised', totalAmount: 18000, agreementItems: [{ id: 'i2', title: 'تأسيس لوحات التوزيع', quantity: 3, unit: 'لوحة', unitPrice: 3000 }], recordedAt: '2026-09-20T09:00:00Z', recordedBy: 'a', recordedByName: 'م. أحمد', reason: 'إضافة لوحة ثالثة' }],
  createdAt: at, updatedAt: at,
};
const plumb: Worker = { id: 'w-plumb', clientId: client.id, name: 'مصطفى السباك', jobType: 'سباكة', totalAmount: 14000, paidAmount: 0, remainingAmount: 14000, status: 'completed', createdAt: at, updatedAt: at };

const expenses: Expense[] = [
  exp('e1', 'خرسانة جاهزة، 22 م³', 20240, 'concrete', '2026-10-18', { quantity: 22, unitPrice: 920, unit: 'm3' }),
  exp('e2', 'حديد تسليح 12 ملم', 18500, 'rebar', '2026-10-15', { quantity: 4.3, unitPrice: 4300, unit: 'ton', notes: 'الدفعة الأولى' }),
  exp('e3', 'إسمنت ومونة', 3600, 'cement', '2026-10-12', { quantity: 120, unitPrice: 30, unit: 'sack' }),
  exp('e4', 'أجور عمال صب', 4200, 'labor', '2026-10-19'),
  exp('e5', 'إيجار شدات وسقالات', 2800, 'equipment', '2026-10-10'),
  exp('e6', 'نقل رمل وزلط', 1650, 'transport', '2026-10-08'),
  exp('e7', 'دفعة للكهربائي علي', 4000, 'labor', '2026-09-30', { workerId: elec.id, workerName: elec.name, notes: 'مرحلة التأسيس', createdBy: 'م. أحمد' }),
  exp('e8', 'دفعة للكهربائي علي', 2000, 'labor', '2026-10-14', { workerId: elec.id, workerName: elec.name, createdBy: 'م. أحمد' }),
  exp('e9', 'دفعة للسباك مصطفى (تسوية كاملة)', 14000, 'labor', '2026-10-16', { workerId: plumb.id, workerName: plumb.name }),
  exp('e10', 'رسوم رخصة البناء', 2400, 'permits', '2026-06-12'),
];
const payments: Payment[] = [
  { id: 'p1', invoiceId: 'inv1', clientId: client.id, amount: 60000, paymentMethod: 'bank_transfer', paymentDate: '2026-09-20', createdAt: at, updatedAt: at, createdBy: 'م. أحمد' },
  { id: 'p2', invoiceId: 'inv1', clientId: client.id, amount: 25000, paymentMethod: 'cash', paymentDate: '2026-10-10', notes: 'استلمها المهندس في الموقع', createdAt: at, updatedAt: at, createdBy: 'م. أحمد' },
];
const debts: StandaloneDebt[] = [
  { id: 'd1', clientId: client.id, partyType: 'client', partyName: client.name, description: 'سلفة مواد على الحساب', amount: 8000, paidAmount: 3000, remainingAmount: 5000, status: 'partially_paid', date: '2026-09-28', dueDate: '2026-11-15', createdAt: at, updatedAt: at },
];
const summary = { totalPaid: 85000, totalExpenses: 73390, totalDebts: 5000, totalObligations: 78390, profit: 8908.5, remaining: -2298.5, totalWorkersAgreed: 32000, totalWorkersPaid: 20000, totalWorkersDue: 12000, profitPercentage: 15, profitBase: 'expenses' as const };

const budget = {
  phases: [
    { phase: { id: 'p1', clientId: client.id, name: 'الحفر والأساسات', order: 1, status: 'completed' }, budget: 25000, actual: 25440, variance: -440, pctUsed: 100 },
    { phase: { id: 'p2', clientId: client.id, name: 'الهيكل الخرساني', order: 2, status: 'in_progress' }, budget: 33000, actual: 27950, variance: 5050, pctUsed: 84.7 },
  ] as any,
  categories: [
    { category: 'concrete', label: 'خرسانة', budget: 18000, actual: 20240, variance: -2240, ratio: 112.4, state: 'over' as const },
    { category: 'cement', label: 'أسمنت', budget: 3990, actual: 3600, variance: 390, ratio: 90.2, state: 'near' as const },
    { category: 'labor', label: 'أجور عمالة', budget: 0, actual: 24200, variance: -24200, ratio: null, state: 'unbudgeted' as const },
  ],
};

const milestone = (id: string, order: number, title: string, amount: number, dueDate: string) =>
  ({ id, clientId: client.id, title, amount, dueDate, order, createdAt: at, updatedAt: at }) as PaymentMilestone;
const schedule = buildPaymentSchedule(
  [
    milestone('m1', 1, 'الدفعة الأولى: مقدمة العقد', 60000, '2026-08-15'),
    milestone('m2', 2, 'عند صب الهيكل الخرساني', 40000, '2026-10-01'),
    milestone('m3', 3, 'أعمال التشطيبات', 50000, '2026-12-15'),
  ],
  85000,
  new Date('2026-10-25T09:00:00'),
);

const invoice: Invoice = {
  id: 'inv1', invoiceNumber: 'MK-2026-001', clientId: client.id, items: [{ id: 'a', description: 'أعمال الحفر والأساسات (المرحلة الأولى)', quantity: 1, unitPrice: 60000, total: 60000 }, { id: 'b', description: 'الدفعة الأولى من الهيكل الخرساني', quantity: 1, unitPrice: 50000, total: 50000 }],
  subtotal: 110000, taxRate: 0, taxAmount: 0, total: 110000, status: 'partially_paid', issueDate: '2026-09-15', dueDate: '2026-10-15', notes: 'تُسدَّد الدفعات بالتحويل البنكي أو نقداً في المكتب.', createdAt: at, updatedAt: at,
};
const letter: Letter = {
  id: 'l1', type: 'official', refNumber: 'MK-L-0007', date: '2026-10-24', recipientName: 'السيد خالد المبروك', recipientTitle: 'مالك المشروع', clientId: client.id, subject: 'إشعار بموعد صب سقف الدور الأرضي',
  greeting: 'السلام عليكم ورحمة الله وبركاته،', bodyParagraphs: ['نفيدكم بأن أعمال صب سقف الدور الأرضي ستبدأ يوم الخميس الموافق 29/10/2026، وذلك بعد اعتماد أعمال الحديد والشدات.', 'نرجو التكرم بتأكيد الحضور أو إبداء أي ملاحظات قبل الموعد بيوم.'], closing: 'وتفضلوا بقبول فائق الاحترام،\nإدارة المشروع', signerName: 'م. أحمد', signerTitle: 'مدير المشاريع', showStamp: false, createdAt: at,
};

describe('MAKIN PDF documents', () => {
  const cases: [string, () => ReactElement, number][] = [
    ['expenses.pdf', () => createElement(ExpensesPDF, { client, expenses, total: expenses.reduce((s, e) => s + e.amount, 0) }), 1],
    ['expenses-long.pdf', () => createElement(ExpensesPDF, { client, expenses: Array.from({ length: 4 }, (_, k) => expenses.map((e) => ({ ...e, id: `${e.id}-${k}` }))).flat(), total: 1 }), 2],
    ['payments.pdf', () => createElement(PaymentsPDF, { client, payments, total: 85000 }), 1],
    ['debts.pdf', () => createElement(DebtsPDF, { client, debts, total: 5000 }), 1],
    ['workers.pdf', () => createElement(WorkersPDF, { client, workers: [elec, plumb], expenses }), 2],
    ['worker-statement.pdf', () => createElement(WorkerStatementPDF, { client, entry: buildWorkerLedgers([elec], expenses)[0] }), 1],
    ['full-report.pdf', () => createElement(FullReportPDF, { client, expenses, payments, debts, workers: [elec, plumb], summary, budget, schedule }), 3],
    ['receipt.pdf', () => createElement(ReceiptPDF, { receipt: buildReceipt({ payment: payments[1], number: 'RC-2026-0007', client, invoice, allPayments: payments }) }), 1],
    ['invoice.pdf', () => createElement(InvoicePDF, { invoice, client }), 1],
    ['letter.pdf', () => createElement(LetterPDF, { letter }), 1],
  ];
  for (const [name, make, minPages] of cases) {
    it(`renders ${name} with the logo`, async () => {
      const buffer = await renderToBuffer(withLogo(make()));
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      expect(pageCount(buffer)).toBeGreaterThanOrEqual(minPages);
      save(name, buffer);
    }, 60000);
  }
});
