// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({ props: null as null | { onSubmit: (d: unknown) => Promise<void>; onClose: () => void; open: boolean } }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../../config/firebase', () => ({ db: {}, auth: {}, firebaseConfig: { projectId: 'demo-op' }, default: {} }));
vi.mock('../../../services/auditService', () => ({ writeAuditLog: vi.fn() }));
vi.mock('../../../services/storageService', () => ({ deleteStorageFileByUrl: vi.fn() }));
vi.mock('../../../services/firebaseService', () => {
  const service = () => ({ subscribe: () => () => undefined });
  return {
    clientsService: service(), invoicesService: service(), paymentsService: service(), expensesService: service(), standaloneDebtsService: service(),
    debtPartiesService: service(), expenseInvoicesService: service(), workersService: service(), userBalancesService: service(), lettersService: service(),
    projectPhasesService: service(), boqItemsService: service(), siteReportsService: service(), paymentMilestonesService: service(), workerAttendanceService: service(), suppliersService: service(),
    globalFundTransactionsService: service(), createExpenseInvoiceAtomic: vi.fn(), deleteExpenseInvoiceAtomic: vi.fn(), toConstraints: () => [], clearField: () => null,
  };
});
vi.mock('./ExpenseFormSheet', () => ({ ExpenseFormSheet: (props: never) => { captured.props = props; return null; } }));
vi.mock('./client-profile/useUsersDirectory', () => ({ useUsersDirectory: () => [] }));
vi.mock('../client-profile/useUsersDirectory', () => ({ useUsersDirectory: () => [] }));
vi.mock('../../../core/hooks/useMyFundStats', () => ({ useMyFundStats: () => null }));

import { useAuthStore } from '../../../stores/useAuthStore';
import { useDataStore } from '../../../stores/useDataStore';
import { ExpensesPage } from '../ExpensesPage';

let root: Root;
let host: HTMLDivElement;
const form = { description: 'خرسانة', amount: 500, category: 'concrete', date: '2026-10-25', notes: '', clientId: 'c1' };

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
  toast.success.mockReset(); toast.error.mockReset();
  useAuthStore.setState({ user: { id: 'u1', email: 'a@b.c', displayName: 'م', role: 'admin' } as never, isAuthenticated: true, isLoading: false });
  useDataStore.setState({ clients: [{ id: 'c1', name: 'فيلا' } as never], projectPhases: [], payments: [], expenses: [{ id: 'x', clientId: 'c1', amount: 1, category: 'cement', date: '2026-10-01', description: 'd', createdAt: '2026-10-01', updatedAt: '2026-10-01', isClosed: false, userId: 'u1' } as never], isLoading: false });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(MemoryRouter, null, createElement(ExpensesPage))));
});
afterEach(async () => { vi.useRealTimers(); await act(async () => root.unmount()); host.remove(); });

describe('saving a new expense', () => {
  it('repeats the SAME operation when «save» is pressed again, so it can never be recorded twice', async () => {
    const calls: Array<Record<string, unknown>> = [];
    useDataStore.setState({ addExpense: vi.fn(async (e: never) => { calls.push(e); if (calls.length === 1) throw Object.assign(new Error('slow'), { code: 'unavailable' }); }) });
    await act(async () => [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('مصروف جديد'))!.click());
    await expect(captured.props!.onSubmit(form)).rejects.toBeDefined();
    await captured.props!.onSubmit(form);
    expect(calls).toHaveLength(2);
    expect(calls[1].id).toBe(calls[0].id);
    expect(calls[1].createdAt).toBe(calls[0].createdAt);
    // the same operation, field for field: writing it again rewrites the same record
    expect({ ...calls[1], updatedAt: 0 }).toEqual({ ...calls[0], updatedAt: 0 });
  });

  it('starts a new operation once the form is closed or the expense is saved', async () => {
    const ids: unknown[] = [];
    useDataStore.setState({ addExpense: vi.fn(async (e: never) => { ids.push((e as { id: string }).id); }) });
    await act(async () => [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('مصروف جديد'))!.click());
    await captured.props!.onSubmit(form);
    await captured.props!.onSubmit(form);
    await act(async () => captured.props!.onClose());
    await captured.props!.onSubmit(form);
    expect(new Set(ids).size).toBe(3);
  });

  it('shows the failure to the form (it stays open) and the next press goes through', async () => {
    const calls: unknown[] = [];
    useDataStore.setState({ addExpense: vi.fn(async (e: never) => { calls.push(e); if (calls.length === 1) throw Object.assign(new Error('الاتصال بطيء'), { code: 'slow-network' }); }) });
    await act(async () => [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('مصروف جديد'))!.click());
    await expect(captured.props!.onSubmit(form)).rejects.toMatchObject({ code: 'slow-network' });
    await expect(captured.props!.onSubmit(form)).resolves.toBeUndefined();
    expect(calls).toHaveLength(2);
  });
});
