import { afterEach, describe, expect, it } from 'vitest';
import {
  CONSTRUCTION_EXPENSE_CATEGORIES,
  allExpenseCategories,
  categoryLabelProblem,
  customCategoryId,
  customExpenseCategories,
  expenseCategories,
  findCategoryByLabel,
  getExpenseCategory,
  getExpenseCategoryLabel,
  getExpenseCategoryShortLabel,
  normalizeCategoryLabel,
  registerCustomCategories,
} from './expenseCategories';

const cat = (label: string) => ({ id: customCategoryId(label), label, createdAt: '2026-10-26' });

afterEach(() => registerCustomCategories([]));

describe('categories added by the team', () => {
  it('are known to every label lookup at once, built in ones untouched', () => {
    const builtIn = CONSTRUCTION_EXPENSE_CATEGORIES.length;
    registerCustomCategories([cat('ستائر')]);
    const { id } = cat('ستائر');
    expect(getExpenseCategoryLabel(id)).toBe('ستائر');
    expect(getExpenseCategoryShortLabel(id)).toBe('ستائر');
    expect(expenseCategories[id]).toBe('ستائر');
    expect(getExpenseCategory(id)?.group).toBe('custom');
    expect(allExpenseCategories()).toHaveLength(builtIn + 1);
    expect(getExpenseCategoryLabel('cement')).toBe('أسمنت ومونة جاهزة');
    expect(CONSTRUCTION_EXPENSE_CATEGORIES).toHaveLength(builtIn);
  });

  it('are replaced, not piled up, on every snapshot', () => {
    registerCustomCategories([cat('ستائر'), cat('تأمين')]);
    expect(customExpenseCategories()).toHaveLength(2);
    registerCustomCategories([cat('تأمين')]);
    expect(customExpenseCategories().map((c) => c.label)).toEqual(['تأمين']);
    expect(expenseCategories[cat('ستائر').id]).toBeUndefined();
    expect(getExpenseCategoryLabel(cat('ستائر').id)).toBe(cat('ستائر').id);
  });

  it('ignore a malformed record instead of breaking the lists', () => {
    registerCustomCategories([{ id: 'custom_bad', label: '   ', createdAt: 'x' }, { id: 5 as never, label: 'x', createdAt: 'x' }, cat('سليمة')]);
    expect(customExpenseCategories().map((c) => c.label)).toEqual(['سليمة']);
  });
});

describe('the same name is the same category', () => {
  it('ignores spacing, the Arabic letter variants and case', () => {
    expect(normalizeCategoryLabel('  أسمنت   مسلح ')).toBe(normalizeCategoryLabel('اسمنت مسلح'));
    expect(normalizeCategoryLabel('مدرسة')).toBe(normalizeCategoryLabel('مدرسه'));
    expect(normalizeCategoryLabel('ABC')).toBe('abc');
  });

  it('finds a built in category by its full or short name', () => {
    expect(findCategoryByLabel('سباكة')?.id).toBe('plumbing');
    expect(findCategoryByLabel('اسمنت')?.id).toBe('cement');
    expect(findCategoryByLabel('مصروفات اخرى')?.id).toBe('other');
  });

  it('finds a legacy and a team-added category, and nothing for a new name', () => {
    expect(findCategoryByLabel('رسوم حكومية')?.id).toBe('government_fees');
    registerCustomCategories([cat('ستائر')]);
    expect(findCategoryByLabel('ستائـر')?.id).toBe(cat('ستائر').id);
    expect(findCategoryByLabel('اسم لا وجود له')).toBeUndefined();
    expect(findCategoryByLabel('   ')).toBeUndefined();
  });

  it('gives the same id for the same name wherever and whenever it is typed', () => {
    expect(customCategoryId('ستائر')).toBe(customCategoryId('  ستائر '));
    expect(customCategoryId('ستائر')).not.toBe(customCategoryId('ستائر مزدوجة'));
    expect(customCategoryId('ستائر')).toMatch(/^custom_[0-9a-f]{16}$/);
  });
});

describe('what a name may be', () => {
  it('needs two letters and at most sixty', () => {
    expect(categoryLabelProblem('')).toBeTruthy();
    expect(categoryLabelProblem(' ا ')).toBeTruthy();
    expect(categoryLabelProblem('ستائر')).toBeNull();
    expect(categoryLabelProblem('ا'.repeat(60))).toBeNull();
    expect(categoryLabelProblem('ا'.repeat(61))).toBeTruthy();
  });
});
