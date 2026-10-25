// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuickExpenseSheet from './QuickExpenseSheet';
import type { Client, Expense, ProjectPhase } from '../../types';
import { CONSTRUCTION_EXPENSE_CATEGORIES } from '../../core/expenseCategories';
const mocks = vi.hoisted(() => ({ add: vi.fn(), confirmed: vi.fn(), expenses: [] as Expense[], phases: [] as ProjectPhase[], clients: [] as Client[], scope: 'all' }));
vi.mock('../../config/firebase', () => ({ firebaseConfig: { projectId: 'demo-quick-ui' } }));
vi.mock('../../stores/useAuthStore', () => ({ useAuthStore: (select: (state: unknown) => unknown) => select({ user: { id: 'u1' } }) }));
vi.mock('../../stores/useDataStore', () => ({ useDataStore: (select: (state: unknown) => unknown) => select({ addExpense: mocks.add, projectPhases: mocks.phases }) }));
vi.mock('../../services/firebaseService', () => ({ expensesService: { getConfirmedById: mocks.confirmed } }));
vi.mock('./useQuickExpenseModel', () => ({ useQuickExpenseModel: () => ({ access: { can: () => true, expenseScope: mocks.scope }, me: { id: 'u1', name: 'عمر' }, owner: { id: 'u1', name: 'عمر' }, ownerIsMe: true, clients: mocks.clients, expenses: mocks.expenses, loading: false, canPickPerson: false, people: [], remaining: 1000 }) }));
let root: Root;
let host: HTMLDivElement;
function button(text: string) { const b = [...document.querySelectorAll('button')].find(el => el.textContent?.trim() === text); if (!b) throw new Error(`Missing button: ${text}`); return b; }
async function click(text: string) { await act(async () => { button(text).click(); }); }
async function input(label: string, value: string) {
  const el = [...document.querySelectorAll('label')].find(el => el.textContent === label);
  const field = el && document.getElementById(el.htmlFor) as HTMLInputElement;
  if (!field) throw new Error(`Missing input: ${label}`);
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function open() { host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => { root.render(createElement(QuickExpenseSheet, { open: true, onClose: vi.fn(), initialClientId: 'c1' })); }); }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
  localStorage.clear(); mocks.add.mockReset().mockResolvedValue(undefined); mocks.confirmed.mockReset().mockResolvedValue(null);
  mocks.expenses = []; mocks.phases = []; mocks.scope = 'all'; mocks.clients = [{ id: 'c1', name: 'الموقع الأول' } as Client];
});
afterEach(async () => { await act(async () => { root?.unmount(); }); document.body.innerHTML = ''; localStorage.clear(); vi.useRealTimers(); });
describe('quick expense user journey', () => {
  it('offers all clients and all categories, searches them and keeps both selections in the saved quantity expense', async () => {
    mocks.clients = Array.from({ length: 8 }, (_, i) => ({ id: `c${i + 1}`, name: `الموقع ${i + 1}` } as Client));
    await open();
    await act(async () => { document.querySelector<HTMLButtonElement>('[aria-label^="اختيار العميل:"]')!.click(); });
    const clientDialog = document.querySelector('[role="dialog"][aria-label="كل العملاء"]')!;
    for (const client of mocks.clients) expect(clientDialog.textContent).toContain(client.name);
    await act(async () => {
      const field = document.querySelector<HTMLInputElement>('[aria-label="بحث عن عميل"]')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, 'الموقع 8');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(clientDialog.textContent).toContain('عرض 1 من 8 عميل');
    await act(async () => { [...clientDialog.querySelectorAll<HTMLButtonElement>('button')].find((entry) => entry.textContent?.includes('الموقع 8'))!.click(); });
    await act(async () => { document.querySelector<HTMLButtonElement>('[aria-label^="اختيار فئة المصروف:"]')!.click(); });
    const categoryDialog = document.querySelector('[role="dialog"][aria-label="فئات مصروفات البناء"]')!;
    for (const category of CONSTRUCTION_EXPENSE_CATEGORIES) expect(categoryDialog.textContent).toContain(category.label);
    await act(async () => {
      const field = document.querySelector<HTMLInputElement>('[aria-label="بحث في فئات المصروفات"]')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, 'كابلات');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click('كابلات وأسلاك ولوحات كهرباء');
    await click('كمية × سعر'); await input('الكمية', '2'); await input('سعر الوحدة بالدينار', '7.5');
    await click('تسجيل المصروف');
    expect(mocks.add.mock.calls[0][0]).toMatchObject({ clientId: 'c8', category: 'cables', quantity: 2, unitPrice: 7.5, unit: 'm', amount: 15 });
  });
  function seedRepeat() {
    mocks.expenses = [{ id: 'old-operation', clientId: 'c1', userId: 'u1', createdBy: 'عمر', amount: 0.3, category: 'other', description: 'توريد سابق', quantity: 3, unitPrice: 0.1, unit: 'كيس', invoiceNumber: 'old-paper', notes: 'private-old-note', date: '2001-01-01', createdAt: '2001-01-01T12:00:00Z', phaseId: 'p1' } as Expense];
    mocks.phases = [{ id: 'p1', clientId: 'c1', name: 'الأساسات', budgetAmount: 1 } as ProjectPhase];
  }
  it('copies a previous expense into a reviewable draft and saves a fresh operation only on request', async () => {
    seedRepeat(); await open(); await click('إعادة استخدام مصروف سابق');
    const candidate = [...document.querySelectorAll<HTMLButtonElement>('button')].find(el => el.textContent?.includes('توريد سابق'))!;
    await act(async () => { candidate.click(); });
    expect(mocks.add).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('أثر المصروف على ميزانية المرحلة');
    expect(document.body.textContent).toContain('0.4');
    await click('تسجيل المصروف');
    const saved = mocks.add.mock.calls[0][0];
    expect(saved).toMatchObject({ clientId: 'c1', userId: 'u1', quantity: 3, unitPrice: 0.1, amount: 0.3, phaseId: 'p1' });
    expect(saved.invoiceNumber).toBeUndefined();
    expect(saved.id).not.toBe('old-operation');
    expect(saved.date).not.toBe('2001-01-01');
    expect(saved.notes).not.toBe('private-old-note');
    expect(document.querySelector('[role="status"]')?.textContent).toContain('0.3');
  });
  it('does not show a partial project budget to an employee with only personal expenses', async () => {
    seedRepeat(); mocks.scope = 'own'; await open(); await click('إعادة استخدام مصروف سابق');
    const candidate = [...document.querySelectorAll<HTMLButtonElement>('button')].find(el => el.textContent?.includes('توريد سابق'))!;
    await act(async () => { candidate.click(); });
    expect(document.body.textContent).not.toContain('أثر المصروف على ميزانية المرحلة');
    expect(mocks.add).not.toHaveBeenCalled();
  });
  it('records a quantity-backed expense for the profile client and shows confirmed success', async () => {
    await open(); await click('كمية × سعر'); await input('الكمية', '٣'); await input('سعر الوحدة بالدينار', '٠٫١'); await click('تسجيل المصروف');
    expect(mocks.add).toHaveBeenCalledTimes(1);
    expect(mocks.add.mock.calls[0][0]).toMatchObject({ clientId: 'c1', userId: 'u1', quantity: 3, unitPrice: 0.1, amount: 0.3 });
    expect(document.body.textContent).toContain('مصروف آخر');
  });
  it('keeps an uncertain operation immutable across closing and retrying, then accepts late success', async () => {
    vi.useFakeTimers(); let resolve!: () => void;
    const work = new Promise<void>(done => { resolve = done; }); mocks.add.mockReturnValue(work);
    await open(); await input('المبلغ بالدينار', '12.125'); await click('تسجيل المصروف');
    const sent = mocks.add.mock.calls[0][0];
    await act(async () => { await vi.advanceTimersByTimeAsync(15001); });
    expect(document.querySelector('fieldset')?.disabled).toBe(true);
    await act(async () => { root.unmount(); }); host.remove(); await open();
    await click('التحقق وإعادة المحاولة');
    expect(mocks.add.mock.calls[1][0]).toEqual(sent);
    await act(async () => { resolve(); await work; });
    expect(document.body.textContent).toContain('مصروف آخر');
    expect([...Array(localStorage.length)].map((_, i) => localStorage.key(i)).some(k => k?.startsWith('quick-expense:draft'))).toBe(false);
  });
});
