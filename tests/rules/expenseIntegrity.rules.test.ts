import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createEnv, dbFor } from './helpers';
import { createExpenseInvoiceAtomic, deleteExpenseInvoiceAtomic } from '../../src/services/expenseInvoiceTransactions';
import { addExpenseConfirmedOnce } from '../../src/services/expenseTransactions';
import type { Expense } from '../../src/types';

let env: RulesTestEnvironment;
beforeAll(async () => { env = await createEnv('demo-saas-expense-integrity'); });
afterAll(async () => { await env.cleanup(); });

function expense(id: string, extra: Partial<Expense> = {}): Expense {
  return {
    id, clientId: 'c1', userId: 'u-field', description: 'مواد بناء', category: 'materials', amount: 10,
    date: '2026-10-24', isClosed: false, createdAt: '2026-10-24T10:00:00Z', updatedAt: '2026-10-24T10:00:00Z',
    // Anybody may record an expense waiting for review; only an approver may write another status.
    approvalStatus: 'pending',
    ...extra,
  };
}
async function seedExpense(id: string, extra: Partial<Expense> = {}) {
  const value = expense(id, extra);
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'expenses', id), value));
  return value;
}
const input = (id: string, expenseIds: string[]) => ({ id, expenseIds, clientId: 'c1', invoiceNumber: id, createdBy: 'المحاسب' });
const saved = (path: string, id: string) => getDoc(doc(dbFor(env, 'admin'), path, id));

describe('expense financial boundaries', () => {
  for (const [label, value] of Object.entries({ negative: -1, zero: 0, tooSmall: 0.0001, tooLarge: 1_000_000_001, string: '10', null: null, nan: NaN, infinity: Infinity })) {
    it(`rejects ${label} on create and update, including edit-all`, async () => {
      const id = `amount-${label}`;
      await seedExpense(id);
      for (const who of ['field', 'admin'] as const) {
        await assertFails(setDoc(doc(dbFor(env, who), 'expenses', `${id}-${who}`), { ...expense(id), amount: value }));
        await assertFails(updateDoc(doc(dbFor(env, who), 'expenses', id), { amount: value }));
      }
      expect((await saved('expenses', id)).data()?.amount).toBe(10);
    });
  }

  it('requires an existing client and allows the minimum currency precision', async () => {
    const db = dbFor(env, 'field');
    await assertSucceeds(setDoc(doc(db, 'expenses', 'minimum'), expense('minimum', { amount: 0.001 })));
    await assertFails(setDoc(doc(db, 'expenses', 'client-missing'), expense('client-missing', { clientId: 'missing' })));
    await assertFails(setDoc(doc(db, 'expenses', 'client-empty'), expense('client-empty', { clientId: '' })));
    await assertFails(setDoc(doc(db, 'expenses', 'client-absent'), { amount: 1, userId: 'u-field' }));
  });

  it('preserves orphaned historical notes maintenance but requires valid data for a money correction', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'expenses', 'orphan'), { amount: -2, notes: 'قديم' }));
    await assertSucceeds(updateDoc(doc(dbFor(env, 'admin'), 'expenses', 'orphan'), { notes: 'سجل تاريخي' }));
    await assertFails(updateDoc(doc(dbFor(env, 'admin'), 'expenses', 'orphan'), { amount: 2 }));
    await assertSucceeds(updateDoc(doc(dbFor(env, 'admin'), 'expenses', 'orphan'), { amount: 2, clientId: 'c1' }));
  });
});

describe('worker payment linking', () => {
  it('requires worker management when deleting a worker payment, even when owned', async () => {
    await seedExpense('worker-delete-owned', { workerId: 'w1' });
    await assertFails(deleteDoc(doc(dbFor(env, 'field'), 'expenses', 'worker-delete-owned')));
    expect((await saved('expenses', 'worker-delete-owned')).exists()).toBe(true);
    await assertSucceeds(deleteDoc(doc(dbFor(env, 'admin'), 'expenses', 'worker-delete-owned')));
  });
  it('requires workers.manage even from an expense owner or an expense editor', async () => {
    for (const [who, uid] of [['field', 'u-field'], ['accountant', 'u-acct']] as const) {
      await assertFails(setDoc(doc(dbFor(env, who), 'expenses', `worker-no-${who}`), expense(`worker-no-${who}`, { userId: uid, workerId: 'w1' })));
    }
    await assertSucceeds(setDoc(doc(dbFor(env, 'supervisor'), 'expenses', 'worker-valid'), expense('worker-valid', { userId: 'u-super', workerId: 'w1' })));
  });

  it('rejects a nonexistent worker and a worker from another client, including for admins', async () => {
    for (const who of ['supervisor', 'admin'] as const) {
      await assertFails(setDoc(doc(dbFor(env, who), 'expenses', `worker-cross-${who}`), expense(`worker-cross-${who}`, { userId: 'u-super', workerId: 'w1', clientId: 'c2' })));
      await assertFails(setDoc(doc(dbFor(env, who), 'expenses', `worker-missing-${who}`), expense(`worker-missing-${who}`, { userId: 'u-super', workerId: 'missing' })));
    }
  });

  it('refuses attaching, detaching or moving a worker payment without worker rights', async () => {
    await seedExpense('worker-edit');
    await assertFails(updateDoc(doc(dbFor(env, 'field'), 'expenses', 'worker-edit'), { workerId: 'w1' }));
    await seedExpense('worker-owned', { workerId: 'w1' });
    await assertFails(updateDoc(doc(dbFor(env, 'field'), 'expenses', 'worker-owned'), { workerId: '' }));
    await assertFails(updateDoc(doc(dbFor(env, 'accountant'), 'expenses', 'worker-owned'), { amount: 20 }));
    await assertFails(updateDoc(doc(dbFor(env, 'admin'), 'expenses', 'worker-owned'), { clientId: 'c2' }));
    await assertSucceeds(updateDoc(doc(dbFor(env, 'admin'), 'expenses', 'worker-owned'), { amount: 20 }));
  });

  it('retains every prior agreement revision when history is appended', async () => {
    const revision = { id: 'baseline', totalAmount: 100, recordedAt: '2026-10-01' };
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'workers', 'history'), { clientId: 'c1', agreementHistory: [revision] }));
    const ref = doc(dbFor(env, 'supervisor'), 'workers', 'history');
    await assertFails(updateDoc(ref, { agreementHistory: [] }));
    await assertFails(updateDoc(ref, { agreementHistory: [{ ...revision, totalAmount: 1 }] }));
    await assertSucceeds(updateDoc(ref, { agreementHistory: [revision, { id: 'next', totalAmount: 200 }] }));
    await assertFails(updateDoc(ref, { agreementHistory: [revision, { id: 'stale', totalAmount: 300 }] }));
  });
});

describe('idempotent expense submission', () => {
  it('allows confirming a missing operation without exposing a colleague expense', async () => {
    await assertSucceeds(getDoc(doc(dbFor(env, 'field'), 'expenses', 'not-submitted')));
    await assertFails(getDoc(doc(dbFor(env, 'field'), 'expenses', 'e-field2')));
  });

  it('creates one record on simultaneous retries and rejects a different same-id payload', async () => {
    const db = dbFor(env, 'field');
    const record = expense('retry-once');
    await Promise.all([addExpenseConfirmedOnce(db, record), addExpenseConfirmedOnce(db, record)]);
    expect((await saved('expenses', record.id)).data()?.amount).toBe(record.amount);
    await expect(addExpenseConfirmedOnce(db, { ...record, amount: 100 })).rejects.toThrow('ببيانات مختلفة');
    expect((await saved('expenses', record.id)).data()?.amount).toBe(record.amount);
  });

  it('settles a saved operation after invoice closure without overwriting its closed state', async () => {
    const record = await seedExpense('retry-after-close');
    await createExpenseInvoiceAtomic(dbFor(env, 'accountant'), input('retry-invoice', [record.id]));
    await addExpenseConfirmedOnce(dbFor(env, 'field'), record);
    const existing = (await saved('expenses', record.id)).data();
    expect(existing?.isClosed).toBe(true);
    expect(existing?.expenseInvoiceId).toBe('retry-invoice');
  });
});

describe('atomic expense invoice lifecycle', () => {
  it('sums server amounts exactly and closes/reopens all sources in the same commit', async () => {
    await seedExpense('exact-a', { amount: 0.1 });
    await seedExpense('exact-b', { amount: 0.2 });
    const db = dbFor(env, 'accountant');
    const invoice = await createExpenseInvoiceAtomic(db, input('exact-invoice', ['exact-a', 'exact-b']));
    expect(invoice.totalAmount).toBe(0.3);
    expect(invoice.expenses.map((record) => record.amount)).toEqual([0.1, 0.2]);
    expect((await saved('expenses', 'exact-a')).data()?.expenseInvoiceId).toBe(invoice.id);
    expect((await saved('expenses', 'exact-b')).data()?.isClosed).toBe(true);
    await assertFails(updateDoc(doc(db, 'expenses', 'exact-a'), { isClosed: false, amount: 999 }));
    await assertFails(updateDoc(doc(db, 'expenses', 'exact-a'), { isClosed: false })); // invoice still exists
    await deleteExpenseInvoiceAtomic(db, invoice.id);
    expect((await saved('expense_invoices', invoice.id)).exists()).toBe(false);
    for (const id of ['exact-a', 'exact-b']) {
      const record = (await saved('expenses', id)).data();
      expect(record?.isClosed).toBe(false);
      expect(record).not.toHaveProperty('expenseInvoiceId');
      expect(record).not.toHaveProperty('closedAt');
    }
  });

  it('refuses standalone closure or reopen-and-edit even for an expense editor', async () => {
    await seedExpense('lock-guard');
    const ref = doc(dbFor(env, 'accountant'), 'expenses', 'lock-guard');
    await assertFails(updateDoc(ref, { isClosed: true }));
    await assertFails(updateDoc(ref, { isClosed: true, expenseInvoiceId: 'nonexistent' }));
    await createExpenseInvoiceAtomic(dbFor(env, 'accountant'), input('guard-invoice', ['lock-guard']));
    await assertFails(updateDoc(ref, { isClosed: false, clientId: 'c2', amount: 100 }));
    await assertSucceeds(updateDoc(ref, { createdBy: 'الاسم المحدّث' }));
  });

  it('rejects the entire selection when a source is absent, belongs elsewhere or is already closed', async () => {
    await seedExpense('safe-open');
    await seedExpense('safe-other', { clientId: 'c2' });
    await seedExpense('safe-closed', { isClosed: true });
    const db = dbFor(env, 'accountant');
    for (const [suffix, ids] of [['absent', ['safe-open', 'absent']], ['client', ['safe-open', 'safe-other']], ['closed', ['safe-open', 'safe-closed']]] as const) {
      const id = `rejected-${suffix}`;
      await expect(createExpenseInvoiceAtomic(db, input(id, [...ids]))).rejects.toBeDefined();
      expect((await saved('expense_invoices', id)).exists()).toBe(false);
      expect((await saved('expenses', 'safe-open')).data()?.isClosed).toBe(false);
    }
  });

  it('lets only one concurrent invoice claim a source', async () => {
    await seedExpense('race-source');
    const db = dbFor(env, 'accountant');
    const results = await Promise.allSettled([
      createExpenseInvoiceAtomic(db, input('race-one', ['race-source'])),
      createExpenseInvoiceAtomic(db, input('race-two', ['race-source'])),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const source = (await saved('expenses', 'race-source')).data();
    const invoices = await Promise.all(['race-one', 'race-two'].map((id) => saved('expense_invoices', id)));
    expect(invoices.filter((snapshot) => snapshot.exists()).map((snapshot) => snapshot.id)).toEqual([source?.expenseInvoiceId]);
  });

  it('does not reopen any source when one is now linked to a different invoice', async () => {
    await seedExpense('wrong-link-a');
    await seedExpense('wrong-link-b');
    const db = dbFor(env, 'accountant');
    await createExpenseInvoiceAtomic(db, input('wrong-link-invoice', ['wrong-link-a', 'wrong-link-b']));
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'expenses', 'wrong-link-b'), { expenseInvoiceId: 'another-invoice' }));
    await expect(deleteExpenseInvoiceAtomic(db, 'wrong-link-invoice')).rejects.toThrow('فاتورة أخرى');
    expect((await saved('expense_invoices', 'wrong-link-invoice')).exists()).toBe(true);
    expect((await saved('expenses', 'wrong-link-a')).data()?.isClosed).toBe(true);
  });

  it('rejects duplicates and too-large selections before reading or writing', async () => {
    const db = dbFor(env, 'accountant');
    await expect(createExpenseInvoiceAtomic(db, input('duplicate-selection', ['e-field', 'e-field']))).rejects.toThrow('مكرر');
    await expect(createExpenseInvoiceAtomic(db, input('too-large-selection', Array.from({ length: 401 }, (_, i) => `large-${i}`)))).rejects.toThrow('400');
    expect((await saved('expense_invoices', 'duplicate-selection')).exists()).toBe(false);
    expect((await saved('expense_invoices', 'too-large-selection')).exists()).toBe(false);
  });
});
