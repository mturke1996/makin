import { buildWorkerLedgers } from './workerLedger';
import { normalizeSearchText } from './clientRecords';
import type { Client, Expense, Worker } from '../../types';

export function buildWorkforce(
  workers: readonly Worker[],
  expenses: readonly Expense[],
  clients: readonly Client[],
) {
  const names = new Map(clients.map((client) => [client.id, client.name]));
  return buildWorkerLedgers(workers, expenses).map((entry) => ({
    ...entry,
    clientName: names.get(entry.worker.clientId) ?? 'مشروع غير متاح',
    clientAvailable: names.has(entry.worker.clientId),
  }));
}
export type WorkforceEntry = ReturnType<typeof buildWorkforce>[number];
export type WorkforceFilter =
  | 'owed'
  | 'current'
  | 'settled'
  | 'overpaid'
  | 'archived'
  | 'all';
export function filterWorkforce(
  entries: readonly WorkforceEntry[],
  filter: WorkforceFilter,
  clientId: string,
  query: string,
) {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  return entries
    .filter(({ worker, ledger, clientName }) => {
      if (clientId && worker.clientId !== clientId) return false;
      if (filter === 'owed' && ledger.remaining <= 0) return false;
      if (filter === 'current' && worker.archivedAt) return false;
      if (filter === 'settled' && ledger.status !== 'settled') return false;
      if (filter === 'overpaid' && ledger.overpaidBy <= 0) return false;
      if (filter === 'archived' && !worker.archivedAt) return false;
      const text = normalizeSearchText(
        [worker.name, worker.jobType, worker.phone, clientName]
          .filter(Boolean)
          .join(' '),
      );
      return terms.every((term) => text.includes(term));
    })
    .sort(
      (a, b) =>
        b.ledger.remaining - a.ledger.remaining ||
        a.worker.name.localeCompare(b.worker.name, 'ar'),
    );
}
