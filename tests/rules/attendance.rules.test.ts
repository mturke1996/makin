import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createEnv, dbFor, type PersonaName } from './helpers';

let env: RulesTestEnvironment;
beforeAll(async () => { env = await createEnv('demo-saas-attendance'); });
afterAll(async () => { await env.cleanup(); });

const record = (workerId: string, date: string, status = 'present') => ({ workerId, clientId: 'c1', date, status, createdAt: 'x', updatedAt: 'x' });
const put = (who: PersonaName, id: string, data: Record<string, unknown>) => setDoc(doc(dbFor(env, who), 'worker_attendance', id), data);

describe('worker attendance', () => {
  it('is marked by whoever manages workers, with the id the data describes', async () => {
    await assertSucceeds(put('supervisor', 'w2_2026-10-26', record('w2', '2026-10-26')));
    await assertSucceeds(put('admin', 'w2_2026-10-27', record('w2', '2026-10-27', 'half')));
  });

  it('lets a day be marked again (the same id is changed, not duplicated)', async () => {
    await assertSucceeds(put('supervisor', 'w2_2026-10-26', record('w2', '2026-10-26', 'absent')));
    await assertSucceeds(updateDoc(doc(dbFor(env, 'supervisor'), 'worker_attendance', 'w2_2026-10-26'), { status: 'present' }));
  });

  it('refuses an unknown status, a missing field and an id that does not match the worker and day', async () => {
    await assertFails(put('supervisor', 'w2_2026-10-28', record('w2', '2026-10-28', 'late')));
    await assertFails(put('supervisor', 'w2_2026-10-28', { workerId: 'w2', clientId: 'c1', status: 'present' }));
    await assertFails(put('supervisor', 'other_2026-10-28', record('w2', '2026-10-28')));
    await assertFails(put('supervisor', 'w2_2026-10-29', record('w2', '2026-10-28')));
  });

  it('is read by whoever sees workers, and by nobody else', async () => {
    for (const who of ['admin', 'supervisor', 'viewer'] as PersonaName[]) await assertSucceeds(getDoc(doc(dbFor(env, who), 'worker_attendance', 'w1_2026-10-25')));
    for (const who of ['field', 'accountant', 'nobody'] as PersonaName[]) await assertFails(getDoc(doc(dbFor(env, who), 'worker_attendance', 'w1_2026-10-25')));
  });

  it('cannot be written or deleted by someone who only views', async () => {
    await assertFails(put('viewer', 'w3_2026-10-26', record('w3', '2026-10-26')));
    await assertFails(deleteDoc(doc(dbFor(env, 'viewer'), 'worker_attendance', 'w1_2026-10-25')));
    await assertFails(put('nobody', 'w3_2026-10-26', record('w3', '2026-10-26')));
  });

  it('can be cleared by whoever manages workers', async () => {
    await assertSucceeds(deleteDoc(doc(dbFor(env, 'supervisor'), 'worker_attendance', 'w2_2026-10-27')));
  });
});
