import { describe, expect, it } from 'vitest';
import type { Expense } from '../../types';
import { assessPrice, buildPriceBook, materialKey, medianPrice, normalizeMaterial, recentPriceSpikes, summarizeMaterial } from './priceTracking';

let n = 0;
const buy = (description: string, unitPrice: number, date: string, extra: Partial<Expense> = {}): Expense =>
  ({ id: `e${++n}`, clientId: 'c1', description, category: 'materials', amount: unitPrice * 10, quantity: 10, unitPrice, unit: 'كيس', date, createdAt: `${date}T08:00:00Z`, isClosed: false, ...extra }) as Expense;

describe('normalizeMaterial', () => {
  it('writes the same material the same way', () => {
    expect(normalizeMaterial('أسمنت  بورتلاندي')).toBe(normalizeMaterial('اسمنت بورتلاندي'));
    expect(normalizeMaterial('إسمنتٌ')).toBe('اسمنت');
    expect(normalizeMaterial('حديد ١٢ ملم')).toBe('حديد 12 ملم');
  });
  it('keeps sizes apart', () => {
    expect(normalizeMaterial('حديد 12 ملم')).not.toBe(normalizeMaterial('حديد 16 ملم'));
  });
});

describe('materialKey', () => {
  it('separates the same material sold by a different unit', () => {
    expect(materialKey({ description: 'أسمنت', category: 'materials', unit: 'كيس' })).not.toBe(materialKey({ description: 'أسمنت', category: 'materials', unit: 'طن' }));
  });
});

describe('buildPriceBook', () => {
  it('follows one material through time and projects, oldest first, and skips what has no quantity line', () => {
    const book = buildPriceBook([
      buy('اسمنت', 22, '2026-09-10'),
      buy('أسمنت', 20, '2026-08-01', { clientId: 'c2' }),
      { ...buy('نقل', 0, '2026-09-01'), quantity: undefined, unitPrice: undefined },
    ]);
    expect(book).toHaveLength(1);
    expect(book[0].points.map((p) => [p.date, p.unitPrice, p.clientId])).toEqual([['2026-08-01', 20, 'c2'], ['2026-09-10', 22, 'c1']]);
    expect(book[0].name).toBe('اسمنت');
  });
});

describe('medianPrice', () => {
  it('is not pulled by one odd purchase', () => {
    expect(medianPrice([20, 21, 22, 90])).toBe(21.5);
    expect(medianPrice([20, 21, 90])).toBe(21);
    expect(medianPrice([])).toBe(0);
  });
});

describe('assessPrice', () => {
  const book = buildPriceBook([buy('اسمنت', 20, '2026-08-01'), buy('اسمنت', 21, '2026-08-20'), buy('اسمنت', 22, '2026-09-10')])[0];

  it('says nothing until there are two earlier purchases to compare with', () => {
    const young = buildPriceBook([buy('رمل', 50, '2026-08-01')])[0];
    expect(assessPrice(young, 500).high).toBe(false);
    expect(assessPrice(undefined, 500)).toMatchObject({ priorCount: 0, change: null, high: false });
  });

  it('flags a price 15 percent or more above the usual one', () => {
    expect(assessPrice(book, 21).high).toBe(false);
    expect(assessPrice(book, 24.15)).toMatchObject({ usual: 21, high: true });
    expect(assessPrice(book, 24.15).change).toBeCloseTo(0.15, 5);
    expect(assessPrice(book, 24.14).high).toBe(false);
  });

  it('never flags a price that fell', () => {
    expect(assessPrice(book, 10)).toMatchObject({ high: false });
    expect(assessPrice(book, 10).change!).toBeLessThan(0);
  });

  it('compares only with purchases before a date, and not with itself', () => {
    expect(assessPrice(book, 30, { before: '2026-08-10' }).high).toBe(false); // only one earlier purchase
    expect(assessPrice(book, 30, { before: '2026-09-11' }).high).toBe(true);
    expect(assessPrice(book, 22, { before: '2026-09-11', excludeId: book.points[2].expenseId }).usual).toBe(20.5);
  });
});

describe('recentPriceSpikes', () => {
  const now = new Date('2026-10-25T09:00:00Z');
  const history = [buy('حديد 12', 3.2, '2026-08-01', { unit: 'كجم' }), buy('حديد 12', 3.3, '2026-09-01', { unit: 'كجم' }), buy('حديد 12', 3.25, '2026-09-20', { unit: 'كجم' })];

  it('finds a purchase of the last two weeks that cost clearly more than usual', () => {
    const spike = buy('حديد 12', 4.2, '2026-10-20', { unit: 'كجم' });
    const found = recentPriceSpikes([...history, spike], now);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ unitPrice: 4.2, usual: 3.25 });
    expect(found[0].change).toBeGreaterThan(0.29);
  });

  it('ignores an old spike and a normal purchase', () => {
    expect(recentPriceSpikes([...history, buy('حديد 12', 4.2, '2026-09-25', { unit: 'كجم' })], now)).toEqual([]);
    expect(recentPriceSpikes([...history, buy('حديد 12', 3.3, '2026-10-20', { unit: 'كجم' })], now)).toEqual([]);
  });
});

describe('summarizeMaterial', () => {
  it('gives the latest price, its range and the cheapest supplier', () => {
    const material = buildPriceBook([
      buy('اسمنت', 20, '2026-08-01', { supplierId: 's1', supplierName: 'مؤسسة النور' }),
      buy('اسمنت', 19, '2026-08-20', { supplierId: 's2', supplierName: 'مصنع الشرق' }),
      buy('اسمنت', 23, '2026-09-10', { supplierId: 's1', supplierName: 'مؤسسة النور' }),
    ])[0];
    const s = summarizeMaterial(material);
    expect(s).toMatchObject({ min: 19, max: 23, suppliers: 2, latest: { unitPrice: 23 } });
    expect(s.cheapest).toEqual({ name: 'مصنع الشرق', unitPrice: 19 });
    expect(s.high).toBe(true);
  });
});
