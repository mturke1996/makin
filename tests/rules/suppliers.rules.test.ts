import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createEnv, dbFor, type PersonaName } from './helpers';

let env: RulesTestEnvironment;
beforeAll(async () => { env = await createEnv('demo-saas-suppliers'); });
afterAll(async () => { await env.cleanup(); });

const ref = (who: PersonaName, id: string) => doc(dbFor(env, who), 'suppliers', id);

describe('the supplier directory', () => {
  it('is read by whoever records or views expenses, and by nobody else', async () => {
    for (const who of ['admin', 'field', 'field2', 'accountant', 'viewer', 'supervisor'] as PersonaName[]) await assertSucceeds(getDoc(ref(who, 's1')));
    await assertFails(getDoc(ref('nobody', 's1')));
  });

  it('can be added to by whoever records expenses, with a real name', async () => {
    await assertSucceeds(setDoc(ref('field', 'n1'), { name: 'مورّد جديد' }));
    await assertSucceeds(setDoc(ref('accountant', 'n2'), { name: 'آخر' }));
    await assertFails(setDoc(ref('field', 'n3'), { name: '' }));
    await assertFails(setDoc(ref('field', 'n4'), { phone: '091' }));
    await assertFails(setDoc(ref('field', 'n5'), { name: 'x'.repeat(121) }));
    await assertFails(setDoc(ref('viewer', 'n6'), { name: 'لا يكتب' }));
    await assertFails(setDoc(ref('nobody', 'n7'), { name: 'لا يكتب' }));
  });

  it('is changed and removed only by whoever edits everyone\'s expenses', async () => {
    await assertSucceeds(updateDoc(ref('accountant', 'n2'), { phone: '0912345678' }));
    await assertFails(updateDoc(ref('field', 'n1'), { phone: '0912345678' }));
    await assertFails(deleteDoc(ref('field', 'n1')));
    await assertFails(deleteDoc(ref('viewer', 'n2')));
    await assertSucceeds(deleteDoc(ref('accountant', 'n2')));
    await assertSucceeds(deleteDoc(ref('admin', 'n1')));
  });
});
