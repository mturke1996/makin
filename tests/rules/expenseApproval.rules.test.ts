import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createEnv, dbFor, type PersonaName } from './helpers';

let env: RulesTestEnvironment;
beforeAll(async () => { env = await createEnv('demo-saas-expense-approval'); });
afterAll(async () => { await env.cleanup(); });

const base = { clientId: 'c1', amount: 10, isClosed: false, date: '2026-10-25' };
const seed = (id: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'expenses', id), { ...base, ...data }));
const write = (who: PersonaName, id: string, data: Record<string, unknown>) => setDoc(doc(dbFor(env, who), 'expenses', id), { ...base, ...data });
const patch = (who: PersonaName, id: string, data: Record<string, unknown>) => updateDoc(doc(dbFor(env, who), 'expenses', id), data);
const stored = async (id: string) => (await getDoc(doc(dbFor(env, 'admin'), 'expenses', id))).data();

const approved = (uid: string) => ({ approvalStatus: 'approved', reviewedBy: uid, reviewedByName: 'x', reviewedAt: '2026-10-25T10:00:00Z' });
const rejected = (uid: string, reason?: string) => ({ approvalStatus: 'rejected', reviewedBy: uid, reviewedByName: 'x', reviewedAt: '2026-10-25T10:00:00Z', ...(reason ? { rejectionReason: reason } : {}) });

describe('recording an expense', () => {
  it('lets an employee record one only as waiting for review', async () => {
    await assertSucceeds(write('field', 'new-pending', { userId: 'u-field', approvalStatus: 'pending' }));
    await assertFails(write('field', 'new-no-status', { userId: 'u-field' })); // a missing status would read as approved
    await assertFails(write('field', 'new-approved', { userId: 'u-field', ...approved('u-field') }));
    await assertFails(write('field', 'new-approved-by-other', { userId: 'u-field', ...approved('u-acct') }));
    await assertFails(write('field', 'new-reviewer', { userId: 'u-field', approvalStatus: 'pending', reviewedBy: 'u-acct' }));
  });

  it('lets an approver record one approved under their own name, or leave it waiting', async () => {
    await assertSucceeds(write('accountant', 'acc-approved', { userId: 'u-acct', ...approved('u-acct') }));
    await assertSucceeds(write('accountant', 'acc-pending', { userId: 'u-acct', approvalStatus: 'pending' }));
    await assertSucceeds(write('admin', 'admin-approved', { userId: 'u-admin', ...approved('u-admin') }));
    await assertFails(write('accountant', 'acc-forged', { userId: 'u-acct', ...approved('u-admin') })); // a decision carries the decider's own uid
    await assertFails(write('accountant', 'acc-bad-status', { userId: 'u-acct', approvalStatus: 'whatever' }));
    await assertFails(write('accountant', 'acc-reject-no-reason', { userId: 'u-acct', ...rejected('u-acct') }));
  });
});

describe('deciding', () => {
  it('lets an approver approve or reject a colleague\'s waiting expense, and a rejection needs a reason', async () => {
    await seed('w1', { userId: 'u-field', approvalStatus: 'pending' });
    await assertSucceeds(patch('accountant', 'w1', approved('u-acct')));
    await seed('w2', { userId: 'u-field', approvalStatus: 'pending' });
    await assertFails(patch('accountant', 'w2', rejected('u-acct')));
    await assertSucceeds(patch('accountant', 'w2', rejected('u-acct', 'الفاتورة غير واضحة')));
    expect((await stored('w2'))?.rejectionReason).toBe('الفاتورة غير واضحة');
  });

  it('refuses a decision in somebody else\'s name', async () => {
    await seed('w3', { userId: 'u-field', approvalStatus: 'pending' });
    await assertFails(patch('accountant', 'w3', approved('u-admin')));
    expect((await stored('w3'))?.approvalStatus).toBe('pending');
  });

  it('keeps people who only view or only record from deciding', async () => {
    await seed('w4', { userId: 'u-field', approvalStatus: 'pending' });
    await assertFails(patch('viewer', 'w4', approved('u-viewer')));
    await assertFails(patch('field', 'w4', approved('u-field'))); // not even their own
    await assertFails(patch('field2', 'w4', approved('u-field2')));
    await assertFails(patch('supervisor', 'w4', approved('u-super')));
    expect((await stored('w4'))?.approvalStatus).toBe('pending');
  });

  it('lets an approver edit an already approved expense without disturbing who approved it', async () => {
    await seed('w5', { userId: 'u-field', ...approved('u-admin') });
    await assertSucceeds(patch('accountant', 'w5', { notes: 'تصحيح ملاحظة' }));
    expect((await stored('w5'))?.reviewedBy).toBe('u-admin');
  });

  it('freezes the decision on a closed expense', async () => {
    await seed('w6', { userId: 'u-field', approvalStatus: 'pending', isClosed: true });
    await assertFails(patch('accountant', 'w6', approved('u-acct')));
  });
});

describe('editing an approved expense', () => {
  it('lets the owner change it only by sending it back to review', async () => {
    await seed('o1', { userId: 'u-field', ...approved('u-acct') });
    await assertFails(patch('field', 'o1', { amount: 999 })); // quietly keeping the approval
    await assertFails(patch('field', 'o1', { amount: 999, approvalStatus: 'approved' }));
    await assertFails(patch('field', 'o1', { amount: 999, approvalStatus: 'pending' })); // the old reviewer is still on it
    await assertSucceeds(patch('field', 'o1', { amount: 999, approvalStatus: 'pending', reviewedBy: null, reviewedByName: null, reviewedAt: null, rejectionReason: null }));
    expect((await stored('o1'))?.amount).toBe(999);
  });

  it('lets the owner correct a rejected expense, which goes back to review', async () => {
    await seed('o2', { userId: 'u-field', ...rejected('u-acct', 'ناقص') });
    await assertSucceeds(patch('field', 'o2', { amount: 12, approvalStatus: 'pending', reviewedBy: null, reviewedByName: null, reviewedAt: null, rejectionReason: null }));
  });

  it('needs the same step for a record from before approvals existed', async () => {
    await seed('o3', { userId: 'u-field' });
    await assertFails(patch('field', 'o3', { amount: 5 }));
    await assertSucceeds(patch('field', 'o3', { amount: 5, approvalStatus: 'pending' }));
  });
});

