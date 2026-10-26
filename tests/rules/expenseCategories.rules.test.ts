import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createEnv, dbFor, type PersonaName } from './helpers';
import { customCategoryId } from '../../src/core/expenseCategories';

let env: RulesTestEnvironment;
beforeAll(async () => { env = await createEnv('demo-saas-expense-categories'); });
afterAll(async () => { await env.cleanup(); });

const ref = (who: PersonaName, id: string) => doc(dbFor(env, who), 'expense_categories', id);
const record = (label: string, extra: Record<string, unknown> = {}) => {
  const id = customCategoryId(label);
  return { id, label, createdAt: '2026-10-26T10:00:00.000Z', createdBy: 'u-field', ...extra };
};

describe('expense categories added from the expense form', () => {
  it('are added by whoever records expenses, under the id that follows from the name', async () => {
    const curtains = record('ستائر');
    await assertSucceeds(setDoc(ref('field', curtains.id), curtains));
    const glass = record('زجاج سيكوريت');
    await assertSucceeds(setDoc(ref('accountant', glass.id), glass));
  });

  it('are read by whoever records or views expenses, and by nobody else', async () => {
    const id = customCategoryId('ستائر');
    for (const who of ['admin', 'field', 'accountant', 'viewer', 'supervisor'] as PersonaName[]) await assertSucceeds(getDoc(ref(who, id)));
    await assertFails(getDoc(ref('nobody', id)));
  });

  it('refuse a viewer, a person with no permission, and a stranger', async () => {
    const r = record('تأمين');
    await assertFails(setDoc(ref('viewer', r.id), r));
    await assertFails(setDoc(ref('nobody', r.id), r));
    await assertFails(setDoc(ref('stranger', r.id), r));
  });

  it('refuse an id that does not say «custom», so no built-in id can be shadowed', async () => {
    await assertFails(setDoc(ref('field', 'cement'), { id: 'cement', label: 'أسمنت آخر', createdAt: 'x' }));
    await assertFails(setDoc(ref('field', 'other'), { id: 'other', label: 'مخادعة', createdAt: 'x' }));
  });

  it('refuse a record whose id field disagrees, an empty or oversized name, and stray fields', async () => {
    const r = record('فئة صحيحة');
    await assertFails(setDoc(ref('field', r.id), { ...r, id: 'custom_other0000' }));
    const empty = record('x');
    await assertFails(setDoc(ref('field', empty.id), { ...empty, label: '' }));
    await assertFails(setDoc(ref('field', empty.id), { ...empty, label: 'x' }));
    const long = record('طويلة');
    await assertFails(setDoc(ref('field', long.id), { ...long, label: 'ا'.repeat(61) }));
    await assertFails(setDoc(ref('field', r.id), { ...r, isAdmin: true }));
    await assertFails(setDoc(ref('field', r.id), { id: r.id, createdAt: 'x' }));
  });

  it('are never renamed or removed, not even by an admin: expenses keep pointing at their id', async () => {
    const id = customCategoryId('ستائر');
    await assertFails(updateDoc(ref('admin', id), { label: 'اسم آخر' }));
    await assertFails(updateDoc(ref('field', id), { label: 'اسم آخر' }));
    await assertFails(deleteDoc(ref('admin', id)));
    await assertFails(deleteDoc(ref('field', id)));
  });
});
