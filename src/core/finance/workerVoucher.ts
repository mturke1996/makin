import type { Worker } from '../../types';
import { amountInWords } from './amountInWords';
import type { WorkerLedger, WorkerLedgerPayment } from './workerLedger';
import { workerProgressView, type WorkerProgressView } from './workerProgress';

/**
 * The payment voucher a worker signs when he is paid (إيصال صرف): who, how much in figures and in words, whether it is
 * an advance or a payment on account, what remains of his agreement, and what the approved progress says about it.
 * It has no sequential number (those belong to receipts for money coming in): its reference is made of the
 * payment's own date and id, so it is the same every time it is printed.
 */
export interface WorkerVoucherData {
  ref: string;
  date: string;
  workerName: string;
  jobType?: string;
  phone?: string;
  nationalId?: string;
  projectName: string;
  amount: number;
  amountWords: string;
  isAdvance: boolean;
  note?: string;
  /** Paid to him up to and including this payment. */
  paidThrough: number;
  agreed: number;
  /** Left of the agreement after this payment (negative: paid beyond it). */
  remainingAfter: number;
  /** Approved progress as it stands now, when there is one. */
  progress?: WorkerProgressView;
  recordedBy: string;
  qr: string;
}

const compactDay = (day: string) => day.replace(/-/g, '');

export function workerVoucherRef(payment: Pick<WorkerLedgerPayment, 'id' | 'day'>): string {
  return `MK-WPV-${compactDay(payment.day || '00000000')}-${payment.id.slice(-4).toUpperCase()}`;
}

export function buildWorkerVoucher(args: {
  payment: WorkerLedgerPayment;
  worker: Pick<Worker, 'name' | 'jobType' | 'phone' | 'nationalId' | 'workProgressPercent'>;
  ledger: Pick<WorkerLedger, 'agreed' | 'paid'>;
  projectName: string;
  /** Total of the worker's advances, for the progress line. */
  advances?: number;
}): WorkerVoucherData {
  const { payment, worker, ledger, projectName, advances } = args;
  const ref = workerVoucherRef(payment);
  const progress = worker.workProgressPercent == null
    ? undefined
    : workerProgressView({ agreed: ledger.agreed, paid: ledger.paid, percent: worker.workProgressPercent, advances });
  return {
    ref,
    date: payment.day,
    workerName: worker.name,
    jobType: worker.jobType || undefined,
    phone: worker.phone || undefined,
    nationalId: worker.nationalId || undefined,
    projectName,
    amount: payment.amount,
    amountWords: amountInWords(payment.amount),
    isAdvance: !!payment.expense.isWorkerAdvance,
    note: payment.note || undefined,
    paidThrough: payment.cumulativePaid,
    agreed: payment.agreedAtPayment,
    remainingAfter: payment.remainingAfter,
    progress,
    recordedBy: payment.recordedBy,
    qr: ['MAKIN', 'WPV', ref, payment.amount.toFixed(3), payment.day].join('|'),
  };
}
