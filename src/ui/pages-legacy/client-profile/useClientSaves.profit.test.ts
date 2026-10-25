// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClientSaves } from './useClientSaves';

const mocks = vi.hoisted(() => ({ updateClient: vi.fn(), afterSave: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: mocks.error, success: vi.fn() } }));
vi.mock('../../../config/firebase', () => ({ firebaseConfig: { projectId: 'demo-profit' } }));
vi.mock('../../../services/firebaseService', () => ({ clearField: null }));
vi.mock('../../../stores/useAuthStore', () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ user: { id: 'u1', displayName: 'م. أحمد' } }) }));
vi.mock('../../../stores/useDataStore', () => ({ useDataStore: () => ({ workers: [], updateClient: mocks.updateClient }) }));

type Saves = ReturnType<typeof useClientSaves>;
let root: Root;
let saves: Saves;

function Probe({ clientId }: { clientId?: string }) {
  saves = useClientSaves({ clientId, systemUsers: [], afterSave: mocks.afterSave, phaseCount: 0, milestoneCount: 0 });
  return null;
}
async function mount(clientId: string | undefined) {
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => { root.render(createElement(Probe, { clientId })); });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.updateClient.mockReset().mockResolvedValue(undefined);
  mocks.afterSave.mockReset();
  mocks.error.mockReset();
});
afterEach(async () => { await act(async () => { root?.unmount(); }); document.body.innerHTML = ''; });

describe('saveProfit', () => {
  it('saves the percentage with its base and closes the form', async () => {
    await mount('c1');
    expect(await saves.saveProfit('15', 'expenses')).toBe(true);
    expect(mocks.updateClient).toHaveBeenCalledWith('c1', { profitPercentage: 15, profitBase: 'expenses' });
    expect(mocks.afterSave).toHaveBeenCalledTimes(1);
  });

  it('saves the base the person chose', async () => {
    await mount('c1');
    await saves.saveProfit('10', 'payments');
    expect(mocks.updateClient).toHaveBeenCalledWith('c1', { profitPercentage: 10, profitBase: 'payments' });
  });

  it('reads «12,5» and «١٠%» as people type them', async () => {
    await mount('c1');
    await saves.saveProfit('12,5', 'expenses');
    await saves.saveProfit('١٠%', 'expenses');
    expect(mocks.updateClient.mock.calls.map((c) => c[1].profitPercentage)).toEqual([12.5, 10]);
  });

  it('an emptied field removes the percentage', async () => {
    await mount('c1');
    expect(await saves.saveProfit('', 'expenses')).toBe(true);
    expect(mocks.updateClient).toHaveBeenCalledWith('c1', { profitPercentage: 0, profitBase: 'expenses' });
  });

  it('refuses a percentage out of range or unreadable: says why, saves nothing, keeps the form open', async () => {
    await mount('c1');
    for (const bad of ['100', '250', '-1', 'abc']) {
      expect(await saves.saveProfit(bad, 'expenses'), bad).toBe(false);
    }
    expect(mocks.updateClient).not.toHaveBeenCalled();
    expect(mocks.afterSave).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledTimes(4);
  });

  it('keeps the form open when the save itself fails', async () => {
    await mount('c1');
    mocks.updateClient.mockRejectedValueOnce(new Error('permission-denied'));
    expect(await saves.saveProfit('10', 'expenses')).toBe(false);
    expect(mocks.afterSave).not.toHaveBeenCalled();
  });

  it('does nothing without a client', async () => {
    await mount(undefined);
    expect(await saves.saveProfit('10', 'expenses')).toBe(false);
    expect(mocks.updateClient).not.toHaveBeenCalled();
  });
});
