import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { DEFAULT_EMPLOYEE_PERMISSIONS } from '../../src/core/access';
import { createEnv, dbFor, type PersonaName } from './helpers';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});

type Who = PersonaName | 'anon';
const read = (who: Who, path: string, id: string) => getDoc(doc(dbFor(env, who), path, id));
const write = (who: Who, path: string, id: string, data: Record<string, unknown>) => setDoc(doc(dbFor(env, who), path, id), data);
const patch = (who: Who, path: string, id: string, data: Record<string, unknown>) => updateDoc(doc(dbFor(env, who), path, id), data);
const remove = (who: Who, path: string, id: string) => deleteDoc(doc(dbFor(env, who), path, id));
const expectOk = (p: Promise<unknown>) => assertSucceeds(p);
const expectNo = (p: Promise<unknown>) => assertFails(p);

describe('the rules and the app agree on the default employee permissions', () => {
  it('lists the same defaults', () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    const body = rules.match(/function defaultPermissions\(\)\s*\{\s*return \[([^\]]*)\];/)?.[1] ?? '';
    const fromRules = [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(fromRules).toEqual([...DEFAULT_EMPLOYEE_PERMISSIONS]);
  });
});

describe('identity', () => {
  it('closes everything to anonymous visitors and to signed-in people without a profile', async () => {
    for (const who of ['anon', 'stranger'] as const) {
      await expectNo(read(who, 'clients', 'c1'));
      await expectNo(read(who, 'expenses', 'e-field'));
      await expectNo(write(who, 'clients', 'x', { name: 'x' }));
    }
  });

  it('lets a person with no profile discover that fact by reading their own (missing) profile', async () => {
    await expectOk(read('stranger', 'users', 'u-stranger'));
  });

  it('closes collections the rules never name, to admins as well', async () => {
    await expectNo(read('admin', 'secrets', 's1'));
    await expectNo(write('admin', 'secrets', 's1', { v: 1 }));
  });

  it('treats a profile without a role as admin, and an employee with an empty list as having nothing', async () => {
    await expectOk(read('owner', 'payments', 'p1'));
    await expectNo(read('nobody', 'clients', 'c1'));
    await expectNo(read('nobody', 'expenses', 'e-field'));
  });
});

describe('users', () => {
  it('lets anyone read their own profile', async () => {
    for (const who of ['field', 'viewer', 'nobody', 'admin'] as const) {
      await expectOk(read(who, 'users', ({ field: 'u-field', viewer: 'u-viewer', nobody: 'u-nobody', admin: 'u-admin' } as const)[who]));
    }
  });

  it('hides colleagues from people with no reason to see them', async () => {
    await expectNo(read('field', 'users', 'u-field2'));
    await expectNo(read('supervisor', 'users', 'u-admin'));
  });

  it('shows the directory to people who see all expenses or manage custody, and to admins', async () => {
    await expectOk(read('accountant', 'users', 'u-field2'));
    await expectOk(read('viewer', 'users', 'u-admin'));
    await expectOk(read('admin', 'users', 'u-field'));
  });

  it('is changeable by admins only: nobody promotes themselves, adds admins or deletes accounts', async () => {
    for (const who of ['field', 'supervisor', 'accountant', 'nobody', 'stranger'] as const) {
      const uid = who === 'stranger' ? 'u-stranger' : `u-${({ field: 'field', supervisor: 'super', accountant: 'acct', nobody: 'nobody' } as Record<string, string>)[who]}`;
      await expectNo(patch(who, 'users', uid, { role: 'admin' }).catch((e) => Promise.reject(e)));
      await expectNo(write(who, 'users', 'u-new', { role: 'admin' }));
    }
    await expectNo(remove('accountant', 'users', 'u-admin'));
    await expectNo(patch('field', 'users', 'u-field', { permissions: ['payments.delete'] }));
  });

  it('is fully manageable by an admin and by the legacy owner', async () => {
    await expectOk(write('admin', 'users', 'u-temp1', { role: 'employee', permissions: [] }));
    await expectOk(patch('admin', 'users', 'u-temp1', { permissions: ['clients.view'] }));
    await expectOk(write('owner', 'users', 'u-temp2', { role: 'employee' }));
    await expectOk(remove('admin', 'users', 'u-temp1'));
    await expectOk(remove('owner', 'users', 'u-temp2'));
  });
});

describe('simple areas follow the view / manage / delete ladder', () => {
  const ladders: {
    path: string; id: string; create: Record<string, unknown>;
    view: PersonaName[]; manage: PersonaName[]; del: PersonaName[];
  }[] = [
    { path: 'clients', id: 'c1', create: { name: 'N' }, view: ['admin', 'owner', 'field', 'field2', 'supervisor', 'accountant', 'viewer'], manage: ['admin', 'accountant'], del: ['admin'] },
    { path: 'invoices', id: 'i1', create: { total: 1 }, view: ['admin', 'accountant', 'viewer'], manage: ['admin', 'accountant'], del: ['admin'] },
    { path: 'payments', id: 'p1', create: { amount: 1 }, view: ['admin', 'accountant', 'viewer'], manage: ['admin', 'accountant'], del: ['admin'] },
    { path: 'standalone_debts', id: 'd1', create: { amount: 1 }, view: ['admin', 'accountant', 'viewer'], manage: ['admin', 'accountant'], del: ['admin'] },
    { path: 'debt_parties', id: 'dp1', create: { name: 'S' }, view: ['admin', 'accountant', 'viewer'], manage: ['admin', 'accountant'], del: ['admin', 'accountant'] },
    { path: 'workers', id: 'w1', create: { name: 'W' }, view: ['admin', 'supervisor', 'viewer'], manage: ['admin', 'supervisor'], del: ['admin', 'supervisor'] },
    { path: 'letters', id: 'l1', create: { title: 'L' }, view: ['admin', 'accountant', 'viewer'], manage: ['admin', 'accountant'], del: ['admin', 'accountant'] },
    { path: 'project_phases', id: 'ph1', create: { name: 'P' }, view: ['admin', 'supervisor', 'viewer'], manage: ['admin', 'supervisor'], del: ['admin', 'supervisor'] },
    { path: 'boq_items', id: 'boq1', create: { title: 'B' }, view: ['admin', 'supervisor', 'viewer'], manage: ['admin', 'supervisor'], del: ['admin', 'supervisor'] },
    { path: 'site_reports', id: 's1', create: { title: 'R' }, view: ['admin', 'supervisor', 'viewer'], manage: ['admin', 'supervisor'], del: ['admin', 'supervisor'] },
  ];
  const everyone: PersonaName[] = ['admin', 'owner', 'field', 'field2', 'supervisor', 'accountant', 'viewer', 'nobody'];

  for (const l of ladders) {
    it(`${l.path}: read, write and delete go to exactly the right people`, async () => {
      for (const who of everyone) {
        const mayRead = l.view.includes(who) || who === 'owner';
        const mayManage = l.manage.includes(who) || who === 'owner';
        const mayDelete = l.del.includes(who) || who === 'owner';
        await (mayRead ? expectOk : expectNo)(read(who, l.path, l.id));
        await (mayManage ? expectOk : expectNo)(write(who, l.path, `new-${who}`, l.create));
        await (mayManage ? expectOk : expectNo)(patch(who, l.path, `new-${who}`, { touched: true }).catch((e) => {
          // an update of a document that does not exist fails by design; only the rule outcome matters here
          throw e;
        })).catch(() => undefined);
        await (mayDelete ? expectOk : expectNo)(remove(who, l.path, mayDelete ? `new-${who}` : l.id));
      }
    });
  }
});

describe('invoices: recording a payment may only move the status', () => {
  it('lets a payments manager touch status and updatedAt, nothing more', async () => {
    const payer = 'accountant';
    await expectOk(patch(payer, 'invoices', 'i1', { status: 'paid', updatedAt: '2026-02-01' }));
  });

  it('refuses a payments-only person any other change to the invoice', async () => {
    const env2 = await createEnv('demo-saas-rules-inv');
    try {
      await env2.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users', 'u-payer'), { role: 'employee', permissions: ['payments.view', 'payments.manage', 'invoices.view'] });
      });
      const db = env2.authenticatedContext('u-payer').firestore();
      await assertSucceeds(updateDoc(doc(db, 'invoices', 'i1'), { status: 'paid', updatedAt: 'x' }));
      await assertFails(updateDoc(doc(db, 'invoices', 'i1'), { total: 1 }));
      await assertFails(updateDoc(doc(db, 'invoices', 'i1'), { status: 'paid', total: 1 }));
    } finally {
      await env2.cleanup();
    }
  });
});

describe('expenses', () => {
  it('lets a field employee read their own expenses and nobody else\'s', async () => {
    await expectOk(read('field', 'expenses', 'e-field'));
    await expectNo(read('field', 'expenses', 'e-field2'));
    await expectNo(read('field', 'expenses', 'e-admin'));
    await expectNo(read('field', 'expenses', 'e-legacy')); // no owner id: nobody can prove it is theirs
  });

  it('lets someone who views all expenses read every expense', async () => {
    for (const id of ['e-field', 'e-field2', 'e-admin', 'e-legacy', 'e-worker']) {
      await expectOk(read('viewer', 'expenses', id));
      await expectOk(read('accountant', 'expenses', id));
      await expectOk(read('admin', 'expenses', id));
    }
  });

  it('shows worker payments to whoever views workers, and no other expense of a colleague', async () => {
    await expectOk(read('supervisor', 'expenses', 'e-worker'));
    await expectNo(read('supervisor', 'expenses', 'e-field2'));
    await expectNo(read('supervisor', 'expenses', 'e-admin'));
  });

  it('lets an employee record an expense in their own name only', async () => {
    await expectOk(write('field', 'expenses', 'n1', { clientId: 'c1', userId: 'u-field', amount: 1 }));
    await expectNo(write('field', 'expenses', 'n2', { clientId: 'c1', userId: 'u-field2', amount: 1 }));
    await expectNo(write('field', 'expenses', 'n3', { clientId: 'c1', amount: 1 }));
    await expectNo(write('field', 'expenses', 'n4', { clientId: 'c1', userId: 'u-field', amount: 1, isClosed: true }));
    await expectNo(write('nobody', 'expenses', 'n5', { clientId: 'c1', userId: 'u-nobody', amount: 1 }));
    await expectNo(write('viewer', 'expenses', 'n6', { clientId: 'c1', userId: 'u-viewer', amount: 1 }));
  });

  it('lets an owner edit their open expense but not give it away, close it or touch a colleague\'s', async () => {
    await expectOk(patch('field', 'expenses', 'e-field', { amount: 55 }));
    await expectNo(patch('field', 'expenses', 'e-field', { userId: 'u-field2' }));
    await expectNo(patch('field', 'expenses', 'e-field', { isClosed: true }));
    await expectNo(patch('field', 'expenses', 'e-field2', { amount: 1 }));
    await expectNo(patch('field', 'expenses', 'e-legacy', { amount: 1 }));
  });

  it('freezes a closed expense for its owner and for edit-all alike, but edit-all may reopen it', async () => {
    await expectNo(patch('field', 'expenses', 'e-closed', { amount: 1 }));
    await expectNo(remove('field', 'expenses', 'e-closed'));
    await expectNo(patch('accountant', 'expenses', 'e-closed', { amount: 1 }));
    await expectNo(remove('accountant', 'expenses', 'e-closed')); // edit-all is not delete-all
    await expectOk(patch('accountant', 'expenses', 'e-closed', { isClosed: false }));
    await expectNo(patch('accountant', 'expenses', 'e-closed', { isClosed: true })); // closing requires its invoice
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'expenses', 'e-closed'), { isClosed: true });
    });
  });

  it('lets an edit-all holder refresh only the author name on a closed expense (renaming a user)', async () => {
    await expectOk(patch('accountant', 'expenses', 'e-closed', { createdBy: 'New Name' }));
    await expectNo(patch('accountant', 'expenses', 'e-closed', { createdBy: 'x', amount: 2 }));
    await expectNo(patch('field', 'expenses', 'e-closed', { createdBy: 'New Name' }));
  });

  it('lets delete-all (an admin removing a client or a user) delete closed expenses too', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'expenses', 'e-closed-2'), { clientId: 'c1', userId: 'u-field', amount: 3, isClosed: true });
    });
    await expectOk(remove('admin', 'expenses', 'e-closed-2'));
  });

  it('lets edit-all close and edit any open expense, but not delete it without delete-all', async () => {
    await expectOk(patch('accountant', 'expenses', 'e-admin', { amount: 70 }));
    await expectOk(patch('accountant', 'expenses', 'e-field2', { isClosed: false, notes: 'ok' }));
    await expectNo(remove('accountant', 'expenses', 'e-admin'));
    await expectOk(remove('admin', 'expenses', 'e-admin'));
  });

  it('lets an owner delete their open expense and nobody else\'s', async () => {
    await expectOk(remove('field', 'expenses', 'n1'));
    await expectNo(remove('field', 'expenses', 'e-field2'));
    await expectNo(remove('viewer', 'expenses', 'e-field2'));
  });

  it('keeps expense invoices (copies of others\' expenses) for people who see all expenses', async () => {
    await expectNo(read('field', 'expense_invoices', 'xi1'));
    await expectNo(read('supervisor', 'expense_invoices', 'xi1'));
    await expectOk(read('viewer', 'expense_invoices', 'xi1'));
    await expectNo(write('viewer', 'expense_invoices', 'x2', { total: 1 }));
    await expectOk(write('accountant', 'expense_invoices', 'x2', { total: 1 }));
    await expectOk(remove('accountant', 'expense_invoices', 'x2'));
  });
});

describe('custody', () => {
  for (const path of ['global_fund_transactions', 'user_balances']) {
    const mine = path === 'global_fund_transactions' ? 't-field' : 'b-field';
    const theirs = path === 'global_fund_transactions' ? 't-field2' : 'b-field2';
    it(`${path}: own records for the owner, everything for managers, writes for managers only`, async () => {
      await expectOk(read('field', path, mine));
      await expectNo(read('field', path, theirs));
      await expectNo(read('nobody', path, mine));
      await expectNo(write('field', path, 'x', { userId: 'u-field', amount: 1 }));
      await expectNo(patch('field', path, mine, { amount: 1 }));
      await expectNo(remove('field', path, mine));
      await expectOk(read('admin', path, theirs));
      await expectOk(write('admin', path, 'x', { userId: 'u-field', amount: 1 }));
      await expectOk(remove('admin', path, 'x'));
    });
  }
});

describe('settings and audit log', () => {
  it('keeps the legacy app-lock settings (and the PIN inside) away from employees', async () => {
    await expectNo(read('field', 'settings', 'appLock'));
    await expectNo(read('accountant', 'settings', 'appLock'));
    await expectOk(read('admin', 'settings', 'appLock'));
    await expectNo(patch('field', 'settings', 'appLock', { pinCode: '' }));
  });

  it('appends audit entries in your own name, readable by admins only, never edited or erased', async () => {
    await expectOk(write('field', 'audit_logs', 'n1', { summary: 's', userId: 'u-field' }));
    await expectNo(write('field', 'audit_logs', 'n2', { summary: 's', userId: 'u-admin' })); // not in someone else's name
    await expectNo(write('field', 'audit_logs', 'n3', { summary: 's' }));
    await expectNo(read('field', 'audit_logs', 'a1'));
    await expectOk(read('admin', 'audit_logs', 'a1'));
    await expectNo(patch('admin', 'audit_logs', 'a1', { summary: 'edited' }));
    await expectNo(remove('admin', 'audit_logs', 'a1'));
  });
});
