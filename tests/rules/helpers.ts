import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { DEFAULT_EMPLOYEE_PERMISSIONS, PERMISSION_TEMPLATES, normalizePermissions } from '../../src/core/access';

export type Persona = {
  uid: string;
  /** What is stored in users/{uid}; `null` means the person is signed in but has NO profile document. */
  profile: Record<string, unknown> | null;
};

const template = (id: string) => normalizePermissions(PERMISSION_TEMPLATES.find((t) => t.id === id)!.permissions);

export const PERSONAS = {
  admin: { uid: 'u-admin', profile: { role: 'admin', displayName: 'Admin' } },
  owner: { uid: 'u-owner', profile: { displayName: 'Legacy owner' } }, // old profile without a role
  field: { uid: 'u-field', profile: { role: 'employee', displayName: 'Field' } }, // no permissions list: default set
  field2: { uid: 'u-field2', profile: { role: 'employee', displayName: 'Field 2', permissions: [...DEFAULT_EMPLOYEE_PERMISSIONS] } },
  supervisor: { uid: 'u-super', profile: { role: 'employee', displayName: 'Supervisor', permissions: template('supervisor') } },
  accountant: { uid: 'u-acct', profile: { role: 'employee', displayName: 'Accountant', permissions: template('accountant') } },
  viewer: { uid: 'u-viewer', profile: { role: 'employee', displayName: 'Viewer', permissions: template('viewer') } },
  nobody: { uid: 'u-nobody', profile: { role: 'employee', displayName: 'Nobody', permissions: [] } },
  stranger: { uid: 'u-stranger', profile: null },
} satisfies Record<string, Persona>;

export type PersonaName = keyof typeof PERSONAS;

const SEED: Record<string, Record<string, Record<string, unknown>>> = {
  clients: { c1: { name: 'Client' }, c2: { name: 'Other client' } },
  invoices: { i1: { status: 'sent', total: 100, updatedAt: '2026-01-01' } },
  payments: { p1: { amount: 10, invoiceId: 'i1' } },
  worker_attendance: { 'w1_2026-10-25': { workerId: 'w1', clientId: 'c1', date: '2026-10-25', status: 'present' } },
  payment_milestones: { pm1: { clientId: 'c1', title: 'Advance', amount: 100, dueDate: '2026-12-01', order: 1 } },
  expenses: {
    'e-field': { clientId: 'c1', userId: 'u-field', amount: 5, isClosed: false, date: '2026-01-01' },
    'e-field2': { clientId: 'c1', userId: 'u-field2', amount: 6, isClosed: false, date: '2026-01-01' },
    'e-admin': { clientId: 'c1', userId: 'u-admin', amount: 7, isClosed: false, date: '2026-01-01' },
    'e-worker': { clientId: 'c1', userId: 'u-field2', amount: 8, workerId: 'w1', isClosed: false, date: '2026-01-01' },
    'e-legacy': { clientId: 'c1', amount: 9, createdBy: 'someone' },
    'e-closed': { clientId: 'c1', userId: 'u-field', amount: 10, isClosed: true },
  },
  expense_invoices: { xi1: { total: 10 } },
  standalone_debts: { d1: { amount: 10 } },
  debt_parties: { dp1: { name: 'Supplier' } },
  workers: { w1: { name: 'Worker', clientId: 'c1' } },
  global_fund_transactions: { 't-field': { userId: 'u-field', amount: 100 }, 't-field2': { userId: 'u-field2', amount: 50 } },
  user_balances: { 'b-field': { userId: 'u-field', amount: 100 }, 'b-field2': { userId: 'u-field2', amount: 50 } },
  letters: { l1: { title: 'Letter' } },
  project_phases: { ph1: { name: 'Phase' } },
  boq_items: { boq1: { title: 'Item' } },
  site_reports: { s1: { title: 'Report' } },
  audit_logs: { a1: { summary: 'x', userId: 'u-admin' } },
  settings: { appLock: { pinCode: '1234' } },
};

export async function createEnv(projectId = 'demo-saas-rules'): Promise<RulesTestEnvironment> {
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const persona of Object.values(PERSONAS)) {
      if (persona.profile) await setDoc(doc(db, 'users', persona.uid), persona.profile);
    }
    for (const [collectionName, docs] of Object.entries(SEED)) {
      for (const [id, data] of Object.entries(docs)) await setDoc(doc(db, collectionName, id), data);
    }
  });
  return env;
}

export const dbFor = (env: RulesTestEnvironment, who: PersonaName | 'anon') =>
  who === 'anon' ? env.unauthenticatedContext().firestore() : env.authenticatedContext(PERSONAS[who].uid).firestore();
