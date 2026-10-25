import { describe, expect, it } from 'vitest';
import type { Expense, Supplier } from '../../types';
import { buildSupplierRows, findSupplierByName, supplierExpenses, unlinkedPurchases } from './supplierLedger';

const sup = (id: string, name: string): Supplier => ({ id, name, createdAt: '', updatedAt: '' });
const exp = (id: string, amount: number, date: string, supplierId?: string, clientId = 'c1', extra: Partial<Expense> = {}): Expense =>
  ({ id, clientId, amount, date, supplierId, description: id, category: 'materials', createdAt: `${date}T08:00:00Z`, isClosed: false, ...extra }) as Expense;

describe('buildSupplierRows', () => {
  const rows = buildSupplierRows(
    [sup('s1', 'مؤسسة النور'), sup('s2', 'مصنع الشرق'), sup('s3', 'جديد')],
    [exp('a', 1000.1, '2026-09-01', 's1'), exp('b', 500.2, '2026-10-01', 's1', 'c2'), exp('c', 300, '2026-08-01', 's2'), exp('d', 77, '2026-10-02')],
  );

  it('totals what was bought from each, exactly, biggest first', () => {
    expect(rows.map((r) => [r.supplier.id, r.total, r.count])).toEqual([['s1', 1500.3, 2], ['s2', 300, 1], ['s3', 0, 0]]);
  });

  it('knows the last purchase and splits by project', () => {
    expect(rows[0].lastDate).toBe('2026-10-01');
    expect(rows[0].byClient).toEqual([{ clientId: 'c1', total: 1000.1, count: 1 }, { clientId: 'c2', total: 500.2, count: 1 }]);
    expect(rows[2].lastDate).toBeNull();
  });
});

describe('supplierExpenses and unlinkedPurchases', () => {
  const list = [exp('a', 1, '2026-09-01', 's1'), exp('b', 1, '2026-10-01', 's1'), exp('c', 1, '2026-10-05', 's2'), exp('d', 1, '2026-10-02', undefined, 'c1', { quantity: 5 }), exp('e', 1, '2026-10-02')];
  it('lists one supplier newest first', () => {
    expect(supplierExpenses('s1', list).map((e) => e.id)).toEqual(['b', 'a']);
  });
  it('counts material purchases not yet tied to a supplier', () => {
    expect(unlinkedPurchases(list)).toBe(1);
  });
});

describe('findSupplierByName', () => {
  const list = [sup('s1', 'مؤسسة الأمل للحديد')];
  it('finds the same supplier however it is typed', () => {
    expect(findSupplierByName(list, 'مؤسسه الامل للحديد')?.id).toBe('s1');
    expect(findSupplierByName(list, '  مؤسسة  الأمل للحديد ')?.id).toBe('s1');
    expect(findSupplierByName(list, 'غير موجود')).toBeUndefined();
    expect(findSupplierByName(list, '')).toBeUndefined();
  });
});
