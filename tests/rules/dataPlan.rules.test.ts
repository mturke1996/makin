import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, getDocs, query } from 'firebase/firestore';
import { DATA_KEYS, SOURCES, buildPrincipal, queriesFor } from '../../src/core/access';
import { toConstraints } from '../../src/core/access/constraints';
import { PERSONAS, createEnv, dbFor, type PersonaName } from './helpers';

/**
 * The app's real subscriptions, replayed against the rules. For every person and every data set:
 * each query the app would run must be accepted, and a plain "give me the whole collection" query
 * must be refused whenever the app deliberately asks for less.
 */
let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await createEnv('demo-saas-plan');
});
afterAll(async () => {
  await env.cleanup();
});

const constraints = toConstraints;

const personaNames = Object.keys(PERSONAS).filter((n) => n !== 'stranger') as PersonaName[];

const principalOf = (name: PersonaName) => {
  const { uid, profile } = PERSONAS[name];
  return buildPrincipal({ id: uid, role: profile?.role as string | undefined, permissions: profile?.permissions });
};

describe('every planned query is allowed by the rules', () => {
  for (const name of personaNames) {
    it(`${name}`, async () => {
      const p = principalOf(name);
      const db = dbFor(env, name);
      for (const key of DATA_KEYS) {
        for (const spec of queriesFor(p, key)) {
          await assertSucceeds(getDocs(query(collection(db, SOURCES[key].collection), ...constraints(spec))));
        }
      }
    });
  }
});

describe('the app never asks for more than the rules give, and the rules refuse the rest', () => {
  for (const name of personaNames) {
    it(`${name}`, async () => {
      const p = principalOf(name);
      const db = dbFor(env, name);
      for (const key of DATA_KEYS) {
        const specs = queriesFor(p, key);
        const wholeCollectionAllowed = specs.some((s) => s.length === 0);
        if (!wholeCollectionAllowed) {
          await assertFails(getDocs(query(collection(db, SOURCES[key].collection))));
        }
      }
    });
  }
});

describe('what actually arrives', () => {
  const ids = async (who: PersonaName, key: (typeof DATA_KEYS)[number]) => {
    const p = principalOf(who);
    const db = dbFor(env, who);
    const seen = new Set<string>();
    for (const spec of queriesFor(p, key)) {
      const snap = await getDocs(query(collection(db, SOURCES[key].collection), ...constraints(spec)));
      snap.docs.forEach((d) => seen.add(d.id));
    }
    return [...seen].sort();
  };

  it('a field employee receives only their own expenses and custody', async () => {
    expect(await ids('field', 'expenses')).toEqual(['e-closed', 'e-field']);
    expect(await ids('field', 'fundTransactions')).toEqual(['t-field']);
    expect(await ids('field', 'userBalances')).toEqual(['b-field']);
    expect(await ids('field', 'payments')).toEqual([]);
  });

  it('a supervisor receives their own expenses and every worker payment, nothing else', async () => {
    expect(await ids('supervisor', 'expenses')).toEqual(['e-worker']);
    expect(await ids('supervisor', 'workers')).toEqual(['w1']);
  });

  it('a viewer and an accountant receive every expense; an admin receives everything', async () => {
    const all = ['e-admin', 'e-closed', 'e-field', 'e-field2', 'e-legacy', 'e-worker'];
    expect(await ids('viewer', 'expenses')).toEqual(all);
    expect(await ids('accountant', 'expenses')).toEqual(all);
    expect(await ids('admin', 'expenses')).toEqual(all);
    expect(await ids('admin', 'fundTransactions')).toEqual(['t-field', 't-field2']);
  });

  it('a person with no permissions receives nothing at all', async () => {
    for (const key of DATA_KEYS) expect(await ids('nobody', key)).toEqual([]);
  });
});
