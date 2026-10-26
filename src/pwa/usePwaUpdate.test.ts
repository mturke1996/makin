// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pwa = vi.hoisted(() => ({ options: null as null | { onNeedRefresh: () => void; onRegisteredSW: (url: string, reg: unknown) => void }, update: vi.fn().mockResolvedValue(undefined) }));
vi.mock('virtual:pwa-register', () => ({ registerSW: (options: never) => { pwa.options = options; return pwa.update; } }));

import { AUTO_APPLY_AFTER_HIDDEN_MS, AUTO_APPLY_LAUNCH_WINDOW_MS, isQuietMoment, usePwaUpdate } from './usePwaUpdate';

let root: Root;
let host: HTMLDivElement;
let api: ReturnType<typeof usePwaUpdate>;
function Probe() { api = usePwaUpdate(); return null; }
const registration = { installing: null, update: vi.fn().mockResolvedValue(undefined) };
const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

// The hook listens on `document`, which outlives a test: remember what it added so each test starts clean.
const added: Array<[string, EventListenerOrEventListenerObject]> = [];
const realAdd = document.addEventListener.bind(document);

beforeEach(async () => {
  document.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    added.push([type, listener]);
    realAdd(type, listener, options);
  }) as typeof document.addEventListener;
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-26T10:00:00Z'));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  pwa.update.mockClear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(Probe)));
  await act(async () => pwa.options!.onRegisteredSW('/sw.js', registration));
});
afterEach(async () => { for (const [type, listener] of added.splice(0)) document.removeEventListener(type, listener); document.addEventListener = realAdd as typeof document.addEventListener; await act(async () => root.unmount()); host.remove(); document.body.innerHTML = ''; vi.useRealTimers(); });

describe('isQuietMoment', () => {
  it('is quiet when nothing is open or being typed', () => {
    expect(isQuietMoment(document)).toBe(true);
  });
  it('is not quiet while a form or dialog is open', () => {
    const dialog = document.createElement('div'); dialog.setAttribute('role', 'dialog'); document.body.append(dialog);
    expect(isQuietMoment(document)).toBe(false);
  });
  it('is not quiet while someone is typing', () => {
    const input = document.createElement('input'); document.body.append(input); input.focus();
    expect(isQuietMoment(document)).toBe(false);
  });
});

describe('a new version', () => {
  it('is applied at once when it is ready right after the app opened and nothing is open', async () => {
    await act(async () => pwa.options!.onNeedRefresh());
    expect(pwa.update).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('waits for the person when it arrives later, and shows the banner state', async () => {
    vi.setSystemTime(Date.now() + AUTO_APPLY_LAUNCH_WINDOW_MS + 1000);
    await act(async () => pwa.options!.onNeedRefresh());
    expect(pwa.update).not.toHaveBeenCalled();
    expect(api.updateReady).toBe(true);
  });

  it('is applied when the app comes back from a long stay in the background', async () => {
    vi.setSystemTime(Date.now() + AUTO_APPLY_LAUNCH_WINDOW_MS + 1000);
    await act(async () => pwa.options!.onNeedRefresh());
    await act(async () => setVisibility('hidden'));
    vi.setSystemTime(Date.now() + AUTO_APPLY_AFTER_HIDDEN_MS + 1000);
    await act(async () => setVisibility('visible'));
    expect(pwa.update).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('is not applied after a short glance away, or while a form is open', async () => {
    vi.setSystemTime(Date.now() + AUTO_APPLY_LAUNCH_WINDOW_MS + 1000);
    await act(async () => pwa.options!.onNeedRefresh());
    await act(async () => setVisibility('hidden'));
    vi.setSystemTime(Date.now() + 5000);
    await act(async () => setVisibility('visible'));
    expect(pwa.update).not.toHaveBeenCalled();
    const dialog = document.createElement('div'); dialog.setAttribute('role', 'dialog'); document.body.append(dialog);
    await act(async () => setVisibility('hidden'));
    vi.setSystemTime(Date.now() + AUTO_APPLY_AFTER_HIDDEN_MS + 1000);
    await act(async () => setVisibility('visible'));
    expect(pwa.update).not.toHaveBeenCalled();
  });

  it('is applied by the person\'s own tap, any time', async () => {
    vi.setSystemTime(Date.now() + AUTO_APPLY_LAUNCH_WINDOW_MS + 1000);
    await act(async () => pwa.options!.onNeedRefresh());
    await act(async () => api.applyUpdate());
    expect(pwa.update).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('is asked for again when the app returns to the foreground', async () => {
    await act(async () => setVisibility('hidden'));
    await act(async () => setVisibility('visible'));
    expect(registration.update).toHaveBeenCalled();
  });
});
