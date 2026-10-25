import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createEnv, dbFor, type PersonaName } from './helpers';
import { ensureReceiptNumber } from '../../src/services/receiptNumber';

let env: RulesTestEnvironment;
beforeAll(async () => { env = await createEnv('demo-saas-receipts'); });
afterAll(async () => { await env.cleanup(); });

const seedPayment = (id: string, extra: Record<string, unknown> = {}) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'payments', id), { amount: 10, invoiceId: 'i1', clientId: 'c1', paymentDate: '2026-10-12', ...extra }));
const counter = async () => (await getDoc(doc(dbFor(env, 'admin'), 'counters', 'receipts-2026'))).data();
const stored = async (id: string) => (await getDoc(doc(dbFor(env, 'admin'), 'payments', id))).data();
const at = new Date('2026-10-25T09:00:00Z');
// The ledger holders are the admin and the accountant; a viewer may read payments but not issue numbers.
const issue = (who: PersonaName, id: string) => ensureReceiptNumber(dbFor(env, who) as never, id, { name: who }, at);

describe('issuing receipt numbers', () => {
  it('gives the first receipt of the year number 1, and the next number 2', async () => {
    await seedPayment('r1'); await seedPayment('r2');
    expect(await issue('accountant', 'r1')).toEqual({ receiptNumber: 'RC-2026-0001', issued: true });
    expect(await issue('admin', 'r2')).toEqual({ receiptNumber: 'RC-2026-0002', issued: true });
    expect((await counter())?.last).toBe(2);
    expect((await stored('r1'))).toMatchObject({ receiptNumber: 'RC-2026-0001', receiptIssuedBy: 'accountant' });
  });

  it('returns the number a payment already has without moving the counter', async () => {
    expect(await issue('admin', 'r1')).toEqual({ receiptNumber: 'RC-2026-0001', issued: false });
    expect((await counter())?.last).toBe(2);
  });

  it('never hands the same number to two payments issued at once', async () => {
    await Promise.all(['c1', 'c2', 'c3', 'c4'].map((id) => seedPayment(id)));
    const results = await Promise.all(['c1', 'c2', 'c3', 'c4'].map((id, i) => issue(i % 2 ? 'admin' : 'accountant', id)));
    const numbers = results.map((r) => r.receiptNumber).sort();
    expect(new Set(numbers).size).toBe(4);
    expect(numbers).toEqual(['RC-2026-0003', 'RC-2026-0004', 'RC-2026-0005', 'RC-2026-0006']);
  });

  it('refuses people who cannot manage payments', async () => {
    await seedPayment('r3');
    for (const who of ['viewer', 'field', 'supervisor', 'nobody'] as const) await expect(issue(who, 'r3')).rejects.toThrow();
    expect((await stored('r3'))?.receiptNumber).toBeUndefined();
  });
});

describe('the counter and the number on a payment', () => {
  it('only moves up by one, and nobody can rewind or delete it', async () => {
    const ref = (who: PersonaName) => doc(dbFor(env, who), 'counters', 'receipts-2026');
    await assertFails(updateDoc(ref('accountant'), { last: 99, updatedAt: 'x' }));
    await assertFails(updateDoc(ref('accountant'), { last: 1, updatedAt: 'x' }));
    await assertFails(updateDoc(ref('viewer'), { last: 7, updatedAt: 'x' }));
    await assertSucceeds(updateDoc(ref('accountant'), { last: (await counter())!.last + 1, updatedAt: 'x' }));
  });

  it('starts a year at 1 only, and only for a counter named like a receipt year', async () => {
    const make = (who: PersonaName, id: string, last: number) => setDoc(doc(dbFor(env, who), 'counters', id), { last, updatedAt: 'x' });
    await assertSucceeds(make('accountant', 'receipts-2027', 1));
    await assertFails(make('accountant', 'receipts-2028', 5));
    await assertFails(make('accountant', 'other', 1));
    await assertFails(make('viewer', 'receipts-2029', 1));
  });

  it('never lets a receipt number on a payment change or be removed', async () => {
    await seedPayment('fixed', { receiptNumber: 'RC-2026-0042' });
    await assertFails(updateDoc(doc(dbFor(env, 'accountant'), 'payments', 'fixed'), { receiptNumber: 'RC-2026-0001' }));
    await assertSucceeds(updateDoc(doc(dbFor(env, 'accountant'), 'payments', 'fixed'), { notes: 'تصحيح ملاحظة' }));
    expect((await stored('fixed'))?.receiptNumber).toBe('RC-2026-0042');
  });
});
