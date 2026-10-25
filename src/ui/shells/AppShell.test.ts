// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('../nav/Sidebar', () => ({ Sidebar: () => null }));
vi.mock('../nav/TopBar', () => ({ TopBar: () => null }));
vi.mock('../nav/MobileBottomNav', () => ({ MobileBottomNav: () => null }));
vi.mock('../notifications/NotificationPanel', () => ({ NotificationPanel: () => null }));
vi.mock('../notifications/SmartAlertsBootstrap', () => ({ SmartAlertsBootstrap: () => null }));
vi.mock('../../pwa/InstallUi', () => ({ InstallBanner: () => null }));

import { AppShell } from './AppShell';

let root: Root;
let host: HTMLDivElement;
let go: (to: string) => void;
function Nav() { go = useNavigate(); return null; }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.scrollTo = vi.fn() as never;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it('takes the page area back to the top on every route change: on a tablet it, not the window, is what scrolls', async () => {
  await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ['/a'] },
    createElement(Nav),
    createElement(Routes, null, createElement(Route, { element: createElement(AppShell) },
      createElement(Route, { path: '/a', element: createElement('p', null, 'A') }),
      createElement(Route, { path: '/b', element: createElement('p', null, 'B') }))))));
  const main = host.querySelector<HTMLElement>('main.app-shell-main')!;
  main.scrollTop = 900;
  await act(async () => go('/b'));
  expect(host.textContent).toContain('B');
  expect(main.scrollTop).toBe(0);
  expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
});

it('has no phone bottom padding from tablet width up, where the bars are gone', async () => {
  await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ['/a'] },
    createElement(Routes, null, createElement(Route, { element: createElement(AppShell) }, createElement(Route, { path: '/a', element: createElement('p', null, 'A') }))))));
  const cls = host.querySelector('main')!.className;
  expect(cls).toContain('md:pb-0');
  expect(cls).not.toContain('lg:pb-0');
});
