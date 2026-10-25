import { describe, expect, it } from 'vitest';
import type { Client } from '../../../../types';
import { clientSchema, type ClientFormValues } from '../schemas';
import {
  EMPTY_PROJECT_FIELDS,
  buildProjectPatch,
  hasProjectDetails,
  projectFieldsOf,
  withProjectFields,
} from './clientFields';

const CLEAR = (() => 'CLEAR') as () => never;

const client = (o: Partial<Client> = {}): Client => ({
  id: 'c1',
  name: 'شركة النور',
  phone: '0912345678',
  address: 'طرابلس',
  type: 'company',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...o,
});

describe('projectFieldsOf', () => {
  it('opens a legacy client as active with empty fields', () => {
    expect(projectFieldsOf(client())).toEqual(EMPTY_PROJECT_FIELDS);
    expect(projectFieldsOf(null)).toEqual(EMPTY_PROJECT_FIELDS);
  });

  it('reads the saved values as text', () => {
    const f = projectFieldsOf(
      client({ status: 'paused', contractValue: 120000.5, startDate: '2026-01-05', expectedEndDate: '2026-06-30', notes: 'ملاحظة' }),
    );
    expect(f).toEqual({ status: 'paused', contractValue: '120000.5', startDate: '2026-01-05', expectedEndDate: '2026-06-30', notes: 'ملاحظة' });
  });

  it('treats a stored zero contract value as none', () => {
    expect(projectFieldsOf(client({ contractValue: 0 })).contractValue).toBe('');
  });
});

describe('hasProjectDetails', () => {
  it('is false for the untouched defaults and true as soon as anything is set', () => {
    expect(hasProjectDetails(EMPTY_PROJECT_FIELDS)).toBe(false);
    expect(hasProjectDetails({ ...EMPTY_PROJECT_FIELDS, notes: '   ' })).toBe(false);
    expect(hasProjectDetails({ ...EMPTY_PROJECT_FIELDS, status: 'completed' })).toBe(true);
    expect(hasProjectDetails({ ...EMPTY_PROJECT_FIELDS, startDate: '2026-01-01' })).toBe(true);
    expect(hasProjectDetails({ ...EMPTY_PROJECT_FIELDS, contractValue: '5' })).toBe(true);
  });
});

describe('buildProjectPatch', () => {
  it('create: writes only what was filled in, and never undefined', () => {
    const patch = buildProjectPatch(EMPTY_PROJECT_FIELDS, 'create', CLEAR);
    expect(patch).toEqual({ status: 'active' });
    expect(Object.values(patch).includes(undefined)).toBe(false);
  });

  it('create: parses the amount exactly and trims the notes', () => {
    const patch = buildProjectPatch(
      { status: 'active', contractValue: '1,250.5', startDate: '2026-02-01', expectedEndDate: '2026-08-01', notes: '  عقد مقطوع  ' },
      'create',
      CLEAR,
    );
    expect(patch).toEqual({ status: 'active', contractValue: 1250.5, startDate: '2026-02-01', expectedEndDate: '2026-08-01', notes: 'عقد مقطوع' });
  });

  it('create: reads Arabic digits', () => {
    expect(buildProjectPatch({ ...EMPTY_PROJECT_FIELDS, contractValue: '١٢٠٠٠٫٥' }, 'create', CLEAR).contractValue).toBe(12000.5);
  });

  it('update: clears every emptied field instead of writing undefined', () => {
    const patch = buildProjectPatch({ ...EMPTY_PROJECT_FIELDS, status: 'completed' }, 'update', CLEAR);
    expect(patch).toEqual({
      status: 'completed',
      contractValue: 'CLEAR',
      startDate: 'CLEAR',
      expectedEndDate: 'CLEAR',
      notes: 'CLEAR',
    });
    expect(Object.values(patch).includes(undefined)).toBe(false);
  });

  it('update: keeps the fields that are still filled', () => {
    const patch = buildProjectPatch(
      { status: 'active', contractValue: '5000', startDate: '', expectedEndDate: '2026-12-01', notes: '' },
      'update',
      CLEAR,
    );
    expect(patch).toEqual({ status: 'active', contractValue: 5000, startDate: 'CLEAR', expectedEndDate: '2026-12-01', notes: 'CLEAR' });
  });

  it('a zero contract value means none', () => {
    expect(buildProjectPatch({ ...EMPTY_PROJECT_FIELDS, contractValue: '0' }, 'create', CLEAR)).toEqual({ status: 'active' });
    expect(buildProjectPatch({ ...EMPTY_PROJECT_FIELDS, contractValue: '0' }, 'update', CLEAR).contractValue).toBe('CLEAR');
  });

  it('rounds the contract value to the thousandth', () => {
    expect(buildProjectPatch({ ...EMPTY_PROJECT_FIELDS, contractValue: '0.1' }, 'create', CLEAR).contractValue).toBe(0.1);
    expect(buildProjectPatch({ ...EMPTY_PROJECT_FIELDS, contractValue: '100.12345' }, 'create', CLEAR).contractValue).toBe(100.123);
  });
});

describe('withProjectFields', () => {
  it('returns the saved client: new values in, emptied fields gone', () => {
    const before = client({ contractValue: 900, startDate: '2026-01-01', notes: 'قديمة', status: 'paused' });
    const after = withProjectFields(before, { status: 'active', contractValue: '', startDate: '2026-03-01', expectedEndDate: '', notes: '' });
    expect(after).toMatchObject({ id: 'c1', name: 'شركة النور', status: 'active', startDate: '2026-03-01' });
    expect('contractValue' in after).toBe(false);
    expect('notes' in after).toBe(false);
    expect('expectedEndDate' in after).toBe(false);
  });
});

describe('clientSchema', () => {
  const valid: ClientFormValues = {
    name: 'شركة النور',
    email: '',
    phone: '0912345678',
    address: 'طرابلس',
    type: 'company',
    ...EMPTY_PROJECT_FIELDS,
  };
  const fail = (o: Partial<ClientFormValues>) => {
    const r = clientSchema.safeParse({ ...valid, ...o });
    return r.success ? null : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  };

  it('accepts a client with no project details', () => {
    expect(clientSchema.safeParse(valid).success).toBe(true);
  });

  it('keeps the old rules on the basic fields', () => {
    expect(fail({ name: 'أ' })?.[0]).toMatch(/^name:/);
    expect(fail({ phone: '123' })?.[0]).toMatch(/^phone:/);
    expect(fail({ address: 'ط' })?.[0]).toMatch(/^address:/);
    expect(fail({ email: 'x' })?.[0]).toMatch(/^email:/);
  });

  it('contract value: empty, zero and a positive amount pass', () => {
    expect(fail({ contractValue: '' })).toBeNull();
    expect(fail({ contractValue: '0' })).toBeNull();
    expect(fail({ contractValue: '250,000.500' })).toBeNull();
    expect(fail({ contractValue: '١٢٣٤' })).toBeNull();
  });

  it('contract value: negative, unreadable, huge and over-precise amounts fail', () => {
    expect(fail({ contractValue: '-1' })?.[0]).toMatch(/^contractValue:/);
    expect(fail({ contractValue: 'abc' })?.[0]).toMatch(/^contractValue:/);
    expect(fail({ contractValue: '1e13' })?.[0]).toMatch(/^contractValue:/);
    expect(fail({ contractValue: '5000000000000' })?.[0]).toMatch(/^contractValue:/);
    expect(fail({ contractValue: '100.1234' })?.[0]).toMatch(/^contractValue:/);
    expect(fail({ contractValue: '100.123' })).toBeNull();
  });

  it('dates: the end may equal but not precede the start', () => {
    expect(fail({ startDate: '2026-05-01', expectedEndDate: '2026-05-01' })).toBeNull();
    expect(fail({ startDate: '2026-05-01', expectedEndDate: '2026-04-30' })).toEqual([
      'expectedEndDate: تاريخ التسليم لا يسبق تاريخ البدء',
    ]);
    expect(fail({ startDate: '2026-05-01' })).toBeNull();
    expect(fail({ expectedEndDate: '2026-05-01' })).toBeNull();
  });

  it('dates: an impossible day fails on its own field', () => {
    expect(fail({ startDate: '2026-02-30' })?.[0]).toMatch(/^startDate:/);
    expect(fail({ expectedEndDate: 'غدا' })?.[0]).toMatch(/^expectedEndDate:/);
  });

  it('notes: 1000 characters at most', () => {
    expect(fail({ notes: 'ا'.repeat(1000) })).toBeNull();
    expect(fail({ notes: 'ا'.repeat(1001) })?.[0]).toMatch(/^notes:/);
  });

  it('status: only the three known values', () => {
    expect(fail({ status: 'paused' })).toBeNull();
    expect(fail({ status: 'archived' as never })?.[0]).toMatch(/^status:/);
  });
});
