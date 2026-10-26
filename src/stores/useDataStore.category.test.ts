// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() }, add: vi.fn(), getById: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: h.toast }));
vi.mock('../config/firebase', () => ({ db: {}, firebaseConfig: { projectId: 'demo-cat' }, default: {} }));
vi.mock('../services/auditService', () => ({ writeAuditLog: vi.fn() }));
vi.mock('../services/storageService', () => ({ deleteStorageFileByUrl: vi.fn() }));
vi.mock('../services/firebaseService', () => {
  const service = (extra: Record<string, unknown> = {}) => ({ subscribe: () => () => undefined, add: vi.fn(), update: vi.fn(), delete: vi.fn(), ...extra });
  return {
    clientsService: service(), invoicesService: service(), paymentsService: service(), expensesService: service(), standaloneDebtsService: service(),
    debtPartiesService: service(), expenseInvoicesService: service(), workersService: service(), userBalancesService: service(), lettersService: service(),
    projectPhasesService: service(), boqItemsService: service(), siteReportsService: service(), paymentMilestonesService: service(), workerAttendanceService: service(),
    suppliersService: service(), customCategoriesService: service({ add: h.add, getById: h.getById }), globalFundTransactionsService: service(),
    createExpenseInvoiceAtomic: vi.fn(), deleteExpenseInvoiceAtomic: vi.fn(), toConstraints: () => [],
  };
});

import { useDataStore } from './useDataStore';
import { useAuthStore } from './useAuthStore';
import { customCategoryId, getExpenseCategoryLabel } from '../core/expenseCategories';

beforeEach(() => {
  Object.values(h.toast).forEach((f) => f.mockReset());
  h.add.mockReset().mockResolvedValue('x');
  h.getById.mockReset().mockResolvedValue(null);
  useDataStore.getState().reset();
  useAuthStore.setState({ user: { id: 'u1', email: 'a@b.c', displayName: 'م', role: 'admin' } as never, isAuthenticated: true, isLoading: false });
});

describe('adding an expense category from inside the expense form', () => {
  it('writes it to the database under the id that follows from the name, and uses it at once', async () => {
    const id = await useDataStore.getState().addCustomCategory('  ستائر   خارجية ');
    expect(id).toBe(customCategoryId('ستائر خارجية'));
    expect(h.add).toHaveBeenCalledOnce();
    expect(h.add.mock.calls[0][0]).toMatchObject({ id, label: 'ستائر خارجية', createdBy: 'u1' });
    // known to every label lookup before the database answers with its own snapshot
    expect(getExpenseCategoryLabel(id)).toBe('ستائر خارجية');
    expect(useDataStore.getState().customCategories.map((c) => c.id)).toEqual([id]);
    expect(h.toast.success).toHaveBeenCalledWith(expect.stringContaining('ستائر خارجية'));
  });

  it('does not write a second time for a name that exists, built in or added: it gives that category back', async () => {
    expect(await useDataStore.getState().addCustomCategory('سباكة')).toBe('plumbing');
    expect(await useDataStore.getState().addCustomCategory('اسمنت')).toBe('cement');
    const id = await useDataStore.getState().addCustomCategory('تأمين');
    expect(await useDataStore.getState().addCustomCategory('تأمين ')).toBe(id);
    expect(h.add).toHaveBeenCalledOnce();
  });

  it('refuses an empty or oversized name aloud, writing nothing', async () => {
    await expect(useDataStore.getState().addCustomCategory('  ')).rejects.toBeDefined();
    await expect(useDataStore.getState().addCustomCategory('ا'.repeat(80))).rejects.toBeDefined();
    expect(h.toast.error).toHaveBeenCalledTimes(2);
    expect(h.add).not.toHaveBeenCalled();
  });

  it('shows the server\'s refusal and keeps nothing', async () => {
    h.add.mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }));
    await expect(useDataStore.getState().addCustomCategory('فئة محظورة')).rejects.toBeDefined();
    expect(h.toast.error).toHaveBeenCalledWith('لا تملك صلاحية لتنفيذ هذه العملية');
    expect(useDataStore.getState().customCategories).toEqual([]);
    expect(getExpenseCategoryLabel(customCategoryId('فئة محظورة'))).toBe(customCategoryId('فئة محظورة'));
  });

  it('treats a colleague adding the same name at the same moment as success', async () => {
    h.add.mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }));
    h.getById.mockResolvedValue({ id: customCategoryId('فئة مشتركة'), label: 'فئة مشتركة' });
    const id = await useDataStore.getState().addCustomCategory('فئة مشتركة');
    expect(id).toBe(customCategoryId('فئة مشتركة'));
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it('two categories in a row both go through', async () => {
    const a = await useDataStore.getState().addCustomCategory('فئة أولى');
    const b = await useDataStore.getState().addCustomCategory('فئة ثانية');
    expect(a).not.toBe(b);
    expect(h.add).toHaveBeenCalledTimes(2);
    expect(useDataStore.getState().customCategories).toHaveLength(2);
  });

  it('is forgotten on sign-out', async () => {
    const id = await useDataStore.getState().addCustomCategory('فئة مؤقتة');
    useDataStore.getState().reset();
    expect(useDataStore.getState().customCategories).toEqual([]);
    expect(getExpenseCategoryLabel(id)).toBe(id);
  });
});
