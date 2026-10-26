// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() }, deletePayment: vi.fn(), addPayment: vi.fn(), updateInvoice: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: h.toast }));
vi.mock('../config/firebase', () => ({ db: {}, firebaseConfig: { projectId: 'demo-writes' }, default: {} }));
vi.mock('../services/auditService', () => ({ writeAuditLog: vi.fn() }));
vi.mock('../services/storageService', () => ({ deleteStorageFileByUrl: vi.fn() }));
vi.mock('../services/firebaseService', () => {
  const service = (extra: Record<string, unknown> = {}) => ({ subscribe: () => () => undefined, add: vi.fn(), update: vi.fn(), delete: vi.fn(), ...extra });
  return {
    clientsService: service(), invoicesService: service({ update: h.updateInvoice }), paymentsService: service({ delete: h.deletePayment, add: h.addPayment }),
    expensesService: service(), standaloneDebtsService: service(), debtPartiesService: service(), expenseInvoicesService: service(),
    workersService: service(), userBalancesService: service(), lettersService: service(), projectPhasesService: service(),
    boqItemsService: service(), siteReportsService: service(), paymentMilestonesService: service(), globalFundTransactionsService: service(),
    createExpenseInvoiceAtomic: vi.fn(), deleteExpenseInvoiceAtomic: vi.fn(), toConstraints: () => [],
  };
});

import { useDataStore } from './useDataStore';
import { ackOrQueue, setLateFailureReporter } from '../services/writeAck';

beforeEach(() => {
  vi.useFakeTimers();
  Object.values(h.toast).forEach((f) => f.mockReset());
  h.deletePayment.mockReset(); h.addPayment.mockReset(); h.updateInvoice.mockReset();
  setLateFailureReporter(vi.fn());
  useDataStore.setState({ payments: [{ id: 'p1', invoiceId: '', clientId: 'c1', amount: 5 } as never], invoices: [] });
});
afterEach(() => { vi.useRealTimers(); setLateFailureReporter(null); });

describe('what a save says', () => {
  it('says plainly that it is done when the server answered', async () => {
    h.deletePayment.mockResolvedValue(undefined);
    await useDataStore.getState().deletePayment('p1');
    expect(h.toast.success).toHaveBeenCalledWith('تم حذف الدفعة', { duration: undefined });
  });

  it('says that it is saved on the device and will go up by itself when the server was silent', async () => {
    h.deletePayment.mockImplementation(() => ackOrQueue(new Promise(() => undefined)));
    const done = useDataStore.getState().deletePayment('p1');
    await vi.advanceTimersByTimeAsync(7000);
    await done;
    expect(h.toast.success).toHaveBeenCalledOnce();
    expect(h.toast.success.mock.calls[0][0]).toContain('تم حذف الدفعة');
    expect(h.toast.success.mock.calls[0][0]).toContain('سيُرفع تلقائياً');
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it('a button never waits for ever: the action settles even if the server never answers', async () => {
    h.addPayment.mockImplementation(() => ackOrQueue(new Promise(() => undefined)));
    let settled = false;
    const done = useDataStore.getState().addPayment({ id: 'p9', invoiceId: '', clientId: 'c1', amount: 1 } as never).then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(10000);
    await done;
    expect(settled).toBe(true);
  });

  it('shows a refusal as an error and lets the form stay open (the promise rejects)', async () => {
    h.deletePayment.mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }));
    await expect(useDataStore.getState().deletePayment('p1')).rejects.toBeDefined();
    expect(h.toast.error).toHaveBeenCalledWith('لا تملك صلاحية لتنفيذ هذه العملية');
    expect(h.toast.success).not.toHaveBeenCalled();
  });
});
