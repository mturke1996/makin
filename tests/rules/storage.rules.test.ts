import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
const EMP = 'u-emp';
const STRANGER = 'u-stranger';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-saas-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', EMP), { displayName: 'Emp', role: 'employee' });
  });
});

afterAll(async () => {
  await env.cleanup();
});

const png = (bytes = 16) => new Uint8Array(bytes);
const emp = () => env.authenticatedContext(EMP).storage();

describe('expense attachments', () => {
  it('lets a registered employee upload, read and delete a receipt image or PDF', async () => {
    const file = ref(emp(), 'expenses/e1/receipt.png');
    await assertSucceeds(uploadBytes(file, png(), { contentType: 'image/png' }));
    await assertSucceeds(getBytes(file));
    await assertSucceeds(uploadBytes(ref(emp(), 'expenses/e1/receipt.pdf'), png(), { contentType: 'application/pdf' }));
    await assertSucceeds(deleteObject(file));
  });

  it('rejects other file types and files over 10 MB', async () => {
    await assertFails(uploadBytes(ref(emp(), 'expenses/e1/run.exe'), png(), { contentType: 'application/x-msdownload' }));
    await assertFails(uploadBytes(ref(emp(), 'expenses/e1/huge.png'), png(10 * 1024 * 1024 + 1), { contentType: 'image/png' }));
  });

  it('denies strangers and anonymous users', async () => {
    const stranger = env.authenticatedContext(STRANGER).storage();
    await assertFails(uploadBytes(ref(stranger, 'expenses/e1/a.png'), png(), { contentType: 'image/png' }));
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), 'expenses/e1/receipt.pdf')));
  });

  it('keeps every other path closed', async () => {
    await assertFails(uploadBytes(ref(emp(), 'public/a.png'), png(), { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(emp(), 'expenses/e1/nested/a.png'), png(), { contentType: 'image/png' }));
  });
});
