import type { Worker, WorkerAgreementItem, WorkerAgreementRevision } from '../../types';
import { fromMilli, toMilli } from './money';

type Agreement = Pick<Worker, 'totalAmount' | 'agreementItems'>;
type RevisionMeta = Pick<WorkerAgreementRevision, 'recordedAt' | 'recordedBy' | 'recordedByName' | 'reason'>;

function cleanItems(items?: readonly WorkerAgreementItem[]): WorkerAgreementItem[] {
  return (items ?? []).map((item) => ({
    id: item.id, title: item.title.trim(), quantity: fromMilli(toMilli(item.quantity)), unitPrice: fromMilli(toMilli(item.unitPrice)),
    ...(item.unit?.trim() ? { unit: item.unit.trim() } : {}),
    ...(item.note?.trim() ? { note: item.note.trim() } : {}),
  }));
}

/** Compare financial terms and line descriptions, not metadata or field ordering. */
export function workerAgreementChanged(before: Agreement, after: Agreement): boolean {
  return toMilli(before.totalAmount) !== toMilli(after.totalAmount)
    || JSON.stringify(cleanItems(before.agreementItems)) !== JSON.stringify(cleanItems(after.agreementItems));
}

export function agreementRevision(
  agreement: Agreement, meta: RevisionMeta, kind: WorkerAgreementRevision['kind'], id: string,
): WorkerAgreementRevision {
  return { id, kind, ...meta, totalAmount: fromMilli(toMilli(agreement.totalAmount)), agreementItems: cleanItems(agreement.agreementItems) };
}

/** A first edit of a legacy worker records what exists now; it never invents an older timeline. */
export function revisedAgreementHistory(worker: Worker, next: Agreement, meta: RevisionMeta, revisionId: string): WorkerAgreementRevision[] {
  const history = [...(worker.agreementHistory ?? [])];
  if (!workerAgreementChanged(worker, next)) return history;
  if (history.length === 0) {
    history.push(agreementRevision(worker, { ...meta, reason: 'الاتفاق الموجود عند بدء توثيق السجل، تاريخ الاتفاق الأصلي غير موثق' }, 'baseline', `${revisionId}-opening`));
  }
  history.push(agreementRevision(next, meta, 'revised', revisionId));
  return history;
}

export type AgreementBalanceBasis = 'recorded' | 'opening' | 'current';

/** Date of recording is the event date; backdated payment dates do not rewrite saved agreement history. */
export function agreementForPayment(worker: Worker, recordedAt: string, currentAgreed: number): { agreed: number; basis: AgreementBalanceBasis } {
  const revisions = [...(worker.agreementHistory ?? [])].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const at = Date.parse(recordedAt);
  if (revisions.length === 0 || !Number.isFinite(at)) return { agreed: currentAgreed, basis: 'current' };
  const known = revisions.filter((revision) => revision.kind !== 'baseline' && Date.parse(revision.recordedAt) <= at);
  const revision = known[known.length - 1];
  if (revision) return { agreed: revision.totalAmount, basis: 'recorded' };
  const baseline = revisions.find((entry) => entry.kind === 'baseline');
  return baseline ? { agreed: baseline.totalAmount, basis: 'opening' } : { agreed: currentAgreed, basis: 'current' };
}
