import type { WorkerLedgerPayment } from './workerLedger';
import { normalizeSearchText } from './clientRecords';

export function filterWorkerPayments(
  payments: readonly WorkerLedgerPayment[],
  search: string,
  from: string,
  to: string,
) {
  const terms = normalizeSearchText(search).split(/\s+/).filter(Boolean);
  return payments.filter((payment) => {
    if ((from || to) && !payment.day) return false;
    if ((from && payment.day < from) || (to && payment.day > to)) return false;
    const text = normalizeSearchText(
      [payment.id, payment.note, payment.recordedBy, payment.day, String(payment.amount)].join(' '),
    );
    return terms.every((term) => text.includes(term));
  });
}
