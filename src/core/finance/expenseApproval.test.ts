import { describe, expect, it } from 'vitest';
import {
  APPROVAL_LABEL,
  REJECTION_REASON_REQUIRED,
  approvalCounts,
  approvalDecision,
  approvalFieldsForNew,
  approvalPatchOnEdit,
  approvalStatusOf,
  expensePhrase,
  matchesApprovalFilter,
  type ApprovalActor,
} from './expenseApproval';

const approver: ApprovalActor = { id: 'u-acc', name: 'المحاسب', canApprove: true };
const field: ApprovalActor = { id: 'u-emp', name: 'سالم', canApprove: false };
const NOW = '2026-10-25T09:00:00.000Z';

describe('expense approval status', () => {
  it('counts a record from before approvals existed as approved', () => {
    expect(approvalStatusOf({})).toBe('approved');
    expect(approvalStatusOf({ approvalStatus: 'pending' })).toBe('pending');
  });

  it('approves an approver\'s own expense on the spot and queues everybody else\'s', () => {
    expect(approvalFieldsForNew(approver, NOW)).toEqual({ approvalStatus: 'approved', reviewedBy: 'u-acc', reviewedByName: 'المحاسب', reviewedAt: NOW });
    expect(approvalFieldsForNew(field, NOW)).toEqual({ approvalStatus: 'pending' });
  });

  it('sends an edited approved or rejected expense back to review, but only when a non-approver edits it', () => {
    const back = approvalPatchOnEdit({ approvalStatus: 'approved' }, field);
    expect(back.approvalStatus).toBe('pending');
    expect(back.reviewedBy).toBeNull();
    expect(back.rejectionReason).toBeNull();
    expect(approvalPatchOnEdit({ approvalStatus: 'rejected' }, field).approvalStatus).toBe('pending');
    expect(approvalPatchOnEdit({}, field).approvalStatus).toBe('pending');
    expect(approvalPatchOnEdit({ approvalStatus: 'pending' }, field)).toEqual({});
    expect(approvalPatchOnEdit({ approvalStatus: 'approved' }, approver)).toEqual({});
  });
});

describe('approval decisions', () => {
  it('records who approved and when, and clears an earlier reason', () => {
    expect(approvalDecision('approved', approver, NOW)).toEqual({ approvalStatus: 'approved', reviewedBy: 'u-acc', reviewedByName: 'المحاسب', reviewedAt: NOW, rejectionReason: null });
  });

  it('refuses a rejection without a reason', () => {
    expect(() => approvalDecision('rejected', approver, NOW)).toThrow(REJECTION_REASON_REQUIRED);
    expect(() => approvalDecision('rejected', approver, NOW, '   ')).toThrow(REJECTION_REASON_REQUIRED);
    expect(approvalDecision('rejected', approver, NOW, ' الفاتورة غير واضحة ').rejectionReason).toBe('الفاتورة غير واضحة');
  });

  it('lets only an approver decide', () => {
    expect(() => approvalDecision('approved', field, NOW)).toThrow('not-allowed');
  });
});

describe('counts and filters', () => {
  const list = [
    { approvalStatus: 'pending' as const, amount: 100.125 },
    { approvalStatus: 'pending' as const, amount: 50.5 },
    { approvalStatus: 'rejected' as const, amount: 20 },
    { approvalStatus: 'approved' as const, amount: 10 },
    { amount: 5 },
  ];

  it('counts each status and totals what is waiting exactly', () => {
    expect(approvalCounts(list)).toEqual({ pending: 2, approved: 2, rejected: 1, pendingAmount: 150.625 });
  });

  it('filters by status, and «all» keeps everything', () => {
    expect(list.filter((e) => matchesApprovalFilter(e, 'pending'))).toHaveLength(2);
    expect(list.filter((e) => matchesApprovalFilter(e, 'rejected'))).toHaveLength(1);
    expect(list.filter((e) => matchesApprovalFilter(e, 'all'))).toHaveLength(5);
  });

  it('has an Arabic label for every status', () => {
    expect(Object.values(APPROVAL_LABEL).every(Boolean)).toBe(true);
  });
});

describe('expense phrase', () => {
  it('counts the Arabic way, with an agreeing adjective', () => {
    expect(expensePhrase(1)).toBe('مصروف واحد');
    expect(expensePhrase(2)).toBe('مصروفان');
    expect(expensePhrase(5)).toBe('5 مصروفات');
    expect(expensePhrase(11)).toBe('11 مصروفاً');
    const rejected = { one: 'مرفوض', two: 'مرفوضان', few: 'مرفوضة', many: 'مرفوضاً' };
    expect(expensePhrase(2, rejected)).toBe('مصروفان مرفوضان');
    expect(expensePhrase(7, rejected)).toBe('7 مصروفات مرفوضة');
  });
});
