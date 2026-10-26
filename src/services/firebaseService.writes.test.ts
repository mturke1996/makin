import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fs = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  collection: vi.fn((_db: unknown, name: string) => ({ collection: name })),
  query: vi.fn((c: unknown, ...w: unknown[]) => ({ c, w })),
  where: vi.fn((...args: unknown[]) => args),
  setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(),
  getDoc: vi.fn(), getDocFromCache: vi.fn(), getDocs: vi.fn(), getDocFromServer: vi.fn(),
  runTransaction: vi.fn(), deleteField: vi.fn(() => '__delete__'), onSnapshot: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({ ...fs }));
vi.mock('../config/firebase', () => ({ db: { name: 'db' } }));
vi.mock('./expenseTransactions', () => ({ addExpenseConfirmedOnce: vi.fn() }));
vi.mock('./expenseInvoiceTransactions', () => ({ createExpenseInvoiceAtomic: vi.fn(), deleteExpenseInvoiceAtomic: vi.fn() }));
vi.mock('../core/access/constraints', () => ({ toConstraints: vi.fn() }));

import { paymentsService } from './firebaseService';
import { ACK_WAIT_ONLINE_MS, queuedWrites, setLateFailureReporter } from './writeAck';

const snap = (exists: boolean) => ({ exists: () => exists });
const never = () => new Promise<void>(() => undefined);

beforeEach(() => {
  vi.useFakeTimers();
  for (const fn of Object.values(fs)) (fn as ReturnType<typeof vi.fn>).mockClear?.();
  fs.setDoc.mockResolvedValue(undefined);
  fs.updateDoc.mockResolvedValue(undefined);
  fs.deleteDoc.mockResolvedValue(undefined);
  fs.getDocFromCache.mockResolvedValue(snap(true));
  fs.getDoc.mockResolvedValue(snap(true));
  fs.getDocs.mockResolvedValue({ empty: true, docs: [] });
  setLateFailureReporter(vi.fn());
});
afterEach(() => { vi.useRealTimers(); setLateFailureReporter(null); });

describe('adding', () => {
  it('writes the record under its own id and gives the id back', async () => {
    await expect(paymentsService.add({ id: 'p1', amount: 5, note: undefined })).resolves.toBe('p1');
    expect(fs.setDoc).toHaveBeenCalledWith({ path: 'payments/p1' }, { id: 'p1', amount: 5 });
  });

  it('does not hold the screen up when the server is silent: it resolves, counted as queued', async () => {
    fs.setDoc.mockReturnValue(never());
    const before = queuedWrites();
    const done = paymentsService.add({ id: 'p2', amount: 1 });
    await vi.advanceTimersByTimeAsync(ACK_WAIT_ONLINE_MS + 1);
    await expect(done).resolves.toBe('p2');
    expect(queuedWrites()).toBe(before + 1);
  });

  it('still reports a refusal that comes in time', async () => {
    fs.setDoc.mockRejectedValue(Object.assign(new Error('no'), { code: 'permission-denied' }));
    await expect(paymentsService.add({ id: 'p3' })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('updating', () => {
  it('finds the record in the local cache and never asks the network', async () => {
    await paymentsService.update('p1', { amount: 9, gone: undefined } as never);
    expect(fs.getDocFromCache).toHaveBeenCalled();
    expect(fs.getDoc).not.toHaveBeenCalled();
    expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'payments/p1' }, { amount: 9 });
  });

  it('asks the server only when the cache does not hold it', async () => {
    fs.getDocFromCache.mockRejectedValue(new Error('not cached'));
    await paymentsService.update('p1', { amount: 9 });
    expect(fs.getDoc).toHaveBeenCalledOnce();
    expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'payments/p1' }, { amount: 9 });
  });

  it('goes ahead when the lookup is too slow, instead of hanging on it', async () => {
    fs.getDocFromCache.mockRejectedValue(new Error('not cached'));
    fs.getDoc.mockReturnValue(never());
    const done = paymentsService.update('p1', { amount: 9 });
    await vi.advanceTimersByTimeAsync(4001);
    await done;
    expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'payments/p1' }, { amount: 9 });
  });

  it('finds a legacy record by its id field', async () => {
    fs.getDocFromCache.mockRejectedValue(new Error('not cached'));
    fs.getDoc.mockResolvedValue(snap(false));
    fs.getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'real-doc-id' }] });
    await paymentsService.update('legacy', { amount: 1 });
    expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'payments/real-doc-id' }, { amount: 1 });
  });

  it('says so when the record is nowhere', async () => {
    fs.getDocFromCache.mockRejectedValue(new Error('not cached'));
    fs.getDoc.mockResolvedValue(snap(false));
    await expect(paymentsService.update('ghost', { amount: 1 })).rejects.toThrow('السجل لم يعد موجوداً');
    expect(fs.updateDoc).not.toHaveBeenCalled();
  });

  it('is queued, not stuck, when the server is silent', async () => {
    fs.updateDoc.mockReturnValue(never());
    const done = paymentsService.update('p1', { amount: 2 });
    await vi.advanceTimersByTimeAsync(ACK_WAIT_ONLINE_MS + 1);
    await expect(done).resolves.toBeUndefined();
  });
});

describe('deleting', () => {
  it('deletes straight away, without a transaction that needs the server', async () => {
    await paymentsService.delete('p1');
    expect(fs.deleteDoc).toHaveBeenCalledWith({ path: 'payments/p1' });
    expect(fs.runTransaction).not.toHaveBeenCalled();
    expect(fs.getDoc).not.toHaveBeenCalled();
  });

  it('is done on the device and queued when the server is silent', async () => {
    fs.deleteDoc.mockReturnValue(never());
    const before = queuedWrites();
    const done = paymentsService.delete('p1');
    await vi.advanceTimersByTimeAsync(ACK_WAIT_ONLINE_MS + 1);
    await expect(done).resolves.toBeUndefined();
    expect(queuedWrites()).toBe(before + 1);
  });

  it('reports a refusal (a closed record, no permission)', async () => {
    fs.deleteDoc.mockRejectedValue(Object.assign(new Error('no'), { code: 'permission-denied' }));
    await expect(paymentsService.delete('p1')).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('says so when the record is nowhere', async () => {
    fs.getDocFromCache.mockRejectedValue(new Error('not cached'));
    fs.getDoc.mockResolvedValue(snap(false));
    await expect(paymentsService.delete('ghost')).rejects.toThrow('السجل لم يعد موجوداً');
    expect(fs.deleteDoc).not.toHaveBeenCalled();
  });
});
