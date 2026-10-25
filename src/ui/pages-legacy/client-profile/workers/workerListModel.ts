import type { WorkerEntry } from './types';
import { normalizeSearchText } from '../../../../core/finance/clientRecords';

export type WorkerFilter = 'current' | 'owed' | 'settled' | 'overpaid' | 'completed' | 'archived' | 'all';

export function filterWorkerEntries(entries: readonly WorkerEntry[], filter: WorkerFilter, query = ''): WorkerEntry[] {
  const words = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  return entries.filter(({ worker, ledger }) => {
    const archived = !!worker.archivedAt;
    if (filter === 'current' && archived) return false;
    if (filter === 'archived' && !archived) return false;
    // Financial filters include archived obligations so an unpaid archive cannot conceal a debt.
    if (filter === 'owed' && ledger.remaining <= 0) return false;
    if (filter === 'settled' && ledger.status !== 'settled') return false;
    if (filter === 'overpaid' && ledger.overpaidBy <= 0) return false;
    if (filter === 'completed' && (worker.status !== 'completed' || archived)) return false;
    const haystack = normalizeSearchText([worker.name, worker.jobType, worker.phone, worker.notes].filter(Boolean).join(' '));
    return words.every((word) => haystack.includes(word));
  }).sort((a, b) => {
    const rank = (entry: WorkerEntry) => entry.ledger.remaining > 0 ? 0 : entry.ledger.overpaidBy > 0 ? 1 : 2;
    return rank(a) - rank(b) || b.ledger.remaining - a.ledger.remaining || a.worker.name.localeCompare(b.worker.name, 'ar') || a.worker.id.localeCompare(b.worker.id);
  });
}
