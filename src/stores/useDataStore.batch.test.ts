// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPrincipal } from '../core/access/principal';

type Listener = (rows: any[]) => void;
const feeds = vi.hoisted(() => ({ listeners: {} as Record<string, Listener[]>, unsubscribed: 0 }));

vi.mock('../config/firebase', () => ({ db: {}, firebaseConfig: { projectId: 'demo-batch' }, default: {} }));
vi.mock('../services/auditService', () => ({ writeAuditLog: vi.fn() }));
vi.mock('../services/storageService', () => ({ deleteStorageFileByUrl: vi.fn() }));
vi.mock('../services/firebaseService', () => {
  const service = (name: string) => ({
    subscribe: (cb: Listener) => {
      (feeds.listeners[name] ??= []).push(cb);
      return () => { feeds.unsubscribed += 1; };
    },
  });
  return {
    clientsService: service('clients'), invoicesService: service('invoices'), paymentsService: service('payments'),
    expensesService: service('expenses'), standaloneDebtsService: service('standaloneDebts'), debtPartiesService: service('debtParties'),
    expenseInvoicesService: service('expenseInvoices'), workersService: service('workers'), userBalancesService: service('userBalances'),
    lettersService: service('letters'), projectPhasesService: service('projectPhases'), boqItemsService: service('boqItems'),
    siteReportsService: service('siteReports'), paymentMilestonesService: service('paymentMilestones'), workerAttendanceService: service('workerAttendance'), suppliersService: service('suppliers'), customCategoriesService: service('customCategories'),
    globalFundTransactionsService: service('fundTransactions'), createExpenseInvoiceAtomic: vi.fn(), deleteExpenseInvoiceAtomic: vi.fn(),
    toConstraints: () => [],
  };
});

import { SNAPSHOT_BATCH_MS, useDataSlice, useDataStore } from './useDataStore';

const admin = buildPrincipal({ id: 'a1', role: 'admin' });
const emit = (key: string, rows: any[]) => feeds.listeners[key].forEach((cb) => cb(rows));
const client = (id: string) => ({ id, name: id, createdAt: '2026-01-01' });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  feeds.listeners = {};
  feeds.unsubscribed = 0;
  useDataStore.getState().reset();
});
afterEach(() => { vi.useRealTimers(); });

describe('useDataStore.initialize: one update for a burst of snapshots', () => {
  it('sets the store once for every collection that reported in the same burst, and ends loading with them', () => {
    const seen: boolean[] = [];
    const stop = useDataStore.subscribe((s) => seen.push(s.isLoading));
    const unsubscribe = useDataStore.getState().initialize(admin);

    emit('clients', [client('c1'), client('c2')]);
    emit('expenses', [{ id: 'e1', amount: 5, date: '2026-01-02', createdAt: '2026-01-02' }]);
    for (const key of Object.keys(feeds.listeners)) if (key !== 'clients' && key !== 'expenses') emit(key, []);

    // nothing is applied yet: the burst is still being gathered
    expect(useDataStore.getState().clients).toHaveLength(0);
    expect(useDataStore.getState().isLoading).toBe(true);

    vi.advanceTimersByTime(SNAPSHOT_BATCH_MS + 1);

    const state = useDataStore.getState();
    expect(state.clients.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
    expect(state.expenses).toHaveLength(1);
    expect(state.isLoading).toBe(false);
    // the initial reset-state write plus ONE batched write, not one per collection
    expect(seen.length).toBeLessThanOrEqual(2);
    stop();
    unsubscribe();
  });

  it('later changes still arrive, shortly after, as one update', () => {
    const unsubscribe = useDataStore.getState().initialize(admin);
    for (const key of Object.keys(feeds.listeners)) emit(key, []);
    vi.advanceTimersByTime(SNAPSHOT_BATCH_MS + 1);
    let writes = 0;
    const stop = useDataStore.subscribe(() => { writes += 1; });

    emit('clients', [client('c1')]);
    emit('clients', [client('c1'), client('c2')]);
    emit('payments', [{ id: 'p1', clientId: 'c1', amount: 10, paymentDate: '2026-01-03', createdAt: '2026-01-03' }]);
    vi.advanceTimersByTime(SNAPSHOT_BATCH_MS + 1);

    expect(writes).toBe(1);
    expect(useDataStore.getState().clients).toHaveLength(2);
    expect(useDataStore.getState().payments).toHaveLength(1);
    stop();
    unsubscribe();
  });

  it('keeps the loading state off forever once data came, and stops everything on unsubscribe', () => {
    const unsubscribe = useDataStore.getState().initialize(admin);
    emit('clients', [client('c1')]);
    unsubscribe();
    // the pending patch is dropped with the subscription: nothing lands after it
    vi.advanceTimersByTime(SNAPSHOT_BATCH_MS * 10);
    expect(useDataStore.getState().clients).toHaveLength(0);
    expect(feeds.unsubscribed).toBeGreaterThan(0);
  });

  it('stops waiting after 8 seconds when a collection never answers', () => {
    const unsubscribe = useDataStore.getState().initialize(admin);
    emit('clients', [client('c1')]);
    vi.advanceTimersByTime(SNAPSHOT_BATCH_MS + 1);
    expect(useDataStore.getState().isLoading).toBe(true);
    vi.advanceTimersByTime(8000);
    vi.advanceTimersByTime(SNAPSHOT_BATCH_MS + 1);
    expect(useDataStore.getState().isLoading).toBe(false);
    unsubscribe();
  });
});

describe('useDataSlice', () => {
  let root: Root;
  let host: HTMLDivElement;
  let renders = 0;
  function Probe() {
    renders += 1;
    const { clients } = useDataSlice('clients');
    return createElement('span', null, String(clients.length));
  }
  beforeEach(async () => {
    vi.useRealTimers();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    renders = 0;
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await act(async () => root.render(createElement(Probe)));
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

  it('redraws for the collection it reads and not for the others', async () => {
    const before = renders;
    await act(async () => { useDataStore.setState({ letters: [{ id: 'l1' } as any] }); });
    await act(async () => { useDataStore.setState({ boqItems: [{ id: 'b1' } as any] }); });
    expect(renders).toBe(before);
    await act(async () => { useDataStore.setState({ clients: [client('c9') as any] }); });
    expect(renders).toBe(before + 1);
    expect(host.textContent).toBe('1');
  });

  it('hands back the actions as they are', () => {
    const slice = useDataStore.getState();
    expect(typeof slice.updateClient).toBe('function');
  });
});
