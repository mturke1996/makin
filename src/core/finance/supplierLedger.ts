import type { Expense, Supplier } from '../../types';
import { fromMilli, toMilli } from './money';

/**
 * ما اشتُري من كل مورّد: المجموع وعدد المشتريات وآخر شراء، وتوزيعه على المشاريع. المرجع هو المصروف المرتبط
 * بمورّد (`supplierId`)، فلا يُخزَّن رصيد في المورّد نفسه. كل المصروفات تدخل في المجموع (المرفوض يبقى «مُعاد للتصحيح»
 * كما في حساب العميل).
 */

export interface SupplierRow {
  supplier: Supplier;
  total: number;
  count: number;
  /** تاريخ آخر شراء YYYY-MM-DD، أو null. */
  lastDate: string | null;
  /** المجموع لكل مشروع. */
  byClient: { clientId: string; total: number; count: number }[];
}

const dayOf = (value: string | undefined) => (value ?? '').slice(0, 10);

export function buildSupplierRows(suppliers: readonly Supplier[], expenses: readonly Expense[]): SupplierRow[] {
  const bySupplier = new Map<string, Expense[]>();
  for (const e of expenses) if (e.supplierId) bySupplier.set(e.supplierId, [...(bySupplier.get(e.supplierId) ?? []), e]);

  return suppliers
    .map((supplier): SupplierRow => {
      const own = bySupplier.get(supplier.id) ?? [];
      let total = 0;
      const clients = new Map<string, { total: number; count: number }>();
      let last: string | null = null;
      for (const e of own) {
        total += toMilli(e.amount);
        const c = clients.get(e.clientId) ?? { total: 0, count: 0 };
        c.total += toMilli(e.amount);
        c.count += 1;
        clients.set(e.clientId, c);
        const d = dayOf(e.date);
        if (d && (!last || d > last)) last = d;
      }
      return {
        supplier,
        total: fromMilli(total),
        count: own.length,
        lastDate: last,
        byClient: [...clients.entries()].map(([clientId, c]) => ({ clientId, total: fromMilli(c.total), count: c.count })).sort((a, b) => b.total - a.total),
      };
    })
    .sort((a, b) => b.total - a.total || a.supplier.name.localeCompare(b.supplier.name, 'ar'));
}

/** مصروفات مورّد واحد، الأحدث أولاً. */
export function supplierExpenses(supplierId: string, expenses: readonly Expense[]): Expense[] {
  return expenses
    .filter((e) => e.supplierId === supplierId)
    .sort((a, b) => dayOf(b.date).localeCompare(dayOf(a.date)) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

/** مصروفات بمواد (سطر كمية) لم تُربط بمورّد بعد: ما يلزم ربطه لتكتمل الصورة. */
export function unlinkedPurchases(expenses: readonly Expense[]): number {
  return expenses.filter((e) => !e.supplierId && (e.quantity ?? 0) > 0).length;
}

/** هل يوجد مورّد بهذا الاسم؟ (مقارنة بلا فروق همزات ومسافات) لمنع تكرار المورّد نفسه. */
export function findSupplierByName(suppliers: readonly Supplier[], name: string): Supplier | undefined {
  const norm = (t: string) => t.normalize('NFKC').replace(/[ً-ٟـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim().toLowerCase();
  const wanted = norm(name);
  return wanted ? suppliers.find((s) => norm(s.name) === wanted) : undefined;
}
