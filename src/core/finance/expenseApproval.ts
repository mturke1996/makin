import type { Expense, ExpenseApprovalStatus } from '../../types';
import { sumMoney } from './money';

/**
 * Expense approval. A field employee records an expense and it waits for someone who may edit all
 * expenses to approve it; what such a person records themselves is approved on the spot.
 *
 * An expense is real money out whatever its status, so every status stays counted in the account.
 * «Rejected» means "returned for correction": it keeps showing, with the reason, until the person who
 * recorded it fixes it (which sends it back to review) or someone deletes it.
 */

export const APPROVAL_LABEL: Record<ExpenseApprovalStatus, string> = {
  pending: 'بانتظار الاعتماد',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

/** Records made before approvals existed carry no status; they count as approved so no old data floods the queue. */
export const approvalStatusOf = (expense: Pick<Expense, 'approvalStatus'>): ExpenseApprovalStatus =>
  expense.approvalStatus ?? 'approved';

export const isAwaitingApproval = (expense: Pick<Expense, 'approvalStatus'>) => approvalStatusOf(expense) === 'pending';
export const isRejected = (expense: Pick<Expense, 'approvalStatus'>) => approvalStatusOf(expense) === 'rejected';

/** Who is acting, reduced to what approval needs. `canApprove` is the `expenses.edit.all` permission. */
export interface ApprovalActor {
  id: string;
  name: string;
  canApprove: boolean;
}

/** The fields a new expense carries: approved on the spot for an approver, otherwise waiting. */
export function approvalFieldsForNew(actor: ApprovalActor, createdAt: string): Pick<Expense, 'approvalStatus' | 'reviewedBy' | 'reviewedByName' | 'reviewedAt'> {
  return actor.canApprove
    ? { approvalStatus: 'approved', reviewedBy: actor.id, reviewedByName: actor.name, reviewedAt: createdAt }
    : { approvalStatus: 'pending' };
}

/** A removed field is cleared with null: Firestore strips undefined, and the rules read null as absent. */
const cleared = null as unknown as undefined;

/**
 * What an edit does to the status. An approver's edit keeps it. Anyone else changing an approved or
 * rejected expense sends it back to review, because the figure that was approved is no longer the one saved.
 */
export function approvalPatchOnEdit(existing: Pick<Expense, 'approvalStatus'>, actor: ApprovalActor): Partial<Expense> {
  if (actor.canApprove) return {};
  if (approvalStatusOf(existing) === 'pending' && existing.approvalStatus === 'pending') return {};
  return { approvalStatus: 'pending', reviewedBy: cleared, reviewedByName: cleared, reviewedAt: cleared, rejectionReason: cleared };
}

export const REJECTION_REASON_REQUIRED = 'اكتب سبب الرفض ليعرف مُسجّل المصروف ما يصحّحه.';

/** The fields of an approver's decision. A rejection must say why. */
export function approvalDecision(
  decision: 'approved' | 'rejected',
  actor: ApprovalActor,
  nowIso: string,
  reason?: string,
): Partial<Expense> {
  if (!actor.canApprove) throw new Error('not-allowed');
  const base = { approvalStatus: decision, reviewedBy: actor.id, reviewedByName: actor.name, reviewedAt: nowIso };
  if (decision === 'approved') return { ...base, rejectionReason: cleared };
  const why = (reason ?? '').trim();
  if (!why) throw new Error(REJECTION_REASON_REQUIRED);
  return { ...base, rejectionReason: why };
}

export interface ApprovalCounts {
  pending: number;
  approved: number;
  rejected: number;
  /** What is waiting, in dinars. */
  pendingAmount: number;
}

export function approvalCounts(expenses: readonly Pick<Expense, 'approvalStatus' | 'amount'>[]): ApprovalCounts {
  const counts: ApprovalCounts = { pending: 0, approved: 0, rejected: 0, pendingAmount: 0 };
  const waiting: number[] = [];
  for (const e of expenses) {
    const status = approvalStatusOf(e);
    counts[status] += 1;
    if (status === 'pending') waiting.push(e.amount);
  }
  counts.pendingAmount = sumMoney(waiting);
  return counts;
}

export type ApprovalFilter = 'all' | 'pending' | 'rejected';

export const matchesApprovalFilter = (expense: Pick<Expense, 'approvalStatus'>, filter: ApprovalFilter) =>
  filter === 'all' || approvalStatusOf(expense) === filter;

/** «مصروف واحد، مصروفان، 3 مصروفات، 11 مصروفاً»; an adjective takes the matching forms when given. */
export function expensePhrase(n: number, adjective?: { one: string; two: string; few: string; many: string }): string {
  const noun = n === 1 ? 'مصروف واحد' : n === 2 ? 'مصروفان' : n <= 10 ? `${n} مصروفات` : `${n} مصروفاً`;
  if (!adjective) return noun;
  return `${noun} ${n === 1 ? adjective.one : n === 2 ? adjective.two : n <= 10 ? adjective.few : adjective.many}`;
}
