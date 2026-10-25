import { afterAll, beforeAll, expect, it } from 'vitest';
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { createEnv, dbFor } from './helpers';
import { buildTemplatePhases, PROJECT_TEMPLATES } from '../../src/core/finance/projectTemplates';
import { applyProjectTemplate } from '../../src/services/projectTemplatesService';
let env: RulesTestEnvironment;
beforeAll(async () => { env = await createEnv('demo-saas-project-templates'); });
afterAll(async () => { await env.cleanup(); });
it('concurrent template applications add stages once and preserve later edits on retry', async () => {
  const db = dbFor(env, 'supervisor');
  const phases = buildTemplatePhases(PROJECT_TEMPLATES[0], 'c1', [], 'u-super', '2026-10-24T12:00:00Z');
  const counts = await Promise.all([applyProjectTemplate(db, 'c1', phases), applyProjectTemplate(db, 'c1', phases)]);
  expect(counts.reduce((a, b) => a + b)).toBe(12);
  const ref = doc(db, 'project_phases', phases[0].id);
  await updateDoc(ref, { status: 'completed', budgetAmount: 1000, name: 'مرحلة مراجعة' });
  expect(await applyProjectTemplate(db, 'c1', phases)).toBe(0);
  expect((await getDoc(ref)).data()).toMatchObject({ status: 'completed', budgetAmount: 1000, name: 'مرحلة مراجعة' });
});
it('a viewer cannot apply a template and a missing client leaves every candidate absent', async () => {
  const phases = buildTemplatePhases(PROJECT_TEMPLATES[1], 'c2', [], 'u-viewer', '2026-10-24T12:00:00Z');
  await assertFails(applyProjectTemplate(dbFor(env, 'viewer'), 'c2', phases));
  expect((await getDoc(doc(dbFor(env, 'admin'), 'project_phases', phases[0].id))).exists()).toBe(false);
  const missing = buildTemplatePhases(PROJECT_TEMPLATES[1], 'missing', [], 'u-admin', '2026-10-24T12:00:00Z');
  await expect(applyProjectTemplate(dbFor(env, 'admin'), 'missing', missing)).rejects.toThrow('لم يعد موجود');
  expect((await getDoc(doc(dbFor(env, 'admin'), 'project_phases', missing[0].id))).exists()).toBe(false);
});
