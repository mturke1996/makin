import { describe, expect, it } from 'vitest';
import { countCaption, expenseCategoryLabel } from './recordLabels';

describe('expenseCategoryLabel', () => {
  it('names a category in Arabic, including the ones the shared table forgot', () => {
    expect(expenseCategoryLabel('materials')).toBe('توفير مواد خام متنوعة');
    expect(expenseCategoryLabel('government_fees')).toBe('رسوم حكومية');
    expect(expenseCategoryLabel('office_supplies')).toBe('قرطاسية ومكتبية');
    expect(expenseCategoryLabel('marketing')).toBe('تسويق');
  });

  it('keeps a category nobody knows as it was written', () => {
    expect(expenseCategoryLabel('custom_thing')).toBe('custom_thing');
  });
});

describe('countCaption', () => {
  it('counts in words like the rest of the profile', () => {
    expect(countCaption('expenses', 18, false)).toBe('18 مصروفاً');
    expect(countCaption('payments', 2, true)).toBe('دفعتان');
  });

  it('says there are no results when a filter leaves nothing, not that the list is empty', () => {
    expect(countCaption('expenses', 0, true)).toBe('لا نتائج');
    expect(countCaption('expenses', 0, false)).toBe('لا مصروفات بعد');
  });
});
