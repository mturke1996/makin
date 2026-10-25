import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_TEMPLATES,
  PERMISSIONS,
  normalizePermissions,
} from '../../core/access/permissions';
import { LEVEL_RUNGS, rungPermissions, templateLevel, templateMatrix } from './accessMatrix';

const template = (id: string) => PERMISSION_TEMPLATES.find((t) => t.id === id)!;

describe('accessMatrix', () => {
  it('lists every permission of the catalog exactly once, in its own group', () => {
    const listed = rungPermissions();
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(PERMISSIONS.map((p) => p.id).sort());
    for (const def of PERMISSIONS) {
      expect(LEVEL_RUNGS[def.group].some(([permission]) => permission === def.id)).toBe(true);
    }
  });

  it('reads the reach of a template inside an area', () => {
    const field = template('field').permissions;
    expect(templateLevel(field, 'clients')).toEqual({ level: 'view', label: 'عرض' });
    expect(templateLevel(field, 'expenses')).toEqual({ level: 'view', label: 'مصروفاته فقط' });
    expect(templateLevel(field, 'custody')).toEqual({ level: 'view', label: 'عهدته فقط' });
    expect(templateLevel(field, 'payments').level).toBe('none');
    expect(templateLevel(field, 'payments').label).toBe('');
  });

  it('shows the highest rung a template holds, never a lower one', () => {
    const accountant = template('accountant').permissions;
    expect(templateLevel(accountant, 'clients').level).toBe('manage');
    expect(templateLevel(accountant, 'expenses')).toEqual({ level: 'manage', label: 'تعديل الكل' });
    // the accountant template carries no delete rights anywhere
    for (const group of PERMISSION_GROUPS) expect(templateLevel(accountant, group.id).level).not.toBe('delete');
  });

  it('puts the viewer on look-only everywhere it has access', () => {
    const viewer = template('viewer').permissions;
    for (const group of PERMISSION_GROUPS) {
      const { level } = templateLevel(viewer, group.id);
      expect(['none', 'view']).toContain(level);
    }
    expect(templateLevel(viewer, 'expenses').label).toBe('عرض الكل');
  });

  it('builds one row per group and one cell per template', () => {
    const matrix = templateMatrix(PERMISSION_GROUPS, PERMISSION_TEMPLATES);
    expect(matrix.map((row) => row.id)).toEqual(PERMISSION_GROUPS.map((g) => g.id));
    for (const row of matrix) expect(row.cells).toHaveLength(PERMISSION_TEMPLATES.length);
  });

  it('agrees with the default employee set', () => {
    const resolved = normalizePermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
    expect(templateLevel(resolved, 'clients').level).toBe('view');
    expect(templateLevel(resolved, 'invoices').level).toBe('none');
  });
});
