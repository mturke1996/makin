// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() }, deletePayment: vi.fn(), addPayment: vi.fn(), updateInvoice: vi.fn(), updateExpense: vi.fn(), updateManyExpenses: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: h.toast }));
vi.mock('../config/firebase', () => ({ db: {}, firebaseConfig: { projectId: 'demo-writes' }, default: {} }));
vi.mock('../services/auditService', () => ({ writeAuditLog: vi.fn() }));
vi.mock('../services/storageService', () => ({ deleteStorageFileByUrl: vi.fn() }));
vi.mock('../services/firebaseService', () => {
  const service = (extra: Record<string, unknown> = {}) => ({ subscribe: () => () => undefined, add: vi.fn(), update: vi.fn(), delete: vi.fn(), ...extra });
  return {
    clientsService: service(), invoicesService: service({ update: h.updateInvoice }), paymentsService: service({ delete: h.deletePayment, add: h.addPayment }),
    expensesService: service({ update: h.updateExpense, updateMany: h.updateManyExpenses }), standaloneDebtsService: service(), debtPartiesService: service(), expenseInvoicesService: service(),
    workersService: service(), userBalancesService: service(), lettersService: service(), projectPhasesService: service(),
    boqItemsService: service(), siteReportsService: service(), paymentMilestonesService: service(), workerAttendanceService: service(), suppliersService: service(), globalFundTransactionsService: service(),
    createExpenseInvoiceAtomic: vi.fn(), deleteExpenseInvoiceAtomic: vi.fn(), toConstraints: () => [],
  };
});

import { useDataStore } from './useDataStore';
import { useAuthStore } from './useAuthStore';
import { confirmWrite } from '../services/writeAck';

beforeEach(() => {
  vi.useFakeTimers();
  Object.values(h.toast).forEach((f) => f.mockReset());
  h.deletePayment.mockReset(); h.addPayment.mockReset(); h.updateInvoice.mockReset();
  vi.stubGlobal('navigator', { onLine: true });
  useDataStore.setState({ payments: [{ id: 'p1', invoiceId: '', clientId: 'c1', amount: 5 } as never], invoices: [] });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('what a save says', () => {
  it('says plainly that it is done when the server answered', async () => {
    h.deletePayment.mockResolvedValue(undefined);
    await useDataStore.getState().deletePayment('p1');
    expect(h.toast.success).toHaveBeenCalledWith('تم حذف الدفعة');
  });

  it('a button never waits for ever: with a silent server the action ends in a clear error', async () => {
    h.addPayment.mockImplementation(() => confirmWrite(() => new Promise(() => undefined)));
    const done = useDataStore.getState().addPayment({ id: 'p9', invoiceId: '', clientId: 'c1', amount: 1 } as never);
    const assertion = expect(done).rejects.toMatchObject({ code: 'slow-network' });
    await vi.advanceTimersByTimeAsync(11000);
    await assertion;
    expect(h.toast.error).toHaveBeenCalledOnce();
    expect(h.toast.success).not.toHaveBeenCalled();
  });

  it('offline: nothing is written, and the person is told so at once', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    h.addPayment.mockImplementation(() => confirmWrite(() => Promise.resolve()));
    await expect(useDataStore.getState().addPayment({ id: 'p8', invoiceId: '', clientId: 'c1', amount: 1 } as never)).rejects.toMatchObject({ code: 'offline' });
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('لا يوجد اتصال'));
  });

  it('two entries in a row both go through', async () => {
    h.addPayment.mockResolvedValue(undefined);
    await useDataStore.getState().addPayment({ id: 'p10', invoiceId: '', clientId: 'c1', amount: 1 } as never);
    await useDataStore.getState().addPayment({ id: 'p11', invoiceId: '', clientId: 'c1', amount: 2 } as never);
    expect(h.addPayment).toHaveBeenCalledTimes(2);
    expect(h.toast.success).toHaveBeenCalledTimes(2);
  });

  it('shows a refusal as an error and lets the form stay open (the promise rejects)', async () => {
    h.deletePayment.mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }));
    await expect(useDataStore.getState().deletePayment('p1')).rejects.toBeDefined();
    expect(h.toast.error).toHaveBeenCalledWith('لا تملك صلاحية لتنفيذ هذه العملية');
    expect(h.toast.success).not.toHaveBeenCalled();
  });
});

describe('approving and rejecting never end in silence', () => {
  const expense = (id: string, extra: Record<string, unknown> = {}) => ({ id, description: `بند ${id}`, amount: 10, approvalStatus: 'pending', isClosed: false, ...extra }) as never;
  const signIn = (role: 'admin' | 'employee') => useAuthStore.setState({ user: { id: 'u1', email: 'a@b.c', displayName: 'المحاسب', role } as never, isAuthenticated: true, isLoading: false });
  beforeEach(() => {
    h.updateExpense.mockReset().mockResolvedValue(undefined);
    h.updateManyExpenses.mockReset().mockResolvedValue(undefined);
    useDataStore.setState({ expenses: [expense('1'), expense('2'), expense('3', { isClosed: true })] });
    signIn('admin');
  });

  it('approves several in ONE batch under the approver\'s uid', async () => {
    await useDataStore.getState().approveExpenses(['1', '2']);
    expect(h.updateManyExpenses).toHaveBeenCalledOnce();
    const [ids, patch] = h.updateManyExpenses.mock.calls[0];
    expect(ids).toEqual(['1', '2']);
    expect(patch).toMatchObject({ approvalStatus: 'approved', reviewedBy: 'u1', rejectionReason: null });
    expect(h.toast.success).toHaveBeenCalledWith(expect.stringContaining('تم اعتماد 2 مصروفاً'));
  });

  it('skips a closed one but still approves the rest', async () => {
    await useDataStore.getState().approveExpenses(['1', '3']);
    expect(h.updateManyExpenses.mock.calls[0][0]).toEqual(['1']);
  });

  it('says so, and rejects, when the expense is not there or is closed', async () => {
    await expect(useDataStore.getState().approveExpenses(['nope'])).rejects.toThrow('لم يُعثر على المصروف');
    expect(h.toast.error).toHaveBeenLastCalledWith(expect.stringContaining('لم يُعثر على المصروف'));
    await expect(useDataStore.getState().approveExpenses(['3'])).rejects.toThrow('مُغلق');
    expect(h.toast.error).toHaveBeenLastCalledWith(expect.stringContaining('مُغلق'));
    expect(h.updateManyExpenses).not.toHaveBeenCalled();
  });

  it('tells someone who may not approve, in Arabic, instead of «not-allowed»', async () => {
    signIn('employee');
    await expect(useDataStore.getState().approveExpenses(['1'])).rejects.toBeDefined();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('صلاحية تعديل كل المصروفات'));
    expect(h.updateManyExpenses).not.toHaveBeenCalled();
  });

  it('shows the server\'s refusal', async () => {
    h.updateManyExpenses.mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }));
    await expect(useDataStore.getState().approveExpenses(['1'])).rejects.toBeDefined();
    expect(h.toast.error).toHaveBeenCalledWith('لا تملك صلاحية لتنفيذ هذه العملية');
  });

  it('rejecting needs a reason (said aloud), then stores it with who rejected', async () => {
    await expect(useDataStore.getState().rejectExpense('1', '   ')).rejects.toBeDefined();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('اكتب سبب الرفض'));
    expect(h.updateExpense).not.toHaveBeenCalled();
    await useDataStore.getState().rejectExpense('1', 'الفاتورة غير واضحة');
    expect(h.updateExpense).toHaveBeenCalledWith('1', expect.objectContaining({ approvalStatus: 'rejected', reviewedBy: 'u1', rejectionReason: 'الفاتورة غير واضحة' }));
  });

  it('rejecting an unknown or closed expense says so', async () => {
    await expect(useDataStore.getState().rejectExpense('nope', 'x')).rejects.toBeDefined();
    expect(h.toast.error).toHaveBeenLastCalledWith(expect.stringContaining('لم يُعثر على المصروف'));
    await expect(useDataStore.getState().rejectExpense('3', 'x')).rejects.toBeDefined();
    expect(h.toast.error).toHaveBeenLastCalledWith(expect.stringContaining('مُغلق'));
  });
});
