// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ update: vi.fn(), updateMany: vi.fn(), remove: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: h.toast }));
vi.mock('../../../config/firebase', () => ({ db: {}, auth: {}, firebaseConfig: { projectId: 'demo-approve' }, default: {} }));
vi.mock('../../../services/auditService', () => ({ writeAuditLog: vi.fn() }));
vi.mock('../../../services/storageService', () => ({ deleteStorageFileByUrl: vi.fn() }));
vi.mock('../../../services/firebaseService', () => {
  const service = (extra: Record<string, unknown> = {}) => ({ subscribe: () => () => undefined, add: vi.fn(), update: vi.fn(), delete: vi.fn(), ...extra });
  return {
    clientsService: service(), invoicesService: service(), paymentsService: service(), expensesService: service({ update: h.update, updateMany: h.updateMany, delete: h.remove, add: vi.fn() }),
    standaloneDebtsService: service(), debtPartiesService: service(), expenseInvoicesService: service(), workersService: service(), userBalancesService: service(),
    lettersService: service(), projectPhasesService: service(), boqItemsService: service(), siteReportsService: service(), paymentMilestonesService: service(),
    workerAttendanceService: service(), suppliersService: service(), customCategoriesService: service(), globalFundTransactionsService: service(),
    createExpenseInvoiceAtomic: vi.fn(), deleteExpenseInvoiceAtomic: vi.fn(), toConstraints: () => [], clearField: () => null,
  };
});
vi.mock('./useReceipt', () => ({ useReceipt: () => ({ canIssue: false, busyId: null, issue: vi.fn(), live: (p: unknown) => p }) }));
vi.mock('../client-profile/useUsersDirectory', () => ({ useUsersDirectory: () => [] }));
vi.mock('../../../core/hooks/useMyFundStats', () => ({ useMyFundStats: () => null }));

import { useAuthStore } from '../../../stores/useAuthStore';
import { useDataStore } from '../../../stores/useDataStore';
import { ExpensesPage } from '../ExpensesPage';

let root: Root;
let host: HTMLDivElement;
const exp = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, clientId: 'c1', description: `بند ${id}`, amount: 100, category: 'cement', date: '2026-10-20', createdAt: '2026-10-20T10:00:00Z', updatedAt: '2026-10-20T10:00:00Z', isClosed: false, userId: 'u-field', createdBy: 'علي', approvalStatus: 'pending', ...extra }) as never;
const signIn = (id: string, role: 'admin' | 'employee', permissions?: string[]) =>
  useAuthStore.setState({ user: { id, email: 'a@b.c', displayName: 'المحاسب', role, ...(permissions ? { permissions } : {}) } as never, isAuthenticated: true, isLoading: false });
const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('button')];
const byLabel = (label: string) => host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const byText = (text: string) => buttons().find((b) => b.textContent?.trim() === text);
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

async function mount(expenses: unknown[]) {
  useDataStore.setState({ clients: [{ id: 'c1', name: 'فيلا' } as never], projectPhases: [], payments: [], expenses: expenses as never[], isLoading: false });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(MemoryRouter, null, createElement(ExpensesPage))));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
  window.scrollTo = vi.fn() as never;
  localStorage.clear();
  h.update.mockReset().mockResolvedValue(undefined);
  h.updateMany.mockReset().mockResolvedValue(undefined);
  h.remove.mockReset().mockResolvedValue(undefined);
  Object.values(h.toast).forEach((f) => f.mockReset());
  signIn('u-acct', 'admin');
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

const approvedPatch = { approvalStatus: 'approved', reviewedBy: 'u-acct', reviewedByName: 'المحاسب', rejectionReason: null };

describe('approving an expense', () => {
  it('the row\'s check button approves it: one batch, under the approver\'s own uid, clearing any old reason', async () => {
    await mount([exp('1')]);
    const button = byLabel('اعتماد مصروف بند 1');
    expect(button).toBeTruthy();
    await act(async () => button!.click());
    await flush();
    expect(h.updateMany).toHaveBeenCalledOnce();
    const [ids, patch] = h.updateMany.mock.calls[0];
    expect(ids).toEqual(['1']);
    expect(patch).toMatchObject(approvedPatch);
    expect(typeof patch.reviewedAt).toBe('string');
    expect(h.toast.success).toHaveBeenCalledWith(expect.stringContaining('تم اعتماد المصروف «بند 1»'));
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it('a phone gets its own «اعتماد» button under the row (the check on the right is for wide screens)', async () => {
    await mount([exp('1')]);
    const phone = [...host.querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.textContent?.trim() === 'اعتماد' && !b.closest('[role="dialog"]'));
    expect(phone).toHaveLength(1);
    await act(async () => phone[0].click());
    await flush();
    expect(h.updateMany).toHaveBeenCalledOnce();
  });

  it('shows that it is working and ignores a second press until it is done', async () => {
    let finish!: () => void;
    h.updateMany.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    await mount([exp('1')]);
    await act(async () => byLabel('اعتماد مصروف بند 1')!.click());
    expect(byLabel('اعتماد مصروف بند 1')!.disabled).toBe(true);
    expect(byLabel('اعتماد مصروف بند 1')!.getAttribute('aria-busy')).toBe('true');
    await act(async () => byLabel('اعتماد مصروف بند 1')!.click());
    expect(h.updateMany).toHaveBeenCalledOnce();
    await act(async () => { finish(); });
    await flush();
    expect(byLabel('اعتماد مصروف بند 1')!.disabled).toBe(false);
  });

  it('the review panel of the open expense approves it', async () => {
    await mount([exp('2')]);
    await act(async () => buttons().find((b) => b.getAttribute('aria-label')?.startsWith('تعديل مصروف بند 2'))!.click());
    expect(document.body.textContent).toContain('بانتظار الاعتماد');
    const approve = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'اعتماد' && b.closest('[role="dialog"]'));
    expect(approve).toBeTruthy();
    await act(async () => approve!.click());
    await flush();
    expect(h.updateMany).toHaveBeenCalledOnce();
    expect(h.updateMany.mock.calls[0][0]).toEqual(['2']);
    expect(h.updateMany.mock.calls[0][1]).toMatchObject(approvedPatch);
  });

  it('«اعتماد الكل» approves every waiting expense that is shown, in one batch', async () => {
    await mount([exp('3'), exp('4'), exp('5', { approvalStatus: 'approved' })]);
    await act(async () => byText('مراجعة')!.click());
    await act(async () => buttons().find((b) => b.textContent?.includes('اعتماد الكل'))!.click());
    await act(async () => byText('تأكيد الاعتماد')!.click());
    await flush();
    expect(h.updateMany).toHaveBeenCalledOnce();
    expect([...h.updateMany.mock.calls[0][0]].sort()).toEqual(['3', '4']);
  });

  it('shows an error and stays usable when the server refuses (and nothing is left unhandled)', async () => {
    h.updateMany.mockRejectedValue(Object.assign(new Error('no'), { code: 'permission-denied' }));
    await mount([exp('6')]);
    await act(async () => byLabel('اعتماد مصروف بند 6')!.click());
    await flush();
    expect(h.toast.error).toHaveBeenCalledWith('لا تملك صلاحية لتنفيذ هذه العملية');
    expect(byLabel('اعتماد مصروف بند 6')!.disabled).toBe(false);
  });

  it('offers no approve button to someone who may not approve', async () => {
    signIn('u-field', 'employee', ['expenses.view.own', 'expenses.create']);
    await mount([exp('7', { userId: 'u-field' })]);
    expect(byLabel('اعتماد مصروف بند 7')).toBeNull();
    expect(buttons().some((b) => b.textContent?.trim() === 'اعتماد')).toBe(false);
  });

  it('an already approved or closed expense has no approve button', async () => {
    await mount([exp('8', { approvalStatus: 'approved' }), exp('9', { isClosed: true })]);
    expect(byLabel('اعتماد مصروف بند 8')).toBeNull();
    expect(byLabel('اعتماد مصروف بند 9')).toBeNull();
  });
});

describe('rejecting an expense', () => {
  const openPanel = async (id: string) => act(async () => buttons().find((b) => b.getAttribute('aria-label')?.startsWith(`تعديل مصروف بند ${id}`))!.click());
  const dialogButton = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === text && b.closest('[role="dialog"]'))!;

  it('needs a reason, and sends it with the person who rejected', async () => {
    await mount([exp('1')]);
    await openPanel('1');
    await act(async () => dialogButton('رفض').click());
    // no reason yet: nothing is sent and the form says why
    await act(async () => dialogButton('تأكيد الرفض').click());
    expect(h.update).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('اكتب سبب الرفض');
    const field = document.querySelector<HTMLTextAreaElement>('[role="dialog"] textarea[rows="2"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, 'الفاتورة غير واضحة');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => dialogButton('تأكيد الرفض').click());
    await flush();
    expect(h.update).toHaveBeenCalledOnce();
    expect(h.update.mock.calls[0][0]).toBe('1');
    expect(h.update.mock.calls[0][1]).toMatchObject({ approvalStatus: 'rejected', reviewedBy: 'u-acct', rejectionReason: 'الفاتورة غير واضحة' });
  });
});

describe('deleting an expense', () => {
  it('asks first, names it, and deletes only on confirmation', async () => {
    await mount([exp('1', { approvalStatus: 'approved', userId: 'u-acct' })]);
    await act(async () => buttons().find((b) => b.getAttribute('aria-label') === 'حذف مصروف بند 1')!.click());
    expect(document.body.textContent).toContain('حذف هذا المصروف؟');
    expect(document.body.textContent).toContain('بند 1');
    expect(h.remove).not.toHaveBeenCalled();
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'حذف المصروف')!.click());
    await flush();
    expect(h.remove).toHaveBeenCalledWith('1');
    expect(h.toast.success).toHaveBeenCalledWith(expect.stringContaining('تم حذف المصروف'));
  });

  it('keeps it and says why when the server refuses', async () => {
    h.remove.mockRejectedValue(Object.assign(new Error('no'), { code: 'permission-denied' }));
    await mount([exp('1', { approvalStatus: 'approved', userId: 'u-acct' })]);
    await act(async () => buttons().find((b) => b.getAttribute('aria-label') === 'حذف مصروف بند 1')!.click());
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'حذف المصروف')!.click());
    await flush();
    expect(h.toast.error).toHaveBeenCalledWith('لا تملك صلاحية لتنفيذ هذه العملية');
    expect(document.body.textContent).toContain('حذف هذا المصروف؟');
  });

  it('does not delete a closed expense, and says it is closed', async () => {
    await mount([exp('1', { approvalStatus: 'approved', isClosed: true, userId: 'u-acct' })]);
    const del = buttons().find((b) => b.getAttribute('aria-label') === 'حذف مصروف بند 1');
    if (del) await act(async () => del.click());
    expect(h.remove).not.toHaveBeenCalled();
  });
});
