// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../config/firebase', () => ({ db: {}, auth: {}, firebaseConfig: { projectId: 'demo-money' }, default: {} }));
vi.mock('../../../services/auditService', () => ({ writeAuditLog: vi.fn() }));
vi.mock('../../../services/storageService', () => ({ deleteStorageFileByUrl: vi.fn() }));
vi.mock('../../../services/firebaseService', () => {
  const service = () => ({ subscribe: () => () => undefined });
  return {
    clientsService: service(), invoicesService: service(), paymentsService: service(), expensesService: service(), standaloneDebtsService: service(),
    debtPartiesService: service(), expenseInvoicesService: service(), workersService: service(), userBalancesService: service(), lettersService: service(),
    projectPhasesService: service(), boqItemsService: service(), siteReportsService: service(), paymentMilestonesService: service(), workerAttendanceService: service(), suppliersService: service(), customCategoriesService: service(),
    globalFundTransactionsService: service(), createExpenseInvoiceAtomic: vi.fn(), deleteExpenseInvoiceAtomic: vi.fn(), toConstraints: () => [],
    clearField: () => null,
  };
});
vi.mock('./useReceipt', () => ({ useReceipt: () => ({ canIssue: false, busyId: null, issue: vi.fn(), live: (p: unknown) => p }) }));
vi.mock('../client-profile/useUsersDirectory', () => ({ useUsersDirectory: () => [] }));
vi.mock('../../../core/hooks/useMyFundStats', () => ({ useMyFundStats: () => null }));

import { useAuthStore } from '../../../stores/useAuthStore';
import { useDataStore } from '../../../stores/useDataStore';
import { PaymentsPage } from '../PaymentsPage';
import { ExpensesPage } from '../ExpensesPage';

let root: Root;
let host: HTMLDivElement;
const NOW = new Date();
const dayAgo = (n: number) => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

const payment = (id: string, ago: number, amount: number, method: string, clientId = 'c1') =>
  ({ id, clientId, invoiceId: '', amount, paymentMethod: method, paymentDate: dayAgo(ago), createdAt: `${dayAgo(ago)}T10:00:00Z`, updatedAt: `${dayAgo(ago)}T10:00:00Z`, createdBy: 'م' }) as never;
const expense = (id: string, ago: number, amount: number, category: string, extra: Record<string, unknown> = {}) =>
  ({ id, clientId: 'c1', description: `بند ${id}`, amount, category, date: dayAgo(ago), createdAt: `${dayAgo(ago)}T10:00:00Z`, updatedAt: `${dayAgo(ago)}T10:00:00Z`, isClosed: false, userId: 'u-admin', createdBy: 'م', ...extra }) as never;

const signIn = (role: 'admin' | 'employee', permissions?: string[]) =>
  useAuthStore.setState({ user: { id: role === 'admin' ? 'u-admin' : 'u-emp', email: 'a@b.c', displayName: 'م', role, ...(permissions ? { permissions } : {}) } as never, isAuthenticated: true, isLoading: false });

async function mount(page: typeof PaymentsPage) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(MemoryRouter, null, createElement(page))));
}
const text = () => host.textContent!.replace(/\s+/g, ' ');
const kpis = () => host.querySelector('section[aria-label^="مؤشرات"]');

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
  window.scrollTo = vi.fn() as never;
  localStorage.clear();
  useDataStore.setState({ clients: [{ id: 'c1', name: 'فيلا خالد' } as never], invoices: [], projectPhases: [], payments: [], expenses: [], isLoading: false });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

describe('PaymentsPage', () => {
  beforeEach(() => signIn('admin'));

  it('opens with the home page\'s statistic cards: this month with its change and curve, total, average, last', async () => {
    useDataStore.setState({ payments: [payment('a', 0, 1000, 'cash'), payment('b', 1, 2000, 'bank_transfer'), payment('c', 40, 500, 'cash'), payment('d', 70, 250.5, 'check')] });
    await mount(PaymentsPage);
    const grid = kpis()!;
    expect(grid).not.toBeNull();
    expect(grid.querySelectorAll('.rounded-lg.border')).toHaveLength(4);
    expect(text()).toContain('المحصّل هذا الشهر');
    expect(text()).toContain('إجمالي المحصّل');
    expect(text()).toContain('3,750.5');
    expect(text()).toContain('4 دفعات');
    expect(text()).toContain('متوسط الدفعة');
    expect(text()).toContain('937.625');
    expect(text()).toContain('فيلا خالد');
    // monthly curve + cumulative curve + the bars of the latest payments
    expect(grid.querySelectorAll('[role="img"]').length).toBeGreaterThanOrEqual(3);
  });

  it('shows where the money came in by, with shares that add up to 100, and filters by tapping a method', async () => {
    useDataStore.setState({ payments: [payment('a', 0, 100, 'cash'), payment('b', 1, 100, 'bank_transfer'), payment('c', 2, 100, 'check')] });
    await mount(PaymentsPage);
    const region = host.querySelector('section[aria-label="المدفوعات حسب طريقة الدفع"]')!;
    expect(region).not.toBeNull();
    const labels = [...region.querySelectorAll('li span.text-xs bdi')].map((el) => Number(el.textContent!.replace('%', '')));
    expect(labels.reduce((a, b) => a + b, 0)).toBe(100);
    expect(region.textContent).toContain('3 طرق');
    const before = host.querySelectorAll('button[aria-label^="تعديل دفعة"]').length;
    await act(async () => region.querySelector<HTMLButtonElement>('li button')!.click());
    const after = host.querySelectorAll('button[aria-label^="تعديل دفعة"]').length;
    expect(before).toBe(3);
    expect(after).toBe(1);
  });

  it('draws a page of rows at a time, keeps the month totals whole, and shows the rest on request', async () => {
    const many = Array.from({ length: 150 }, (_, i) => ({ ...(payment(`p${i}`, 0, 10, 'cash') as object), paymentDate: '2026-03-15' }) as never);
    useDataStore.setState({ payments: many });
    await mount(PaymentsPage);
    const rows = () => host.querySelectorAll('button[aria-label^="تعديل دفعة"]').length;
    expect(rows()).toBe(60);
    expect(text()).toContain('متبقٍ 90 دفعة');
    // the heading of a month still counts every payment of that month, not just the drawn ones
    expect(text()).toContain('150 دفعات · 1,500');
    await act(async () => [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('دفعة أخرى'))!.click());
    expect(rows()).toBe(120);
    await act(async () => [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('دفعة أخرى'))!.click());
    expect(rows()).toBe(150);
    expect(text()).not.toContain('لم تُعرض بعد');
  });

  it('has no cards for an empty page, only the way to add the first payment', async () => {
    await mount(PaymentsPage);
    expect(kpis()).toBeNull();
    expect(text()).toContain('لا توجد مدفوعات بعد');
    expect(text()).toContain('أضف أول دفعة');
  });

  it('shows the loading silhouette, not zeros, while the first data arrives', async () => {
    useDataStore.setState({ isLoading: true, payments: [] });
    await mount(PaymentsPage);
    expect(host.querySelector('[role="status"][aria-label="جارٍ التحميل"]')).not.toBeNull();
    expect(kpis()).toBeNull();
  });
});

describe('ExpensesPage', () => {
  const rows = () => [
    expense('1', 0, 6000, 'rebar'), expense('2', 2, 4000, 'cement'), expense('3', 35, 2000, 'rebar'),
    expense('4', 3, 1500, 'labor', { approvalStatus: 'pending' }),
  ];

  it('opens with the same statistic cards: total, this month with its change, average or waiting, biggest category', async () => {
    signIn('admin');
    useDataStore.setState({ expenses: rows() });
    await mount(ExpensesPage);
    const grid = kpis()!;
    expect(grid.querySelectorAll('.rounded-lg.border')).toHaveLength(4);
    expect(text()).toContain('إجمالي المصروفات');
    expect(text()).toContain('13,500');
    expect(text()).toContain('أكبر تصنيف');
    expect(text()).toContain('متوسط السجل');
    expect(grid.querySelectorAll('[role="img"]').length).toBeGreaterThanOrEqual(3);
  });

  it('does not say «waiting for approval» twice for someone who approves: the banner has it, the card is the average', async () => {
    signIn('admin');
    useDataStore.setState({ expenses: rows() });
    await mount(ExpensesPage);
    expect(text()).toContain('بانتظار اعتمادك');
    expect(kpis()!.textContent).not.toContain('بانتظار الاعتماد');
    expect(kpis()!.textContent).toContain('متوسط السجل');
  });

  it('tells the person whose expenses wait that they are waiting, with a tap to see them', async () => {
    signIn('employee', ['expenses.view.own', 'expenses.create']);
    useDataStore.setState({ expenses: [expense('9', 1, 800, 'cement', { userId: 'u-emp', approvalStatus: 'pending' }), expense('8', 2, 200, 'cement', { userId: 'u-emp' })] });
    await mount(ExpensesPage);
    const card = [...kpis()!.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('بانتظار الاعتماد'))!;
    expect(card).toBeDefined();
    expect(card.textContent).toContain('800');
    expect(text()).toContain('إجمالي مصروفاتي');
    expect(host.querySelector<HTMLSelectElement>('select[aria-label="تصفية حسب حالة الاعتماد"]')!.value).toBe('all');
    await act(async () => card.click());
    expect(host.querySelector<HTMLSelectElement>('select[aria-label="تصفية حسب حالة الاعتماد"]')!.value).toBe('pending');
    expect(text()).toContain('بند 9');
    expect(text()).not.toContain('بند 8');
  });

  it('filters the list to the biggest category when its card is tapped, and clears it on a second tap', async () => {
    signIn('admin');
    useDataStore.setState({ expenses: rows() });
    await mount(ExpensesPage);
    const shown = () => (host.textContent!.match(/بند \d/g) ?? []).length;
    const card = [...kpis()!.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('أكبر تصنيف'))!;
    const select = host.querySelector<HTMLSelectElement>('select[aria-label="تصفية حسب التصنيف"]')!;
    expect(select.value).toBe('all');
    expect(shown()).toBe(4);
    await act(async () => card.click());
    expect(host.querySelector<HTMLSelectElement>('select[aria-label="تصفية حسب التصنيف"]')!.value).toBe('rebar');
    expect(shown()).toBe(2);
    await act(async () => [...kpis()!.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('أكبر تصنيف'))!.click());
    expect(host.querySelector<HTMLSelectElement>('select[aria-label="تصفية حسب التصنيف"]')!.value).toBe('all');
    expect(shown()).toBe(4);
  });

  it('draws a page of rows at a time and says how many wait', async () => {
    signIn('admin');
    useDataStore.setState({ expenses: Array.from({ length: 130 }, (_, i) => expense(`${i}`, i % 30, 5, 'cement')) });
    await mount(ExpensesPage);
    const shown = () => (host.textContent!.match(/بند \d+/g) ?? []).length;
    expect(shown()).toBe(60);
    expect(text()).toContain('متبقٍ 70 مصروف');
    await act(async () => [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('مصروف أخرى'))!.click());
    expect(shown()).toBe(120);
    // a new filter starts the count over
    const select = host.querySelector<HTMLSelectElement>('select[aria-label="تصفية حسب التصنيف"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, 'cement');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(shown()).toBe(60);
  });

  it('has no cards for an empty page', async () => {
    signIn('admin');
    await mount(ExpensesPage);
    expect(kpis()).toBeNull();
    expect(text()).toContain('لا توجد مصروفات بعد');
  });
});
