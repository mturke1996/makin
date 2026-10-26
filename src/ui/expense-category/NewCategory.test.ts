// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() }, add: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: h.toast }));
vi.mock('../../config/firebase', () => ({ db: {}, firebaseConfig: { projectId: 'demo-newcat' }, default: {} }));
vi.mock('../../services/auditService', () => ({ writeAuditLog: vi.fn() }));
vi.mock('../../services/storageService', () => ({ deleteStorageFileByUrl: vi.fn() }));
vi.mock('../../services/firebaseService', () => {
  const service = (extra: Record<string, unknown> = {}) => ({ subscribe: () => () => undefined, add: vi.fn(), update: vi.fn(), delete: vi.fn(), ...extra });
  return {
    clientsService: service(), invoicesService: service(), paymentsService: service(), expensesService: service(), standaloneDebtsService: service(),
    debtPartiesService: service(), expenseInvoicesService: service(), workersService: service(), userBalancesService: service(), lettersService: service(),
    projectPhasesService: service(), boqItemsService: service(), siteReportsService: service(), paymentMilestonesService: service(), workerAttendanceService: service(),
    suppliersService: service(), customCategoriesService: service({ add: h.add, getById: vi.fn().mockResolvedValue(null) }), globalFundTransactionsService: service(),
    createExpenseInvoiceAtomic: vi.fn(), deleteExpenseInvoiceAtomic: vi.fn(), toConstraints: () => [],
  };
});

import { CategoryChoice } from '../quick-expense/CategoryChoice';
import { NewCategoryLink } from './NewCategory';
import { useDataStore } from '../../stores/useDataStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { customCategoryId } from '../../core/expenseCategories';

let root: Root;
let host: HTMLDivElement;
const setValue = (field: HTMLInputElement, value: string) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); };
const button = (text: string | RegExp) => {
  const found = [...document.querySelectorAll('button')].find((b) => (typeof text === 'string' ? b.textContent?.trim() === text : text.test(b.textContent ?? '')));
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
};
const nameField = () => document.querySelector<HTMLInputElement>('input[placeholder^="مثل: ستائر"]')!;
async function render(node: ReturnType<typeof createElement>) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => { root.render(node); }); }

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
  Object.values(h.toast).forEach((f) => f.mockReset());
  h.add.mockReset().mockResolvedValue('x');
  useDataStore.getState().reset();
  useAuthStore.setState({ user: { id: 'u1', email: 'a@b.c', displayName: 'م', role: 'admin' } as never, isAuthenticated: true, isLoading: false });
});
afterEach(async () => { await act(async () => { root?.unmount(); }); document.body.innerHTML = ''; });

describe('«the category is not there? add it» under a category select', () => {
  it('opens a name field, saves the category and hands back its id', async () => {
    const onCreated = vi.fn();
    await render(createElement(NewCategoryLink, { onCreated }));
    expect(nameField()).toBeNull();
    await act(async () => { button(/أضف فئة جديدة/).click(); });
    await act(async () => { setValue(nameField(), 'ستائر خارجية'); });
    await act(async () => { button('إضافة الفئة واختيارها').click(); });
    expect(h.add).toHaveBeenCalledOnce();
    expect(onCreated).toHaveBeenCalledWith(customCategoryId('ستائر خارجية'));
    expect(nameField()).toBeNull();
  });

  it('says why a name is refused and writes nothing', async () => {
    const onCreated = vi.fn();
    await render(createElement(NewCategoryLink, { onCreated }));
    await act(async () => { button(/أضف فئة جديدة/).click(); });
    await act(async () => { setValue(nameField(), 'ا'); });
    await act(async () => { button('إضافة الفئة واختيارها').click(); });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('حرفان');
    expect(h.add).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('tells the person a name already exists and picks that one instead of adding a copy', async () => {
    const onCreated = vi.fn();
    await render(createElement(NewCategoryLink, { onCreated }));
    await act(async () => { button(/أضف فئة جديدة/).click(); });
    await act(async () => { setValue(nameField(), 'سباكة'); });
    expect(document.body.textContent).toContain('موجودة مسبقاً');
    await act(async () => { button('اختيار الفئة').click(); });
    expect(onCreated).toHaveBeenCalledWith('plumbing');
    expect(h.add).not.toHaveBeenCalled();
  });

  it('Enter adds the category and does not send the form around it', async () => {
    const onCreated = vi.fn();
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    await render(createElement('form', { onSubmit }, createElement(NewCategoryLink, { onCreated })));
    await act(async () => { button(/أضف فئة جديدة/).click(); });
    await act(async () => { setValue(nameField(), 'عزل صوتي'); });
    await act(async () => { nameField().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledWith(customCategoryId('عزل صوتي'));
  });

  it('keeps the form and shows the failure when the server refuses', async () => {
    h.add.mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }));
    const onCreated = vi.fn();
    await render(createElement(NewCategoryLink, { onCreated }));
    await act(async () => { button(/أضف فئة جديدة/).click(); });
    await act(async () => { setValue(nameField(), 'فئة ممنوعة'); });
    await act(async () => { button('إضافة الفئة واختيارها').click(); });
    expect(onCreated).not.toHaveBeenCalled();
    expect(nameField().value).toBe('فئة ممنوعة');
    expect(h.toast.error).toHaveBeenCalled();
  });
});

describe('the quick expense category picker', () => {
  const props = (onChange = vi.fn()) => ({ value: 'cement', onChange, favorites: [], onToggleFavorite: vi.fn() });

  it('offers adding a category when the search finds nothing, with what was typed already filled in', async () => {
    const onChange = vi.fn();
    await render(createElement(CategoryChoice, props(onChange)));
    await act(async () => { document.querySelector<HTMLButtonElement>('[aria-label^="اختيار فئة المصروف"]')!.click(); });
    await act(async () => { setValue(document.querySelector<HTMLInputElement>('[aria-label="بحث في فئات المصروفات"]')!, 'مظلات سيارات'); });
    expect(document.body.textContent).toContain('لا توجد فئة مطابقة');
    const field = [...document.querySelectorAll<HTMLInputElement>('input')].find((i) => i.value === 'مظلات سيارات' && i.placeholder.startsWith('مثل: ستائر'))!;
    expect(field).toBeTruthy();
    await act(async () => { button('إضافة الفئة واختيارها').click(); });
    expect(h.add.mock.calls[0][0]).toMatchObject({ label: 'مظلات سيارات' });
    expect(onChange).toHaveBeenCalledWith(customCategoryId('مظلات سيارات'));
    expect(document.querySelector('[aria-label^="اختيار فئة المصروف"]')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('lists a category added earlier under its own group, and counts it', async () => {
    await render(createElement(CategoryChoice, props()));
    const id = await useDataStore.getState().addCustomCategory('تركيب مصاعد');
    await act(async () => { document.querySelector<HTMLButtonElement>('[aria-label^="اختيار فئة المصروف"]')!.click(); });
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector('section[aria-label="فئات أضافها الفريق"]')?.textContent).toContain('تركيب مصاعد');
    expect(id).toBe(customCategoryId('تركيب مصاعد'));
  });
});
