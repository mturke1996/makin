import { describe, expect, it } from 'vitest';
import type { Expense } from '../../types';
import { CONSTRUCTION_EXPENSE_CATEGORIES, EXPENSE_CATEGORY_GROUPS } from '../../core/expenseCategories';
import { calculateQuickQuantity, buildQuickExpense, sameQuickExpenseRequest } from './quickExpenseLogic';
import { readQuickDraft, writeQuickDraft, clearQuickDraft, type QuickDraft } from './quickDraft';
const record: Expense = { id: 'operation', clientId: 'client', userId: 'user', amount: 0.3, category: 'cement', description: 'أسمنت', date: '2026-10-24', createdAt: '2026-10-24T12:00:00Z', updatedAt: '2026-10-24T12:00:00Z', isClosed: false };
const draft: QuickDraft = { clientId: 'client', category: 'cement', mode: 'quantity', amount: '', quantity: '3', unitPrice: '0.1', unit: 'sack', description: '', invoiceNumber: '', notes: '', date: '2026-10-24', phaseId: '', personId: '', operation: record };
function storage() { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } }; }
describe('construction expense catalog, quantities and durable retries', () => {
  it('has unique stable construction IDs and every category belongs to a visible group', () => {
    expect(CONSTRUCTION_EXPENSE_CATEGORIES.length).toBeGreaterThanOrEqual(50);
    expect(new Set(CONSTRUCTION_EXPENSE_CATEGORIES.map(c => c.id)).size).toBe(CONSTRUCTION_EXPENSE_CATEGORIES.length);
    expect(CONSTRUCTION_EXPENSE_CATEGORIES.every(c => EXPENSE_CATEGORY_GROUPS.some(g => g.id === c.group))).toBe(true);
  });
  it('parses Arabic/Persian quantities and prices with exact final milli rounding', () => {
    expect(calculateQuickQuantity('٣', '٠٫١')).toEqual({ quantity: 3, unitPrice: 0.1, amount: 0.3 });
    expect(calculateQuickQuantity('۲٫۵', '٣٫٣٣٣').amount).toBe(8.333);
    expect(calculateQuickQuantity('0.0000001', '5').error).toBeTruthy();
    expect(calculateQuickQuantity('1', '0.0001').error).toBeTruthy();
    expect(calculateQuickQuantity('0', '5').error).toBeTruthy();
  });
  it('builds the same quantity-backed record as the full expense journey', () => {
    const value = buildQuickExpense({ id: 'q', now: new Date(record.createdAt), owner: { id: 'user', name: 'عمر' }, clientId: 'client', amount: 999, category: 'cement', description: '', fallbackDescription: 'أسمنت', invoiceNumber: '', quantity: 3, unitPrice: 0.1, unit: 'sack', phaseId: 'foundation', notes: 'توريد' });
    expect(value.amount).toBe(0.3); expect(value.phaseId).toBe('foundation'); expect(value.notes).toBe('توريد');
    expect(sameQuickExpenseRequest(value, { ...value, isClosed: true, updatedAt: 'later' })).toBe(true);
    expect(sameQuickExpenseRequest(value, { ...value, amount: 999 })).toBe(false);
  });
  it('isolates drafts by Firebase project and user and never clears a newer operation', () => {
    const s = storage();
    expect(writeQuickDraft('project1', 'user1', draft, s)).toBe(true);
    expect(readQuickDraft('project1', 'user1', s)?.operation?.id).toBe('operation');
    expect(readQuickDraft('project2', 'user1', s)).toBeNull(); expect(readQuickDraft('project1', 'user2', s)).toBeNull();
    clearQuickDraft('project1', 'user1', 'old-operation', s); expect(readQuickDraft('project1', 'user1', s)).not.toBeNull();
    clearQuickDraft('project1', 'user1', 'operation', s); expect(readQuickDraft('project1', 'user1', s)).toBeNull();
  });
});
