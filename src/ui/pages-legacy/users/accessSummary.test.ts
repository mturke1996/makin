import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS, DEFAULT_EMPLOYEE_PERMISSIONS, PERMISSION_TEMPLATES, type Permission } from '../../../core/access';
import {
  applyToggle,
  describeAccess,
  expenseVisibility,
  matchTemplate,
  permissionCountLabel,
} from './accessSummaryModel';

const template = (id: string) => PERMISSION_TEMPLATES.find((t) => t.id === id)!;

describe('permissionCountLabel', () => {
  it('uses the Arabic number forms', () => {
    expect(permissionCountLabel(0)).toBe('بلا صلاحيات');
    expect(permissionCountLabel(1)).toBe('صلاحية واحدة');
    expect(permissionCountLabel(2)).toBe('صلاحيتان');
    expect(permissionCountLabel(3)).toBe('3 صلاحيات');
    expect(permissionCountLabel(10)).toBe('10 صلاحيات');
    expect(permissionCountLabel(11)).toBe('11 صلاحية');
    expect(permissionCountLabel(26)).toBe('26 صلاحية');
  });
});

describe('matchTemplate', () => {
  it('finds every template from its own permissions, in any order', () => {
    for (const t of PERMISSION_TEMPLATES) {
      expect(matchTemplate(t.permissions)?.id).toBe(t.id);
      expect(matchTemplate([...t.permissions].reverse())?.id).toBe(t.id);
    }
  });

  it('ignores duplicates and unknown ids, but not a missing or extra permission', () => {
    expect(matchTemplate([...DEFAULT_EMPLOYEE_PERMISSIONS, 'clients.view', 'nonsense'])?.id).toBe('field');
    expect(matchTemplate([...DEFAULT_EMPLOYEE_PERMISSIONS, 'invoices.view'])).toBeNull();
    expect(matchTemplate(['clients.view', 'expenses.create'])).toBeNull();
    expect(matchTemplate(undefined)).toBeNull();
  });
});

describe('expenseVisibility', () => {
  it('derives the expense scope from the selection', () => {
    expect(expenseVisibility(['clients.view'])).toBe('none');
    expect(expenseVisibility(['expenses.create'])).toBe('own');
    expect(expenseVisibility(['expenses.view.all'])).toBe('all');
    expect(expenseVisibility(template('accountant').permissions)).toBe('all');
    expect(expenseVisibility(template('field').permissions)).toBe('own');
  });
});

describe('describeAccess', () => {
  it('admins have everything, whatever list is stored', () => {
    const d = describeAccess('admin', ['clients.view']);
    expect(d).toMatchObject({ kind: 'admin', label: 'كل الصلاحيات', count: ALL_PERMISSIONS.length, expenses: 'all' });
  });

  it('an employee without a stored list is "default" and carries the default set', () => {
    for (const stored of [undefined, null, 'x']) {
      const d = describeAccess('employee', stored);
      expect(d.kind).toBe('default');
      expect(d.label).toBe('الافتراضي');
      expect(d.permissions).toEqual(expect.arrayContaining([...DEFAULT_EMPLOYEE_PERMISSIONS]));
      expect(d.count).toBe(DEFAULT_EMPLOYEE_PERMISSIONS.length);
      expect(d.expenses).toBe('own');
    }
  });

  it('names the template when the stored set equals one', () => {
    const d = describeAccess('employee', template('accountant').permissions);
    expect(d).toMatchObject({ kind: 'template', label: 'محاسب', expenses: 'all' });
    expect(d.template?.id).toBe('accountant');
    expect(describeAccess('employee', [...DEFAULT_EMPLOYEE_PERMISSIONS]).label).toBe('موظف ميداني');
  });

  it('counts a custom set, closing it under prerequisites first', () => {
    // workers.manage pulls in workers.view, expenses.create and clients.view, so the stored list reads as 4.
    const d = describeAccess('employee', ['workers.manage']);
    expect(d).toMatchObject({ kind: 'custom', count: 4, label: '4 صلاحيات', expenses: 'own' });
  });

  it('an empty stored list is its own state, not "0 صلاحية"', () => {
    expect(describeAccess('employee', [])).toMatchObject({ kind: 'none', label: 'بلا صلاحيات', count: 0, expenses: 'none' });
  });
});

describe('applyToggle', () => {
  it('says nothing when only the tapped switch moved', () => {
    const r = applyToggle([], 'clients.view', true);
    expect(r.next).toEqual(['clients.view']);
    expect(r.alsoChanged).toEqual([]);
    expect(r.note).toBeNull();
  });

  it('turning on reports the prerequisites it switched on', () => {
    const r = applyToggle(['clients.view'], 'invoices.delete', true);
    expect(r.next).toEqual(['clients.view', 'invoices.view', 'invoices.manage', 'invoices.delete']);
    expect(r.alsoChanged).toEqual(['invoices.view', 'invoices.manage']);
    expect(r.note).toBe('تفعيل «حذف الفواتير» فعّل «عرض الفواتير» و«إنشاء الفواتير وتعديلها» تلقائياً');
  });

  it('does not report prerequisites that were already on', () => {
    const r = applyToggle(['clients.view', 'invoices.view'], 'invoices.manage', true);
    expect(r.alsoChanged).toEqual([]);
    expect(r.note).toBeNull();
  });

  it('turning off reports the dependents it switched off', () => {
    const all: Permission[] = ['payments.view', 'payments.manage', 'payments.delete'];
    const r = applyToggle(all, 'payments.view', false);
    expect(r.next).toEqual([]);
    expect(r.alsoChanged).toEqual(['payments.manage', 'payments.delete']);
    expect(r.note).toBe('إيقاف «عرض المدفوعات» أوقف «تسجيل المدفوعات وتعديلها» و«حذف المدفوعات» أيضاً');
  });

  it('joins three or more names with an Arabic comma', () => {
    const r = applyToggle([], 'expenses.delete.all', true);
    expect(r.alsoChanged).toEqual(['clients.view', 'expenses.create', 'expenses.view.all', 'expenses.edit.all']);
    expect(r.note).toContain('«عرض العملاء»، «تسجيل مصروفاته»، «عرض مصروفات الجميع» و«تعديل مصروفات الجميع»');
  });

  it('turning off a switch that nothing depends on changes only that switch', () => {
    const r = applyToggle(['clients.view', 'expenses.create'], 'expenses.create', false);
    expect(r.next).toEqual(['clients.view']);
    expect(r.note).toBeNull();
  });
});
