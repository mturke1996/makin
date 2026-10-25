import { subtractMoney, sumMoney, type WorkerLedger } from '../../core/finance/workerLedger';
import type { Worker } from '../../types';

export interface WorkerReportPeriod { from?: string; to?: string }
export interface WorkerReportEntry { worker: Worker; ledger: WorkerLedger }

export function workerWorkLabel(worker: Worker): string {
  return `${worker.status === 'completed' ? 'العمل مكتمل' : 'العمل جارٍ'}${worker.archivedAt ? '، مؤرشف' : ''}`;
}

export function workerAccountLabel(ledger: WorkerLedger): string {
  return ledger.status === 'settled' ? 'مسدد بالكامل' : ledger.status === 'overpaid' ? 'زيادة مدفوعة' : ledger.status === 'not_started' ? 'لم تبدأ الدفعات' : 'متبقٍ مستحق';
}

/** Export uses the same calculated ledger as the screen. Worker payments remain expense records only. */
export function buildWorkerStatement(entry: WorkerReportEntry, period: WorkerReportPeriod = {}) {
  const { worker, ledger } = entry;
  if (period.from && period.to && period.from > period.to) throw new Error('invalid-worker-report-period');
  const scoped = !!(period.from || period.to);
  const payments = ledger.payments.filter((payment) => !scoped || (!!payment.day && (!period.from || payment.day >= period.from) && (!period.to || payment.day <= period.to)));
  const before = period.from ? ledger.payments.filter((payment) => payment.day && payment.day < period.from!) : [];
  const openingPaid = sumMoney(before.map((payment) => payment.amount));
  const periodPaid = sumMoney(payments.map((payment) => payment.amount));
  const closingPaid = sumMoney([openingPaid, periodPaid]);
  return {
    worker, ledger, period, scoped, payments, openingPaid, periodPaid, closingPaid,
    unknownDatePayments: scoped ? ledger.payments.filter((payment) => !payment.day).length : 0,
    workLabel: workerWorkLabel(worker), accountLabel: workerAccountLabel(ledger),
    agreementRows: ledger.lines.map((line) => ({ title: line.title, quantity: line.quantity, unit: line.unit ?? '', unitPrice: line.unitPrice, total: line.total, note: line.note ?? '' })),
    revisions: (worker.agreementHistory ?? []).map((revision, index, history) => ({ ...revision, change: index > 0 ? subtractMoney(revision.totalAmount, history[index - 1].totalAmount) : 0 })),
  };
}

export function workerSummaryRow({ worker, ledger }: WorkerReportEntry) {
  return { job: worker.jobType || 'عامل / مقاول', name: worker.name, work: workerWorkLabel(worker), account: workerAccountLabel(ledger), agreed: ledger.agreed, paid: ledger.paid, due: Math.max(0, ledger.remaining), overpaid: ledger.overpaidBy };
}
