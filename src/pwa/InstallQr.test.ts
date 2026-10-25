// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InstallQr } from './InstallUi';

vi.mock('../config/BrandProvider', () => ({ useBrand: () => ({ name: 'MAKIN', direction: 'rtl' }) }));

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it('draws the QR once the library has arrived, and nothing before', async () => {
  await act(async () => root.render(createElement(InstallQr, { url: 'https://makin.example/install' })));
  // the library is a separate download: let it land
  await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
  const svg = host.querySelector('svg[aria-label="رمز QR لتثبيت التطبيق"]')!;
  expect(svg).not.toBeNull();
  expect(svg.querySelector('path')!.getAttribute('d')!.length).toBeGreaterThan(100);
});

it('draws a different code for a different link', async () => {
  const draw = async (url: string) => {
    await act(async () => root.render(createElement(InstallQr, { url })));
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    return host.querySelector('path')!.getAttribute('d');
  };
  const a = await draw('https://a.example/install');
  const b = await draw('https://bbbbbbbbbbbbbbbbbbbb.example/install');
  expect(a).not.toBe(b);
});
