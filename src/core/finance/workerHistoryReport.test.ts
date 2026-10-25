import { describe, expect, it } from 'vitest';
import type { Expense, Worker } from '../../types';
import { agreementRevision, revisedAgreementHistory } from './workerLedgerHistory';
import { buildWorkerLedger, buildWorkerLedgers, summarizeWorkerLedgers } from './workerLedger';
import { buildWorkerStatement, workerWorkLabel } from '../../features/pdf/workerReportModel';
import { filterWorkerEntries } from '../../ui/pages-legacy/client-profile/workers/workerListModel';
const at = '2026-10-01T10:00:00.000Z';
const worker: Worker = { id: 'w1', clientId: 'c1', name: 'أحمد', jobType: 'سباكة', totalAmount: 100, paidAmount: 0, remainingAmount: 100, status: 'active', createdAt: at, updatedAt: at };
const meta = { recordedAt: '2026-10-10T10:00:00.000Z', recordedBy: 'admin', recordedByName: 'مدير', reason: 'زيادة نطاق العمل' };
const payment = (id: string, amount: number, day: string, recorded = day + 'T12:00:00.000Z'): Expense => ({ id, clientId: 'c1', workerId: 'w1', amount, category: 'labor', description: 'دفعة', date: day, isClosed: false, createdAt: recorded, updatedAt: recorded });

describe('worker agreement revisions and statements', () => {
  it('records a legacy opening without inventing its agreement date', () => {
    const history = revisedAgreementHistory(worker, { totalAmount: 150 }, meta, 'revision');
    expect(history.map(r => [r.kind, r.totalAmount])).toEqual([['baseline', 100], ['revised', 150]]);
    expect(history[0].recordedAt).toBe(meta.recordedAt);
    expect(worker.agreementHistory).toBeUndefined();
    expect(revisedAgreementHistory(worker, worker, meta, 'unchanged')).toEqual([]);
  });
  it('keeps old payment balances on the recorded agreement and uses the revision for later ones', () => {
    const first = agreementRevision(worker, { ...meta, recordedAt: at }, 'created', 'first');
    const history = revisedAgreementHistory({ ...worker, agreementHistory: [first] }, { totalAmount: 150 }, meta, 'next');
    const ledger = buildWorkerLedger({ ...worker, totalAmount: 150, agreementHistory: history }, [payment('a', 30, '2026-10-02'), payment('b', 20, '2026-10-12')]);
    expect(ledger.payments.map(p => p.remainingAfter)).toEqual([70, 100]);
    expect(ledger.remaining).toBe(100);
    const report = buildWorkerStatement({ worker, ledger }, { from: '2026-10-10', to: '2026-10-20' });
    expect(report.openingPaid).toBe(30); expect(report.periodPaid).toBe(20); expect(report.closingPaid).toBe(50);
    expect(report.payments.map(p => p.id)).toEqual(['b']);
    expect(() => buildWorkerStatement({ worker, ledger }, { from: '2026-12-01', to: '2026-10-01' })).toThrow();
  });
  it('retains archived debts without netting an overpayment against another worker', () => {
    const archived = { ...worker, archivedAt: at, status: 'completed' as const };
    const other = { ...worker, id: 'w2', name: 'خالد' };
    const entries = buildWorkerLedgers([archived, other], [payment('a', 30, '2026-10-02'), { ...payment('b', 120, '2026-10-03'), workerId: 'w2' }]);
    const totals = summarizeWorkerLedgers(entries.map(e => e.ledger));
    expect(totals.owed).toBe(70); expect(totals.overpaid).toBe(20); expect(totals.remaining).toBe(50);
    expect(filterWorkerEntries(entries, 'owed').map(e => e.worker.id)).toEqual(['w1']);
    expect(filterWorkerEntries(entries, 'current').map(e => e.worker.id)).toEqual(['w2']);
    expect(filterWorkerEntries(entries, 'all', 'احمد سباك')).toHaveLength(1);
    expect(workerWorkLabel(archived)).toContain('العمل مكتمل');
    expect(workerWorkLabel(archived)).not.toContain('مسدد');
  });
});
